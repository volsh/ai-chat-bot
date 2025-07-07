"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Emotion, Message, MessageWithEmotion, Session, SessionWithGoal } from "@/types";
import { loadSessionMessages, updateSessionTitle } from "@/utils/supabase";
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
import saveMessageToDB from "@/utils/chat/saveMessageToDB";
import startNewChat from "@/utils/chat/startNewChat";
import Modal from "../ui/modal";
import Spinner from "../ui/spinner";

interface ChatBoxProps {
  initialSession?: Session;
  onRefresh?: () => void;
}

export default function ChatBox({ initialSession, onRefresh }: ChatBoxProps) {
  const [messages, setMessages] = useState<MessageWithEmotion[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout>();
  const [session, setSession] = useState<SessionWithGoal>();
  const [summary, setSummary] = useState<string>(initialSession?.summary!);
  const [showEditor, setShowEditor] = useState(false);
  const [emotionLogs, setEmotionLogs] = useState<Record<string, MessageWithEmotion>>({});
  const [tagAssistantEnabled, setTagAssistantEnabled] = useState(true);
  const [showSummary, setShowSummary] = useState(true);
  const [expandedSummary, setExpandedSummary] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [paused, setPaused] = useState(false);

  const { userProfile } = useAppStore(useShallow((s) => ({ userProfile: s.userProfile })));
  const userId = userProfile?.id;
  const sessionId = initialSession?.id;
  const { othersTyping, setTyping } = usePresenceChannel(sessionId, userId);
  const countMessagesForSummary = useRef(0);

  const isTherapist = userProfile?.role === "therapist";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (initialSession?.summary) {
      setSummary(initialSession.summary);
    } else {
      setSummary("");
    }
  }, [initialSession]);

  const fetchSession = useCallback(async () => {
    setLoading(true);

    const { data: sessionData, error: sessionError } = await supabase
      .from("sessions")
      .select(
        `
        *,
        treatments (
          id,
          goal_id,
          goals (
            id,
            title
          )
        )
      `
      )
      .eq("id", sessionId)
      .single();

    if (sessionError || !sessionData) {
      console.error("Session not found");
    }
    setSession(sessionData);

    try {
      const res = await fetch("/api/generate-first-message", {
        method: "POST",
        body: JSON.stringify({
          sessionId: sessionData.id,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();

      if (json.message === "Session already started") {
        return;
      }
      const firstMessage = {
        role: "system",
        content: json.message,
        created_at: new Date().toISOString(),
      } as MessageWithEmotion;
      const savedMessage = await saveMessageToDB(sessionData.id, firstMessage);
      setMessages([savedMessage]);
    } catch (err) {
      console.error("Failed to generate first message");
    }
    setLoading(false);
  }, [sessionId]);

  const fetchMessages = useCallback(() => {
    if (!userId) return;
    if (sessionId) {
      setLoading(true);
      loadSessionMessages(sessionId).then((msgs: MessageWithEmotion[]) => {
        setMessages((prev) => (msgs ? [...prev, ...msgs] : prev));
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
        setLoading(false);
      });
    }
  }, [sessionId, userId]);

  useEffect(() => {
    if (sessionId) {
      fetchSession();
      fetchMessages();
      const savedDraft = localStorage.getItem(`draft-${sessionId}`);
      if (savedDraft) setInput(savedDraft);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!session) return;

    const createdAt = new Date(session.created_at).getTime();
    const pausedAt = session.paused_at ? new Date(session.paused_at).getTime() : null;
    const totalPausedMs = (session.total_pause_seconds || 0) * 1000;
    const durationMs = 2 * 60 * 60 * 1000;
    const expiresAt = createdAt + durationMs + totalPausedMs;

    if (session.ended_at) {
      setIsExpired(true);
      setCountdown(null);
      return;
    }

    if (pausedAt) {
      const pausedCountdown = expiresAt - pausedAt;
      setCountdown(pausedCountdown);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = expiresAt - now;
      if (remaining <= 0) {
        clearInterval(interval);
        setIsExpired(true);
        setCountdown(null);
      } else {
        setCountdown(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

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

  const handlePause = async () => {
    setPaused(true);
    await supabase
      .from("sessions")
      .update({ paused_at: new Date().toISOString() })
      .eq("id", sessionId);
    fetchSession();
  };

  const handleContinue = async () => {
    if (!session?.paused_at) return;
    setPaused(false);
    const now = new Date();
    const pausedAt = new Date(session.paused_at);
    const diffSeconds = Math.floor((now.getTime() - pausedAt.getTime()) / 1000);
    const newTotal = (session.total_pause_seconds || 0) + diffSeconds;

    await supabase
      .from("sessions")
      .update({ paused_at: null, total_pause_seconds: newTotal })
      .eq("id", sessionId);

    fetchSession();
  };

  const generateMessageAndTagEmotion = async (messages: MessageWithEmotion[]) => {
    try {
      const response = await sendChatMessage(session?.treatments.goals.title!, messages);
      const assistantMessage = await saveMessageToDB(sessionId!, response.message);
      setMessages([...messages, assistantMessage]);
      if (tagAssistantEnabled) {
        try {
          const result = await tagEmotion(assistantMessage.id!, (optimistic) => {
            setEmotionLogs((prev) => ({ ...prev, [assistantMessage.id!]: optimistic }));
          });
          if (result?.emotion) {
            setEmotionLogs((prev) => ({ ...prev, [assistantMessage.id!]: result }));
          }
        } catch {
          toast.error("Failed to tag emotion");
        }
      }
    } catch {
      toast.error("Failed to generate message");
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

    let userMessageWithId: MessageWithEmotion;
    try {
      userMessageWithId = await saveMessageToDB(sessionId!, rawMessage);
      setMessages((prev) => [...prev, userMessageWithId]);
      const result = await tagEmotion(userMessageWithId.id!, (optimistic) => {
        setEmotionLogs((prev) => ({ ...prev, [userMessageWithId.id!]: optimistic }));
      });
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

  const handleFinishChat = async () => {
    setIsFinishing(true);
    const { error } = await supabase
      .from("sessions")
      .update({ ended_at: new Date() })
      .eq("id", sessionId);
    if (error) {
      toast.error("Failed to end chat. Please try again later");
    }
    fetchSession();
    onRefresh?.();
    setIsFinishing(false);
    setIsFinishModalOpen(false);
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
        {isExpired && (
          <p className="italic text-gray-500">This session has been marked as finished.</p>
        )}
        {countdown && (
          <div className="mb-2 text-sm text-gray-600">
            Session ends in: {new Date(countdown).toISOString().substr(11, 8)}
          </div>
        )}
        {!isTherapist && (
          <>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                className="flex-1 rounded-md border p-2 disabled:opacity-50 dark:bg-zinc-800 dark:text-white"
                placeholder="Ask something…"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setTyping(true);
                  if (typingTimeout.current) clearTimeout(typingTimeout.current);
                  typingTimeout.current = setTimeout(() => setTyping(false), 1200);
                }}
                onKeyDown={(e) => e.key === "Enter" && send()}
                disabled={!sessionId || isExpired || paused}
                aria-label="chat input"
              />
              <button
                onClick={send}
                className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                disabled={!sessionId || loading || isExpired || paused}
              >
                Send
              </button>
            </div>
            <div className="flex gap-2">
              {/* <button
                onClick={() => {
                  const next = !tagAssistantEnabled;
                  setTagAssistantEnabled(next);
                  localStorage.setItem("tagAssistantEnabled", String(next));
                }}
                className="text-sm text-gray-600 underline dark:text-gray-300"
              >
                {tagAssistantEnabled
                  ? "🔴 Disable Assistant Tagging"
                  : "🟢 Enable Assistant Tagging"}
              </button> */}
              <button
                onClick={() => exportChatToPDF("My Chat", messages)}
                className="text-sm text-zinc-700 underline dark:text-white"
              >
                📄 Export
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setMessages([]);
                  startNewChat(session?.treatment_id!);
                }}
                className="rounded bg-gray-200 px-3 py-1 text-sm text-zinc-700 shadow disabled:opacity-50 dark:bg-zinc-700 dark:text-white"
                disabled={!session}
              >
                ➕ New Chat
              </button>
              {session?.paused_at ? (
                <button
                  onClick={handleContinue}
                  className="rounded bg-yellow-500 px-4 py-2 text-sm text-white hover:bg-yellow-600 disabled:opacity-50"
                  disabled={!sessionId || isExpired}
                >
                  ▶️ Play
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="rounded bg-yellow-500 px-4 py-2 text-sm text-white hover:bg-yellow-600 disabled:opacity-50"
                  disabled={!sessionId || isExpired}
                >
                  ⏸️ Pause
                </button>
              )}
              <button
                onClick={() => setIsFinishModalOpen(true)}
                className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                disabled={!sessionId || isExpired}
              >
                Finish Chat
              </button>
            </div>
          </>
        )}
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
      {isFinishModalOpen && (
        <Modal onClose={() => setIsFinishModalOpen(false)}>
          <>
            <h3 className="text-xl font-semibold text-red-600">Are you sure?</h3>
            <p className="text-sm text-zinc-500">This action will permanently end the session.</p>
            {isFinishing && <Spinner />}
            <div className="mt-4 flex justify-between gap-4">
              <button
                onClick={() => setIsFinishModalOpen(false)}
                className="w-1/2 rounded bg-gray-600 py-2 text-white hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleFinishChat}
                className="w-1/2 rounded bg-red-600 py-2 text-white hover:bg-red-700"
              >
                Finish
              </button>
            </div>
          </>
        </Modal>
      )}
    </div>
  );
}
