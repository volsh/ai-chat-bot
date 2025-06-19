"use client";

import { useEffect, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { useRouter } from "next/router";
import FolderCreatorModal from "../folders/FolderCreatorModal";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import DragHandle from "../DragHandle";
import SessionEditorModal from "./SessionEditorModal";
import { Tooltip } from "react-tooltip";
import { flattenTree, reorderTree } from "@/utils/folderUtils";
import { Folder, FolderNode, Session } from "@/types";
import FolderActionsModal from "../folders/FolderActionsModal";
import { useAppStore } from "@/state";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

export default function SessionSidebar({
  initialSession,
  onUpdateSession,
}: {
  initialSession?: Session;
  onUpdateSession?: () => void;
}) {
  const { session: authSession } = useAppStore(
    useShallow((s) => ({
      session: s.session,
    }))
  );
  const router = useRouter();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [actionModal, setActionModal] = useState<{ id: string; title: string } | null>(null);
  const [folderActionModal, setFolderActionModal] = useState<{ id: string; name: string } | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");

  const currentSessionId = initialSession?.id;

  const filteredSessions = !!searchQuery.trim()
    ? sessions.filter(
        (s) =>
          s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.summary?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sessions;

  useEffect(() => {
    if (!authSession) return;

    const fetchData = async () => {
      const { data: folderData } = await supabase.from("folders").select("*");

      const { data: sessionData } = await supabase.from("sessions").select("*");

      setFolders(folderData || []);
      setSessions(sessionData || []);
    };
    fetchData();
  }, [authSession, initialSession]);

  useEffect(() => {
    if (folders.length === 0) return;
    const stored = localStorage.getItem("collapsedFolders");
    const next: Record<string, boolean> = {};
    folders.forEach((f) => {
      next[f.id] = stored ? (JSON.parse(stored)[f.id] ?? true) : true;
    });
    setCollapsed(next);
  }, [folders]);

  useEffect(() => {
    localStorage.setItem("collapsedFolders", JSON.stringify(collapsed));
  }, [collapsed]);

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

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId, type } = result;
    if (!destination) return;

    if (type === "SESSION") {
      const sessionId = draggableId;
      const newFolderId = destination.droppableId === "unassigned" ? null : destination.droppableId;

      await supabase
        .from("sessions")
        .update({ folder_id: newFolderId, order_index: destination.index })
        .eq("id", sessionId);

      const { data: updated } = await supabase.from("sessions").select("*");
      setSessions(updated || []);
    }

    if (type === "FOLDER") {
      const newParentId = destination.droppableId !== draggableId ? destination.droppableId : null;
      const newTree = reorderTree(buildTree(folders), draggableId, newParentId);
      setFolders(flattenTree(newTree));
      await supabase.from("folders").update({ parent_id: newParentId }).eq("id", draggableId);
    }
  };

  const tree = buildTree(folders);

  const renderTree = (node: FolderNode, depth = 0) => (
    <Draggable draggableId={node.id} index={depth} key={node.id}>
      {(provided) => (
        <div ref={provided.innerRef} {...provided.draggableProps}>
          <div
            onClick={() => setCollapsed((prev) => ({ ...prev, [node.id]: !prev[node.id] }))}
            className="group mb-2 flex cursor-pointer items-center gap-2 rounded px-1 text-sm font-semibold text-zinc-800 transition-all hover:bg-zinc-100 dark:text-white dark:hover:bg-zinc-800"
          >
            <span {...provided.dragHandleProps}>{node.emoji || "📁"}</span>
            <span
              className={clsx(
                "text-xs transition-transform",
                collapsed[node.id] ? "rotate-0" : "rotate-90"
              )}
            >
              <ChevronRight />
            </span>

            <span className="truncate" title={node.name}>
              {node.name}
            </span>
            <button
              onClick={() => setFolderActionModal({ id: node.id, name: node.name })}
              className="ml-auto text-xs text-zinc-400 hover:text-zinc-600"
              data-tooltip-id="tooltip-folder"
              data-tooltip-content="Folder actions"
              aria-label="Folder Actions"
            >
              ⋯
            </button>
          </div>

          <Droppable droppableId={node.id} type="SESSION">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{
                  overflow: "hidden",
                  opacity: collapsed[node.id] ? 0 : 1,
                  display: "block",
                  minHeight: 5,
                }}
              >
                {!collapsed[node.id] &&
                  filteredSessions
                    .filter((s) => s.folder_id === node.id)
                    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                    .map((s, i) => (
                      <Draggable draggableId={s.id} index={i} key={s.id}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`group flex items-center justify-between gap-2 rounded px-2 py-1 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                              s.id === currentSessionId
                                ? "bg-blue-200 text-white dark:bg-blue-700"
                                : "text-zinc-800 dark:text-white"
                            }`}
                          >
                            <div
                              onClick={() => router.push(`/chat/${s.id}`)}
                              className="flex items-center gap-2 truncate"
                            >
                              {s.emoji && <span>{s.emoji}</span>}
                              {s.color && (
                                <span
                                  className="inline-block h-2 w-2 rounded-full"
                                  style={{ backgroundColor: s.color }}
                                />
                              )}
                              <span className="opacity-0 group-hover:opacity-100">
                                <DragHandle props={provided.dragHandleProps} />
                              </span>
                              <span
                                className="truncate"
                                title={s.summary || s.title || "Untitled"}
                                data-tooltip-id={`session-summary-${s.id}`}
                              >
                                {s.title || "Untitled"}
                              </span>
                              <Tooltip
                                id={`session-summary-${s.id}`}
                                content={s.summary}
                                place="right"
                              />
                            </div>
                            <button
                              data-tooltip-id="tooltip-session"
                              data-tooltip-content="Session actions"
                              className="text-xs text-zinc-400 hover:text-zinc-600"
                              onClick={() => setActionModal({ id: s.id, title: s.title })}
                              aria-label="Session Actions"
                            >
                              ⋯
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                {provided.placeholder}
                {node.children.map((child, i) => renderTree(child, i))}
              </div>
            )}
          </Droppable>
        </div>
      )}
    </Draggable>
  );

  const handleDelete = (deletedSessionId: string) => {
    if (deletedSessionId === currentSessionId) {
      const fallback = sessions.filter((s) => s.id !== deletedSessionId)[0]?.id;
      router.push(fallback ? `/chat/${fallback}` : `/chat`);
    }
  };

  return (
    <div className="h-full w-64 overflow-y-auto border-r bg-zinc-50 p-4 dark:bg-zinc-900 sm:w-full">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-zinc-700 dark:text-white">📁 Sessions</h2>
        <input
          type="text"
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-3 w-full rounded border px-2 py-1 text-sm dark:bg-zinc-800 dark:text-white"
        />

        <button
          onClick={() => setShowFolderModal(true)}
          className="text-xs text-blue-600 underline"
          aria-label="New Folder"
        >
          + New Folder
        </button>
      </div>

      <DragDropContext
        onDragEnd={handleDragEnd}
        onDragUpdate={(props) => {
          console.log(props);
          const { destination } = props;
          if (destination) {
            setCollapsed((prev) => ({ ...prev, [destination.droppableId]: false }));
          }
        }}
      >
        <Droppable droppableId="root" type="FOLDER">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="pb-5">
              {tree.map(renderTree)}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        <Droppable droppableId="unassigned" type="SESSION">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="min-h-[10px] space-y-1 border-t pt-3"
            >
              <h3 className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-300">
                📄 No Folder
              </h3>
              {filteredSessions
                .filter((s) => !s.folder_id)
                .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                .map((s, i) => (
                  <Draggable draggableId={s.id} index={i} key={s.id}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={clsx(
                          "group flex items-center justify-between gap-2 rounded px-2 py-1 text-sm transition-colors",
                          s.id === currentSessionId
                            ? "border-l-4 border-blue-500 bg-blue-100 font-semibold text-blue-900 dark:bg-blue-900 dark:text-white"
                            : "text-zinc-800 hover:bg-zinc-100 dark:text-white dark:hover:bg-zinc-800"
                        )}
                      >
                        <div
                          onClick={() => router.push(`/chat/${s.id}`)}
                          className="flex items-center gap-2 truncate"
                        >
                          {s.emoji && <span>{s.emoji}</span>}
                          {s.color && (
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: s.color }}
                            />
                          )}
                          <span className="opacity-0 group-hover:opacity-100">
                            <DragHandle props={provided.dragHandleProps} />
                          </span>
                          <span
                            className="truncate"
                            title={s.summary || s.title || "Untitled"}
                            data-tooltip-id={`session-summary-${s.id}`}
                          >
                            {s.title || "Untitled"}
                          </span>
                          <Tooltip
                            id={`session-summary-${s.id}`}
                            content={s.summary}
                            place="right"
                          />
                          {s.archived && (
                            <span className="ml-2 rounded bg-yellow-300 px-2 py-0.5 text-xs font-medium text-black dark:bg-yellow-500">
                              Archived
                            </span>
                          )}
                        </div>
                        <button
                          data-tooltip-id="tooltip-session"
                          data-tooltip-content="Session actions"
                          className="text-xs text-zinc-400 hover:text-zinc-600"
                          onClick={() => setActionModal({ id: s.id, title: s.title })}
                          aria-label="Action Modal"
                        >
                          ⋯
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {showFolderModal && (
        <FolderCreatorModal
          onRefresh={async () => {
            const { data } = await supabase.from("folders").select("*");
            setFolders(data || []);
          }}
          onClose={() => setShowFolderModal(false)}
        />
      )}
      {actionModal && (
        <SessionEditorModal
          mode="sidebar"
          sessionId={actionModal.id}
          initialTitle={actionModal.title}
          onClose={() => setActionModal(null)}
          onRefresh={async () => {
            const { data } = await supabase.from("sessions").select("*");
            setSessions(data || []);
            onUpdateSession?.();
          }}
          onDelete={handleDelete}
        />
      )}
      {folderActionModal && (
        <FolderActionsModal
          folderId={folderActionModal.id}
          initialName={folderActionModal.name}
          onClose={() => setFolderActionModal(null)}
          onRefresh={async () => {
            const { data } = await supabase.from("folders").select("*");
            setFolders(data || []);
          }}
        />
      )}
      <Tooltip id="tooltip-session" />
      <Tooltip id="tooltip-folder" />
    </div>
  );
}
