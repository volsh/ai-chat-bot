"use client";

import { useEffect, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { useRouter } from "next/router";
import FolderCreatorModal from "../folders/FolderCreatorModal";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DragStart,
  BeforeCapture,
} from "@hello-pangea/dnd";
import DragHandle from "../DragHandle";
import SessionEditorModal from "./SessionEditorModal";
import { Tooltip } from "react-tooltip";
import { flattenTree, reorderTree } from "@/utils/folderUtils";
import { Folder, FolderNode, Session, Treatment } from "@/types";
import FolderActionsModal from "../folders/FolderActionsModal";
import { useAppStore } from "@/state";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import TreatmentSessions from "./TreatmentSessions";
import TreatmentEditorModal from "../treatment/TreatmentEditorModal";

export default function SessionSidebar({
  initialSession,
  onUpdateSession,
}: {
  initialSession?: Session;
  onUpdateSession?: () => void;
}) {
  const { session: authSession } = useAppStore(useShallow((s) => ({ session: s.session })));
  const router = useRouter();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [sessionActionModal, setSessionActionModal] = useState<Session | null>(null);
  const [treatmentActionModal, setTreatmentActionModal] = useState<Treatment | null>(null);

  const [folderActionModal, setFolderActionModal] = useState<{ id: string; name: string } | null>(
    null
  );
  const [draggingTreatmentId, setDraggingTreatmentId] = useState<string>();

  const [searchQuery, setSearchQuery] = useState("");
  const currentSessionId = initialSession?.id;

  const filteredTreatments = treatments.filter((t) =>
    t.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredSessions = sessions.filter(
    (s) =>
      s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (!authSession) return;

    const fetchData = async () => {
      const [{ data: folderData }, { data: treatmentData }, { data: sessionData }] =
        await Promise.all([
          supabase.from("folders").select("*"),
          supabase.from("treatments").select("*"),
          supabase.from("sessions").select("*"),
        ]);

      setFolders(folderData || []);
      setTreatments(treatmentData || []);
      setSessions(sessionData || []);
    };
    fetchData();
  }, [authSession, initialSession]);

  useEffect(() => {
    if (!folders.length) return;

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
  const tree = buildTree(folders);

  const handleDragStart = (start: BeforeCapture) => {
    setDraggingTreatmentId(start.draggableId);
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId, type } = result;
    setDraggingTreatmentId("");

    if (!destination) return;

    if (type === "FOLDER") {
      const newParentId = destination.droppableId !== draggableId ? destination.droppableId : null;

      const newTree = reorderTree(buildTree(folders), draggableId, newParentId);
      setFolders(flattenTree(newTree));

      await supabase.from("folders").update({ parent_id: newParentId }).eq("id", draggableId);
      return;
    }

    if (type === "TREATMENT") {
      const newFolderId = destination.droppableId === "unassigned" ? null : destination.droppableId;

      const { error } = await supabase
        .from("treatments")
        .update({ folder_id: newFolderId, order_index: destination.index })
        .eq("id", draggableId);

      if (error) {
        console.error(error);
        alert("Error updating treatment order.");
        return;
      }

      const { data: updatedTreatments } = await supabase.from("treatments").select("*");
      setTreatments(updatedTreatments || []);

      return;
    }
  };

  const handleDelete = (deletedSessionId: string) => {
    if (deletedSessionId === currentSessionId) {
      const fallback = sessions.filter((s) => s.id !== deletedSessionId)[0]?.id;
      router.push(fallback ? `/chat/${fallback}` : `/chat`);
    }
  };

  const renderFolder = (node: FolderNode, depth = 0) => (
    <div key={node.id}>
      {/* =========================
             FOLDER HEADER
         ========================= */}
      <Draggable draggableId={node.id.toString()} index={depth}>
        {(folderProvided) => (
          <div ref={folderProvided.innerRef} {...folderProvided.draggableProps}>
            <div
              onClick={() => setCollapsed((prev) => ({ ...prev, [node.id]: !prev[node.id] }))}
              className="group flex cursor-pointer items-center gap-2 rounded px-1 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 dark:text-white dark:hover:bg-zinc-800"
            >
              <span {...folderProvided.dragHandleProps}>{node.emoji || "📁"}</span>
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
                onClick={(e) => {
                  e.stopPropagation();
                  setFolderActionModal({ id: node.id, name: node.name });
                }}
                className="ml-auto text-xs text-zinc-400 hover:text-zinc-600"
                data-tooltip-id="tooltip-folder"
                data-tooltip-content="Folder Actions"
              >
                ⋯
              </button>
            </div>
          </div>
        )}
      </Draggable>

      {/* =========================
             DROPPABLE AREA
         ========================= */}
      <Droppable droppableId={node.id.toString()} type="TREATMENT">
        {(treatProvided, treatSnapshot) => {
          const treatmentsInFolder = filteredTreatments.filter((t) => t.folder_id === node.id);

          return (
            <div
              ref={treatProvided.innerRef}
              {...treatProvided.droppableProps}
              style={{
                paddingLeft: "1rem",
                minHeight: "1rem",
                // height: collapsed[node.id] ? "4px" : "auto",
                opacity: collapsed[node.id] ? 0 : 1,
              }}
              className="transition-opacity"
            >
              {/* {!collapsed[node.id] && treatmentsInFolder.length === 0 && (
                <div
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    fontSize: "0.75rem",
                    color: "#888",
                    backgroundColor: treatSnapshot.isDraggingOver ? "#f0f9ff" : "transparent",
                    borderRadius: "4px",
                    border: treatSnapshot.isDraggingOver ? "1px dashed #60a5fa" : "1px dashed #ccc",
                  }}
                >
                  Drop treatments here
                </div>
              )} */}

              {!collapsed[node.id] &&
                treatmentsInFolder
                  .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                  .map((t, i) => {
                    return (
                      <Draggable draggableId={t.id.toString()} index={i} key={t.id}>
                        {(treatProvided) => (
                          <div
                            ref={treatProvided.innerRef}
                            {...treatProvided.draggableProps}
                            className={clsx(
                              "group flex flex-col rounded p-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800",
                              {
                                "bg-blue-100 font-semibold text-blue-900 dark:bg-blue-900 dark:text-white":
                                  draggingTreatmentId === t.id,
                              }
                            )}
                          >
                            <TreatmentSessions
                              sessions={filteredSessions}
                              treatment={t}
                              currentSessionId={currentSessionId}
                              draggingTreatmentId={draggingTreatmentId}
                              treatProvided={treatProvided}
                              onTreatmentActionsClick={setTreatmentActionModal}
                              onSessionActionsClick={setSessionActionModal}
                            />
                          </div>
                        )}
                      </Draggable>
                    );
                  })}

              {treatProvided.placeholder}
            </div>
          );
        }}
      </Droppable>
    </div>
  );

  return (
    <div className="h-full w-64 overflow-y-auto border-r bg-zinc-50 p-4 dark:bg-zinc-900 sm:w-full">
      <div className="mb-3 flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">📁 Treatments & Sessions</h2>
          <button
            onClick={() => setShowFolderModal(true)}
            className="text-xs text-blue-600 underline"
            aria-label="New Folder"
          >
            + New Folder
          </button>
        </div>
        <input
          type="text"
          placeholder="Search treatments or sessions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded border px-2 py-1 text-sm dark:bg-zinc-800 dark:text-white"
        />
      </div>

      <DragDropContext
        onDragEnd={handleDragEnd}
        onDragUpdate={(update) => {
          const overId = update.destination?.droppableId;
          if (overId && collapsed[overId]) {
            // Expand if hovering over a collapsed folder
            setCollapsed((prev) => ({ ...prev, [overId]: false }));
          }
        }}
        onBeforeCapture={handleDragStart}
      >
        <Droppable droppableId="root" type="FOLDER">
          {(provided, snapshot) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {tree.map((node, depth) => renderFolder(node, depth))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        <Droppable droppableId="unassigned" type="TREATMENT">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[10rem]">
              <h3 className="mb-2 mt-8 text-xs font-semibold text-zinc-500 dark:text-zinc-300">
                🩺 No Folder
              </h3>
              {filteredTreatments
                .filter((t) => !t.folder_id)
                .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                .map((t, i) => (
                  <Draggable draggableId={t.id.toString()} index={i} key={t.id}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={clsx(
                          "group rounded p-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800",
                          {
                            "bg-blue-100 font-semibold text-blue-900 dark:bg-blue-900 dark:text-white":
                              t.id === draggingTreatmentId,
                          }
                        )}
                      >
                        <TreatmentSessions
                          sessions={filteredSessions}
                          treatment={t}
                          currentSessionId={currentSessionId}
                          draggingTreatmentId={draggingTreatmentId}
                          treatProvided={provided}
                          onTreatmentActionsClick={setTreatmentActionModal}
                          onSessionActionsClick={setSessionActionModal}
                        />
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
      {sessionActionModal && (
        <SessionEditorModal
          mode="sidebar"
          sessionId={sessionActionModal.id}
          initialTitle={sessionActionModal.title}
          onClose={() => setSessionActionModal(null)}
          onRefresh={async () => {
            const { data } = await supabase.from("sessions").select("*");
            setSessions(data || []);
            onUpdateSession?.();
          }}
          onDelete={handleDelete}
        />
      )}
      {treatmentActionModal && (
        <TreatmentEditorModal
          onClose={() => setTreatmentActionModal(null)}
          onRefresh={async () => {
            const { data } = await supabase.from("treatments").select("*");
            setTreatments(data || []);
          }}
          treatmentId={treatmentActionModal.id}
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
