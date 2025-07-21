"use client";

import { useState } from "react";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { v4 as uuidv4 } from "uuid";
import { useAppStore } from "@/state";

interface InviteTherapistFormProps {
  onSuccess?: () => void;
}

export default function InviteTherapistForm({ onSuccess }: InviteTherapistFormProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleInvite = async () => {
    if (!email) return toast.error("Please enter an email");

    setSending(true);
    try {
      const res = await fetch("/api/admin-invite-therapist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send invite");
      }

      toast.success("Invite sent successfully");
      setEmail("");
      if (onSuccess) onSuccess(); // ✅ trigger callback
    } catch (error: any) {
      toast.error(error.message || "Unexpected error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-md space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Send a secure magic link to invite a therapist to your platform.
      </p>
      <Input
        type="email"
        label="Therapist Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="therapist@example.com"
      />
      <Button onClick={handleInvite} disabled={sending}>
        {sending ? "Sending..." : "Send Invite"}
      </Button>
    </div>
  );
}
