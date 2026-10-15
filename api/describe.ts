import { GoogleGenAI } from '@google/genai';
import { describeDrawing } from '../src/utils/describeDrawing';

// Vercel serverless version of the /api/describe route from server.ts (needs GEMINI_API_KEY).
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'No GEMINI_API_KEY configured' });
  try {
    const { image, steps } = req.body || {};
    if (typeof image !== 'string' || !Array.isArray(steps)) return res.status(400).json({ error: 'image and steps are required' });
    const base64 = image.replace(/^data:image\/\w+;base64,/, '');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await describeDrawing(ai, base64, steps.slice(0, 20));
    if (!result) return res.status(502).json({ error: 'Could not describe the drawing' });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'describe failed' });
  }
}
