import type { QuestionFormat } from "@/types/template";

export const SUBJECTIVE_FORMATS: QuestionFormat[] = [
  "subjective-1marks",
  "subjective-2marks",
  "subjective-3marks",
  "subjective-4marks",
  "subjective-5marks",
  "casestudy-4marks",
  "subjective",
];

export const OBJECTIVE_FORMATS: QuestionFormat[] = ["objective", "objective-ar"];

export const FORMAT_LABELS: Record<QuestionFormat, string> = {
  "subjective-1marks": "Subjective · 1M",
  "subjective-2marks": "Subjective · 2M",
  "subjective-3marks": "Subjective · 3M",
  "subjective-4marks": "Subjective · 4M",
  "subjective-5marks": "Subjective · 5M",
  "casestudy-4marks": "Case Study · 4M",
  subjective: "Subjective",
  objective: "Objective",
  "objective-ar": "Objective-AR",
};
