import { boolean } from "zod";

export type ExportFilterOptions = {
  emotions?: string[];
  tones?: string[];
  topics?: string[];
  intensity?: [number, number];
  alignment_score?: [number, number];
  sourceTypes?: string[];
  includeCorrected?: boolean;
  correctedBy?: string;
  highRiskOnly?: boolean;
  users?: string[];
  therapists?: string[];
  messageRole?: string[]; // e.g., user or assistant
  startDate?: string;
  endDate?: string;
  topN?: number;
  scoreCutoff?: number;
  flaggedOnly?: boolean;
  flagReasons?: string[];
  agreement?: [number, number];
  goals?: string[];
};
