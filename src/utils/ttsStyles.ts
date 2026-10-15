/**
 * Voice direction for Gemini TTS. A flat "read this text" gives a flat voice; telling the model
 * HOW to say each line gives it intonation and expression.
 *
 * IMPORTANT (measured with the real API): keep the direction SHORT, like "Say cheerfully:".
 * Long "acting" paragraphs made the voice drag (20+ seconds for one short sentence);
 * short directions keep a natural, lively pace (4-9 seconds) and still change the tone.
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

const EN: Record<NarrationStyle, string> = {
  storyteller: 'Say warmly and playfully, like telling a story to a little child',
  excited: 'Say with big, bubbly excitement',
  delighted: 'Say with joyful delight',
  dreamy: 'Say softly and dreamily',
  amazed: 'Say with wonder and amazement',
  celebrate: 'Say proudly and joyfully, as a celebration',
};

const FR: Record<NarrationStyle, string> = {
  storyteller: 'Dis chaleureusement et avec joie, comme en racontant une histoire à un petit enfant',
  excited: 'Dis avec beaucoup d’enthousiasme et de pétillant',
  delighted: 'Dis avec une joie sincère',
  dreamy: 'Dis doucement et avec une voix rêveuse',
  amazed: 'Dis avec émerveillement',
  celebrate: 'Dis avec fierté et joie, comme pour une fête',
};

export function buildTtsPrompt(text: string, style: string | undefined, isFrench: boolean): string {
  const bank = isFrench ? FR : EN;
  const direction = bank[(style as NarrationStyle) || 'storyteller'] || bank.storyteller;
  return `${direction}: ${text}`;
}
