"use client";

import { useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

interface FolderActionsModalProps {
  folderId: string;
  initialName: string;
  onClose: () => void;
  onRefresh: () => void;
}

export default function FolderActionsModal({
  folderId,
  initialName,
  onClose,
  onRefresh,
}: FolderActionsModalProps) {
  const [name, setName] = useState(initialName);
  const [isDeleting, setIsDeleting] = useState(false);

  const renameFolder = async () => {
    if (!name.trim()) {
      toast.error("Folder name is required.");
      return;
    }

    const { error } = await supabase.from("folders").update({ name: name.trim() }).eq("id", folderId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Folder renamed.");
      onRefresh();
      onClose();
    }
  };

  const deleteFolder = async () => {
    const confirmMsg = "Delete this folder and all sessions inside it?";
    if (!confirm(confirmMsg)) return;

    setIsDeleting(true);
    const { error } = await supabase.from("folders").delete().eq("id", folderId);
    if (error) {
      toast.error("Failed to delete folder.");
    } else {
      toast.success("Folder deleted.");
      onRefresh();
      onClose();
    }
    setIsDeleting(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl dark:bg-zinc-900 dark:text-white"
        >
          <h2 className="mb-4 text-lg font-semibold">🗂 Folder Settings</h2>

          <label className="block text-sm font-medium">Rename</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border p-2 text-sm dark:bg-zinc-800 dark:text-white"
          />

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={renameFolder}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={onClose}
              className="rounded bg-gray-300 px-4 py-2 text-sm text-black dark:bg-zinc-700 dark:text-white"
            >
              Cancel
            </button>
          </div>

          <hr className="my-4 border-zinc-300 dark:border-zinc-700" />

          <button
            onClick={deleteFolder}
            disabled={isDeleting}
            className="w-full rounded bg-red-600 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete Folder"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
