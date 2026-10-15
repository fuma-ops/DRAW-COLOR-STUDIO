import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { buildTtsPrompt, TTS_VOICES } from './src/utils/ttsStyles';
import { describeDrawing } from './src/utils/describeDrawing';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '4mb' }));

const ai = new GoogleGenAI();

// In-memory cache for audio snippets (letters, words, praises)
const ttsAudioCache = new Map<string, { audioBase64: string; mimeType: string }>();
let geminiQuotaExhaustedUntil = 0; // Gemini TTS is tried first; a cooldown is only set after a real 429

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

    // Call Gemini TTS model if quota is active
    let audioBase64: string | null = null;
    let mimeType = 'audio/wav';

    if (Date.now() >= geminiQuotaExhaustedUntil) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash-tts',
          contents: buildTtsPrompt(cleanText, styleKey, isFrench),
          config: {
            responseModalities: ['AUDIO'],
            temperature: 1.0,
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: safeVoice,
                },
              },
            },
          },
        });
        const candidate = response.candidates?.[0];
        const part = candidate?.content?.parts?.[0];
        if (part?.inlineData?.data) {
          audioBase64 = part.inlineData.data;
          mimeType = part.inlineData.mimeType || 'audio/wav';
        }
      } catch (primaryErr: any) {
        const msg = String(primaryErr?.message || '');
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
          geminiQuotaExhaustedUntil = Date.now() + 60 * 60 * 1000;
        }
      }
    }

    // High-quality, reliable, quota-free fallback using Google natural voice stream
    if (!audioBase64) {
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
      const result = {
        audioBase64,
        mimeType,
      };
      ttsAudioCache.set(cacheKey, result);
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
