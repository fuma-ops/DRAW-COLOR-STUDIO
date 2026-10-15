import { KidDrawingStep, KidColoringStep } from './kidDrawingSteps';
import type { NarrationStyle } from './ttsStyles';

type Lang = 'en' | 'fr';

/** A narrator line + HOW to say it (emotion), so the voice has real intonation. */
export interface StyledLine {
  text: string;
  style: NarrationStyle;
}

export interface StepLines {
  intro: StyledLine;
  outro: StyledLine;
}

export interface TutorialScript {
  welcome: StyledLine;
  draw: StepLines[];
  drawDone: StyledLine;
  color: StepLines[];
  finale: StyledLine;
  all: StyledLine[];
}

type Kind = 'head' | 'body' | 'wing' | 'antenna' | 'tail' | 'feet' | 'eyes' | 'brows' | 'smile' | 'stripes' | 'main' | 'little' | 'dots' | 'generic';

// Written to be SPOKEN: short sentences, interjections, sound effects, and questions give the voice
// something to perform (rise, pause, smile) instead of reading flat text.
const INTROS: Record<Lang, Record<Kind, string[]>> = {
  en: {
    head: [
      "Okay, ready? Let's start with the head! A big, big, round circle... just like the sun!",
      "Ooh, first, the head! Follow the dots... nice and round... like a big, happy balloon!",
      "Pencil up! We begin with a great big round head. Here we go!",
    ],
    body: [
      "Now, the body! Ooh, a big, cozy, chubby one, right next to the head!",
      "Next up... the tummy! Follow the dots, slowly, slowly... you're doing great!",
      "Let's add the body now. No hurry, take your time!",
    ],
    wing: [
      "Ooh, it's wing time! A soft, curvy wing... flap, flap, flap!",
      "Let's give our friend a wing, so it can fly up, up, up!",
      "Here comes a wing! Follow the dots all the way around... swoosh!",
    ],
    antenna: [
      "Two funny antennae on top! Boing, boing!",
      "Now the antennae! Little wiggly sticks... with a round ball on the end!",
    ],
    tail: ["And now, a pointy little tail at the back... zip, zip!", "Let's finish the back with a tiny pointy tail!"],
    feet: [
      "Now, the tiny feet! Ready? One... two... three!",
      "Three tiny little feet, so our friend can walk! Tap, tap, tap!",
    ],
    eyes: [
      "Ooh, now the eyes! Two big, shiny eyes... so our friend can see us!",
      "Time for the eyes! Look at me... blink, blink!",
    ],
    brows: ["Little eyebrows now! Swish, swish!", "Two tiny eyebrows... to look extra, extra cute!"],
    smile: ["And now... the best part! A big, happy smile!", "Last one! A lovely, happy smile... say cheese!"],
    stripes: ["Now the stripes! One by one... nice and steady!"],
    main: [
      "Okay, ready? Let's start with the big main shape! Follow the dots... nice and slow!",
      "Pencil up! First, the biggest shape. Follow the dots all the way around!",
      "Ooh, let's begin with the big shape in the middle. Here we go!",
    ],
    little: [
      "Now the little shapes! One... by one... you're doing great!",
      "Ooh, some little ones now! Follow the dots, nice and gently!",
    ],
    dots: ["Now the little dots! Dot... dot... dot!", "Ooh, tiny round dots now! Follow the circles!"],
    generic: [
      "Next shape! Follow the dotted line with me.",
      "You're doing great! Let's draw the next part!",
      "Ooh, another shape! Look at the dots... and follow them!",
    ],
  },
  fr: {
    head: [
      "Prêt ? On commence par la tête ! Un grand, grand rond... comme un soleil !",
      "Oh, d'abord, la tête ! Suis les points... tout doucement... comme un gros ballon tout content !",
      "Crayon en main ! On commence par une grosse tête toute ronde. C'est parti !",
    ],
    body: [
      "Maintenant, le corps ! Oh, un gros corps tout rond, juste à côté de la tête !",
      "Ensuite... le gros ventre ! Suis les points, doucement, doucement... tu fais ça très bien !",
      "Ajoutons le corps. Pas de pression, prends ton temps !",
    ],
    wing: [
      "Oh, c'est l'heure de l'aile ! Une aile toute douce... flap, flap, flap !",
      "Donnons une aile à notre ami, pour qu'il vole, vole, vole !",
      "Voici une aile ! Suis les points jusqu'au bout... zouuu !",
    ],
    antenna: ["Deux drôles d'antennes sur la tête ! Boing, boing !", "Maintenant les antennes ! De petits bâtons qui gigotent... avec une boule au bout !"],
    tail: ["Et maintenant, une petite queue pointue derrière... zip, zip !", "Terminons l'arrière avec une petite queue pointue !"],
    feet: ["Maintenant, les petits pieds ! Prêt ? Un... deux... trois !", "Trois petits pieds pour marcher ! Tap, tap, tap !"],
    eyes: ["Oh, maintenant les yeux ! Deux grands yeux brillants... pour nous voir !", "C'est l'heure des yeux ! Regarde-moi... clin d'œil !"],
    brows: ["Les petits sourcils maintenant ! Swish, swish !", "Deux petits sourcils... pour être encore plus mignon !"],
    smile: ["Et maintenant... le meilleur ! Un grand sourire !", "Le dernier ! Un joli sourire tout content... ouistiti !"],
    stripes: ["Maintenant les rayures ! Une par une... tranquillement !"],
    main: [
      "Prêt ? On commence par la grande forme principale ! Suis les points... tout doucement !",
      "Crayon en main ! D'abord, la plus grande forme. Suis les points jusqu'au bout !",
      "Oh, commençons par la grande forme du milieu. C'est parti !",
    ],
    little: [
      "Maintenant les petites formes ! Une... par une... tu fais ça très bien !",
      "Oh, des petites formes maintenant ! Suis les points, tout doucement !",
    ],
    dots: ["Maintenant les petits points ! Point... point... point !", "Oh, de minuscules ronds maintenant ! Suis les cercles !"],
    generic: [
      "Une nouvelle forme ! Suis la ligne de points avec moi.",
      "Tu fais ça très bien ! Dessinons la partie suivante !",
      "Oh, encore une forme ! Regarde les points... et suis-les !",
    ],
  },
};

