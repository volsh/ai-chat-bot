// components/therapist/CreateSnapshotModal.tsx
"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { ExportFilterOptions } from "@/types";
import { format } from "date-fns";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { toast } from "react-hot-toast";

interface Props {
  filters: ExportFilterOptions;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateSnapshotModal({ filters, onClose, onSuccess }: Props) {
  const [name, setName] = useState("Snapshot – " + format(new Date(), "PPpp"));
  const [loading, setLoading] = useState(false);
  const [existingHash, setExistingHash] = useState<string | null>(null);

  useEffect(() => {
    const checkDuplicate = async () => {
      const hash = JSON.stringify(filters);
      const { data } = await supabase
        .from("fine_tune_snapshots")
        .select("id")
        .eq("filters", hash)
        .maybeSingle();

      if (data?.id) setExistingHash(data.id);
    };
    checkDuplicate();
  }, [filters]);

  const handleCreate = async () => {
    if (existingHash) {
      toast.error("A snapshot with the same filters already exists.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("fine_tune_snapshots").insert({
      name,
      filters,
      created_at: new Date().toISOString(),
      version: "1", // optional, update as needed
    });

    if (error) toast.error("Failed to create snapshot");
    else toast.success("Snapshot created");
    setLoading(false);
    onSuccess();
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold mb-2">📸 Create Snapshot</h2>

      <label className="text-sm font-medium">Snapshot Name</label>
      <Input
        className="mb-4"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={loading}
      />

      {existingHash && (
        <div className="mb-4 rounded bg-yellow-100 p-2 text-sm text-yellow-700">
          A snapshot with these filters already exists.
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={handleCreate} disabled={loading || !!existingHash}>
          Save Snapshot
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
