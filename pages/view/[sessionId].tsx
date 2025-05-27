// pages/view/[sessionId].tsx

import { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/libs/supabase";
import { Message } from "@/types";
import ReactMarkdown from "react-markdown";
import clsx from "clsx";
import { format } from "date-fns";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const supabase = createSupabaseServerClient(
    context.req as NextApiRequest,
    context.res as NextApiResponse
  );
  const sessionId = context.params?.sessionId;

  const { data: session } = await supabase
    .from("sessions")
    .select("id, summary")
    .eq("id", sessionId)
    .single();

  if (!session) return { notFound: true };

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  return {
    props: {
      sessionId,
      messages,
      summary: session.summary ?? null,
    },
  };
}

export default function ViewSessionPage({
  sessionId,
  messages,
  summary,
}: {
  sessionId: string;
  messages: Message[];
  summary: string | null;
}) {
  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-semibold">📄 Session Transcript</h1>
      <div className="rounded bg-zinc-100 p-4 text-sm text-gray-800">
        <h2 className="text-md mb-2 font-semibold">AI Insight Summary</h2>
        {summary ? (
          <p>{summary}</p>
        ) : (
          <p className="text-xs text-gray-400">No summary available yet.</p>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={clsx("whitespace-pre-wrap rounded-lg px-3 py-2 text-sm", {
              "border-l-4 border-blue-400 bg-white": msg.role === "assistant",
              "border-l-4 border-gray-400 bg-white": msg.role === "user",
              "bg-zinc-200 text-zinc-700": msg.role === "system",
            })}
          >
            <div className="flex justify-between text-xs text-gray-500">
              <span className="capitalize">{msg.role}</span>
              <span>{format(new Date(msg.created_at), "MMM d, p")}</span>
            </div>
            <div className="prose dark:prose-invert">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
