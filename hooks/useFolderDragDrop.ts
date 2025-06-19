// hooks/useFolderDragDrop.ts
import { useState } from "react";
import { Folder } from "@/types";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";

export function useFolderDragDrop(folders: Folder[], setFolders: (folders: Folder[]) => void) {
  const [isDragging, setIsDragging] = useState(false);

  const onDragEnd = async (result: any) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.index === destination.index) return;

    // Find dragged folder
    const dragged = folders.find((f) => f.id === draggableId);
    if (!dragged) return;

    // Prevent moving a folder into itself
    if (dragged.id === destination.droppableId) return;

    // Update parent_id
    const updatedFolders = folders.map((f) =>
      f.id === dragged.id
        ? { ...f, parent_id: destination.droppableId === "root" ? null : destination.droppableId }
        : f
    );

    setFolders(updatedFolders);

    // Persist
    await supabase
      .from("folders")
      .update({ parent_id: destination.droppableId === "root" ? null : destination.droppableId })
      .eq("id", dragged.id);
  };

  return { onDragEnd, isDragging, setIsDragging };
}
