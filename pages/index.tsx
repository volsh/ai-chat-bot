// pages/index.tsx
import { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
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

  if (role === "therapist")
    return {
      redirect: {
        destination: "/dashboard/therapist",
        permanent: false,
      },
    };
  if (role === "admin")
    return {
      redirect: {
        destination: "/dashboard/admin",
        permanent: false,
      },
    };
  return {
    redirect: {
      destination: "/treatments",
      permanent: false,
    },
  };
}

export default function HomePage() {
  return null; // SSR-only
}
