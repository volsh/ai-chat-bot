import { Session, Treatment } from "@/types";
import clsx from "clsx";
import { useRouter } from "next/router";
import DragHandle from "../DragHandle";
import { DraggableProvided } from "@hello-pangea/dnd";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

export default function ({
  sessions,
  treatment,
  currentSessionId,
  draggingTreatmentId,
  treatProvided,
  onTreatmentActionsClick,
  onSessionActionsClick,
}: {
  sessions: Session[];
  treatment: Treatment;
  currentSessionId?: string;
  draggingTreatmentId?: string;
  treatProvided?: DraggableProvided;
  onTreatmentActionsClick?: (t: Treatment) => void;
  onSessionActionsClick?: (s: Session) => void;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-1">
          {/* ⚡️ Collapse Toggle Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed((prev) => !prev);
            }}
            className="text-gray-500 hover:text-gray-800"
            title={collapsed ? "Expand" : "Collapse"}
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            <ChevronRight
              className={clsx("transition-transform", collapsed ? "rotate-0" : "rotate-90")}
              size={16}
            />
          </button>
          <div
            onClick={() => router.push(`/treatment/${treatment.id}`)}
            className="flex cursor-pointer items-center gap-2 truncate"
          >
            {treatment.emoji && <span>{treatment.emoji}</span>}
            {treatment.color && (
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: treatment.color }}
              />
            )}
            <span className="truncate">{treatment.title || "Untitled Treatment"}</span>
            {/* ⚡️ Treatment Action Button */}
            <button
              data-tooltip-id="tooltip-treatment"
              data-tooltip-content="Edit Treatment"
              className="ml-2 text-xs text-zinc-400 hover:text-zinc-600"
              onClick={(e) => {
                e.stopPropagation();
                onTreatmentActionsClick?.(treatment);
              }}
            >
              ⋯
            </button>
          </div>
        </div>
        <span className="opacity-0 group-hover:opacity-100">
          <DragHandle props={treatProvided?.dragHandleProps} />
        </span>
      </div>
      {!collapsed && (
        <div
          className="ml-5 space-y-1"
          style={{
            transition: "display 300ms ease",
            display: draggingTreatmentId === treatment.id.toString() ? "none" : "block",
          }}
        >
          {sessions
            .filter((s) => s.treatment_id === treatment.id)
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
            .map((s) => (
              <div
                key={s.id}
                className={clsx(
                  "group flex cursor-pointer items-center justify-between gap-1 rounded px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800",
                  {
                    "bg-blue-100 font-semibold text-blue-900 dark:bg-blue-900 dark:text-white":
                      s.id === currentSessionId,
                  }
                )}
                onClick={() => router.push(`/chat/${s.id}`)}
              >
                {s.emoji && <span>{s.emoji}</span>}
                {s.color && (
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                )}
                <span className="truncate">{s.title || "Untitled Session"}</span>
                <button
                  data-tooltip-id="tooltip-session"
                  data-tooltip-content="Session actions"
                  className="ml-auto text-xs text-zinc-400 opacity-0 hover:text-zinc-600 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSessionActionsClick?.(s);
                  }}
                >
                  ⋯
                </button>
              </div>
            ))}
        </div>
      )}
    </>
  );
}
