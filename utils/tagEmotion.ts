export async function tagEmotion(
  content: string,
  session_id: string,
  message_id: string
) {
  try {
    const res = await fetch("/api/tag-emotion", {
      method: "POST",
      body: JSON.stringify({ content, session_id, message_id }),
      headers: { "Content-Type": "application/json" },
    });
    return await res.json();
  } catch (err) {
    console.error("Tagging error:", err);
    return null;
  }
}
