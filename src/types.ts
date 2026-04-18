/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface HealthMetric {
  category: string;
  score: number; // 0-100 indicating health status (high = healthy, low = concern)
  label: string;
}

export interface MedicalSummary {
  summary: string;
  keyFindings: string[];
  medications: {
    name: string;
    dosage: string;
    purpose: string;
  }[];
  nextSteps: string[];
  suggestedQuestions: string[];
  riskLevel: 'low' | 'moderate' | 'high';
  healthMetrics: HealthMetric[];
  riskScore: number; // 0-100 overall risk
  anatomicalTags: string[]; // e.g. ["chest", "lungs", "heart"]
  urgencyLabel: string; // e.g. "Immediate", "Scheduled", "Routine"
  dietPlan: {
    allowed: string[];
    avoid: string[];
    timing: string;
  };
  exercisePlan: {
    recommendations: string[];
    precautions: string[];
  };
  timestamp: number;
}

export interface ReportInput {
  text: string;
  type: 'pathology' | 'radiology' | 'general' | 'discharge';
}
