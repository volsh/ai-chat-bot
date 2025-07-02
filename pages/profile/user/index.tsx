"use client";

import { useAppStore } from "@/state";
import { useEffect, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { EmotionTrainingRow, Goal, Treatment } from "@/types";
import { SessionScoreTrendChart } from "@/components/analytics/SessionScoreTrendChart";
import { PostgrestError } from "@supabase/supabase-js";

interface UserGoal {
  goal_title: string;
  treatment_id: string;
}

export default function MePage() {
  const { userProfile, loadingProfile } = useAppStore();
  const [allRows, setAllRows] = useState<EmotionTrainingRow[]>([]);
  const [userGoals, setUserGoals] = useState<UserGoal[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!userProfile?.id) return;

      const { data, error } = (await supabase
        .from("v_emotion_training_data")
        .select(
          `
          session_id,
          treatment_id,
          treatment_name,
          treatment_created_at,
          treatment_status,
          goal,
          tagged_at,
          message_created_at,
          tone,
          intensity,
          alignment_score,
          user_id
        `
        )
        .eq("user_id", userProfile.id)
        .order("message_created_at")) as unknown as {
        data: EmotionTrainingRow[];
        error: PostgrestError;
      };
      setAllRows(data || []);
      if (error) console.error("Failed to load training data", error);
    };

    const loadUserGoals = async () => {
      if (!userProfile?.id) return;
      const { data, error } = (await supabase
        .from("treatments")
        .select(`id, goals ( title )`)
        .eq("user_id", userProfile.id)) as unknown as {
        data: (Treatment & { goals: Goal })[];
        error: PostgrestError;
      };
      if (error) {
        console.error("Failed to load user goals", error);
        return;
      }

      const parsedGoals = data
        .filter((t) => t.goals?.title)
        .map((t) => ({ goal_title: t.goals.title, treatment_id: t.id }));

      setUserGoals(parsedGoals);
    };

    loadData();
    loadUserGoals();
  }, [userProfile]);

  if (loadingProfile) return <p className="text-muted-foreground">Loading profile…</p>;
  if (!userProfile) return <p className="text-muted-foreground">Not logged in</p>;

  return (
    <div className="text-foreground p-6">
      <h1 className="mb-2 text-xl font-bold">Your Profile</h1>
      <div className="mb-4 space-y-1 text-sm">
        <div className="flex items-center gap-2">
          {userProfile.avatar_url && (
            <img src={userProfile.avatar_url} alt="Avatar" className="h-10 w-10 rounded-full" />
          )}
          <div>
            <div className="font-semibold">{userProfile.full_name}</div>
            <div className="text-muted-foreground">{userProfile.email}</div>
          </div>
        </div>
        {userProfile.short_description && (
          <div className="text-muted-foreground">{userProfile.short_description}</div>
        )}
      </div>

      {userGoals.length > 0 && (
        <div className="text-muted-foreground mb-6 text-sm">
          <p>
            You are currently working on <strong>{userGoals.length}</strong> treatment
            {userGoals.length > 1 ? "s" : ""}, focusing on goals such as:
          </p>
          <ul className="text-foreground mt-1 list-inside list-disc">
            {userGoals.map((g, idx) => (
              <li key={idx}>{g.goal_title}</li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="text-md text-muted-foreground mb-2 font-bold">My Progress</h2>
      <SessionScoreTrendChart rows={allRows} />
    </div>
  );
}
