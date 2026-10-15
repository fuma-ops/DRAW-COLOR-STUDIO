import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { TTS_VOICES } from './src/utils/ttsStyles.js';
import { synthesizeSpeech, TTS_MODELS } from './src/utils/geminiTts.js';
import { describeDrawing } from './src/utils/describeDrawing.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '4mb' }));

const ai = new GoogleGenAI();

// In-memory cache for audio snippets (letters, words, praises)
const ttsAudioCache = new Map<string, { audioBase64: string; mimeType: string }>();

// Quick diagnostics: /api/tts (status) and /api/tts?test=1 (runs one real voice call)
app.get('/api/tts', async (req, res) => {
  const hasKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  if (req.query.test !== '1') return res.json({ ok: true, hasKey, models: TTS_MODELS });
  const t = Date.now();
  const out = await synthesizeSpeech(ai, 'Hello little artist!', 'delighted', 'Puck', false);
  return res.json({ ok: !!out.result, hasKey, ms: Date.now() - t, model: out.result?.model, errors: out.errors });
});

// High-fidelity Text-To-Speech endpoint for English Learning & Video Audio Stream
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voiceName = 'Puck', lang = 'en-US', style: styleKey } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const cleanText = text.trim();
    if (!cleanText) {
      return res.status(400).json({ error: 'Empty text' });
    }

    const safeVoice = TTS_VOICES.includes(voiceName)
      ? voiceName
      : 'Puck';

    const langLower = String(lang).toLowerCase();
    const isFrench = langLower.startsWith('fr');
    const safeLang = isFrench ? 'fr' : langLower.includes('gb') || langLower.includes('uk') ? 'en-uk' : 'en';
    const cacheKey = `${safeVoice}:${safeLang}:${styleKey || ''}:${cleanText.toLowerCase()}`;
    if (ttsAudioCache.has(cacheKey)) {
      return res.json(ttsAudioCache.get(cacheKey));
    }

    // Gemini TTS: tries several models in turn (each has its own free daily allowance)
    let audioBase64: string | null = null;
    let mimeType = 'audio/wav';
    let source: 'gemini' | 'fallback' = 'gemini';
    let model: string | undefined;
    let reason = '';

    const out = await synthesizeSpeech(ai, cleanText, styleKey, safeVoice, isFrench);
    if (out.result) {
      audioBase64 = out.result.audioBase64;
      mimeType = out.result.mimeType;
      model = out.result.model;
    } else {
      reason = out.errors.map(e => `${e.model}: ${e.error}`).join(' | ');
    }

    // High-quality, reliable, quota-free fallback using Google natural voice stream
    if (!audioBase64) {
      source = 'fallback';
      try {
        const tl = safeLang;
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=${tl}&client=tw-ob`;
        const fetchResp = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://translate.google.com/',
          },
        });
        if (fetchResp.ok) {
          const arrayBuf = await fetchResp.arrayBuffer();
          audioBase64 = Buffer.from(arrayBuf).toString('base64');
          mimeType = 'audio/mpeg';
        }
      } catch (fallbackErr) {
        console.error('Google voice fallback error:', fallbackErr);
      }
    }

    if (audioBase64) {
      const result = { audioBase64, mimeType, source, model, reason };
      // only keep the good Gemini voice in the cache (never freeze the plain fallback voice)
      if (source === 'gemini') ttsAudioCache.set(cacheKey, result);
      return res.json(result);
    }

    return res.status(500).json({ error: 'Could not generate TTS audio' });
  } catch (err: any) {
    console.error('TTS Generation error:', err);
    return res.status(500).json({ error: err.message || 'TTS generation failed' });
  }
});

// Optional AI naming of the drawing's shapes (works for any object, not only creatures)
app.post('/api/describe', async (req, res) => {
  try {
    const { image, steps } = req.body || {};
    if (typeof image !== 'string' || !Array.isArray(steps)) {
      return res.status(400).json({ error: 'image and steps are required' });
    }
    const base64 = image.replace(/^data:image\/\w+;base64,/, '');
    const result = await describeDrawing(ai, base64, steps.slice(0, 20));
    if (!result) return res.status(502).json({ error: 'Could not describe the drawing' });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'describe failed' });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
