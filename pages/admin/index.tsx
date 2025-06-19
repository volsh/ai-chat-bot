import { createSupabaseServerClient } from "@/libs/supabase";
import type { Session } from "@supabase/supabase-js";
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import ssrGuard from "@/utils/auth/ssrGuard";

interface AdminPageProps {
  session: Session;
}

export default function AdminPage({ session }: AdminPageProps) {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Admin Panel</h1>
      <p>Welcome, {session.user.email}</p>
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const redirect = await ssrGuard(context, ["admin"]);
  if (redirect) {
    return redirect;
  }

  return {
    props: {},
  };
}
