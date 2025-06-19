// PATCHED: ChatSessionPage — dark mode animation, skeleton, mobile polish, keyboard shortcuts

"use client";

import { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/libs/supabase";
import ChatBox from "@/components/chat/ChatBox";
import { useCallback, useEffect, useState } from "react";
import SessionEditorModal from "@/components/chat/SessionEditorModal";
import SessionSidebar from "@/components/chat/SessionSidebar";
import ssrGuard from "@/utils/auth/ssrGuard";
import { ThemeToggle } from "@/components/ThemeToggle";
import Head from "next/head";
import { useAppStore } from "@/state";
import { useShallow } from "zustand/react/shallow";
import { redirectUserToChat } from "@/utils/chat/redirectUserToChat";
import { Session } from "@/types";
import { loadSession } from "@/utils/supabase";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const redirect = await ssrGuard(context);
  if (redirect) {
    return redirect;
  }
  const supabase = createSupabaseServerClient(
    context.req as NextApiRequest,
    context.res as NextApiResponse
  );

  const sessionId = context.params?.sessionId;

  const { data: chatSession } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .single();

  if (!chatSession) {
    return redirectUserToChat(context);
  }

  return {
    props: {
      sessionId,
    },
  };
}

function ChatSessionPage({ sessionId }: { sessionId: string }) {
  const [showSettings, setShowSettings] = useState(false);
  const [session, setSession] = useState<Session>();

  const { session: authSession } = useAppStore(
    useShallow((s) => ({
      session: s.session,
    }))
  );

  const fetchSession = useCallback(async () => {
    if (!sessionId || !authSession) return;
    try {
      const session = await loadSession(sessionId);
      setSession(session);
    } catch (err) {}
  }, [sessionId, authSession]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "/") {
      e.preventDefault();
      const input = document.querySelector("input,textarea") as HTMLElement;
      if (input) input.focus();
    } else if (e.key === "Escape") {
      setShowSettings(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="transition-colors duration-300">
      <Head>
        <title>Chat Session – AI Chat App</title>
      </Head>
      <div className="flex h-screen">
        <SessionSidebar initialSession={session!} onUpdateSession={fetchSession} />
        <div className="flex-1.5 flex flex-col">
          <header className="flex items-center justify-between border-b bg-white px-4 py-2 text-zinc-800 dark:bg-zinc-900 dark:text-white">
            <h1 className="text-lg font-semibold">💬 Chat Session</h1>
            <div className="hidden gap-3 sm:flex">
              <ThemeToggle />
              <button
                onClick={() => setShowSettings(true)}
                className="text-sm text-blue-600 underline"
                aria-label="Session Settings"
              >
                ⚙️ Session Settings
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-hidden" role="main">
            <ChatBox initialSession={session!} onRefresh={fetchSession} />
          </main>
        </div>

        <button
          onClick={() => setShowSettings(true)}
          className="fixed bottom-4 right-4 z-50 rounded bg-blue-600 px-4 py-2 text-xs text-white shadow-lg hover:bg-blue-700 sm:hidden"
          aria-label="Open Session Settings"
        >
          ⚙️ Settings
        </button>
      </div>
      {showSettings && (
        <SessionEditorModal
          mode="chat"
          sessionId={sessionId}
          onClose={() => setShowSettings(false)}
          onRefresh={fetchSession}
        />
      )}
    </div>
  );
}

export default ChatSessionPage;
