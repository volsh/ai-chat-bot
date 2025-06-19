// pages/index.tsx
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

  const destination = role === "therapist" ? "/dashboard/therapist" : redirectUserToChat(context);

  return {
    redirect: {
      destination,
      permanent: false,
    },
  };
}

export default function HomePage() {
  return null; // SSR-only
}
