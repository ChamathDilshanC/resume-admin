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

// 503 = model overloaded ("high demand"), 429 = rate limited. Both are worth
// retrying against a different model rather than failing the whole request.
function isRetryableStatus(status: number): boolean {
  return status === 503 || status === 429;
}

const GITHUB_MODELS_FALLBACKS = ["openai/gpt-4o-mini", "openai/gpt-4o", "meta/meta-llama-3.1-8b-instruct"];
const GEMINI_MODEL_FALLBACKS = ["gemini-flash-latest", "gemini-2.0-flash", "gemini-1.5-flash"];

async function callGithubModels(systemPrompt: string, userPrompt: string, model: string): Promise<string> {
  const apiUrl = process.env.AI_API_URL || "https://models.github.ai/inference/chat/completions";

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new AIRequestError(`AI API request failed (${response.status}): ${await response.text()}`, response.status);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callGemini(systemPrompt: string, userPrompt: string, model: string): Promise<string> {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.AI_API_KEY}`;

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

export async function generateProjectHighlights(params: {
  repoName: string;
  repoDescription: string;
  techStack: string;
}): Promise<string[]> {
  if (!process.env.AI_API_KEY) {
    throw new Error("AI_API_KEY is not configured for resume-admin.");
  }

  const userPrompt = [
    `Project Name: ${params.repoName}`,
    `Project Description: ${params.repoDescription}`,
    `Technologies Used: ${params.techStack}`,
  ].join("\n");

  const provider = process.env.AI_PROVIDER || "github-models";
  const configuredModel = process.env.AI_MODEL;
  const fallbacks = provider === "gemini" ? GEMINI_MODEL_FALLBACKS : GITHUB_MODELS_FALLBACKS;
  const modelsToTry = configuredModel
    ? [configuredModel, ...fallbacks.filter((model) => model !== configuredModel)]
    : fallbacks;

  let lastError: unknown;
  for (const model of modelsToTry) {
    try {
      const rawText =
        provider === "gemini"
          ? await callGemini(PROJECT_SYSTEM_PROMPT, userPrompt, model)
          : await callGithubModels(PROJECT_SYSTEM_PROMPT, userPrompt, model);
      return extractJsonArray(rawText);
    } catch (error) {
      lastError = error;
      if (!(error instanceof AIRequestError) || !isRetryableStatus(error.status)) {
        throw error;
      }
      // Overloaded/rate-limited: fall through and retry with the next model.
    }
  }

  throw lastError;
}
