"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { Folder } from "@/types";
import { useAppStore } from "@/state";
import { useShallow } from "zustand/react/shallow";

interface FolderCreatorModalProps {
  onClose: () => void;
  onRefresh: () => void;
}

export default function FolderCreatorModal({ onRefresh, onClose }: FolderCreatorModalProps) {
  const { session } = useAppStore(
    useShallow((s) => ({
      session: s.session,
    }))
  );
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📁");
  const [color, setColor] = useState("#888888");
  const [parentId, setParentId] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("folders")
      .select()
      .then(({ data }) => {
        if (data) setFolders(data);
      });
  }, [session]);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const createFolder = async () => {
    if (!name.trim()) {
      toast.error("Folder name is required.");
      return;
    }

    if (folders.some((f) => f.name.trim().toLowerCase() === name.trim().toLowerCase())) {
      toast.error("Folder with this name already exists.");
      return;
    }

    const { data: newFolder, error } = await supabase
      .from("folders")
      .insert([
        {
          name: name.trim(),
          emoji,
          color,
          parent_id: parentId,
          user_id: session?.user.id,
        },
      ])
      .select()
      .single();
    if (error) {
      toast.error(error.message);
    } else {
      setFolders((prev) => [...prev, newFolder]); // ✅ Add new folder to state
      toast.success("Folder created");
      onRefresh();
      onClose(); // Close modal
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 10, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md rounded bg-white p-6 shadow-xl dark:bg-zinc-800"
        >
          <h2 className="mb-4 text-lg font-semibold dark:text-white">📁 New Folder</h2>

          <label className="block text-sm font-medium dark:text-white">Name</label>
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mb-3 w-full rounded border p-2 text-sm dark:bg-zinc-700 dark:text-white"
          />

          <div className="mb-3 flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium dark:text-white">Emoji</label>
              <button onClick={() => setShowEmojiPicker((prev) => !prev)} className="mt-1 text-2xl">
                {emoji}
              </button>
              {showEmojiPicker && (
                <div className="absolute z-50 mt-2">
                  <Picker
                    data={data}
                    title="Pick emoji"
                    emoji="point_up"
                    onEmojiSelect={(e: any) => {
                      setEmoji(e.native);
                      setShowEmojiPicker(false);
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium dark:text-white">Color</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="mt-1 h-10 w-16 rounded border px-0 py-0 dark:bg-zinc-700"
              />
            </div>
          </div>

          <label className="block text-sm font-medium dark:text-white">
            Parent Folder (optional)
          </label>
          <select
            value={parentId || ""}
            onChange={(e) => setParentId(e.target.value || null)}
            className="mb-4 w-full rounded border p-2 text-sm dark:bg-zinc-700 dark:text-white"
          >
            <option value="">None</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded bg-gray-300 px-4 py-2 text-sm dark:bg-zinc-600 dark:text-white"
            >
              Cancel
            </button>
            <button
              onClick={createFolder}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Create
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
