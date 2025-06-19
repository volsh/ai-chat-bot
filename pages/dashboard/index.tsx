// pages/dashboard/index.tsx
import { GetServerSideProps, NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/libs/supabase";
import ssrGuard from "@/utils/auth/ssrGuard";

export const getServerSideProps: GetServerSideProps = async (context) => {
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

  const destination = role === "therapist" ? "/dashboard/therapist" : "/dashboard/user";

  return {
    redirect: {
      destination,
      permanent: false,
    },
  };
};

export default function DashboardRedirect() {
  return null; // This page only redirects on the server side
}
