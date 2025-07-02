"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import EmojiPicker from "emoji-picker-react";
import { toast } from "react-hot-toast";
import { useAppStore } from "@/state";
import { useShallow } from "zustand/react/shallow";
import Modal from "../ui/modal";
import Spinner from "../ui/spinner";
import { Session } from "@/types";

interface Props {
  sessionId: string;
  initialTitle?: string;
  mode?: "sidebar" | "chat";
  onClose: () => void;
  onRefresh?: () => void;
  onDelete?: (session: Session) => void;
}

export default function SessionEditorModal({
  sessionId,
  initialTitle = "",
  mode = "chat",
  onClose,
  onRefresh,
  onDelete,
}: Props) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState<Session>();
  const [title, setTitle] = useState(initialTitle);
  const [emoji, setEmoji] = useState("\ud83e\udde0");
  const [color, setColor] = useState("#3b82f6");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [summary, setSummary] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { userProfile } = useAppStore(
    useShallow((s) => ({
      userProfile: s.userProfile,
    }))
  );

  const isTherapist = userProfile?.role === "therapist";

  // Fetching data for session and folders
  useEffect(() => {
    if (!sessionId || !userProfile) return;
    const fetchData = async () => {
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (!sessionData || sessionError) {
        toast.error("Failed to load session");
        return;
      }

      setSession(sessionData);
      setTitle(sessionData.title || "");
      setEmoji(sessionData.emoji || "\ud83e\udde0");
      setColor(sessionData.color || "#3b82f6");
      setSummary(sessionData.summary || "");
    };
    fetchData();
  }, [sessionId, userProfile]);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Save session logic
  const handleSave = async () => {
    if (!title.trim()) return toast.error("Session title cannot be empty.");
    const { error } = await supabase
      .from("sessions")
      .update({
        title: title.trim(),
        emoji,
        color,
        summary,
      })
      .eq("id", sessionId);
    if (error) {
      toast.error("Failed to save session");
      console.log("Failed to save session", error);
      return;
    }
    if (title.trim() !== initialTitle?.trim()) {
      await supabase.from("session_events").insert({
        session_id: sessionId,
        user_id: userProfile?.id,
        event_type: "rename",
        description: `Renamed session to '${title.trim()}'`,
      });
    }
    toast.success("Session updated.");
    onRefresh?.();
    onClose();
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleteModalOpen(false);
    setIsDeleting(true);
    await supabase.from("sessions").delete().eq("id", sessionId);
    toast.success("Session deleted.");
    onRefresh?.();
    onClose();
    onDelete?.(session!);
    setIsDeleting(false);
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="relative h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-lg bg-white p-5 text-zinc-700 shadow-xl transition-all dark:bg-zinc-900 dark:text-white">
        <h2 className="text-lg font-semibold">🛠 Edit Session</h2>

        <div>
          <label className="text-sm">Rename</label>
          <input
            ref={nameRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border p-2 text-black dark:bg-zinc-800 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col">
            <label className="text-sm">Emoji</label>
            <button
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="text-2xl"
              title="Pick emoji"
            >
              {emoji}
            </button>
            {showEmojiPicker && (
              <div className="absolute z-50 mt-2">
                <EmojiPicker
                  height={300}
                  width={250}
                  onEmojiClick={(e) => {
                    setEmoji(e.emoji);
                    setShowEmojiPicker(false);
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <label className="text-sm">Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-16 rounded border dark:bg-zinc-800"
            />
          </div>
        </div>

        <div>
          <label className="text-sm">Edit Summary</label>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full rounded border p-2 text-sm dark:bg-zinc-800 dark:text-white"
          />
        </div>
        {isDeleteModalOpen && (
          <Modal onClose={() => setIsDeleteModalOpen(false)}>
            <>
              <h3 className="text-xl font-semibold text-red-600">Are you sure?</h3>
              <p className="text-sm text-zinc-500">
                This action will permanently delete the session.
              </p>

              <div className="mt-4 flex justify-between gap-4">
                <button
                  onClick={cancelDelete}
                  className="w-1/2 rounded bg-gray-600 py-2 text-white hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="w-1/2 rounded bg-red-600 py-2 text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </>
          </Modal>
        )}
        <div className="flex justify-between gap-2">
          <button
            onClick={handleSave}
            className="w-full rounded bg-green-600 py-2 text-white hover:bg-green-700"
          >
            Save
          </button>
          {mode === "sidebar" && !isTherapist && (
            <>
              <button
                onClick={handleDelete}
                className="w-full rounded bg-red-600 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                disabled={isDeleting}
              >
                Delete
              </button>
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="absolute bottom-1 left-1/2 -translate-x-1/2 text-center text-sm text-zinc-500 underline dark:text-zinc-400"
        >
          Close
        </button>
      </div>
    </div>
  );
}
