"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Emotion, Message, MessageWithEmotion, Session } from "@/types";
import { loadSessionMessages, saveMessageToSupabase, updateSessionTitle } from "@/utils/supabase";
import { sendChatMessage } from "@/utils/api";
import clsx from "clsx";
import { exportChatToPDF } from "@/utils/export";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { summarizeSession } from "@/utils/chat/summarizeSession";
import { saveSummaryToDb } from "@/utils/chat/saveSummaryToDb";
import toast from "react-hot-toast";
import { tagEmotion } from "@/utils/ai/emotions";
import { usePresenceChannel } from "@/hooks/usePresenceChannel";
import { useRouter } from "next/router";
import { useAppStore } from "@/state";
import { AnimatePresence } from "framer-motion";
import { useShallow } from "zustand/react/shallow";
import ChatMessage from "./ChatMessage";

interface ChatBoxProps {
  initialSession?: Session;
  onRefresh?: () => void;
}

export default function ChatBox({ initialSession, onRefresh }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout>();
  const [summary, setSummary] = useState<string>(initialSession?.summary!);
  const [showEditor, setShowEditor] = useState(false);
  const [emotionLogs, setEmotionLogs] = useState<Record<string, MessageWithEmotion>>({});
  const [tagAssistantEnabled, setTagAssistantEnabled] = useState(true);
  const [showSummary, setShowSummary] = useState(true);
  const [expandedSummary, setExpandedSummary] = useState(false);

  const { userProfile } = useAppStore(useShallow((s) => ({ userProfile: s.userProfile })));
  const userId = userProfile?.id;
  const sessionId = initialSession?.id;
  const { othersTyping, setTyping } = usePresenceChannel(sessionId, userId);
  const router = useRouter();
  const countMessagesForSummary = useRef(0);

  const isTherapist = userProfile?.role === "therapist";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (initialSession?.summary) setSummary(initialSession.summary);
  }, [initialSession]);

  const fetchMessages = useCallback(() => {
    if (!userId) return;
    if (sessionId) {
      loadSessionMessages(sessionId).then((msgs: MessageWithEmotion[]) => {
        setMessages((msgs ?? []) as Message[]);
        const map = Object.fromEntries(
          msgs
            .filter((msg) => !!msg.emotion)
            .map((msg) => [
              msg.source_id,
              {
                emotion: msg.emotion,
                intensity: msg.intensity,
                tone: msg.tone,
                topic: msg.topic,
              },
            ])
        );
        setEmotionLogs(map as Record<string, MessageWithEmotion>);
      });
    }
  }, [sessionId, userId]);

  useEffect(() => {
    if (sessionId) {
      fetchMessages();
      const savedDraft = localStorage.getItem(`draft-${sessionId}`);
      if (savedDraft) setInput(savedDraft);
    }
  }, [sessionId]);

  useEffect(() => {
    localStorage.setItem(`draft-${sessionId}`, input);
  }, [input, sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const saved = localStorage.getItem("tagAssistantEnabled");
    if (saved !== null) setTagAssistantEnabled(saved === "true");
  }, []);

  const generateMessageAndTagEmotion = async (messages: Message[]) => {
    try {
      const response = await sendChatMessage(sessionId!, messages);
      const assistantMessage = await saveMessageToSupabase(sessionId!, response.message);
      setMessages([...messages, assistantMessage]);
      if (tagAssistantEnabled) {
        try {
          const result = await tagEmotion(
            response.message.content,
            assistantMessage.id!,
            "assistant",
            (optimistic) => {
              setEmotionLogs((prev) => ({ ...prev, [assistantMessage.id!]: optimistic }));
            }
          );
          if (result?.emotion) {
            setEmotionLogs((prev) => ({ ...prev, [assistantMessage.id!]: result }));
          }
        } catch {
          toast.error("Failed to tag emotion");
        }
      }
    } catch {
      toast.error("Failed to regenerate message");
    }
  };

  const generateSummary = async () => {
    setLoading(true);
    try {
      const summary = await summarizeSession(messages);
      setSummary(summary || "No summary generated.");
      return summary;
    } catch (err: any) {
      toast.error(err.message || "Generating summary failed");
    } finally {
      setLoading(false);
    }
  };

  const saveSummary = async (summary: string) => {
    setLoading(true);
    try {
      await saveSummaryToDb(sessionId!, summary);
      toast.success("Summary updated.");
      onRefresh?.();
    } catch (err: any) {
      toast.error(err.message || "Updating summary failed");
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    if (!input.trim() || !userId) return;
    const rawMessage: Partial<Message> = {
      role: "user",
      content: input,
      created_at: new Date().toISOString(),
    };
    setInput("");
    setLoading(true);

    if (initialSession?.title.startsWith("Chat –")) {
      await updateSessionTitle(sessionId!, rawMessage.content!);
      onRefresh?.();
    }

    let userMessageWithId: Message;
    try {
      userMessageWithId = await saveMessageToSupabase(sessionId!, rawMessage);
      setMessages((prev) => [...prev, userMessageWithId]);
      const result = await tagEmotion(
        userMessageWithId.content,
        userMessageWithId.id!,
        "user",
        (optimistic) => {
          setEmotionLogs((prev) => ({ ...prev, [userMessageWithId.id!]: optimistic }));
        }
      );
      if (result?.emotion) {
        setEmotionLogs((prev) => ({ ...prev, [userMessageWithId.id!]: result }));
      }
    } catch {
      toast.error("Failed to save user message");
      setLoading(false);
      return;
    }

    await generateMessageAndTagEmotion([...messages, userMessageWithId]);

    try {
      countMessagesForSummary.current++;
      if (countMessagesForSummary.current >= 6) {
        countMessagesForSummary.current = 0;
        const summary = await generateSummary();
        if (summary) await saveSummary(summary);
      }
    } catch {
      toast.error("Failed to save summary");
    }

    setLoading(false);
  };

  const regenerate = async (index: number) => {
    const userMsg = messages[index - 1];
    if (!userMsg || userMsg.role !== "user") return;
    setLoading(true);
    const trimmed = messages.slice(0, index);
    await generateMessageAndTagEmotion(trimmed);
    setLoading(false);
  };

  const startNewChat = async () => {
    const { data, error } = await supabase
      .from("sessions")
      .insert([{ user_id: userId }])
      .select()
      .single();
    if (!error && data?.id) {
      const newSessionId = data.id;
      setMessages([]);
      setSummary("");

      await saveMessageToSupabase(newSessionId, {
        role: "system",
        content: "🆕 New session started. Ask me anything to begin.",
        created_at: new Date().toISOString(),
      } as Message);

      router.push(`/chat/${newSessionId}`);
    } else {
      toast.error("Failed to start new chat");
    }
  };

  if (!userId) {
    return <p className="mt-8 text-center text-sm text-gray-500">Please log in to use the chat.</p>;
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col rounded-xl border bg-white p-4 shadow dark:bg-zinc-900">
      {!showSummary && summary && (
        <button
          onClick={() => setShowSummary(true)}
          className="mb-4 self-start text-sm text-blue-600 underline"
        >
          📄 Show Summary
        </button>
      )}

      {summary && showSummary && (
        <div className="relative mb-4 flex max-h-[300px] flex-col rounded bg-zinc-100 p-3 text-xs text-gray-600 dark:bg-zinc-800 dark:text-gray-300">
          {/* Top-right hide button */}
          <button
            onClick={() => setShowSummary(false)}
            className="absolute right-2 top-2 text-xs text-red-500"
          >
            ✖
          </button>

          <strong className="mb-1 pr-6">AI Summary:</strong>

          {/* Scrollable summary box when collapsed */}
          <div className="relative flex-1 overflow-auto">
            <div
              className={clsx(
                "whitespace-pre-wrap break-words pr-2 transition-all",
                expandedSummary ? "max-h-none" : "max-h-[6rem] overflow-y-hidden"
              )}
              style={{ minHeight: "3rem" }}
            >
              {summary}
            </div>
            {/* Fade gradient shown only when collapsed */}
            {!expandedSummary && summary.length > 300 && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-zinc-100 to-transparent dark:from-zinc-800" />
            )}
          </div>

          {/* Show more / less toggle */}
          {summary.length > 300 && (
            <div className="mt-1">
              <button
                onClick={() => setExpandedSummary((prev) => !prev)}
                className="text-xs text-blue-600 underline"
              >
                {expandedSummary ? "Show less" : "Show more"}
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={async () => {
                const newSummary = await generateSummary();
                if (newSummary) {
                  setSummary(newSummary);
                  saveSummary(newSummary);
                }
              }}
              disabled={loading}
              className="text-xs text-blue-500 underline disabled:opacity-50"
            >
              ↻ Regenerate Summary
            </button>
            <button
              onClick={() => setShowEditor((prev) => !prev)}
              className="text-xs text-blue-600 underline"
            >
              {showEditor ? "Hide Editor" : "Edit Summary"}
            </button>
            <button
              onClick={() => saveSummary(summary)}
              disabled={loading || !showEditor}
              className="text-xs text-green-600 underline disabled:opacity-50"
            >
              Save Edit
            </button>
          </div>

          {showEditor && (
            <textarea
              className="mt-2 w-full rounded border p-2 text-sm"
              rows={3}
              value={summary}
              onChange={(e) => {
                if (e.target.value.trim().length) setSummary(e.target.value);
              }}
            />
          )}
        </div>
      )}

      {initialSession?.title && (
        <div className="mb-3 text-center text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          📝 {initialSession.title}
        </div>
      )}
      <div className="flex-1 space-y-3 overflow-y-auto px-2">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <ChatMessage
              key={(msg as MessageWithEmotion).source_id || i}
              msg={msg as MessageWithEmotion}
              emotion={emotionLogs[(msg as MessageWithEmotion).source_id!]}
              regenerate={() => regenerate(i)}
              onRefresh={fetchMessages}
              loading={loading}
            />
          ))}
        </AnimatePresence>
        {loading && (
          <div className="animate-pulse text-sm text-gray-400">
            Thinking<span className="inline-block animate-bounce">…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!!initialSession?.ended_at && (
          <p className="italic text-gray-500">This session has been marked as finished.</p>
        )}
        {!isTherapist && (
          <>
            <input
              ref={inputRef}
              className="flex-1 rounded-md border p-2 dark:bg-zinc-800 dark:text-white"
              placeholder="Ask something…"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setTyping(true);
                if (typingTimeout.current) clearTimeout(typingTimeout.current);
                typingTimeout.current = setTimeout(() => setTyping(false), 1200);
              }}
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={!sessionId || !!initialSession?.ended_at}
              aria-label="chat input"
            />
            <button
              onClick={send}
              className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
              disabled={!sessionId || loading || !!initialSession?.ended_at}
            >
              Send
            </button>
            <button
              onClick={startNewChat}
              className="rounded bg-gray-200 px-3 py-1 text-sm text-zinc-700 shadow dark:bg-zinc-700 dark:text-white"
            >
              ➕ New Chat
            </button>
            <button
              onClick={() => {
                const next = !tagAssistantEnabled;
                setTagAssistantEnabled(next);
                localStorage.setItem("tagAssistantEnabled", String(next));
              }}
              className="text-sm text-gray-600 underline dark:text-gray-300"
            >
              {tagAssistantEnabled ? "🔴 Disable Assistant Tagging" : "🟢 Enable Assistant Tagging"}
            </button>
            <button
              onClick={async () => {
                await supabase
                  .from("sessions")
                  .update({ ended_at: new Date() })
                  .eq("id", sessionId);
                onRefresh?.();
              }}
              className="mt-4 rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
              disabled={!sessionId || !!initialSession?.ended_at}
            >
              Finish Chat
            </button>
          </>
        )}
        <button
          onClick={() => exportChatToPDF("My Chat", messages)}
          className="text-sm text-zinc-700 underline dark:text-white"
        >
          📄 Export
        </button>
      </div>

      {othersTyping.length > 0 && (
        <div className="mt-2 flex flex-col gap-1 text-xs text-gray-500">
          {othersTyping.map((user) => (
            <div key={user.id} className="flex items-center gap-2">
              {user.avatar && (
                <img src={user.avatar} className="h-4 w-4 rounded-full" alt="avatar" />
              )}
              <span>
                <strong>{user.name}</strong> – {user.activity}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
