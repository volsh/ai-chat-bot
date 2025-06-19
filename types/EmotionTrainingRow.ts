export type EmotionTrainingRow = {
  source_type: string;
  source_id: string;
  user_id: string | null;
  role: string;
  content: string;
  emotion: string;
  tone: string;
  intensity: number;
  topic: string | null;
  note: string | null;
  annotation_updated_at: string | null;
  annotation_updated_by: string | null;
  therapist_id: string | null;
  tagged_at: string;
  score: number;
};
