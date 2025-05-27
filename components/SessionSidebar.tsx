"use client";

import { useEffect, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/router";
import FolderCreatorModal from "./FolderCreatorModal";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import DragHandle from "./DragHandle";
import SessionEditorModal from "./SessionEditorModal";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "react-tooltip";

interface Folder {
  id: string;
  name: string;
  emoji: string;
  color: string;
  parent_id: string | null;
  user_id: string;
  shared_with?: string[];
}

interface Session {
  id: string;
  title: string;
  folder_id: string | null;
  user_id: string;
  emoji?: string;
  color?: string;
  shared_with?: string[];
  goal?: string;
  order_index?: number;
}

interface FolderNode extends Folder {
  children: FolderNode[];
}

export default function SessionSidebar({ currentSessionId }: { currentSessionId?: string }) {
  const session = useSession();
  const router = useRouter();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [actionModal, setActionModal] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (!session) return;

    const fetchData = async () => {
      const { data: folderData } = await supabase
        .from("folders")
        .select("*")
        .or(`user_id.eq.${session.user.id},shared_with.cs.{${session.user.id}}`);

      const { data: sessionData } = await supabase
        .from("sessions")
        .select("*")
        .or(`user_id.eq.${session.user.id},shared_with.cs.{${session.user.id}}`);

      setFolders(folderData || []);
      setSessions(sessionData || []);
    };

    fetchData();
  }, [session]);

  const buildTree = (items: Folder[]): FolderNode[] => {
    const map: Record<string, FolderNode> = {};
    const roots: FolderNode[] = [];

    items.forEach((item) => {
      map[item.id] = { ...item, children: [] };
    });

    items.forEach((item) => {
      if (item.parent_id && map[item.parent_id]) {
        map[item.parent_id].children.push(map[item.id]);
      } else {
        roots.push(map[item.id]);
      }
    });

    return roots;
  };

  const renderTree = (node: FolderNode) => (
    <div key={node.id} className="mb-2">
      <div
        onClick={() => setCollapsed((prev) => ({ ...prev, [node.id]: !prev[node.id] }))}
        className="flex cursor-pointer items-center gap-2 text-sm font-semibold"
      >
        <span>{collapsed[node.id] ? "▶️" : "▼"}</span>
        <span>{node.emoji || "📁"}</span>
        <span>{node.name}</span>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed[node.id] && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Droppable droppableId={node.id}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-1 pl-4"
                >
                  {sessions
                    .filter((s) => s.folder_id === node.id)
                    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                    .map((s, i) => (
                      <Draggable draggableId={s.id} index={i} key={s.id}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1 text-sm ${
                              s.id === currentSessionId
                                ? "bg-blue-200 text-white dark:bg-blue-700"
                                : "text-zinc-800 hover:bg-zinc-200 dark:text-white dark:hover:bg-zinc-800"
                            }`}
                          >
                            <div
                              onClick={() => router.push(`/chat/${s.id}`)}
                              className="flex items-center gap-2"
                            >
                              {s.emoji && <span>{s.emoji}</span>}
                              {s.color && (
                                <span
                                  className="inline-block h-2 w-2 rounded-full"
                                  style={{ backgroundColor: s.color }}
                                />
                              )}
                              <DragHandle props={provided.dragHandleProps} />
                              <span>{s.title}</span>
                            </div>
                            <button
                              data-tooltip-id="tooltip-session"
                              data-tooltip-content="Session actions"
                              className="text-xs text-zinc-400 hover:text-zinc-600"
                              onClick={() => setActionModal({ id: s.id, title: s.title })}
                            >
                              ⋯
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                  {node.children.map(renderTree)}
                </div>
              )}
            </Droppable>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const hasNesting = folders.some((f) => f.parent_id !== null);
  const tree = hasNesting ? buildTree(folders) : folders.map((f) => ({ ...f, children: [] }));

  return (
    <div className="h-full w-64 overflow-y-auto border-r bg-zinc-50 p-4 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-zinc-700 dark:text-white">📁 Sessions</h2>
        <button
          onClick={() => setShowFolderModal(true)}
          className="text-xs text-blue-600 underline"
        >
          + New Folder
        </button>
      </div>
      <DragDropContext
        onDragEnd={async (result: DropResult) => {
          const { source, destination } = result;
          if (!destination || source.droppableId !== destination.droppableId) return;

          const group = sessions.filter((s) => s.folder_id === source.droppableId);
          const reordered = [...group];
          const [moved] = reordered.splice(source.index, 1);
          reordered.splice(destination.index, 0, moved);

          setSessions((prev) => {
            const withoutGroup = prev.filter((s) => s.folder_id !== source.droppableId);
            return [...withoutGroup, ...reordered];
          });

          for (let i = 0; i < reordered.length; i++) {
            await supabase.from("sessions").update({ order_index: i }).eq("id", reordered[i].id);
          }
        }}
      >
        {tree.map(renderTree)}
      </DragDropContext>

      {showFolderModal && <FolderCreatorModal onClose={() => setShowFolderModal(false)} />}
      {actionModal && (
        <SessionEditorModal
          mode="sidebar"
          sessionId={actionModal.id}
          initialTitle={actionModal.title}
          onClose={() => setActionModal(null)}
          refresh={() => {
            supabase
              .from("sessions")
              .select("*")
              .or(`user_id.eq.${session?.user.id},shared_with.cs.{${session?.user.id}}`)
              .then(({ data }) => setSessions(data || []));
          }}
        />
      )}
      <Tooltip id="tooltip-session" />
    </div>
  );
}
