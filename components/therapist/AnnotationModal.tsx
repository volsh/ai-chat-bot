import { useState } from "react";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import TextArea from "@/components/ui/textarea";
import { toast } from "react-hot-toast";
import { MessageWithEmotion } from "@/types";
import Toggle from "../ui/toggle";

interface AnnotationModalProps {
  onClose: () => void;
  sourceId: string;
  sourceType: string;
  initialAnnotation?: MessageWithEmotion;
  onSaved?: () => void;
}

export default function AnnotationModal({
  onClose,
  sourceId,
  sourceType,
  initialAnnotation,
  onSaved,
}: AnnotationModalProps) {
  const [correctedEmotion, setCorrectedEmotion] = useState(initialAnnotation?.emotion || "");
  const [correctedTone, setCorrectedTone] = useState(initialAnnotation?.tone || "");
  const [correctedTopic, setCorrectedTopic] = useState(initialAnnotation?.topic || "");
  const [correctedIntensity, setCorrectedIntensity] = useState(initialAnnotation?.intensity || 0);
  const [correctedAlignmentScore, setCorrectedAlignmentScore] = useState(
    initialAnnotation?.alignment_score || 0
  );

  const [note, setNote] = useState(initialAnnotation?.note || "");
  const [flagReason, setFlagReason] = useState(initialAnnotation?.flag_reason || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/annotate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_id: sourceId,
          source_type: sourceType,
          corrected_emotion: correctedEmotion,
          corrected_tone: correctedTone,
          corrected_topic: correctedTopic,
          corrected_intensity: correctedIntensity,
          note,
          flag_reason: flagReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save annotation");

      toast.success("Annotation saved");
      onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="space-y-2 p-2">
        <Input
          label="Corrected Emotion"
          value={correctedEmotion}
          onChange={(e) => setCorrectedEmotion(e.target.value)}
        />
        <Input
          label="Corrected Tone"
          value={correctedTone}
          onChange={(e) => setCorrectedTone(e.target.value)}
        />
        <Input
          label="Corrected Topic"
          value={correctedTopic}
          onChange={(e) => setCorrectedTopic(e.target.value)}
        />
        <Input
          label="Corrected Intensity (0.1 - 1.0)"
          type="number"
          min={0.1}
          max={1}
          step={0.1}
          value={correctedIntensity}
          onChange={(e) => setCorrectedIntensity(parseFloat(e.target.value))}
        />
        <Input
          label="Corrected Alignment With Goal Score (0.1 - 1.0)"
          type="number"
          min={0.1}
          max={1}
          step={0.1}
          value={correctedAlignmentScore}
          onChange={(e) => setCorrectedAlignmentScore(parseFloat(e.target.value))}
        />
        <TextArea
          placeholder="Annotation Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <TextArea
          placeholder="Flag Reason (optional)"
          value={flagReason}
          onChange={(e) => setFlagReason(e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-2">
          <button
            className="rounded bg-gray-200 px-4 py-1 text-sm"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="rounded bg-green-600 px-4 py-1 text-sm text-white"
            onClick={save}
            disabled={saving}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
