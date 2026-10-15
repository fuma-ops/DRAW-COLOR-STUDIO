import { KidDrawingStep, KidColoringStep } from './kidDrawingSteps';

type Lang = 'en' | 'fr';

export interface StepLines {
  intro: string;
  outro: string;
}

export interface TutorialScript {
  welcome: string;
  draw: StepLines[];
  drawDone: string;
  color: StepLines[];
  spellIntro: string;
  spellDone: string;
  all: string[];
}

type Kind = 'head' | 'body' | 'wing' | 'antenna' | 'tail' | 'feet' | 'eyes' | 'brows' | 'smile' | 'stripes' | 'generic';

const INTROS: Record<Lang, Record<Kind, string[]>> = {
  en: {
    head: [
      "Let's start with the head! Make a big, round circle, just like the sun.",
      'First, the head! Follow the dots and draw a nice round shape.',
      'We begin with a big round head. Ready? Pencil up, here we go!',
    ],
    body: [
      'Now the body! A big, cozy shape right next to the head.',
      'Next up, the chubby body. Follow the dots, nice and slow.',
      "Let's add the body. Take your time, there is no hurry!",
    ],
    wing: [
      'Time for a wing! A soft, curvy shape. Flap, flap, flap!',
      "Let's add a wing, so our friend can fly!",
      'Here comes a wing. Follow the dots all the way around.',
    ],
    antenna: [
      'Two funny antennae on top! Boing, boing!',
      'Now the antennae. Little sticks with round balls on the end!',
    ],
    tail: ['A pointy little tail at the back. Zip, zip!', "Let's finish the back with a pointy tail."],
    feet: [
      'Now the tiny feet! One, two, three!',
      'Three tiny feet, so our friend can walk. Tap, tap, tap!',
    ],
    eyes: [
      'Time for the eyes! Two big, shiny eyes.',
      'Now our friend needs eyes, so it can see us!',
    ],
    brows: ['Little eyebrows now. Swish, swish!', 'Two tiny eyebrows to look extra cute!'],
    smile: ['And now the best part: a big happy smile!', 'Last one: a lovely, happy smile!'],
    stripes: ['Now the stripes! One by one, nice and steady.'],
    generic: [
      'Next shape! Follow the dotted line with me.',
      "You're doing great! Let's draw the next part.",
      'Another shape! Look at the dots, and follow them.',
    ],
  },
  fr: {
    head: [
      'Commençons par la tête ! Dessine un grand rond, comme un soleil.',
      "D'abord, la tête ! Suis les points et fais un joli rond.",
      'On commence par une grosse tête toute ronde. Prêt ? Crayon en main, on y va !',
    ],
    body: [
      'Maintenant, le corps ! Une grosse forme toute douce, juste à côté de la tête.',
      'Ensuite, le gros corps rond. Suis les points, doucement.',
      'Ajoutons le corps. Prends ton temps, rien ne presse !',
    ],
    wing: [
      'C’est le moment de dessiner une aile ! Une forme douce et arrondie. Flap, flap, flap !',
      'Ajoutons une aile pour que notre ami puisse voler !',
      'Voici une aile. Suis les points jusqu’au bout.',
    ],
    antenna: [
      'Deux drôles d’antennes sur la tête ! Boing, boing !',
      'Maintenant les antennes. De petits bâtons avec une boule au bout !',
    ],
    tail: ['Une petite queue pointue derrière. Zip, zip !', 'Terminons l’arrière avec une queue pointue.'],
    feet: ['Maintenant les petits pieds ! Un, deux, trois !', 'Trois petits pieds pour marcher. Tap, tap, tap !'],
    eyes: ['C’est l’heure des yeux ! Deux grands yeux brillants.', 'Notre ami a besoin d’yeux pour nous voir !'],
    brows: ['Maintenant les petits sourcils. Swish, swish !', 'Deux petits sourcils pour être encore plus mignon !'],
    smile: ['Et maintenant le meilleur : un grand sourire !', 'Le dernier : un joli sourire tout content !'],
    stripes: ['Maintenant les rayures ! Une par une, tranquillement.'],
    generic: [
      'Une nouvelle forme ! Suis la ligne de points avec moi.',
      'Tu fais ça très bien ! Dessinons la partie suivante.',
      'Encore une forme ! Regarde les points et suis-les.',
    ],
  },
};

