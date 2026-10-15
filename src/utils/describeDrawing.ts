/**
 * Optional AI naming of a drawing's shapes (works for ANY object, not just creatures).
 * Server side: builds the vision prompt and parses the answer. The client falls back to
 * neutral wording ("Main Shape", "Next Shape"...) whenever this is unavailable.
 */
import type { GoogleGenAI } from '@google/genai';

export interface DescribeRequestStep {
  n: number; // step number
  currentName: string; // neutral name already given by the geometry analysis
  areaPct: number;
  box: [number, number, number, number]; // x%, y%, w%, h% of the picture
}

export interface DescribedStep {
  n: number;
  nameEn: string;
  introEn: string;
  nameFr: string;
  introFr: string;
}

export interface DescribeResult {
  objectEn: string;
  objectFr: string;
  steps: DescribedStep[];
}

export async function describeDrawing(
  ai: GoogleGenAI,
  imageBase64: string,
  steps: DescribeRequestStep[]
): Promise<DescribeResult | null> {
  const list = steps
    .map(
      s =>
        `- step ${s.n}: draws the shape(s) located at x=${s.box[0]}%, y=${s.box[1]}%, width=${s.box[2]}%, height=${s.box[3]}% of the picture (about ${s.areaPct}% of the drawing's size)`
    )
    .join('\n');

  const prompt = `You are writing a drawing tutorial for children aged 4 to 6. The picture is a colored cartoon drawing.
1. Say what the drawing is (one or two simple words, for example "cup", "house", "bee", "sun").
2. A teacher will redraw it in ${steps.length} steps. Each step draws these shapes:
${list}
For EACH step, say which part of the object that step draws, using simple child words (for example "the cup", "the handle", "the roof", "the petals"). Give a short spoken sentence the teacher says BEFORE drawing it: cheerful, expressive, at most 18 words, mentioning the part by name. Never call something a head, body, wing or foot unless the drawing really is a creature with that part.
Answer ONLY with JSON in exactly this form (English AND French):
{"objectEn":"","objectFr":"","steps":[{"n":1,"nameEn":"","introEn":"","nameFr":"","introFr":""}]}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [{ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }, { text: prompt }],
        },
      ],
      config: { responseMimeType: 'application/json', temperature: 0.6 },
    });
    const raw = (response.text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const data = JSON.parse(raw) as DescribeResult;
    if (!data || !Array.isArray(data.steps)) return null;
    return {
      objectEn: String(data.objectEn || '').slice(0, 40),
      objectFr: String(data.objectFr || '').slice(0, 40),
      steps: data.steps
        .filter(s => s && typeof s.n === 'number')
        .map(s => ({
          n: s.n,
          nameEn: String(s.nameEn || '').slice(0, 40),
          introEn: String(s.introEn || '').slice(0, 220),
          nameFr: String(s.nameFr || '').slice(0, 40),
          introFr: String(s.introFr || '').slice(0, 220),
        })),
    };
  } catch (err) {
    console.error('describeDrawing failed', err);
    return null;
  }
}
