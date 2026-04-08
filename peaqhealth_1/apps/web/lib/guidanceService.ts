// lib/guidanceService.ts
// Handles OpenAI call for guidance card generation.

import OpenAI from "openai"
import { GUIDANCE_SYSTEM_PROMPT, buildGuidancePrompt, type GuidanceInput } from "./guidancePrompts"

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export interface GuidanceCard {
  metricName: string
  status: "attention" | "watch"
  reading: string
  primaryAction: string
  primaryWhy: string
  crossPanelNote: string | null
  cleaningNote: {
    show: boolean
    regularTitle?: string
    regularDesc?: string
    regularWhen?: string
    deepTitle?: string
    deepDesc?: string
    deepWhen?: string
  }
  moreActions: Array<{ rank: number; action: string; timing: string }>
  science: Array<{ label: string; body: string; citation: string | null }>
}

export interface GoodMetric {
  name: string
  value: string
  note: string
}

export interface GuidanceResponse {
  cards: GuidanceCard[]
  goodMetrics: GoodMetric[]
  generatedAt: string
}

export async function generateGuidance(
  input: GuidanceInput,
): Promise<GuidanceResponse> {
  const userPrompt = buildGuidancePrompt(input)

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    max_tokens: 2500,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: GUIDANCE_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  })

  const raw = completion.choices[0].message.content
  if (!raw) throw new Error("OpenAI returned empty guidance response")

  const parsed = JSON.parse(raw) as Omit<GuidanceResponse, "generatedAt">

  return {
    ...parsed,
    generatedAt: new Date().toISOString(),
  }
}
