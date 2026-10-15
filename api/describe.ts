import { getGeminiClients } from '../src/utils/geminiClients.js';
import { describeDrawing } from '../src/utils/describeDrawing.js';

// Vercel serverless version of the /api/describe route from server.ts (needs GEMINI_API_KEY).
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const clients = getGeminiClients(process.env);
  if (clients.length === 0) return res.status(503).json({ error: 'No GEMINI_API_KEY configured' });
  try {
    const { image, steps } = req.body || {};
    if (typeof image !== 'string' || !Array.isArray(steps)) return res.status(400).json({ error: 'image and steps are required' });
    const base64 = image.replace(/^data:image\/\w+;base64,/, '');
    let result = null;
    for (const ai of clients) {
      result = await describeDrawing(ai, base64, steps.slice(0, 20));
      if (result) break;
    }
    if (!result) return res.status(502).json({ error: 'Could not describe the drawing' });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'describe failed' });
  }
}
