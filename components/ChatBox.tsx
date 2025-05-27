"use client";

import { useEffect, useRef, useState } from "react";
import { Message } from "@/types";
import {
  createSessionWithTitle,
  loadSessionMessages,
  saveMessageToSupabase,
} from "@/utils/supabase/supabase";
import { sendChatMessage } from "@/utils/api";
import ReactMarkdown from "react-markdown";
import clsx from "clsx";
import { format } from "date-fns";
import { exportChatToPDF } from "@/utils/export";
import { useSession } from "@/context/SessionContext";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { generateSessionSummary } from "@/libs/ai/session";

interface ChatBoxProps {
  initialSessionId?: string;
}

export default function ChatBox({ initialSessionId }: ChatBoxProps) {
  const session = useSession();
  const userId = session?.user.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [othersTyping, setOthersTyping] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout>();
  const [summary, setSummary] = useState<string>("");

  useEffect(() => {
    if (sessionId) {
      loadSessionMessages(sessionId).then((msgs) => setMessages(msgs ?? []));
    }
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!sessionId || !userId) return;

    const channel = supabase.channel(`presence:chat-${sessionId}`, {
      config: { presence: { key: userId } },
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ typing: false });
      }
    });

    const updateTypingState = () => {
      const state = channel.presenceState() as Record<string, { typing?: boolean }[]>;
      const others = Object.entries(state || {})
        .filter(([id, users]) => id !== userId && users.some((u) => u.typing))
        .map(([id]) => id);
      setOthersTyping(others);
    };

    channel.on("presence", { event: "sync" }, updateTypingState);
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, userId]);

  const setTyping = (isTyping: boolean) => {
    supabase.channel(`presence:chat-${sessionId}`).track({ typing: isTyping });
  };

  const send = async () => {
    if (!input.trim() || !userId) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      created_at: new Date().toISOString(),
    };
    setInput("");
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    let id = sessionId;
    if (!id) {
      id = await createSessionWithTitle(userId, userMessage.content);
      setSessionId(id);
    }

    await saveMessageToSupabase(id!, userMessage);

    const response = await sendChatMessage(id!, [...messages, userMessage]);
    const newMessages = [...messages, userMessage, response.message];
    setMessages(newMessages);
    await saveMessageToSupabase(id!, response.message);

    if (newMessages.length >= 6) {
      const summary = await generateSessionSummary(newMessages);
      setSummary(summary);
      await supabase.from("sessions").update({ summary }).eq("id", id);
    }
    setLoading(false);
  };

  const regenerate = async (index: number) => {
    const userMsg = messages[index - 1];
    if (!userMsg || userMsg.role !== "user") return;

    const trimmed = messages.slice(0, index);
    setMessages(trimmed);
    setLoading(true);

    const response = await sendChatMessage(sessionId!, trimmed);
    setMessages([...trimmed, response.message]);
    await saveMessageToSupabase(sessionId!, response.message);
    setLoading(false);
  };

  const startNewChat = async () => {
    const title = `Chat – ${format(new Date(), "MMM d")}`;
    const { data, error } = await supabase
      .from("sessions")
      .insert([{ user_id: session?.user.id, title }])
      .select()
      .single();

    if (!error) {
      setSessionId(data.id);
      setMessages([]);
      await saveMessageToSupabase(data.id, {
        role: "system",
        content: "🆕 New session started. Ask me anything to begin.",
        created_at: new Date().toISOString(),
      });
    }
  };

  if (!session) {
    return <p className="mt-8 text-center text-sm text-gray-500">Please log in to use the chat.</p>;
  }

  return (
    <div className="mx-auto flex h-[80vh] max-w-2xl flex-col rounded-xl border bg-white p-4 shadow dark:bg-zinc-900">
      {summary && (
        <div className="mb-4 rounded bg-zinc-100 p-3 text-xs text-gray-600 dark:bg-zinc-800 dark:text-gray-300">
          <strong>AI Summary:</strong> {summary}
          <div className="mt-1">
            <button
              onClick={async () => {
                setLoading(true);
                const newSummary = await generateSessionSummary(messages);
                setSummary(newSummary);
                await supabase.from("sessions").update({ summary: newSummary }).eq("id", sessionId);
                setLoading(false);
              }}
              className="text-xs text-blue-500 underline"
            >
              ↻ Regenerate Summary
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto px-2">
        {messages.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Ask me anything to begin…</p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={clsx("whitespace-pre-wrap rounded-lg px-3 py-2 text-sm", {
              "bg-zinc-100 text-black dark:bg-zinc-800": msg.role === "user",
              "bg-blue-100 text-blue-900 dark:bg-blue-800 dark:text-white":
                msg.role === "assistant",
              "bg-zinc-200 text-zinc-800 dark:bg-zinc-700": msg.role === "system",
            })}
          >
            <div className="flex justify-between text-xs text-gray-500">
              <span className="capitalize">{msg.role}</span>
              <span>{format(new Date(msg.created_at), "p")}</span>
            </div>
            <div className="prose dark:prose-invert">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
            {msg.role === "assistant" && (
              <button
                onClick={() => regenerate(i)}
                className="mt-1 text-xs text-blue-500 underline"
              >
                🔄 Regenerate
              </button>
            )}
          </div>
        ))}

        {loading && <div className="text-sm text-gray-400">Thinking…</div>}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
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
        />
        <button
          onClick={send}
          className="rounded-md bg-blue-600 px-4 py-2 text-white"
          disabled={loading || !sessionId}
        >
          Send
        </button>
        <button onClick={() => exportChatToPDF("My Chat", messages)} className="text-sm underline">
          📄 Export
        </button>
        <button
          onClick={startNewChat}
          className="rounded bg-gray-200 px-3 py-1 text-sm shadow dark:bg-zinc-700"
        >
          ➕ New Chat
        </button>
      </div>
      {othersTyping.length > 0 && (
        <p className="mt-2 text-xs text-gray-500">{othersTyping.length} user(s) typing…</p>
      )}
    </div>
  );
}
