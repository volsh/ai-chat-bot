export type ExportFilterOptions = {
  emotions?: string[];
  tones?: string[];
  topics?: string[];
  intensity?: [number, number];
  alignment_score?: [number, number];
  sourceTypes?: string[];
  includeCorrected?: boolean;
  highRiskOnly?: boolean;
  users?: string[];
  reviewedBy?: string[];
  supportingTherapists?: string[]; // all therapists shared by the client to treatments
  messageRole?: string[]; // e.g., user or assistant
  startDate?: string;
  endDate?: string;
  topN?: number;
  scoreCutoff?: number;
  flaggedOnly?: boolean;
  flagReasons?: string[];
  agreement?: [number, number];
  goals?: string[];
  minEmotionFrequency?: number;
};