const OUTROS: Record<Lang, string[]> = {
  en: [
    'Ta-da! Beautiful!',
    'Wonderful!',
    'Great job!',
    'Perfect! Look at that!',
    "Nice work, little artist!",
    'So good! Give yourself a high five!',
    'Yay! You did it!',
  ],
  fr: [
    'Tada ! Magnifique !',
    'Merveilleux !',
    'Bravo, bon travail !',
    'Parfait ! Regarde-moi ça !',
    'Joli travail, petit artiste !',
    'Super ! Tape-toi dans la main !',
    'Youpi ! Tu as réussi !',
  ],
};

const COLOR_INTROS: Record<Lang, string[]> = {
  en: [
    "Now let's color with {c}!",
    'Pick up the {c} pencil. Let us fill this part.',
    '{c}! Such a pretty color.',
    'Time for some {c}. Color all the way to the edges!',
  ],
  fr: [
    'Maintenant, colorions avec {c} !',
    'Prends le crayon {c}. Remplissons cette partie.',
    '{c} ! Quelle jolie couleur.',
    "C'est le moment du {c}. Colorie jusqu'aux bords !",
  ],
};

const COLOR_OUTROS: Record<Lang, string[]> = {
  en: ['So pretty!', 'Lovely!', 'Look at that color!', 'Yummy colors!', 'Beautiful!'],
  fr: ['Tellement joli !', 'Adorable !', 'Regarde cette couleur !', 'De bien jolies couleurs !', 'Magnifique !'],
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
  const n = `${step.partNameEn} ${step.partName}`.toLowerCase();
  if (/head|tête|tete/.test(n)) return 'head';
  if (/body|corps/.test(n)) return 'body';
  if (/wing|aile/.test(n)) return 'wing';
  if (/antenn/.test(n)) return 'antenna';
  if (/tail|queue|stinger/.test(n)) return 'tail';
  if (/feet|foot|pied/.test(n)) return 'feet';
  if (/brow|sourcil/.test(n)) return 'brows';
  if (/smile|sourire/.test(n)) return 'smile';
  if (/eye|yeux|oeil/.test(n)) return 'eyes';
  if (/stripe|rayure/.test(n)) return 'stripes';
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
  const name = characterName || (lang === 'fr' ? 'petit ami' : 'little friend');

  const welcome =
    lang === 'fr'
      ? `Salut les amis ! Aujourd'hui, on dessine ensemble un super ${name} tout mignon. Prends ton crayon, et suis les petits points avec moi !`
      : `Hi friends! Today we are going to draw a super cute ${name} together. Grab your pencil, and follow the little dots with me!`;

  const draw: StepLines[] = drawingSteps.map(step => {
    const kind = kindOf(step);
    let intro = pick(INTROS[lang][kind], `i-${kind}`);
    // Count-along for groups of small shapes (feet, antennae)
    return { intro, outro: pick(OUTROS[lang], 'outro') };
  });

  const color: StepLines[] = coloringSteps.map(step => {
    const cname = lang === 'fr' ? COLOR_NAMES_FR[step.colorNameEn] || step.colorNameEn.toLowerCase() : step.colorNameEn.toLowerCase();
    return {
      intro: pick(COLOR_INTROS[lang], 'ci').replace('{c}', cname),
      outro: pick(COLOR_OUTROS[lang], 'co'),
    };
  });

  const drawDone =
    lang === 'fr'
      ? 'Waouh, regarde notre dessin ! Maintenant, place aux couleurs !'
      : "Wow, look at our drawing! Now it's time for color!";
  const spellIntro = lang === 'fr' ? "Maintenant, épelons ensemble !" : "Now let's spell! Listen and repeat!";
  const spellDone =
    lang === 'fr' ? 'Bravo ! Tu es un super artiste ! À bientôt !' : 'Awesome! B-E-E, Bee! You are a super artist! See you next time!';

  const all = [
    welcome,
    drawDone,
    spellIntro,
    spellDone,
    ...draw.flatMap(d => [d.intro, d.outro]),
    ...color.flatMap(c => [c.intro, c.outro]),
  ];

  return { welcome, draw, drawDone, color, spellIntro, spellDone, all };
}
