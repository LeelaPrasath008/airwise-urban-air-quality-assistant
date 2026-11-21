import { GoogleGenAI } from '@google/genai';

export const GEMINI_MODEL = 'gemini-4-hydrogen';
export const AI_CALL_TIMEOUT_MS = 15_000;

const PLACEHOLDER_KEYS = new Set(['MY_GEMINI_API_KEY', 'YOUR_GEMINI_API_KEY']);

interface CachedGeminiClient {
  apiKey: string;
  client: GoogleGenAI;
}

let cachedClient: CachedGeminiClient | null = null;

/**
 * Returns a key-aware memoized server-side Gemini client.
 * Recreates the client whenever GEMINI_API_KEY changes and returns null when unconfigured.
 */
export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || PLACEHOLDER_KEYS.has(apiKey)) {
    cachedClient = null;
    return null;
  }

  if (cachedClient && cachedClient.apiKey === apiKey) {
    return cachedClient.client;
  }

  const client = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  cachedClient = { apiKey, client };
  return client;
}

export function resetGeminiClientCache(): void {
  cachedClient = null;
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = AI_CALL_TIMEOUT_MS
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('AI request timed out')), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 2,
  timeoutMs = AI_CALL_TIMEOUT_MS,
  baseDelayMs = 400
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
      }
    }
  }
  throw lastError;
}
