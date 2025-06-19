// utils/ssrGuard.ts
import { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/libs/supabase";

export default async function withRoleGuard(
  ctx: GetServerSidePropsContext,
  allowedRoles?: string[]
) {
  const supabase = createSupabaseServerClient(
    ctx.req as NextApiRequest,
    ctx.res as NextApiResponse
  );
  const { data: userData } = await supabase.auth.getUser();

  if (!userData || !userData.user) {
    return { redirect: { destination: "/auth/login", permanent: false } };
  }

  const user = userData.user;

  const { data } = await supabase.from("users").select("role").eq("id", user?.id).single();
  
  if (!!allowedRoles && !allowedRoles.includes(data?.role)) {
    return {
      redirect: {
        destination: "/unauthorized",
        permanent: false,
      },
    };
  }

  return null;
}
