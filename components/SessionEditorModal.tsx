"use client";

import { useEffect, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { useSession } from "@/context/SessionContext";
import EmojiPicker from "emoji-picker-react";
import { inviteUserToSession } from "@/libs/users-collab";

interface Props {
  sessionId: string;
  initialTitle?: string;
  mode?: "sidebar" | "chat";
  onClose: () => void;
  refresh?: () => void;
}

export default function SessionEditorModal({
  sessionId,
  initialTitle = "",
  mode = "chat",
  onClose,
  refresh,
}: Props) {
  const session = useSession();
  const [title, setTitle] = useState(initialTitle);
  const [emoji, setEmoji] = useState("🧠");
  const [color, setColor] = useState("#3b82f6");
  const [goal, setGoal] = useState("Therapy");
  const [inviteEmail, setInviteEmail] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single()
      .then(({ data }) => {
        if (data) {
          setTitle(data.title || "");
          setEmoji(data.emoji || "🧠");
          setColor(data.color || "#3b82f6");
          setGoal(data.goal || "Therapy");
        }
      });
  }, [sessionId]);

  const handleSave = async () => {
    await supabase.from("sessions").update({ title, emoji, color, goal }).eq("id", sessionId);

    if (title !== initialTitle) {
      await supabase.from("session_events").insert({
        session_id: sessionId,
        user_id: session?.user.id,
        event_type: "rename",
        description: `Renamed session to '${title}'`,
      });
    }

    refresh?.();
    onClose();
  };

  const handleInvite = async () => {
    inviteUserToSession(inviteEmail, sessionId, session!);
    await supabase.from("session_events").insert({
      session_id: sessionId,
      user_id: session?.user.id,
      event_type: "invite",
      description: `Invited ${inviteEmail}`,
    });

    alert("User invited");
    setInviteEmail("");
  };

  const handleArchive = async () => {
    await supabase.from("sessions").update({ archived: true }).eq("id", sessionId);
    await supabase.from("session_events").insert({
      session_id: sessionId,
      user_id: session?.user.id,
      event_type: "archive",
      description: `Archived session '${sessionId}'`,
    });
    refresh?.();
    onClose();
  };

  const handleDelete = async () => {
    await supabase.from("sessions").delete().eq("id", sessionId);
    await supabase.from("messages").delete().eq("session_id", sessionId);
    await supabase.from("session_events").insert({
      session_id: sessionId,
      user_id: session?.user.id,
      event_type: "delete",
      description: `Deleted session '${sessionId}'`,
    });
    refresh?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-5 shadow dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Edit Session</h2>

        <div>
          <label className="text-sm">Rename</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border p-2"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div>
            <label className="text-sm">Emoji</label>
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-xl">
              {emoji}
            </button>
            {showEmojiPicker && (
              <EmojiPicker height={300} width={250} onEmojiClick={(e) => setEmoji(e.emoji)} />
            )}
          </div>

          <div>
            <label className="text-sm">Color</label>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>

          <div>
            <label className="text-sm">Goal</label>
            <select value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option value="Therapy">Therapy</option>
              <option value="Career">Career</option>
              <option value="Relationships">Relationships</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm">Invite User</label>
          <input
            type="email"
            placeholder="Email address"
            className="w-full rounded border p-2"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <button
            onClick={handleInvite}
            className="mt-2 w-full rounded bg-blue-500 py-2 text-white"
          >
            Invite
          </button>
        </div>

        <div className="flex justify-between gap-2">
          <button onClick={handleSave} className="w-full rounded bg-green-600 py-2 text-white">
            Save Changes
          </button>
          {mode === "sidebar" && (
            <>
              <button
                onClick={handleArchive}
                className="w-full rounded bg-yellow-600 py-2 text-white"
              >
                Archive
              </button>
              <button onClick={handleDelete} className="w-full rounded bg-red-600 py-2 text-white">
                Delete
              </button>
            </>
          )}
        </div>

        <button onClick={onClose} className="w-full text-center text-sm text-zinc-500 underline">
          Close
        </button>
      </div>
    </div>
  );
}
