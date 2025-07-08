import { createSupabaseServerClient } from "@/libs/supabase";
import { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";

export const redirectUserToChat = async (context: GetServerSidePropsContext) => {
  const supabase = createSupabaseServerClient(
    context.req as NextApiRequest,
    context.res as NextApiResponse
  );

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return { redirect: { destination: "/auth/login", permanent: false } };
  }

  const userId = userData.user.id;

  // ⚡️ 1️⃣ Get treatments for the user
  const { data: treatments } = await supabase.from("treatments").select("id").eq("user_id", userId);

  const treatmentIds = treatments?.map((t) => t.id) ?? [];
  let sessionId: string | undefined;

  // ⚡️ 2️⃣ Get the latest session across treatments
  if (treatmentIds.length > 0) {
    const { data: lastSession } = await supabase
      .from("sessions")
      .select("id")
      .in("treatment_id", treatmentIds)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    sessionId = lastSession?.id;
  }

  // ⚡️ 3️⃣ If no session, create one for the first treatment
  if (!sessionId) {
    if (treatmentIds.length > 0) {
      const { data: newSession } = await supabase
        .from("sessions")
        .insert([{ treatment_id: treatmentIds[0] }])
        .select()
        .single();

      sessionId = newSession?.id;
    } else {
      // If no treatments at all redirect to treatments page
      return {
        redirect: { destination: "/treatments/", permanent: false },
      };
    }
  }

  // ⚡️ Final Redirection
  return {
    redirect: {
      destination: `/chat/${sessionId}`,
      permanent: false,
    },
  };
};
