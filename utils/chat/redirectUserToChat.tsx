import { createSupabaseServerClient } from "@/libs/supabase";
import { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";

export const redirectUserToChat = async (context: GetServerSidePropsContext) => {
  const supabase = createSupabaseServerClient(
    context.req as NextApiRequest,
    context.res as NextApiResponse
  );

  const { data: userData } = await supabase.auth.getUser();

  if (!userData || !userData.user) {
    return { redirect: { destination: "/auth/login", permanent: false } };
  }

  const { user } = userData;

  const { data: lastSession } = await supabase
    .from("sessions")
    .select("id")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let sessionId = lastSession?.id;

  if (!sessionId) {
    const { data: newSession } = await supabase
      .from("sessions")
      .insert([{ user_id: user.id }])
      .select()
      .single();

    sessionId = newSession?.id;
  }

  return {
    redirect: {
      destination: `/chat/${sessionId}`,
      permanent: false,
    },
  };
};
