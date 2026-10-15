import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

const ai = new GoogleGenAI();

// In-memory cache for audio snippets (letters, words, praises)
const ttsAudioCache = new Map<string, { audioBase64: string; mimeType: string }>();
let geminiQuotaExhaustedUntil = Date.now() + 11 * 60 * 60 * 1000; // Cooldown for current exhausted quota window

// High-fidelity Text-To-Speech endpoint for English Learning & Video Audio Stream
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voiceName = 'Puck', lang = 'en-US' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const cleanText = text.trim();
    if (!cleanText) {
      return res.status(400).json({ error: 'Empty text' });
    }

    const safeVoice = ['Aoede', 'Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'].includes(voiceName)
      ? voiceName
      : 'Aoede';

    const safeLang = String(lang).toLowerCase().includes('gb') || String(lang).toLowerCase().includes('uk')
      ? 'en-uk'
      : 'en';

    const cacheKey = `${safeVoice}:${safeLang}:${cleanText.toLowerCase()}`;
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
          contents: cleanText,
          config: {
            responseModalities: ['AUDIO'],
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