const OUTROS: Record<Lang, string[]> = {
  en: [
    "Ta-da! Look at that! Beautiful!",
    "Yay! Wonderful!",
    "Woohoo! Great job!",
    "Perfect! You're so good at this!",
    "Ooh, so pretty! Nice work, little artist!",
    "Hooray! High five!",
    "Wow! You did it!",
  ],
  fr: [
    "Tada ! Regarde ça ! Magnifique !",
    "Youpi ! Merveilleux !",
    "Hourra ! Bravo !",
    "Parfait ! Tu es trop fort !",
    "Oh, c'est tellement joli ! Joli travail, petit artiste !",
    "Hourra ! Tape-moi dans la main !",
    "Waouh ! Tu as réussi !",
  ],
};

const COLOR_INTROS: Record<Lang, string[]> = {
  en: [
    "Now... let's color with {c}! Ooh, I love this one!",
    "Pick up the {c} pencil... and let's fill this part, nice and soft.",
    "{c}! Oh, what a pretty color!",
    "Time for some {c}... color all the way to the edges!",
  ],
  fr: [
    "Maintenant... colorions avec {c} ! Oh, j'adore celle-là !",
    "Prends le crayon {c}... et remplissons cette partie, tout doucement.",
    "{c} ! Oh, quelle jolie couleur !",
    "C'est le moment du {c}... colorie jusqu'aux bords !",
  ],
};

const COLOR_OUTROS: Record<Lang, string[]> = {
  en: ["So pretty!", "Lovely!", "Ooh, look at that color!", "Yummy colors!", "Beautiful!"],
  fr: ["Tellement joli !", "Adorable !", "Oh, regarde cette couleur !", "De bien jolies couleurs !", "Magnifique !"],
};

const COLOR_NAMES_FR: Record<string, string> = {
  'Honey Yellow': 'jaune miel',
  'Rosy Pink': 'rose bonbon',
  'Pastel Sky Blue': 'bleu ciel',
  'Dark Chocolate': 'marron chocolat',
  'Midnight Black': 'noir',
  'Bright Orange': 'orange vif',
  'Mint Green': 'vert menthe',
  'Dreamy Purple': 'violet rêveur',
  'Vibrant Color': 'couleur magique',
};

