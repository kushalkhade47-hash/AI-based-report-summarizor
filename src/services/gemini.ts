/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { MedicalSummary } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "A patient-friendly, empathetic overview of the report in simple terms.",
    },
    keyFindings: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of the most important clinical observations.",
    },
    medications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          dosage: { type: Type.STRING },
          purpose: { type: Type.STRING },
        },
        required: ["name", "dosage", "purpose"],
      },
      description: "List of medications mentioned with doses and why they were prescribed.",
    },
    nextSteps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Actionable items for the patient (e.g., follow-up appointments, tests).",
    },
    suggestedQuestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Questions the patient should ask their doctor based on this report.",
    },
    riskLevel: {
      type: Type.STRING,
      enum: ["low", "moderate", "high"],
      description: "The estimated urgency of the findings based on medical terminology used.",
    },
    healthMetrics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "System name, e.g., 'Respiratory', 'Cardiac', 'Metabolic'" },
          score: { type: Type.NUMBER, description: "Health score from 0-100 (100 is optimal/normal, lower implies concern)" },
          label: { type: Type.STRING, description: "A simple label like 'Normal', 'Warning', or 'Critical' in the requested language." }
        },
        required: ["category", "score", "label"]
      },
      description: "Numerical scores for different health categories mentioned in the report for visualization."
    },
    riskScore: {
      type: Type.NUMBER,
      description: "A calculated risk score from 0-100 where 100 is extremely critical/high urgency."
    },
    anatomicalTags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Keywords for body parts mentioned, e.g., 'chest', 'brain', 'abdomen', 'lungs', 'heart', 'bones', 'skin'."
    },
    urgencyLabel: {
      type: Type.STRING,
      description: "A short urgency indicator, e.g., 'Immediate Attention', 'Routine Follow-up', 'Scheduled Monitoring'."
    },
    dietPlan: {
      type: Type.OBJECT,
      properties: {
        allowed: { type: Type.ARRAY, items: { type: Type.STRING } },
        avoid: { type: Type.ARRAY, items: { type: Type.STRING } },
        timing: { type: Type.STRING, description: "Best time to eat or frequency." }
      },
      required: ["allowed", "avoid", "timing"]
    },
    exercisePlan: {
      type: Type.OBJECT,
      properties: {
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
        precautions: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["recommendations", "precautions"]
    }
  },
  required: ["summary", "keyFindings", "medications", "nextSteps", "suggestedQuestions", "riskLevel", "healthMetrics", "riskScore", "anatomicalTags", "urgencyLabel", "dietPlan", "exercisePlan"],
};

export async function summarizeMedicalReport(
  reportData: { text?: string; file?: { data: string; mimeType: string } },
  language: string = 'English'
): Promise<MedicalSummary> {
  const prompt = `
    You are a compassionate medical expert who specializes in communicating with patients.
    Your goal is to take a medical report (which might be a PDF document, an image of a scan, a photo, or text) 
    and translate it into language a layperson can understand.
    
    IMPORTANT: You MUST provide the output in ${language}.
    
    GUIDELINES:
    1. Avoid jargon where possible. If you must use a technical term, explain it in parentheses in ${language}.
    2. Be empathetic but accurate.
    3. Clearly highlight follow-up actions.
    4. Categorize risk level:
       - 'low': Routine findings, clear improvements, or preventative checks.
       - 'moderate': Requires attention, lifestyle changes, or follow-up within weeks.
       - 'high': Requires immediate attention or specialized consultation.
    5. Quantitative Metrics: For any systems or organs mentioned (e.g., Lungs, Heart, Kidneys, Liver, Blood Sugar, or general infection markers), assign a health score from 0-100 where 100 is perfectly normal/optimal and lower scores indicate pathological findings or concerns. If a system isn't mentioned, do not include it.
    6. Anatomical Mapping: Identify specific body parts or regions mentioned in the report (e.g., "Chest", "Brain", "Upper Right Arm", "Abdomen"). Provide these as simple keywords for a 3D visualizer.
    7. Lifestyle Intervention: Based on the findings (e.g., if heart issues are noted, suggest heart-healthy diet), provide:
       - A specific Diet Plan: Foods to consume (allowed), foods to avoid, and timing.
       - An Exercise Plan: Specific types of activity suitable for the condition and necessary precautions.

    Please analyze the provided medical report carefully.
  `;

  const contents: any[] = [{ text: prompt }];
  
  if (reportData.text) {
    contents.push({ text: `REPORT TEXT:\n${reportData.text}` });
  }
  
  if (reportData.file) {
    contents.push({
      inlineData: {
        data: reportData.file.data,
        mimeType: reportData.file.mimeType,
      },
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: contents },
      config: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from AI");
    }

    const data = JSON.parse(resultText);
    return {
      ...data,
      timestamp: Date.now()
    } as MedicalSummary;
  } catch (error: any) {
    console.error("Error in summarizeMedicalReport:", error);
    throw new Error(error.message || "Failed to summarize the report. Please try again.");
  }
}

export async function chatWithAI(
  message: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  currentSummary?: MedicalSummary
) {
  const systemInstruction = `
    You are MedClarify AI, a supportive medical assistant. 
    The user is asking questions about their health based on their medical report history.
    
    ${currentSummary ? `CURRENT REPORT SUMMARY FOR CONTEXT: ${JSON.stringify(currentSummary)}` : ""}
    
    GUIDELINES:
    1. Be empathetic and professional.
    2. Explain medical terms simply.
    3. Always remind the user that you are an AI and they should consult a real doctor for medical advice.
    4. Do not provide definitive diagnoses or prescriptions.
    5. Refer back to their specific report metrics when relevant.
  `;

  // We use the same generateContent method for chat-like interactions by passing history
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      { role: "user", parts: [{ text: `INSTRUCTIONS: ${systemInstruction}` }] },
      { role: "model", parts: [{ text: "I understand and will follow these instructions as MedClarify AI." }] },
      ...history,
      { role: "user", parts: [{ text: message }] }
    ],
  });

  return response.text || "I'm sorry, I couldn't process that request.";
}
