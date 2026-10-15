/**
 * Voice direction for Gemini TTS. A flat "read this text" gives a flat voice; telling the model
 * HOW to say each line gives it intonation and expression.
 *
 * IMPORTANT (verified by transcribing the real audio):
 *  - "Say warmly: TEXT" gets READ ALOUD by some models (e.g. gemini-3.8-flash-lite-tts says
 *    "Say with joyful delight, Ta-da!..."). Never put the direction inline with the text.
 *  - The documented "DIRECTOR'S NOTES + TRANSCRIPT" structure keeps the notes silent: only the
 *    TRANSCRIPT part is spoken. Keep the notes SHORT (long ones made the voice drag).
 * Shared by the local server and the Vercel function.
 */
export type NarrationStyle = 'storyteller' | 'excited' | 'delighted' | 'dreamy' | 'amazed' | 'celebrate';

export const TTS_VOICES = [
  'Puck', // upbeat
  'Zephyr', // bright
  'Leda', // youthful
  'Aoede', // breezy
  'Sulafat', // warm
  'Kore',
  'Charon',
  'Fenrir',
];

// Style notes: adjectives describing the performance (never imperative sentences like "Say ...")
const NOTES: Record<NarrationStyle, string> = {
  storyteller: 'warm, playful and melodic, like a kind storyteller talking to a small child',
  excited: 'bubbly and very excited, big smile in the voice',
  delighted: 'joyful and delighted, bright and quick',
  dreamy: 'soft, dreamy and gentle',
  amazed: 'amazed and impressed, full of wonder',
  celebrate: 'proud and joyful, celebrating',
};

export function buildTtsPrompt(text: string, style: string | undefined, isFrench: boolean): string {
  const notes = NOTES[(style as NarrationStyle) || 'storyteller'] || NOTES.storyteller;
  return [
    "### DIRECTOR'S NOTES",
    `Style: ${notes}.`,
    `Pace: lively and natural.${isFrench ? ' Language: French.' : ''}`,
    '',
    '### TRANSCRIPT',
    text,
  ].join('\n');
}
