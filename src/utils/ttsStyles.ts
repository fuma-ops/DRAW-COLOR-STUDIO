/**
 * Voice direction for Gemini TTS. A flat "read this text" gives a flat voice; telling the model
 * HOW to say each line (and with what emotion) is what brings real intonation and expression.
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
  storyteller:
    "You are a warm, playful storyteller reading to a small child at bedtime. Be very expressive and melodic: vary your pitch a lot, stretch the fun words, pause briefly before the key word, and smile while you speak",
  excited:
    "You are a bubbly children's TV presenter who is thrilled to start a new adventure. Sound genuinely excited, with big rising and falling intonation, a bright smile in your voice and lots of energy",
  delighted:
    "React with joyful delight, like a proud teacher who just saw something wonderful. Quick, cheerful, with a little happy laugh in your voice and a clear upward lift on the last word",
  dreamy:
    "Speak in a soft, dreamy, sing-song, magical tone, a little slower, gentle and sparkly, as if sharing a lovely secret",
  amazed:
    "Sound amazed and proud, as if saying 'wow!'. Big expressive pitch changes, a gasp of wonder at the start, warm and joyful",
  celebrate:
    "Celebrate with all your heart! Sound super proud and joyful, warm and sparkly, with a happy laugh, speeding up with excitement and then slowing down softly on the very last words",
};

const FR: Record<NarrationStyle, string> = {
  storyteller:
    "Tu es une conteuse chaleureuse et joueuse qui lit une histoire à un petit enfant. Sois très expressive et mélodieuse : varie beaucoup ta hauteur de voix, étire les mots amusants, fais une petite pause avant le mot important, et souris en parlant",
  excited:
    "Tu es une animatrice d'émission pour enfants, pétillante, ravie de commencer une nouvelle aventure. Sois vraiment enthousiaste, avec une intonation qui monte et descend, un grand sourire dans la voix et beaucoup d'énergie",
  delighted:
    "Réagis avec une joie sincère, comme une maîtresse fière qui voit quelque chose de merveilleux. Rapide, gaie, avec un petit rire dans la voix et une montée claire sur le dernier mot",
  dreamy:
    "Parle d'une voix douce, rêveuse, chantante et magique, un peu plus lentement, comme si tu partageais un joli secret",
  amazed:
    "Sois émerveillée et fière, comme si tu disais « waouh ! ». De grands changements de hauteur, un petit souffle d'émerveillement au début, chaleureuse et joyeuse",
  celebrate:
    "Fête ça de tout ton cœur ! Sois super fière et joyeuse, chaleureuse et scintillante, avec un rire heureux, qui accélère de joie puis ralentit doucement sur les derniers mots",
};

export function buildTtsPrompt(text: string, style: string | undefined, isFrench: boolean): string {
  const bank = isFrench ? FR : EN;
  const direction = bank[(style as NarrationStyle) || 'storyteller'] || bank.storyteller;
  return `${direction}. Say the following text${isFrench ? ' (en français)' : ''}: ${text}`;
}
