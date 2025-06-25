// components/therapist/CreateSnapshotModal.tsx
"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { ExportFilterOptions } from "@/types";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { useExportTraining } from "@/hooks/useExportTraining";

interface Props {
  filters: ExportFilterOptions;
  snapshotName?: string;
  setSnpashotName: (name: string) => void;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateSnapshotModal({
  filters,
  snapshotName,
  setSnpashotName,
  onClose,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);

  const { handleExport } = useExportTraining(filters, snapshotName);

  const handleCreate = async () => {
    setLoading(true);
    await handleExport();
    onSuccess();
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      {/* <h2 className="mb-2 text-lg font-semibold">📸 Create Snapshot</h2> */}

      <label className="text-sm font-medium">Snapshot Name</label>
      <Input
        className="mb-4"
        value={snapshotName}
        onChange={(e) => setSnpashotName(e.target.value)}
        disabled={loading}
      />

      <div className="flex gap-2">
        <Button onClick={handleCreate} disabled={loading}>
          Upload
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
