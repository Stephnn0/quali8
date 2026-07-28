/**
 * Minimal Gemini REST client. Structured-output only (application/json with
 * a responseSchema), temperature 0, 20s timeout, and a never-throws
 * interface — callers get parsed JSON + token usage, or null, and decide
 * their own fallback. No SDK dependency.
 */

export const GEMINI_MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export type GeminiUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type GeminiResult = {
  data: unknown;
  usage: GeminiUsage | null;
};

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function generateJson(
  prompt: string,
  responseSchema: Record<string, unknown>,
  timeoutMs = 20_000,
): Promise<GeminiResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
    });

    if (!response.ok) {
      console.error("Gemini request failed:", response.status);
      return null;
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const meta = payload.usageMetadata;
    return {
      data: JSON.parse(text),
      usage: meta
        ? {
            inputTokens: meta.promptTokenCount ?? 0,
            outputTokens: meta.candidatesTokenCount ?? 0,
            totalTokens: meta.totalTokenCount ?? 0,
          }
        : null,
    };
  } catch (error) {
    console.error("Gemini request error:", error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
