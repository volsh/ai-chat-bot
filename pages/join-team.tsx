import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { useAppStore } from "@/state";
import { useShallow } from "zustand/react/shallow";

export default function JoinTeamPage() {
  const router = useRouter();
  const { email, team_id, token } = router.query;
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState("");

  const { userProfile } = useAppStore(
    useShallow((s) => ({
      userProfile: s.userProfile,
    }))
  );

  const userId = userProfile?.id;

  useEffect(() => {
    const acceptInvite = async () => {
      if (!email || !team_id || !token) return;

      if (!userId) {
        router.push(
          `/auth/login?next=${encodeURIComponent(
            `/join-team?team_id=${team_id}&email=${email}&token=${token}`
          )}`
        );
        return;
      }

      const { data: membership } = await supabase
        .from("team_members")
        .select("*")
        .eq("user_id", userId)
        .eq("team_id", team_id)
        .single();

      if (membership) {
        router.push("/dashboard/therapist");
        return;
      }

      setJoining(true);

      const res = await fetch("/api/join-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, team_id, token }),
      });

      const result = await res.json();
      if (result.success) {
        setMessage("✅ You have joined the team.");
      } else {
        setMessage(result.error || "❌ Unable to join the team.");
      }
      setTimeout(() => router.push("/dashboard/therapist"), 2000);
      setJoining(false);
    };

    acceptInvite();
  }, [email, team_id, token, userId]);

  return <div>{joining ? message || "Joining..." : "Redirecting..."}</div>;
}
