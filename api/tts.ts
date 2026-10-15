import { GoogleGenAI } from '@google/genai';
import { TTS_VOICES } from '../src/utils/ttsStyles.js';
import { synthesizeSpeech, TTS_MODELS } from '../src/utils/geminiTts.js';

// Vercel serverless version of the /api/tts route from server.ts.
// Uses Gemini TTS when GEMINI_API_KEY is set, otherwise the free Google voice fallback.
//
// Quick diagnostics (open these URLs in a browser):
//   /api/tts            -> {ok, hasKey, models}
//   /api/tts?test=1     -> runs ONE real voice call and tells you exactly why it works or fails

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const hasKey = !!process.env.GEMINI_API_KEY;
    if (req.query?.test !== '1') return res.json({ ok: true, hasKey, models: TTS_MODELS });
    if (!hasKey) return res.json({ ok: false, hasKey, problem: 'GEMINI_API_KEY is not set in Vercel (Settings > Environment Variables), or the project was not redeployed after adding it.' });
    const t = Date.now();
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const out = await synthesizeSpeech(ai, 'Hello little artist!', 'delighted', 'Puck', false);
    return res.json({ ok: !!out.result, hasKey, ms: Date.now() - t, model: out.result?.model, errors: out.errors });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const { text, voiceName = 'Puck', lang = 'en-US', style: styleKey } = req.body || {};
    const cleanText = typeof text === 'string' ? text.trim() : '';
    if (!cleanText) return res.status(400).json({ error: 'Text is required' });

    const safeVoice = TTS_VOICES.includes(voiceName) ? voiceName : 'Puck';
    const l = String(lang).toLowerCase();
    const isFrench = l.startsWith('fr');
    const safeLang = isFrench ? 'fr' : l.includes('gb') || l.includes('uk') ? 'en-uk' : 'en';

    let audioBase64: string | null = null;
    let mimeType = 'audio/wav';
    let source: 'gemini' | 'fallback' = 'gemini';
    let model: string | undefined;
    let reason = '';

    if (process.env.GEMINI_API_KEY) {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const out = await synthesizeSpeech(ai, cleanText, styleKey, safeVoice, isFrench);
      if (out.result) {
        audioBase64 = out.result.audioBase64;
        mimeType = out.result.mimeType;
        model = out.result.model;
      } else {
        reason = out.errors.map(e => `${e.model}: ${e.error}`).join(' | ');
      }
    } else {
      reason = 'GEMINI_API_KEY is not set on the server';
    }

    if (!audioBase64) {
      source = 'fallback';
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=${safeLang}&client=tw-ob`;
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://translate.google.com/' },
      });
      if (r.ok) {
        audioBase64 = Buffer.from(await r.arrayBuffer()).toString('base64');
        mimeType = 'audio/mpeg';
      }
    }

    if (!audioBase64) return res.status(500).json({ error: 'Could not generate TTS audio', reason });
    return res.json({ audioBase64, mimeType, source, model, reason });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'TTS generation failed' });
  }
}
