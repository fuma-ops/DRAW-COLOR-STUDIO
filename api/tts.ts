import { GoogleGenAI } from '@google/genai';

// Vercel serverless version of the /api/tts route from server.ts.
// Uses Gemini TTS when GEMINI_API_KEY is set, otherwise the free Google voice fallback.
const VOICES = ['Aoede', 'Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const { text, voiceName = 'Puck', lang = 'en-US' } = req.body || {};
    const cleanText = typeof text === 'string' ? text.trim() : '';
    if (!cleanText) return res.status(400).json({ error: 'Text is required' });

    const safeVoice = VOICES.includes(voiceName) ? voiceName : 'Aoede';
    const l = String(lang).toLowerCase();
    const isFrench = l.startsWith('fr');
    const safeLang = isFrench ? 'fr' : l.includes('gb') || l.includes('uk') ? 'en-uk' : 'en';
    // Natural-language style direction: makes Gemini TTS sound like a warm storyteller, not a GPS
    const style = isFrench
      ? 'Dis avec une voix chaleureuse, souriante et douce, comme une maîtresse qui parle à des enfants de 4 à 6 ans, avec de petites pauses naturelles'
      : 'Say in a warm, smiling, gentle voice, like a kind teacher talking to children aged 4 to 6, with small natural pauses';

    let audioBase64: string | null = null;
    let mimeType = 'audio/wav';

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash-tts',
          contents: `${style}: ${cleanText}`,
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: safeVoice } } },
          },
        });
        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData?.data) {
          audioBase64 = part.inlineData.data;
          mimeType = part.inlineData.mimeType || 'audio/wav';
        }
      } catch (err) {
        console.error('Gemini TTS failed, using fallback', err);
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
