import { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import { redirectUserToChat } from "@/utils/chat/redirectUserToChat";
import ssrGuard from "@/utils/auth/ssrGuard";
import { createSupabaseServerClient } from "@/libs/supabase";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const redirect = await ssrGuard(context);
  if (redirect) {
    return redirect;
  }
  const { req, res } = context;
  const supabase = createSupabaseServerClient(req as NextApiRequest, res as NextApiResponse);

  const { data: userData } = await supabase.auth.getUser();

  const { user } = userData;
  const { data: profile } = await supabase.from("users").select("role").eq("id", user?.id).single();

  const role = profile?.role;
  let destination;

  if (role === "therapist") {
    const { client } = context.query;
    if (client) {
      const { data: lastSession } = await supabase
        .from("sessions")
        .select("id")
        .eq("user_id", client)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      destination = `/chat/${lastSession?.id}`;
    } else {
      destination = "/dashboard/therapist";
    }
  } else {
    destination = redirectUserToChat(context);
  }

  return {
    redirect: {
      destination,
      permanent: false,
    },
  };
}

export default function ChatHomePage() {
  return null; // SSR-only
}
