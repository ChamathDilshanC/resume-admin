import policy from "./resume-writing-policy.json";
import type { ProjectItem, WritingTarget } from "./types";

const PROJECT_SYSTEM_PROMPT = `${policy.evidence}\n\n${policy.project}`;

class AIRequestError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AIRequestError";
  }
}

// 503 = model overloaded ("high demand"), 429 = per-key rate/quota limited,
// 404 = model retired/not available to this key ("no longer available to new
// users" — availability is gated per-account, not just a global shutdown, so
// a different key can genuinely succeed here too). All three are worth
// retrying against a different model or key rather than failing outright.
function isRetryableStatus(status: number): boolean {
  return status === 503 || status === 429 || status === 404;
}

// Prefer the "-latest" aliases: Google hot-swaps them to the newest release
// within that model family (with a 2-week deprecation notice), so they don't
// go stale the way a pinned version does — gemini-2.5-flash/flash-lite, the
// previous pins here, were retired for new users during 2026. Keep one
// concrete pin last in case both aliases have a simultaneous outage.
const GEMINI_MODEL_FALLBACKS = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3.6-flash"];

// AI_API_KEY may hold a single key or a comma-separated list. Multiple keys
// (e.g. from separate Google accounts) let us hop to a fresh quota when one
// key gets rate-limited (429) instead of failing outright.
function getApiKeys(): string[] {
  return (process.env.AI_API_KEY || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

async function callGeminiWithFallback(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKeys = getApiKeys();
  if (apiKeys.length === 0) {
    throw new Error("AI_API_KEY is not configured for resume-admin.");
  }

  const configuredModel = process.env.AI_MODEL;
  const models = configuredModel
    ? [configuredModel, ...GEMINI_MODEL_FALLBACKS.filter((model) => model !== configuredModel)]
    : GEMINI_MODEL_FALLBACKS;

  let lastError: unknown;
  for (const model of models) {
    for (const apiKey of apiKeys) {
      try {
        return await callGemini(systemPrompt, userPrompt, model, apiKey);
      } catch (error) {
        lastError = error;
        if (!(error instanceof AIRequestError) || !isRetryableStatus(error.status)) {
          throw error;
        }
        // Overloaded/rate-limited: fall through and retry with the next key,
        // then the next model once all keys for this model are exhausted.
      }
    }
  }

  throw lastError;
}

export async function generateProjectContent(
  project: ProjectItem,
  target: WritingTarget = {}
): Promise<Pick<ProjectItem, "description" | "highlights">> {
  const raw = await callGeminiWithFallback(PROJECT_SYSTEM_PROMPT, JSON.stringify({
    target,
    project: {
      name: project.name, description: project.description, role: project.role,
      technologies: (project.technologies || []).map((t) => t.trim()).filter(Boolean), highlights: project.highlights,
      evidence: project.evidence || {},
    },
  }));
  const parsed = parseJson(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
      typeof parsed.description !== "string" || !Array.isArray(parsed.highlights) ||
      parsed.highlights.length > 3 || !parsed.highlights.every(isNonemptyString)) {
    throw new Error("AI returned an invalid project draft. Your project was not changed.");
  }
  if (parsed.description.trim().split(/\s+/).length > 35 ||
      parsed.highlights.some((h: string) => h.trim().split(/\s+/).length > 45)) {
    throw new Error("AI draft was too long. Please try again.");
  }
  if (!parsed.description.trim() || parsed.highlights.length === 0) {
    throw new Error("Add the project's purpose and your actual contribution before generating a draft.");
  }
  return { description: parsed.description.trim(), highlights: parsed.highlights.map((h: string) => h.trim()) };
}

const SUMMARY_SYSTEM_PROMPT = `${policy.evidence}\n\n${policy.summary}`;
const WORK_BULLETS_SYSTEM_PROMPT = `${policy.evidence}\n\n${policy.work}`;

export async function optimizeSummaryForAts(params: {
  label: string;
  currentSummary: string;
  skillKeywords: string[];
  workContext: string;
  projectContext: string;
  jobDescription?: string;
}): Promise<string> {
  const userPrompt = [
    `Target Job Title: ${params.label}`,
    `Current Summary: ${params.currentSummary}`,
    `Work Evidence: ${params.workContext}`,
    `Project Evidence: ${params.projectContext}`,
    `Job Description (relevance only): ${params.jobDescription || ""}`,
    `Skill Keywords: ${params.skillKeywords.join(", ")}`,
  ].join("\n");

  const text = await callGeminiWithFallback(SUMMARY_SYSTEM_PROMPT, userPrompt);
  const summary = text.trim().replace(/^"|"$/g, "").trim();
  if (!summary || summary.split(/\s+/).length > 80) {
    throw new Error("AI returned an empty or overly long summary. Add factual work or project evidence and retry.");
  }
  return summary;
}

export async function optimizeWorkHighlightsForAts(params: {
  position: string;
  company: string;
  highlights: string[];
  summary?: string;
  target?: WritingTarget;
  skillKeywords: string[];
}): Promise<string[]> {
  const userPrompt = [
    `Role: ${params.position}`,
    `Company: ${params.company}`,
    `Role summary: ${params.summary || ""}`,
    `Target (relevance only): ${JSON.stringify(params.target || {})}`,
    `Current Bullets:\n${params.highlights.map((h) => `- ${h}`).join("\n")}`,
    `Skill Keywords: ${params.skillKeywords.join(", ")}`,
  ].join("\n");

  const highlights = extractJsonArray(await callGeminiWithFallback(WORK_BULLETS_SYSTEM_PROMPT, userPrompt));
  if (highlights.length !== params.highlights.length || highlights.some((h) => h.split(/\s+/).length > 45)) {
    throw new Error("AI changed the number of work bullets. Your work history was not changed.");
  }
  return highlights;
}

async function callGemini(systemPrompt: string, userPrompt: string, model: string, apiKey: string): Promise<string> {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.3 },
    }),
  });

  if (!response.ok) {
    throw new AIRequestError(`AI API request failed (${response.status}): ${await response.text()}`, response.status);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

function parseJson(rawText: string) {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

function isNonemptyString(item: unknown): item is string {
  return typeof item === "string" && item.trim().length > 0;
}

function extractJsonArray(rawText: string): string[] {
  const parsed = parseJson(rawText);
  if (!Array.isArray(parsed) || !parsed.every(isNonemptyString)) {
    throw new Error("AI response was not a JSON array of strings.");
  }
  return parsed;
}
