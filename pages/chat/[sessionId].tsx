// pages/chat/[sessionId].tsx

import { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/libs/supabase";
import ChatBox from "@/components/ChatBox";
import { useState } from "react";
import { useSession } from "@/context/SessionContext";
import SessionEditorModal from "@/components/SessionEditorModal";
import SessionSidebar from "@/components/SessionSidebar";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const supabase = createSupabaseServerClient(
    context.req as NextApiRequest,
    context.res as NextApiResponse
  );
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const sessionId = context.params?.sessionId;

  const { data: chatSession } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .or(`user_id.eq.${session.user.id},shared_with.cs.{${session.user.id}}`)
    .single();

  if (!chatSession) {
    return { notFound: true };
  }

  return {
    props: {
      sessionId,
    },
  };
}

export default function ChatSessionPage({ sessionId }: { sessionId: string }) {
  const [showSettings, setShowSettings] = useState(false);
  const session = useSession();
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="flex h-screen">
        <SessionSidebar currentSessionId={sessionId} />
        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b bg-white px-4 py-2 dark:bg-zinc-900">
            <h1 className="text-lg font-semibold">💬 Chat Session</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode((prev) => !prev)}
                className="text-xs text-gray-500 underline dark:text-gray-300"
              >
                {darkMode ? "🌞 Light" : "🌙 Dark"} Mode
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="text-sm text-blue-600 underline"
              >
                ⚙️ Session Settings
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-hidden">
            <ChatBox initialSessionId={sessionId} />
          </main>
        </div>
      </div>
      {showSettings && (
        <SessionEditorModal
          mode="chat"
          sessionId={sessionId}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
