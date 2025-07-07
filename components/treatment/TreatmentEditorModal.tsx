"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import EmojiPicker from "emoji-picker-react";
import { toast } from "react-hot-toast";
import { SupabaseTeamResponse, Team, UserProfile } from "@/types";
import { format } from "date-fns";
import { PostgrestError } from "@supabase/supabase-js";
import { useAppStore } from "@/state";
import { useShallow } from "zustand/react/shallow";
import TherapistList from "../therapist/TherpistsList";
import Spinner from "../ui/spinner";
import Select from "../ui/select";
import Button from "../ui/button";
import Input from "../ui/input";
import Textarea from "../ui/textarea";

interface Props {
  treatmentId?: string;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function TreatmentEditorModal({ treatmentId, onClose, onRefresh }: Props) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("🌱");
  const [color, setColor] = useState("#3b82f6");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [summary, setSummary] = useState("");
  const [teamId, setTeamId] = useState("");
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [archived, setArchived] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState<{ id: string; title: string }[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [availableTherapists, setAvailableTherapists] = useState<UserProfile[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingTherapists, setLoadingTherapists] = useState(false);

  const { userProfile } = useAppStore(useShallow((s) => ({ userProfile: s.userProfile })));
  const isTherapist = userProfile?.role === "therapist";
  // Owner or therapist role can archive
  const isAllowedToArchive = isTherapist;

  useEffect(() => {
    if (!treatmentId) {
      nameRef.current?.focus();
      return;
    }
    const loadTreatment = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("treatments")
        .select("*")
        .eq("id", treatmentId)
        .single();
      if (error) {
        toast.error("Failed to load treatment");
      } else {
        setTitle(data?.title ?? "");
        setEmoji(data?.emoji ?? "🌱");
        setColor(data?.color ?? "#3b82f6");
        setSelectedGoalId(data?.goal_id ?? "Therapy");
        setSummary(data?.summary ?? "");
        setTeamId(data?.team_id ?? "");
        setSharedWith(data?.shared_with ?? []);
        setArchived(data?.archived ?? false);
      }
      setLoading(false);
    };
    loadTreatment();
  }, [treatmentId]);

