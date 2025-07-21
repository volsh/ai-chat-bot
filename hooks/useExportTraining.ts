import { useTransition, useCallback, useEffect, useState, useDeferredValue } from "react";
import { toast } from "react-hot-toast";
import { supabaseBrowserClient as supabase } from "@/libs/supabase"; // Assuming supabase client is used
import { EmotionSummary, EmotionTrainingRow, ExportFilterOptions } from "@/types";
import getFilterHash from "@/utils/ai/getFilterHash";

export function useExportTraining(
  filters: ExportFilterOptions | null = null,
  snapshotName?: string
) {
  const deferredFilters = useDeferredValue(filters);
  const [loading, setLoading] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [exportLocked, setExportLocked] = useState(false);
  const [previewRows, setPreviewRows] = useState<EmotionTrainingRow[]>([]);
  const [totalAnnotations, setTotalAnnotations] = useState(0);
  const [selectedCount, setSelectedCount] = useState(0);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [isPending, startTransition] = useTransition();

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/exports/export-fine-tune-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deferredFilters || {}),
    });
    const json = await res.json();
    if (res.ok) {
      startTransition(() => {
        setTotalAnnotations(json.total);
        setSelectedCount(json.annotations.length);
        setPreviewRows(json.annotations);
        setTotalCount(json.total);
      });
    } else {
      toast.error(json.error || "Failed to load preview");
    }
    setLoading(false);
  }, [deferredFilters]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const handleExport = async () => {
    setLoading(true);
    setFilePath(null);
    try {
      const res = await fetch("/api/exports/export-fine-tune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters, name: snapshotName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Export failed");
      if (json.locked) {
        toast.error("Export temporarily locked. Please wait and try again.");
        setExportLocked(true);
        return;
      }
      setFilePath(json.filePath);
      toast.success("Export successful");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading: loading || isPending,
    filePath,
    exportLocked,
    previewRows,
    totalAnnotations,
    selectedCount,
    totalCount,
    fetchPreview,
    handleExport,
  };
}
