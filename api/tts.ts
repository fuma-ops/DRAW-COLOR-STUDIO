import { getGeminiClients } from '../src/utils/geminiClients.js';
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
    const clients = getGeminiClients(process.env);
    const hasKey = clients.length > 0;
    if (req.query?.test !== '1') return res.json({ ok: true, hasKey, keys: clients.length, models: TTS_MODELS });
    if (!hasKey) return res.json({ ok: false, hasKey, problem: 'No Gemini key (GEMINI_API_KEY) is set in Vercel (Settings > Environment Variables), or the project was not redeployed after adding it.' });
    const t = Date.now();
    const out = await synthesizeSpeech(clients, 'Hello little artist!', 'delighted', 'Puck', false);
    return res.json({ ok: !!out.result, hasKey, keys: clients.length, ms: Date.now() - t, model: out.result?.model, keyUsed: out.result ? out.result.keyIndex + 1 : undefined, errors: out.errors });
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

    const clients = getGeminiClients(process.env);
    if (clients.length > 0) {
      const out = await synthesizeSpeech(clients, cleanText, styleKey, safeVoice, isFrench);
      if (out.result) {
        audioBase64 = out.result.audioBase64;
        mimeType = out.result.mimeType;
        model = out.result.model;
      } else {
        reason = out.errors.map(e => `${e.model}: ${e.error}`).join(' | ');
      }
    } else {
      reason = 'No Gemini API key is set on the server';
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
