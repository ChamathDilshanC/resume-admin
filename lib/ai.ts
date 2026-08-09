const PROJECT_SYSTEM_PROMPT = `You are an expert technical resume writer. Your task is to write professional, ATS-optimized resume bullet points for a software engineering project.

CRITICAL RULES:
1. Write exactly 2 to 3 bullet points.
2. Seamlessly integrate the provided "Technologies Used" into the sentences to explain *how* they were used.
3. Start each bullet point with a strong action verb (e.g., Architected, Engineered, Developed, Built).
4. DO NOT create a separate "Skills" or "Technologies" list.
5. You MUST NOT mention, imply, or name-drop any technology, language, framework, or tool that is not
   explicitly listed in "Technologies Used" — even if it seems typical or likely for a project like this
   based on its name or description. If "Technologies Used" doesn't mention a database, AI library, or
   framework, do not invent one. Only describe capabilities using the exact technologies given.
6. You MUST return ONLY a valid JSON array of strings. Do not include markdown code blocks (like \`\`\`json), labels, or any conversational text.

EXAMPLE INPUT:
Project Name: VibeNet
Project Description: Secure Real-Time End-to-End Encrypted Chat Platform.
Technologies Used: Next.js 16, TypeScript, Web Crypto API, Tailwind CSS, Go, WebSocket, DynamoDB, PostgreSQL, AWS EC2.

EXAMPLE OUTPUT:
[
  "Built a real-time E2EE chat client using Next.js 16 and TypeScript with Web Crypto API-based encryption, styled with Tailwind CSS.",
  "Developed a Go backend with WebSocket-based real-time messaging and DynamoDB/PostgreSQL for data storage, deployed on AWS EC2.",
  "Architected the system as a multi-repository monorepo with Git submodules and comprehensive architecture documentation."
]`;

class AIRequestError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AIRequestError";
  }
}

// 503 = model overloaded ("high demand"), 429 = per-key rate/quota limited.
// Both are worth retrying against a different model or key rather than
// failing the whole request.
function isRetryableStatus(status: number): boolean {
  return status === 503 || status === 429;
}

// Gemini 1.5 and 2.0 model families were shut down during 2026 — only the
// 2.5+/3.x families are still live on v1beta. Cheapest/fastest first.
const GEMINI_MODEL_FALLBACKS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.5-flash-lite"];

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

export async function generateProjectHighlights(params: {
  repoName: string;
  repoDescription: string;
  techStack: string;
}): Promise<string[]> {
  const userPrompt = [
    `Project Name: ${params.repoName}`,
    `Project Description: ${params.repoDescription}`,
    `Technologies Used: ${params.techStack}`,
  ].join("\n");

  return extractJsonArray(await callGeminiWithFallback(PROJECT_SYSTEM_PROMPT, userPrompt));
}

const SUMMARY_SYSTEM_PROMPT = `You are an expert technical resume writer specializing in ATS (Applicant Tracking System) optimization.
Rewrite a candidate's professional summary so it scores maximum ATS relevance.

CRITICAL RULES:
1. 3 to 5 sentences, single paragraph, no first-person pronouns (no "I", "my").
2. Open with "<Adjective> <Target Job Title> with <N>+ years of hands-on experience ..." using the exact
   target job title and the experience anchor provided. If years of experience is 0, omit the anchor.
3. Naturally weave in the most relevant keywords from the provided skill list (including practices such as
   SDLC, OOP, Agile/Scrum, unit testing, code reviews when present in the list). Never mention a skill that
   is not in the provided list.
4. Mention measurable scope only when supplied in the input (e.g. production deployments, freelance delivery).
5. No buzzword stuffing, no cliches like "team player" or "hard worker".
6. Return ONLY the paragraph text - no JSON, no quotes, no markdown.`;

const WORK_BULLETS_SYSTEM_PROMPT = `You are an expert technical resume writer specializing in ATS (Applicant Tracking System) optimization.
Rewrite work-experience bullet points so they score maximum ATS relevance while staying 100% truthful.

CRITICAL RULES:
1. Return the SAME number of bullets as the input, in the same order.
2. Start every bullet with a strong action verb (Developed, Engineered, Implemented, Designed, Built,
   Automated, Optimized, Resolved, Delivered, Integrated).
3. Be outcome-oriented: state what changed or what was delivered, not just the duty.
4. Preserve every fact from the original bullet (technologies, platforms, scope). Never invent technologies,
   employers, or responsibilities that are not in the input.
5. Keep any numbers/metrics present in the original. If the original has no metric, express scale
   qualitatively ("multiple", "end-to-end", "cross-platform") - NEVER fabricate specific numbers.
6. Weave in relevant keywords from the provided skill list only where truthful for that role.
7. Each bullet 1 to 2 lines. You MUST return ONLY a valid JSON array of strings (no markdown, no labels).`;

export async function optimizeSummaryForAts(params: {
  label: string;
  currentSummary: string;
  yearsOfExperience: number;
  skillKeywords: string[];
  workContext: string;
}): Promise<string> {
  const userPrompt = [
    `Target Job Title: ${params.label}`,
    `Years Of Experience Anchor: ${params.yearsOfExperience}`,
    `Current Summary: ${params.currentSummary}`,
    `Work History: ${params.workContext}`,
    `Skill Keywords: ${params.skillKeywords.join(", ")}`,
  ].join("\n");

  const text = await callGeminiWithFallback(SUMMARY_SYSTEM_PROMPT, userPrompt);
  return text.trim().replace(/^"|"$/g, "").trim();
}

export async function optimizeWorkHighlightsForAts(params: {
  position: string;
  company: string;
  highlights: string[];
  skillKeywords: string[];
}): Promise<string[]> {
  const userPrompt = [
    `Role: ${params.position}`,
    `Company: ${params.company}`,
    `Current Bullets:\n${params.highlights.map((h) => `- ${h}`).join("\n")}`,
    `Skill Keywords: ${params.skillKeywords.join(", ")}`,
  ].join("\n");

  return extractJsonArray(await callGeminiWithFallback(WORK_BULLETS_SYSTEM_PROMPT, userPrompt));
}

async function callGemini(systemPrompt: string, userPrompt: string, model: string, apiKey: string): Promise<string> {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      generationConfig: { temperature: 0.3 },
    }),
  });

  if (!response.ok) {
    throw new AIRequestError(`AI API request failed (${response.status}): ${await response.text()}`, response.status);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

function extractJsonArray(rawText: string): string[] {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new Error("AI response was not a JSON array of strings.");
  }
  return parsed;
}