function kindOf(step: KidDrawingStep): Kind {
  const n = ` ${step.partNameEn} ${step.partName} `.toLowerCase();
  // whole-word matches only ("Tiny Details" must not match "tail")
  const has = (re: RegExp) => re.test(n);
  if (has(/\b(main shape|forme principale)\b/)) return 'main';
  if (has(/\b(little shapes|petites formes)\b/)) return 'little';
  if (has(/\b(little dots|petits points)\b/)) return 'dots';
  if (has(/\b(tiny details|next shape)\b/)) return 'generic';
  if (has(/\b(head|t[eê]te)\b/)) return 'head';
  if (has(/\b(body|corps)\b/)) return 'body';
  if (has(/\b(wings?|ailes?)\b/)) return 'wing';
  if (has(/\b(antennae|antennas?|antennes?)\b/)) return 'antenna';
  if (has(/\b(tail|queue|stinger)\b/)) return 'tail';
  if (has(/\b(feet|foot|pieds?)\b/)) return 'feet';
  if (has(/\b(eyebrows?|sourcils?)\b/)) return 'brows';
  if (has(/\b(smile|sourire)\b/)) return 'smile';
  if (has(/\b(eyes?|yeux|oeil)\b/)) return 'eyes';
  if (has(/\b(stripes?|rayures?)\b/)) return 'stripes';
  return 'generic';
}

/** Picks a line, never repeating the previous pick of the same bank */
function makePicker() {
  const last = new Map<string, number>();
  let counter = 0;
  return (bank: string[], key: string): string => {
    counter++;
    if (bank.length === 1) return bank[0];
    let i = (counter * 7 + key.length * 3) % bank.length;
    if (last.get(key) === i) i = (i + 1) % bank.length;
    last.set(key, i);
    return bank[i];
  };
}

export function buildTutorialScript(
  drawingSteps: KidDrawingStep[],
  coloringSteps: KidColoringStep[],
  lang: Lang,
  characterName: string
): TutorialScript {
  const pick = makePicker();
  // Only talk about "our <thing>" when we really know what it is; otherwise stay neutral
  const name = (characterName || '').trim();

  const welcome: StyledLine = {
    style: 'excited',
    text:
      lang === 'fr'
        ? `Salut les amis ! Aujourd'hui... on va dessiner ensemble ${name ? `un super, super joli dessin : ${name}` : 'quelque chose de super, super joli'} ! Prenez votre crayon, et suivez les petits points avec moi. Prêts ? C'est parti !`
        : `Hi friends! Today... we're going to draw ${name ? `a super, super cute ${name}` : 'something super, super cute'} together! Grab your pencil, and follow the little dots with me. Ready? Let's go!`,
  };

  const draw: StepLines[] = drawingSteps.map(step => {
    const kind = kindOf(step);
    const aiIntro = (lang === 'fr' ? step.aiIntroFr : step.aiIntroEn) || '';
    return {
      intro: { text: aiIntro || pick(INTROS[lang][kind], `i-${kind}`), style: 'storyteller' },
      outro: { text: pick(OUTROS[lang], 'outro'), style: 'delighted' },
    };
  });

  // Voice calls are limited on the free tier, so only every 2nd color gets a spoken reaction
  const color: StepLines[] = coloringSteps.map((step, idx) => {
    const cname =
      lang === 'fr' ? COLOR_NAMES_FR[step.colorNameEn] || step.colorNameEn.toLowerCase() : step.colorNameEn.toLowerCase();
    return {
      intro: { text: pick(COLOR_INTROS[lang], 'ci').replace('{c}', cname), style: 'dreamy' },
      outro: { text: idx % 2 === 1 ? pick(COLOR_OUTROS[lang], 'co') : '', style: 'delighted' },
    };
  });

  const drawDone: StyledLine = {
    style: 'amazed',
    text:
      lang === 'fr'
        ? "Waouh ! Regarde notre dessin ! Il est magnifique ! Et maintenant... place aux couleurs !"
        : "Wow! Look at our drawing! It's so beautiful! And now... it's time for color!",
  };

  const finale: StyledLine = {
    style: 'celebrate',
    text:
      lang === 'fr'
        ? `Tadaaa ! Regarde comme il est beau, notre dessin ${name ? `de ${name}` : ''} ! Bravo, tu es un super artiste ! À très bientôt, pour un nouveau dessin !`
        : `Ta-daaa! Look how beautiful our ${name ? `${name} drawing` : 'drawing'} is! Bravo, you're a super artist! See you very soon, for a brand new drawing!`,
  };

  const all: StyledLine[] = [
    welcome,
    drawDone,
    finale,
    ...draw.flatMap(d => [d.intro, d.outro]),
    ...color.flatMap(c => [c.intro, c.outro]),
  ].filter(l => l.text);

  return { welcome, draw, drawDone, color, finale, all };
}
