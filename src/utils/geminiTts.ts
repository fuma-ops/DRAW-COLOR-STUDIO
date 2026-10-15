import type { GoogleGenAI } from '@google/genai';
import { buildTtsPrompt } from './ttsStyles';

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

const cooldownUntil = new Map<string, number>();

export interface SynthResult {
  audioBase64: string;
  mimeType: string;
  model: string;
}

export async function synthesizeSpeech(
  ai: GoogleGenAI,
  text: string,
  style: string | undefined,
  voiceName: string,
  isFrench: boolean
): Promise<SynthResult | null> {
  for (const model of TTS_MODELS) {
    if ((cooldownUntil.get(model) || 0) > Date.now()) continue;
    try {
      const response = await ai.models.generateContent({
        model,
        contents: buildTtsPrompt(text, style, isFrench),
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      });
      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part?.inlineData?.data) {
        return { audioBase64: part.inlineData.data, mimeType: part.inlineData.mimeType || 'audio/wav', model };
      }
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        cooldownUntil.set(model, Date.now() + 60 * 60 * 1000); // skip this model for an hour
      }
      console.warn(`TTS model ${model} unavailable, trying the next one`);
    }
  }
  return null;
}