  useEffect(() => {
    setLoadingTeams(true);
    const loadTeams = async () => {
      const { data, error } = (await supabase.from("teams").select(`id, name, description,
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
      setLoadingTeams(false);
    };
    loadTeams();
  }, []);

  useEffect(() => {
    const loadGoals = async () => {
      const { data, error } = await supabase.from("goals").select("id, title");
      if (!error) {
        setGoals(data || []);
        setSelectedGoalId(data[0].id);
      }
    };
    loadGoals();
  }, []);

  useEffect(() => {
    if (!selectedGoalId) return;

    const loadAssociations = async () => {
      // 1️⃣ Get category ids for this goal
      const { data: categoryLinks } = await supabase
        .from("goal_category_links")
        .select("category_id")
        .eq("goal_id", selectedGoalId);
      const categoryIds = categoryLinks?.map((cl) => cl.category_id) || [];
      if (!categoryIds.length) {
        setAvailableTherapists([]);
        setAvailableTeams([]);
        return;
      }
      setLoadingTherapists(true);
      // 2️⃣ Get therapists for those category ids
      const { data: therapistLinks } = await supabase
        .from("category_user_links")
        .select("user_id")
        .in("category_id", categoryIds);
      const therapistIds = therapistLinks?.map((t) => t.user_id) || [];
      if (therapistIds.length) {
        const { data: therapists } = await supabase
          .from("users")
          .select()
          .in("id", therapistIds)
          .eq("role", "therapist");
        setAvailableTherapists(therapists || []);
      } else {
        setAvailableTherapists([]);
      }
      setLoadingTherapists(false);

      // 3️⃣ Get teams for those category ids
      const { data: teamLinks } = await supabase
        .from("category_team_links")
        .select("team_id")
        .in("category_id", categoryIds);
      const teamIds = teamLinks?.map((t) => t.team_id) || [];
      if (teamIds.length) {
        const { data: teams } = (await supabase
          .from("teams")
          .select(
            `id, name, description,
            team_members (
              joined_at,
              users (
                id,
                full_name,
                email,
                role
              )
            )
          )`
          )
          .in("id", teamIds)) as unknown as { data: SupabaseTeamResponse[] };
        const flattened = (teams || []).map((team) => ({
          id: team.id,
          name: team.name,
          description: team.description ?? "",
          team_members:
            team.team_members
              ?.filter((tm) => tm.users?.role === "therapist")
              .map((tm) => ({
                id: tm.users!.id,
                full_name: tm.users!.full_name ?? null,
                email: tm.users!.email,
                joined_at: tm.joined_at,
              })) || [],
        }));

        setAvailableTeams(flattened);
      } else {
        setAvailableTeams([]);
      }
    };
    loadAssociations();
  }, [selectedGoalId]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setIsSaving(true);
    const payload = {
      title: title.trim(),
      emoji,
      color,
      goal_id: selectedGoalId,
      summary,
      team_id: teamId || null,
      user_id: userProfile?.id,
      shared_with: sharedWith,
      archived,
    };
    if (treatmentId) {
      const { error } = await supabase.from("treatments").update(payload).eq("id", treatmentId);
      if (error) {
        toast.error("Failed to save treatment");
      } else {
        toast.success("Treatment updated.");
        onRefresh?.();
        onClose();
      }
    } else {
      const { error } = await supabase.from("treatments").insert(payload);
      if (error) {
        toast.error("Failed to create treatment");
      } else {
        toast.success("Treatment created.");
        onRefresh?.();
        onClose();
      }
    }
    setIsSaving(false);
  };

  // ARCHIVE LOGIC
  const handleArchive = async (newArchivedState: boolean) => {
    if (!treatmentId) return;

    const confirmArchive = window.confirm(
      newArchivedState
        ? "Are you sure you want to archive this treatment?"
        : "Are you sure you want to unarchive this treatment?"
    );
    if (!confirmArchive) return;

    const { error } = await supabase
      .from("treatments")
      .update({ archived: newArchivedState })
      .eq("id", treatmentId);

    if (error) {
      toast.error(`Failed to ${newArchivedState ? "archive" : "unarchive"} treatment`);
    } else {
      toast.success(`Treatment ${newArchivedState ? "archived" : "unarchived"}.`);
      onRefresh?.();
      onClose();
    }
  };
  // END ARCHIVE LOGIC

  if (loading) {
    return <Spinner overlay />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-lg bg-white p-5 text-zinc-700 shadow-xl dark:bg-zinc-900 dark:text-white">
        <h2 className="text-lg font-semibold">
          {treatmentId ? "Edit Treatment" : "Create New Treatment"}
        </h2>

        <div>
          <Input
            label="Title"
            ref={nameRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border p-2 text-black dark:bg-zinc-800 dark:text-white"
            placeholder="My Treatment Plan"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-semibold">Emoji</label>
            <Button
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="text-2xl"
              title="Pick emoji"
            >
              {emoji}
            </Button>
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

          <div className="flex min-w-0 flex-1 flex-col">
            <Select
              label="Goal"
              value={selectedGoalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              options={goals.map((g) => ({ value: g.id, label: g.title }))}
            ></Select>
          </div>

          <div className="flex flex-col">
            <Input
              label="Color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-16 rounded border px-0 py-0 dark:bg-zinc-800"
            />
          </div>
        </div>

        <div>
          <Textarea
            rows={3}
            value={summary}
            label="Summary"
            onChange={(e) => setSummary(e.target.value)}
            className="w-full rounded border p-2 text-sm dark:bg-zinc-800 dark:text-white"
            placeholder="Short description of the treatment..."
          />
        </div>

        <h3 className="text-sm font-medium">Assign to Team</h3>
        {loadingTeams && <Spinner />}
        {availableTeams.length > 0 ? (
          availableTeams.map((team) => (
            <div
              key={team.id}
              className={`rounded border p-3 text-zinc-700 dark:border-zinc-700 dark:text-white ${team.id === teamId ? "border-blue-500 bg-blue-50 dark:bg-zinc-800" : ""}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{team.name}</h3>
                <Button
                  onClick={async () => {
                    setTeamId(team.id!);
                  }}
                  className={`rounded px-3 py-1 text-sm ${team.id === teamId ? "bg-green-600 text-white" : "bg-blue-600 text-white"}`}
                >
                  {team.id === teamId ? "Selected" : "Assign to this team"}
                </Button>
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
          ))
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No available teams found</p>
        )}

        <div>
          <TherapistList
            sharedWith={sharedWith}
            setSharedWith={setSharedWith}
            label="Share with Individual Therapists"
            therapists={availableTherapists}
            loadingTherapists={loadingTherapists}
          />
        </div>

        <div className="flex justify-between gap-2">
          <Button
            onClick={handleSave}
            className="w-full rounded bg-green-600 py-2 text-white hover:bg-green-700 disabled:opacity-50"
            disabled={isSaving}
          >
            Save
          </Button>
          {treatmentId && isAllowedToArchive && (
            <Button
              onClick={() => handleArchive(!archived)}
              className={`w-full ${archived ? "bg-blue-600 hover:bg-blue-700" : "bg-yellow-600 hover:bg-yellow-700"}`}
            >
              {archived ? "Unarchive" : "Archive"}
            </Button>
          )}
        </div>

        <Button
          onClick={onClose}
          className="w-full text-center text-sm text-zinc-500 underline dark:text-zinc-400"
        >
          Close
        </Button>
      </div>
    </div>
  );
}
