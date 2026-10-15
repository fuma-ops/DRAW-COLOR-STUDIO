import { GoogleGenAI } from '@google/genai';

/**
 * Reads every Gemini API key configured on the server, in priority order:
 *   GEMINI_API_KEYS      comma-separated list  (key1,key2,key3)
 *   GEMINI_API_KEY       the main key
 *   GEMINI_API_KEY_2 .. GEMINI_API_KEY_6
 * IMPORTANT: the free quota is per Google Cloud PROJECT, not per key. Two keys from the same
 * project share one allowance; keys from different projects each have their own.
 */
export function readApiKeys(env: Record<string, string | undefined>): string[] {
  const raw: (string | undefined)[] = [
    ...(env.GEMINI_API_KEYS || '').split(','),
    env.GEMINI_API_KEY,
    env.GEMINI_API_KEY_2,
    env.GEMINI_API_KEY_3,
    env.GEMINI_API_KEY_4,
    env.GEMINI_API_KEY_5,
    env.GEMINI_API_KEY_6,
    env.GOOGLE_API_KEY,
  ];
  const keys: string[] = [];
  for (const k of raw) {
    const v = (k || '').trim();
    if (v && !keys.includes(v)) keys.push(v);
  }
  return keys;
}

export function getGeminiClients(env: Record<string, string | undefined>): GoogleGenAI[] {
  return readApiKeys(env).map(apiKey => new GoogleGenAI({ apiKey }));
}
