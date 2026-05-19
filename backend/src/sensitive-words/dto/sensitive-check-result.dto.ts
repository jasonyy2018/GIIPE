export interface SensitiveCheckResult {
  isClean: boolean;
  detectedWords: DetectedWord[];
  maxLevel: number;
  filteredContent?: string;
}

export interface DetectedWord {
  word: string;
  level: number;
  category: string;
  positions: number[];
}