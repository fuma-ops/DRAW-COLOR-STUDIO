import type { GoogleGenAI } from '@google/genai';
import { buildTtsPrompt } from './ttsStyles.js';

/**
 * Gemini TTS models, best first. On the free tier EACH model has its own small daily allowance
 * (10 requests/day/model), so when one is exhausted (HTTP 429) the next one is tried before
 * falling back to the plain voice.
 */
export const TTS_MODELS = [
  'gemini-3.8-flash-tts',
  'gemini-3.1-flash-tts-preview',
  'gemini-3.8-flash-lite-tts',
  'gemini-2.5-flash-preview-tts',
];

const cooldownUntil = new Map<string, number>(); // `${keyIndex}:${model}` -> timestamp
const badKeyUntil = new Map<number, number>(); // keyIndex -> timestamp (invalid / forbidden key)

export interface SynthResult {
  audioBase64: string;
  mimeType: string;
  model: string;
  keyIndex: number;
}

export interface SynthOutcome {
  result: SynthResult | null;
  /** why each model/key failed (shown in diagnostics so "robotic voice" is never a mystery) */
  errors: { model: string; error: string }[];
}

function shortError(err: any): string {
  const msg = String(err?.message || err || 'unknown error');
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) return 'quota exhausted (429): free tier is 10 requests/day/model/project';
  if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) return 'permission denied (403): is the API key valid and enabled?';
  if (msg.includes('400') && /API key/i.test(msg)) return 'invalid API key (400)';
  if (msg.includes('404')) return 'model not found (404)';
  if (msg.includes('503')) return 'model overloaded (503)';
  return msg.replace(/\s+/g, ' ').slice(0, 160);
}

/**
 * Tries the best model first on every key, then the next model, and so on.
 * With several keys (from different projects) the daily allowance adds up.
 */
export async function synthesizeSpeech(
  clients: GoogleGenAI[],
  text: string,
  style: string | undefined,
  voiceName: string,
  isFrench: boolean
): Promise<SynthOutcome> {
  const errors: { model: string; error: string }[] = [];
  const many = clients.length > 1;
  for (const model of TTS_MODELS) {
    for (let k = 0; k < clients.length; k++) {
      const label = many ? `${model} (key ${k + 1})` : model;
      if ((badKeyUntil.get(k) || 0) > Date.now()) {
        errors.push({ model: label, error: 'skipped (key rejected recently)' });
        continue;
      }
      if ((cooldownUntil.get(`${k}:${model}`) || 0) > Date.now()) {
        errors.push({ model: label, error: 'skipped (quota exhausted recently)' });
        continue;
      }
      try {
        const response = await clients[k].models.generateContent({
          model,
          contents: buildTtsPrompt(text, style, isFrench),
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          },
        });
        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData?.data) {
          return {
            result: { audioBase64: part.inlineData.data, mimeType: part.inlineData.mimeType || 'audio/wav', model, keyIndex: k },
            errors,
          };
        }
        errors.push({ model: label, error: 'no audio in the response' });
      } catch (err: any) {
        const msg = String(err?.message || '');
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
          cooldownUntil.set(`${k}:${model}`, Date.now() + 60 * 60 * 1000); // skip it for an hour
        } else if (msg.includes('API key') || msg.includes('403') || msg.includes('PERMISSION_DENIED')) {
          badKeyUntil.set(k, Date.now() + 10 * 60 * 1000); // skip a rejected key for 10 minutes
        }
        errors.push({ model: label, error: shortError(err) });
        console.warn(`TTS ${label} unavailable: ${shortError(err)}`);
      }
    }
  }
  return { result: null, errors };
}
