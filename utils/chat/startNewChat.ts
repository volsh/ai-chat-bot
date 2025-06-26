import { supabaseBrowserClient } from "@/libs/supabase";
import saveMessageToDB from "./saveMessageToDB";
import { Message } from "@/types";
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

    await saveMessageToDB(newSessionId, {
      role: "system",
      content: "🆕 New session started. Ask me anything to begin.",
      created_at: new Date().toISOString(),
    } as Message);

    window.location.href = `/chat/${newSessionId}`;
  } else {
    toast.error("Failed to start new chat");
  }
}
