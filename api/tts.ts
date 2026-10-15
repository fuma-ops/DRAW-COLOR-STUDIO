import { GoogleGenAI } from '@google/genai';
import { TTS_VOICES } from '../src/utils/ttsStyles';
import { synthesizeSpeech } from '../src/utils/geminiTts';

// Vercel serverless version of the /api/tts route from server.ts.
// Uses Gemini TTS when GEMINI_API_KEY is set, otherwise the free Google voice fallback.

export default async function handler(req: any, res: any) {
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

    if (process.env.GEMINI_API_KEY) {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const synth = await synthesizeSpeech(ai, cleanText, styleKey, safeVoice, isFrench);
      if (synth) {
        audioBase64 = synth.audioBase64;
        mimeType = synth.mimeType;
      }
    }

    if (!audioBase64) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=${safeLang}&client=tw-ob`;
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://translate.google.com/' },
      });
      if (r.ok) {
        audioBase64 = Buffer.from(await r.arrayBuffer()).toString('base64');
        mimeType = 'audio/mpeg';
      }
    }

    if (!audioBase64) return res.status(500).json({ error: 'Could not generate TTS audio' });
    return res.json({ audioBase64, mimeType });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'TTS generation failed' });
  }
}
