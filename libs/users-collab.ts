import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { Session } from "@supabase/supabase-js";

export const inviteUserToSession = async (email: string, sessionId: string, session: Session) => {
  const { data: user } = await supabase.from("users").select("id").eq("email", email).single();

  if (!user) return alert("User not found");

  const { data } = await supabase
    .from("sessions")
    .select("shared_with, title")
    .eq("id", sessionId)
    .single();

  await supabase.functions.invoke("send-invite", {
    body: {
      to_email: email,
      from_name: session?.user.email || "Someone",
      session_title: data?.title,
      link: `https://yourapp.com/view/${sessionId}`,
    },
  });
};
