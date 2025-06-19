"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import EmojiPicker from "emoji-picker-react";
import { toast } from "react-hot-toast";
import { Folder, Team, SupabaseTeamResponse, UserProfile } from "@/types";
import { format } from "date-fns";
import { PostgrestError, Session } from "@supabase/supabase-js";
import MultiSelectChips from "../ui/multiSelectChips";
import { useAppStore } from "@/state";
import { useShallow } from "zustand/react/shallow";

interface Props {
  sessionId: string;
  initialTitle?: string;
  mode?: "sidebar" | "chat";
  onClose: () => void;
  onRefresh?: () => void;
  onDelete?: (deletedSessionId: string) => void;
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
  const [title, setTitle] = useState(initialTitle);
  const [emoji, setEmoji] = useState("\ud83e\udde0");
  const [color, setColor] = useState("#3b82f6");
  const [goal, setGoal] = useState("Therapy");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [summary, setSummary] = useState("");
  const [teamId, setTeamId] = useState("");
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [availableTherapists, setAvailableTherapists] = useState<UserProfile[]>([]);
  const [loadingTherapists, setLoadingTherapists] = useState(true);
  const [sharedWith, setSharedWith] = useState<string[]>([]);

  const { userProfile } = useAppStore(
    useShallow((s) => ({
      userProfile: s.userProfile,
    }))
  );

  const isTherapist = userProfile?.role === "therapist";

  useEffect(() => {
    if (!sessionId || !userProfile) return;
    const fetchData = async () => {
      const [{ data: sessionData }, { data: folderData }] = await Promise.all([
        supabase.from("sessions").select("*").eq("id", sessionId).single(),
        supabase.from("folders").select("*"),
      ]);
      if (sessionData) {
        setTitle(sessionData.title || "");
        setEmoji(sessionData.emoji || "\ud83e\udde0");
        setColor(sessionData.color || "#3b82f6");
        setGoal(sessionData.goal || "Therapy");
        setFolderId(sessionData.folder_id || null);
        setSummary(sessionData.summary || "");
        setTeamId(sessionData.team_id || "");
        setSharedWith(sessionData.shared_with || []);
      }
      setFolders(folderData || []);
    };
    fetchData();
  }, [sessionId, userProfile]);

