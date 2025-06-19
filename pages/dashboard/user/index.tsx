import { GetServerSidePropsContext } from "next";
import ssrGuard from "@/utils/auth/ssrGuard";

// pages/dashboard/user/index.tsx
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const redirect = await ssrGuard(context, ["user"]);
  if (redirect) {
    return redirect;
  }
  return {
    redirect: {
      destination: "/dashboard/user/emotion",
      permanent: false,
    },
  };
}

export default function Empty() {
  return null;
}
