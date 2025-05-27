import ChatBox from "@/components/ChatBox";
import SessionSidebar from "@/components/SessionSidebar";
import { createSupabaseServerClient } from "@/libs/supabase";
import { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";

export default function HomePage({ sessionId }: { sessionId: string }) {
  <div className="flex h-screen">
    <SessionSidebar currentSessionId={sessionId} />
    return <ChatBox initialSessionId={sessionId} />;
  </div>;
}

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

  // 🧠 Fetch the last chat session for this user from your Supabase `sessions` table
  const { data: lastSession } = await supabase
    .from("sessions")
    .select("id")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let sessionId = lastSession?.id ?? null;

  if (!sessionId) {
    const { data: newSession, error: createErr } = await supabase
      .from("sessions")
      .insert([
        {
          user_id: session.user.id,
          title: "New Chat Session",
        },
      ])
      .select()
      .single();

    sessionId = newSession?.id ?? null;
  }

  return {
    props: {
      session,
      sessionId: lastSession?.id ?? null,
      isNewSession: !lastSession,
    },
  };
}