  useEffect(() => {
    const loadTeams = async () => {
      const { data, error } = (await supabase.from("teams").select(`
        id,
        name,
        description,
        team_members (
          joined_at,
          users (
            id,
            email,
            full_name,
            role
          )
        )
      `)) as unknown as { data: SupabaseTeamResponse[]; error: PostgrestError };
      if (error) {
        toast.error("Failed to load teams");
        return;
      }
      const flattened = (data || []).map((team) => ({
        id: team.id,
        name: team.name,
        description: team.description ?? "",
        team_members: (team.team_members || [])
          .filter((tm) => tm.users?.role === "therapist")
          .map((tm) => ({
            id: tm.users!.id,
            full_name: tm.users!.full_name ?? null,
            email: tm.users!.email,
            joined_at: tm.joined_at,
          })),
      }));
      setAvailableTeams(flattened);
    };
    loadTeams();

    const loadTherapists = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, role, full_name, email, created_at")
        .eq("role", "therapist");
      if (error) {
        toast.error("Failed to load therapists");
        setLoadingTherapists(false);
        return;
      }
      setAvailableTherapists(data || []);
      setLoadingTherapists(false);
    };
    loadTherapists();
  }, []);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSave = async () => {
    if (!title.trim()) return toast.error("Session title cannot be empty.");
    const { error } = await supabase
      .from("sessions")
      .update({
        title: title.trim(),
        emoji,
        color,
        goal,
        folder_id: folderId,
        summary,
        team_id: teamId || null,
        shared_with: sharedWith,
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

  const handleArchive = async () => {
    await supabase.from("sessions").update({ archived: true }).eq("id", sessionId);
    await supabase.from("session_events").insert({
      session_id: sessionId,
      user_id: userProfile?.id,
      event_type: "archive",
      description: `Archived session '${sessionId}'`,
    });
    toast.success("Session archived.");
    onRefresh?.();
    onClose();
  };

  const handleDelete = async () => {
    await supabase.from("sessions").delete().eq("id", sessionId);
    await supabase.from("messages").delete().eq("session_id", sessionId);
    await supabase.from("session_events").insert({
      session_id: sessionId,
      user_id: userProfile?.id,
      event_type: "delete",
      description: `Deleted session '${sessionId}'`,
    });
    toast.success("Session deleted.");
    onRefresh?.();
    onClose();
    onDelete?.(sessionId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-5 text-zinc-700 shadow-xl transition-all dark:bg-zinc-900 dark:text-white">
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

          <div className="flex flex-col">
            <label className="text-sm">Goal</label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="rounded border p-1 text-black dark:bg-zinc-800 dark:text-white"
            >
              <option value="Therapy">Therapy</option>
              <option value="Career">Career</option>
              <option value="Relationships">Relationships</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm">Folder</label>
            <select
              value={folderId || ""}
              onChange={(e) => setFolderId(e.target.value || null)}
              className="rounded border p-1 text-black dark:bg-zinc-800 dark:text-white"
            >
              <option value="">No Folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.emoji || "📁"} {f.name}
                </option>
              ))}
            </select>
          </div>
          {!isTherapist && (
            <>
              <div className="mt-4 space-y-4">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  Share This Session With a Therapist Team
                </label>

                {availableTeams.length === 0 && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No public therapist teams available for sharing.
                  </p>
                )}

                {availableTeams.map((team) => (
                  <div
                    key={team.id}
                    className={`rounded border p-3 text-zinc-700 transition-all dark:border-zinc-700 dark:text-white ${
                      team.id === teamId
                        ? "border-blue-500 bg-blue-50 dark:bg-zinc-800"
                        : "bg-white dark:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{team.name}</h3>
                      <button
                        onClick={async () => {
                          const { error } = await supabase
                            .from("sessions")
                            .update({ team_id: team.id })
                            .eq("id", sessionId);

                          if (error) {
                            toast.error("Failed to update session team");
                          } else {
                            setTeamId(team.id!);
                            toast.success("Session shared with " + team.name);
                            onRefresh?.();
                          }
                        }}
                        className={`rounded px-3 py-1 text-sm ${
                          team.id === teamId ? "bg-green-600 text-white" : "bg-blue-600 text-white"
                        }`}
                      >
                        {team.id === teamId ? "Selected" : "Share with this team"}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Therapists:</p>
                    <ul className="text-sm">
                      {team.team_members.map((m) => (
                        <li key={m.id}>
                          • {m.full_name || m.email}{" "}
                          <span className="text-xs text-gray-400">
                            (joined {format(new Date(m.joined_at!), "MMM yyyy")})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-4">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  Share With Individual Therapists
                </label>
                {availableTherapists.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No public therapists available for sharing.
                  </p>
                ) : (
                  <MultiSelectChips
                    options={availableTherapists.map((t) => ({
                      value: t.id,
                      label: t.full_name || t.email,
                    }))}
                    values={sharedWith}
                    onChange={async (updated) => {
                      const { error } = await supabase
                        .from("sessions")
                        .update({ shared_with: updated })
                        .eq("id", sessionId);

                      if (!error) {
                        setSharedWith(updated);
                      } else {
                        toast.error("Failed to update therapists.");
                      }
                    }}
                    isLoading={loadingTherapists}
                    searchable
                    scrollable
                  />
                )}
              </div>
            </>
          )}

          <div>
            <label className="text-sm">Edit Summary</label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full rounded border p-2 text-sm dark:bg-zinc-800 dark:text-white"
            />
          </div>
        </div>

        <div className="flex justify-between gap-2">
          <button
            onClick={handleSave}
            className="w-full rounded bg-green-600 py-2 text-white hover:bg-green-700"
          >
            Save
          </button>
          {mode === "sidebar" && (
            <>
              <button
                onClick={handleArchive}
                className="w-full rounded bg-yellow-600 py-2 text-white hover:bg-yellow-700"
              >
                Archive
              </button>
              <button
                onClick={handleDelete}
                className="w-full rounded bg-red-600 py-2 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full text-center text-sm text-zinc-500 underline dark:text-zinc-400"
        >
          Close
        </button>
      </div>
    </div>
  );
}
