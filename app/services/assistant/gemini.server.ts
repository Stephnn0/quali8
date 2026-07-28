/**
 * Minimal Gemini REST client. Structured-output only (application/json with
 * a responseSchema), temperature 0, 20s timeout, and a never-throws
 * interface — callers get parsed JSON or null and decide their own
 * fallback. No SDK dependency.
 */

const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function generateJson(
  prompt: string,
  responseSchema: Record<string, unknown>,
  timeoutMs = 20_000,
): Promise<unknown | null> {
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
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini request error:", error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
