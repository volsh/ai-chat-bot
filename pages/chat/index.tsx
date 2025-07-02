import { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import { redirectUserToChat } from "@/utils/chat/redirectUserToChat";
import ssrGuard from "@/utils/auth/ssrGuard";
import { createSupabaseServerClient } from "@/libs/supabase";
import { Session } from "inspector/promises";
import { SessionWithGoal } from "@/types";
import { PostgrestError } from "@supabase/supabase-js";

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
      const { data: sessions, error } = (await supabase
        .from("sessions")
        .select("id, treatments(user_id)")
        .order("created_at", { ascending: false })) as unknown as {
        data: SessionWithGoal[];
        error: PostgrestError;
      };

      if (error || !sessions?.length) {
        destination = "/dashboard/therapist";
      } else {
        const lastSession = sessions.find((s) => s.treatments.user_id === client);

        if (lastSession) {
          destination = `/chat/${lastSession?.id}`;
        } else {
          destination = "/dashboard/therapist";
        }
      }
    } else {
      destination = "/dashboard/therapist";
    }
  } else {
    return redirectUserToChat(context);
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
