import { supabaseBrowserClient } from "@/libs/supabase";
import toast from "react-hot-toast";

export default async function startNewChat(treatmentId: string) {
  const { data, error } = await supabaseBrowserClient
    .from("sessions")
    .insert([{ treatment_id: treatmentId }])
    .select()
    .single();
  if (error) {
    toast.error("Failed to start new chat");
  }
  if (data?.id) {
    const newSessionId = data.id;

    window.location.href = `/chat/${newSessionId}`;
  } else {
    toast.error("Failed to start new chat");
  }
}
