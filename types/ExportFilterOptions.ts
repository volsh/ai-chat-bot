export type ExportFilterOptions = {
  emotions?: string[];
  tones?: string[];
  topics?: string[];
  intensity?: [number, number];
  sourceTypes?: string[];
  includeCorrected?: boolean;
  correctedBy?: string;
  highRiskOnly?: boolean;
  userId?: string;
  therapistId?: string;
  role?: string[]; // e.g., user or assistant
  startDate?: string;
  endDate?: string;
  topN?: number;
  scoreCutoff?: number;
};
