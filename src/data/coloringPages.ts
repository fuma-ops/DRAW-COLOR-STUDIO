import { ColoringPage } from '../types';

export const COLORING_PAGES: ColoringPage[] = [
  {
    id: "english-learning-apple",
    title: "A is for Apple 🍎",
    category: "Kids English",
    subtitle: "A • P • P • L • E • Red Apple",
    difficulty: "Easy",
    tags: ["kids", "english", "apple", "alphabet", "learning", "phonics"],
    width: 800,
    height: 800,
    referencePalette: [
      '#FF3B4E', // Bright Red Apple
      '#D32F2F', // Deep Red Shade
      '#4CAF50', // Fresh Green Leaf
      '#795548', // Brown Apple Stem
      '#FF8DA1', // Sweet Cheeks
      '#FFD1DC', // Letter A Pastel
      '#FFE082', // Letter P Yellow
      '#81D4FA', // Letter P Blue
      '#C8E6C9', // Letter L Mint
      '#E1BEE7', // Letter E Lavender
      '#FFFDE7', // Soft background
    ],
    englishLearningPreset: {
      enabled: true,
      targetWord: "APPLE",
      objectPhrase: "Red Apple! Look at the delicious sweet red apple.",
      spellingLetters: ["A", "P", "P", "L", "E"],
      celebrationPhrase: "Awesome job! Apple!",
      voiceAccent: "en-US",
      speechRate: 0.82,
      speechPitch: 1.18,
      showFlashcardOverlay: true,
    },
    lineArtSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
      <defs>
        <style>
          .line { stroke: #2D2426; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .bold { stroke: #2D2426; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .detail { stroke: #2D2426; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .bg-fill { fill: #FFFFFF; }
        </style>
      </defs>
      <!-- Outer canvas border -->
      <rect class="bg-fill line" x="8" y="8" width="784" height="784" rx="20" />
      
      <!-- Educational Banner Ribbon Top (Holds Text Letters) -->
      <rect class="line" x="80" y="30" width="640" height="115" rx="18" fill="#FFFDE7" />
      <path class="detail" d="M 95 135 L 705 135" fill="none" stroke="#2D2426" stroke-width="2" stroke-dasharray="6,6" />

      <!-- BIG BOLD HOLLOW SPELLING LETTERS AT THE TOP: A - P - P - L - E -->
      <!-- Letter A -->
      <g>
        <path class="bold" d="M 125 125 L 155 45 L 185 125 L 165 125 L 158 105 L 148 105 L 141 125 Z" />
        <polygon class="line" points="151,90 155,62 160,90" />
      </g>
      <!-- Letter P (1) -->
      <g>
        <path class="bold" d="M 235 125 L 235 45 L 285 45 C 305 45 318 58 318 78 C 318 98 305 110 285 110 L 255 110 L 255 125 Z" />
        <rect class="line" x="255" y="60" width="36" height="32" rx="4" />
      </g>
      <!-- Letter P (2) -->
      <g>
        <path class="bold" d="M 355 125 L 355 45 L 405 45 C 425 45 438 58 438 78 C 438 98 425 110 405 110 L 375 110 L 375 125 Z" />
        <rect class="line" x="375" y="60" width="36" height="32" rx="4" />
      </g>
      <!-- Letter L -->
      <g>
        <path class="bold" d="M 475 125 L 475 45 L 500 45 L 500 105 L 540 105 L 540 125 Z" />
      </g>
      <!-- Letter E -->
      <g>
        <path class="bold" d="M 585 125 L 585 45 L 645 45 L 645 66 L 610 66 L 610 80 L 640 80 L 640 98 L 610 98 L 610 108 L 645 108 L 645 125 Z" />
      </g>

      <!-- Apple Stem -->
      <path class="line" d="M 400 235 C 395 195 415 165 435 150 C 440 155 425 185 415 235 Z" />
      <!-- Apple Leaf -->
      <path class="line" d="M 412 210 C 475 165 540 185 540 185 C 540 185 520 250 422 228 Z" />
      <path class="detail" d="M 420 215 Q 470 200 520 190" fill="none" />

      <!-- Apple Main Body -->
      <path class="bold" d="M 400 250 C 350 205 210 220 180 350 C 145 500 230 630 320 660 C 365 675 390 655 400 655 C 410 655 435 675 480 660 C 570 630 655 500 620 350 C 590 220 450 205 400 250 Z" />

      <!-- Apple Kawaii Smiling Face -->
      <!-- Left Eye -->
      <ellipse class="detail" cx="330" cy="420" rx="14" ry="18" fill="#2D2426" />
      <circle cx="325" cy="415" r="5" fill="#FFFFFF" />
      <!-- Right Eye -->
      <ellipse class="detail" cx="470" cy="420" rx="14" ry="18" fill="#2D2426" />
      <circle cx="465" cy="415" r="5" fill="#FFFFFF" />
      <!-- Left Blush -->
      <ellipse class="line" cx="290" cy="450" rx="18" ry="10" />
      <!-- Right Blush -->
      <ellipse class="line" cx="510" cy="450" rx="18" ry="10" />
      <!-- Cute Smile -->
      <path class="detail" d="M 380 450 Q 400 480 420 450" fill="none" />

      <!-- Cute Decorative Base Stars -->
      <polygon class="line" points="260,730 266,742 280,744 269,754 272,768 260,761 248,768 251,754 240,744 254,742" />
      <polygon class="line" points="540,730 546,742 560,744 549,754 552,768 540,761 528,768 531,754 520,744 534,742" />
    </svg>`,
  },
  {
    id: "english-learning-cat",
    title: "C is for Cat 🐱",
    category: "Kids English",
    subtitle: "C • A • T • Cute Cat",
    difficulty: "Easy",
    tags: ["kids", "english", "cat", "alphabet", "learning", "phonics"],
    width: 800,
    height: 800,
    referencePalette: [
      '#FFF3E0', // Warm cream cat fur
      '#FFB74D', // Soft ginger patches
      '#FF8DA1', // Pink ears and nose
      '#81D4FA', // Sky blue collar
      '#FFD54F', // Golden bell
      '#FFCDD2', // Letter C
      '#FFE082', // Letter A
      '#80CBC4', // Letter T
      '#FFF9C4', // Background
    ],
    englishLearningPreset: {
      enabled: true,
      targetWord: "CAT",
      objectPhrase: "Cute Cat! Look at the playful fluffy cat.",
      spellingLetters: ["C", "A", "T"],
      celebrationPhrase: "Super! Cat!",
      voiceAccent: "en-US",
      speechRate: 0.82,
      speechPitch: 1.18,
      showFlashcardOverlay: true,
    },
    lineArtSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
      <defs>
        <style>
          .line { stroke: #2D2426; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .bold { stroke: #2D2426; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .detail { stroke: #2D2426; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .bg-fill { fill: #FFFFFF; }
        </style>
      </defs>
      <!-- Outer canvas border -->
      <rect class="bg-fill line" x="8" y="8" width="784" height="784" rx="20" />
      
      <!-- Educational Banner Ribbon Top (Holds Text Letters) -->
      <rect class="line" x="120" y="30" width="560" height="115" rx="18" fill="#FFFDE7" />
      <path class="detail" d="M 135 135 L 665 135" fill="none" stroke="#2D2426" stroke-width="2" stroke-dasharray="6,6" />

      <!-- BIG BOLD HOLLOW SPELLING LETTERS AT THE TOP: C - A - T -->
      <!-- Letter C -->
      <g>
        <path class="bold" d="M 230 50 C 190 50 150 75 150 100 C 150 125 190 135 230 135 L 235 115 C 210 115 180 110 180 100 C 180 90 210 70 235 70 Z" />
      </g>
      <!-- Letter A -->
      <g>
        <path class="bold" d="M 370 135 L 405 50 L 440 135 L 420 135 L 412 115 L 398 115 L 390 135 Z" />
        <polygon class="line" points="401,98 405,70 410,98" />
      </g>
      <!-- Letter T -->
      <g>
        <path class="bold" d="M 525 50 L 615 50 L 615 72 L 585 72 L 585 135 L 555 135 L 555 72 L 525 72 Z" />
      </g>

      <!-- Cat Left Ear -->
      <path class="bold" d="M 270 260 L 220 155 L 350 210 Z" />
      <path class="line" d="M 275 245 L 240 175 L 330 210 Z" />
      <!-- Cat Right Ear -->
      <path class="bold" d="M 530 260 L 580 155 L 450 210 Z" />
      <path class="line" d="M 525 245 L 560 175 L 470 210 Z" />

      <!-- Cat Head -->
      <path class="bold" d="M 240 290 C 200 380 220 480 310 510 C 370 530 430 530 490 510 C 580 480 600 380 560 290 C 520 240 280 240 240 290 Z" />

      <!-- Cat Eyes -->
      <ellipse class="detail" cx="330" cy="360" rx="16" ry="22" fill="#2D2426" />
      <circle cx="325" cy="352" r="6" fill="#FFFFFF" />
      <ellipse class="detail" cx="470" cy="360" rx="16" ry="22" fill="#2D2426" />
      <circle cx="465" cy="352" r="6" fill="#FFFFFF" />

      <!-- Cat Cute Snout & Whiskers -->
      <polygon class="detail" points="400,395 390,385 410,385" fill="#FF8DA1" stroke="#2D2426" stroke-width="2" />
      <path class="detail" d="M 400 395 L 400 410 Q 385 425 375 415 M 400 410 Q 415 425 425 415" fill="none" />
      <!-- Whiskers -->
      <line class="detail" x1="280" y1="395" x2="210" y2="385" />
      <line class="detail" x1="280" y1="410" x2="205" y2="415" />
      <line class="detail" x1="520" y1="395" x2="590" y2="385" />
      <line class="detail" x1="520" y1="410" x2="595" y2="415" />

      <!-- Cat Collar & Golden Bell -->
      <path class="line" d="M 300 510 Q 400 550 500 510 L 490 535 Q 400 575 310 535 Z" />
      <circle class="line" cx="400" cy="570" r="22" />
      <line class="detail" x1="390" y1="570" x2="410" y2="570" />

      <!-- Cat Body & Paws -->
      <path class="line" d="M 280 530 C 260 600 270 650 340 650 C 370 650 380 630 400 630 C 420 630 430 650 460 650 C 530 650 540 600 520 530 Z" />

      <!-- Cute Decorative Base Stars -->
      <polygon class="line" points="260,710 266,722 280,724 269,734 272,748 260,741 248,748 251,734 240,724 254,722" />
      <polygon class="line" points="540,710 546,722 560,724 549,734 552,748 540,741 528,748 531,734 520,724 534,722" />
    </svg>`,
  },
  {
    id: "english-learning-sun",
    title: "S is for Sun ☀️",
    category: "Kids English",
    subtitle: "S • U • N • Bright Sun",
    difficulty: "Easy",
    tags: ["kids", "english", "sun", "alphabet", "learning", "phonics"],
    width: 800,
    height: 800,
    referencePalette: [
      '#FFD54F', // Warm Golden Sun
      '#FFA726', // Orange Rays
      '#FF7043', // Deep Coral
      '#FF8DA1', // Pink Blush
      '#81D4FA', // Blue Sky Letter
      '#E1BEE7', // Lavender Letter
      '#A7FFEB', // Mint Letter
      '#E1F5FE', // Sky Background
    ],
    englishLearningPreset: {
      enabled: true,
      targetWord: "SUN",
      objectPhrase: "Bright Yellow Sun! The sun shines warmly in the sky.",
      spellingLetters: ["S", "U", "N"],
      celebrationPhrase: "Brilliant! Sun!",
      voiceAccent: "en-US",
      speechRate: 0.82,
      speechPitch: 1.18,
      showFlashcardOverlay: true,
    },
    lineArtSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
      <defs>
        <style>
          .line { stroke: #2D2426; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .bold { stroke: #2D2426; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .detail { stroke: #2D2426; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .bg-fill { fill: #FFFFFF; }
        </style>
      </defs>
      <!-- Outer canvas border -->
      <rect class="bg-fill line" x="8" y="8" width="784" height="784" rx="20" />
      
      <!-- Educational Banner Ribbon Top (Holds Text Letters) -->
      <rect class="line" x="120" y="30" width="560" height="115" rx="18" fill="#FFFDE7" />
      <path class="detail" d="M 135 135 L 665 135" fill="none" stroke="#2D2426" stroke-width="2" stroke-dasharray="6,6" />

      <!-- BIG BOLD HOLLOW SPELLING LETTERS AT THE TOP: S - U - N -->
      <!-- Letter S -->
      <g>
        <path class="bold" d="M 230 50 C 200 50 160 62 160 88 C 160 118 225 110 225 125 C 225 135 205 138 185 138 C 165 138 150 130 150 130 L 145 145 C 145 145 170 150 190 150 C 225 150 250 140 250 120 C 250 95 185 100 185 85 C 185 75 205 70 225 70 C 245 70 255 75 255 75 L 260 52 C 260 52 245 50 230 50 Z" />
      </g>
      <!-- Letter U -->
      <g>
        <path class="bold" d="M 370 50 L 370 115 C 370 138 395 148 420 148 C 445 148 470 138 470 115 L 470 50 L 445 50 L 445 110 C 445 122 435 128 420 128 C 405 128 395 122 395 110 L 395 50 Z" />
      </g>
      <!-- Letter N -->
      <g>
        <path class="bold" d="M 545 148 L 545 50 L 575 50 L 625 115 L 625 50 L 650 50 L 650 148 L 620 148 L 570 82 L 570 148 Z" />
      </g>

      <!-- Sun Rays -->
      <!-- Top Ray -->
      <polygon class="line" points="400,185 375,255 425,255" />
      <!-- Top Right 1 -->
      <polygon class="line" points="545,245 490,300 530,330" />
      <!-- Right Ray -->
      <polygon class="line" points="645,410 570,385 570,435" />
      <!-- Bottom Right 1 -->
      <polygon class="line" points="555,585 530,510 485,545" />
      <!-- Bottom Ray -->
      <polygon class="line" points="400,645 425,575 375,575" />
      <!-- Bottom Left 1 -->
      <polygon class="line" points="245,585 315,545 270,510" />
      <!-- Left Ray -->
      <polygon class="line" points="155,410 230,435 230,385" />
      <!-- Top Left 1 -->
      <polygon class="line" points="255,245 270,330 310,300" />

      <!-- Center Sun Circle -->
      <circle class="bold" cx="400" cy="415" r="160" />

      <!-- Cute Sunglasses / Kawaii Face -->
      <!-- Left Eye -->
      <ellipse class="detail" cx="340" cy="405" rx="16" ry="20" fill="#2D2426" />
      <circle cx="334" cy="398" r="6" fill="#FFFFFF" />
      <!-- Right Eye -->
      <ellipse class="detail" cx="460" cy="405" rx="16" ry="20" fill="#2D2426" />
      <circle cx="454" cy="398" r="6" fill="#FFFFFF" />
      <!-- Left Blush -->
      <ellipse class="line" cx="295" cy="435" rx="20" ry="11" />
      <!-- Right Blush -->
      <ellipse class="line" cx="505" cy="435" rx="20" ry="11" />
      <!-- Smile -->
      <path class="detail" d="M 375 435 Q 400 470 425 435" fill="none" />

      <!-- Cute Decorative Base Stars -->
      <polygon class="line" points="260,710 266,722 280,724 269,734 272,748 260,741 248,748 251,734 240,724 254,722" />
      <polygon class="line" points="540,710 546,722 560,724 549,734 552,748 540,741 528,748 531,734 520,724 534,722" />
    </svg>`,
  },
  {
    id: "cozy-kawaii-bedroom",
    title: "Cozy Kawaii Bedroom",
    category: "Cozy Life",
    subtitle: "Chambre Kawaii Cosy & Mignonne",
    difficulty: "Detailed",
    tags: ["bedroom", "cozy", "kawaii", "original", "artwork"],
    width: 800,
    height: 800,
    referencePalette: [
      '#FFF0D4', // Warm cream wall
      '#FFD1DC', // Pastel pink duvet
      '#FFE4E8', // Soft pink sheet
      '#D7CCC8', // Light oak floor & headboard
      '#E8F5E9', // Pale matcha pillow & plant
      '#E1F5FE', // Sky blue window curtain & sky
      '#FFF9C4', // Soft warm fairy lights
      '#F3E5F5', // Dreamy lavender nightstand
      '#FF8DA1', // Sweet strawberry blush
      '#FFCCBC', // Warm peach carpet
    ],
    lineArtSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
      <defs>
        <style>
          .line { stroke: #2D2426; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .bold-line { stroke: #2D2426; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .detail-line { stroke: #2D2426; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .bg-fill { fill: #FFFFFF; }
        </style>
      </defs>
      
      <!-- Room Outer Boundary / Walls & Floor -->
      <rect class="bg-fill line" x="6" y="6" width="788" height="788" />
      <!-- Floor dividing baseline -->
      <line class="bold-line" x1="6" y1="560" x2="794" y2="560" />
      <!-- Wood floor planks -->
      <line class="detail-line" x1="160" y1="560" x2="110" y2="794" />
      <line class="detail-line" x1="340" y1="560" x2="290" y2="794" />
      <line class="detail-line" x1="520" y1="560" x2="480" y2="794" />
      <line class="detail-line" x1="700" y1="560" x2="670" y2="794" />

      <!-- Cozy Bedroom Window (Left Wall) -->
      <rect class="bold-line" x="40" y="80" width="220" height="280" rx="12" />
      <rect class="line" x="52" y="92" width="94" height="120" />
      <rect class="line" x="154" y="92" width="94" height="120" />
      <rect class="line" x="52" y="222" width="94" height="126" />
      <rect class="line" x="154" y="222" width="94" height="126" />
      <!-- Crescent Moon & Stars in Window Pane -->
      <path class="detail-line" d="M 100 120 C 100 145 118 165 142 165 C 130 162 120 150 120 135 C 120 125 125 115 132 110 C 112 110 100 120 100 120 Z" />
      <path class="detail-line" d="M 80 170 L 83 160 L 86 170 L 96 173 L 86 176 L 83 186 L 80 176 L 70 173 Z" />
      <path class="detail-line" d="M 185 130 L 187 122 L 189 130 L 197 132 L 189 134 L 187 142 L 185 134 L 177 132 Z" />
      <!-- Cute Ruffled Curtains -->
      <path class="bold-line" d="M 30 70 C 30 70 60 160 50 250 C 40 310 30 380 30 380 C 45 375 75 375 90 380 C 70 300 85 200 80 70 Z" />
      <path class="bold-line" d="M 270 70 C 270 70 240 160 250 250 C 260 310 270 380 270 380 C 255 375 225 375 210 380 C 230 300 215 200 220 70 Z" />

      <!-- Glowing Fairy Lights String Garland draped along wall -->
      <path class="detail-line" d="M 30 50 Q 200 110 380 45 Q 560 110 770 40" fill="none" />
      <circle class="bold-line" cx="90" cy="72" r="12" />
      <circle class="bold-line" cx="170" cy="85" r="12" />
      <circle class="bold-line" cx="260" cy="78" r="12" />
      <circle class="bold-line" cx="350" cy="55" r="12" />
      <circle class="bold-line" cx="440" cy="70" r="12" />
      <circle class="bold-line" cx="530" cy="85" r="12" />
      <circle class="bold-line" cx="620" cy="72" r="12" />
      <circle class="bold-line" cx="710" cy="50" r="12" />

      <!-- Wall Art Posters (Center & Right Wall) -->
      <rect class="bold-line" x="320" y="90" width="120" height="150" rx="8" />
      <!-- Cute Cat Face inside Poster -->
      <circle class="line" cx="380" cy="170" r="35" />
      <polygon class="line" points="350,145 362,120 375,140" />
      <polygon class="line" points="410,145 398,120 385,140" />
      <circle class="detail-line" cx="368" cy="168" r="4" fill="#2D2426" />
      <circle class="detail-line" cx="392" cy="168" r="4" fill="#2D2426" />
      <path class="detail-line" d="M 374 178 Q 380 183 386 178" fill="none" />

      <!-- Hanging Potted Ivy Plant (Top Right) -->
      <line class="detail-line" x1="680" y1="6" x2="680" y2="120" />
      <path class="bold-line" d="M 650 120 L 710 120 L 700 160 L 660 160 Z" />
      <path class="line" d="M 645 130 C 625 150 635 180 650 185 C 660 165 655 140 645 130 Z" />
      <path class="line" d="M 715 130 C 735 150 725 180 710 185 C 700 165 705 140 715 130 Z" />
      <path class="line" d="M 670 160 C 665 190 680 215 690 220 C 695 195 685 170 670 160 Z" />

      <!-- Bookshelf Unit (Right Wall) -->
      <rect class="bold-line" x="650" y="240" width="130" height="340" rx="6" />
      <rect class="line" x="660" y="250" width="110" height="100" />
      <!-- Books on Shelf -->
      <rect class="line" x="670" y="270" width="18" height="75" />
      <rect class="line" x="692" y="260" width="22" height="85" />
      <rect class="line" x="718" y="275" width="20" height="70" />
      <rect class="line" x="742" y="280" width="18" height="65" />
      <!-- Lower Shelf with Cute Clock -->
      <rect class="line" x="660" y="360" width="110" height="105" />
      <circle class="bold-line" cx="715" cy="415" r="30" />
      <!-- Clock Ears (Kawaii Bear Clock) -->
      <circle class="line" cx="692" cy="390" r="10" />
      <circle class="line" cx="738" cy="390" r="10" />
      <line class="detail-line" x1="715" y1="415" x2="715" y2="398" />
      <line class="detail-line" x1="715" y1="415" x2="728" y2="415" />
      <rect class="line" x="660" y="475" width="110" height="95" />
      <!-- Mug on lower shelf -->
      <path class="line" d="M 690 510 L 730 510 L 725 550 L 695 550 Z" />
      <path class="line" d="M 730 520 C 742 520 742 540 726 540" fill="none" />

      <!-- Nightstand Table (Left of Bed) -->
      <rect class="bold-line" x="140" y="400" width="130" height="190" rx="10" />
      <line class="bold-line" x1="140" y1="495" x2="270" y2="495" />
      <!-- Drawer Pull Knobs -->
      <circle class="bold-line" cx="205" cy="450" r="7" />
      <circle class="bold-line" cx="205" cy="545" r="7" />
      <!-- Nightstand Legs -->
      <line class="bold-line" x1="155" y1="590" x2="155" y2="620" />
      <line class="bold-line" x1="255" y1="590" x2="255" y2="620" />

      <!-- Cute Bunny Lamp on Nightstand -->
      <ellipse class="bold-line" cx="205" cy="400" rx="28" ry="8" />
      <path class="bold-line" d="M 185 395 C 185 345 225 345 225 395 Z" />
      <!-- Bunny Lamp Ears -->
      <ellipse class="line" cx="195" cy="330" rx="7" ry="20" transform="rotate(-10 195 330)" />
      <ellipse class="line" cx="215" cy="330" rx="7" ry="20" transform="rotate(10 215 330)" />
      <!-- Lamp face -->
      <circle class="detail-line" cx="200" cy="370" r="2.5" fill="#2D2426" />
      <circle class="detail-line" cx="210" cy="370" r="2.5" fill="#2D2426" />
      <path class="detail-line" d="M 203 376 Q 205 379 207 376" fill="none" />

      <!-- Giant Cozy Kawaii Bed (Centerpiece) -->
      <!-- Headboard -->
      <path class="bold-line" d="M 250 480 C 250 320 280 270 480 270 C 680 270 710 320 710 480 Z" />
      <!-- Headboard Inner Panel -->
      <path class="line" d="M 270 475 C 270 340 300 295 480 295 C 660 295 690 340 690 475 Z" />

      <!-- Big Fluffy Pillows -->
      <!-- Left Pillow -->
      <rect class="bold-line" x="290" y="370" width="165" height="100" rx="28" transform="rotate(-6 372 420)" />
      <!-- Right Pillow -->
      <rect class="bold-line" x="490" y="370" width="165" height="100" rx="28" transform="rotate(6 572 420)" />
      
      <!-- Center Cat Sleeping Plushie Pillow -->
      <ellipse class="bold-line" cx="480" cy="445" rx="55" ry="42" />
      <!-- Cat Plushie Ears -->
      <polygon class="bold-line" points="435,420 445,385 465,410" />
      <polygon class="bold-line" points="525,420 515,385 495,410" />
      <!-- Sleeping Eyes & Nose -->
      <path class="detail-line" d="M 455 445 C 460 455 470 455 475 445" fill="none" />
      <path class="detail-line" d="M 485 445 C 490 455 500 455 505 445" fill="none" />
      <polygon class="detail-line" points="478,454 482,454 480,457" fill="#2D2426" />
      <!-- Cute Blush Circles -->
      <circle class="detail-line" cx="448" cy="452" r="6" />
      <circle class="detail-line" cx="512" cy="452" r="6" />

      <!-- Mattress Fold Sheet -->
      <path class="bold-line" d="M 265 470 Q 480 495 695 470 L 695 530 Q 480 555 265 530 Z" />

      <!-- Giant Puffy Duvet / Quilt Blanket with Ruffles -->
      <path class="bold-line" d="M 255 510 C 255 510 480 545 705 510 C 725 610 710 680 690 710 C 600 730 380 730 270 710 C 245 675 240 600 255 510 Z" />
      <!-- Soft Duvet Fold Creases -->
      <path class="detail-line" d="M 320 550 C 340 620 370 650 390 690" fill="none" />
      <path class="detail-line" d="M 470 545 C 475 615 480 660 485 705" fill="none" />
      <path class="detail-line" d="M 610 545 C 595 620 575 660 560 695" fill="none" />
      <!-- Cute Bed Skirt / Ruffle Hem -->
      <path class="line" d="M 270 710 Q 300 735 330 710 Q 360 735 390 710 Q 420 735 450 710 Q 480 735 510 710 Q 540 735 570 710 Q 600 735 630 710 Q 660 735 690 710" fill="none" />

      <!-- Fluffy Bear Carpet Rug on Floor -->
      <ellipse class="bold-line" cx="210" cy="690" rx="140" ry="60" />
      <!-- Rug Scalloped Border -->
      <ellipse class="detail-line" cx="210" cy="690" rx="122" ry="48" fill="none" />

      <!-- Cute Kawaii Slippers on Floor Rug -->
      <!-- Left Slipper -->
      <ellipse class="bold-line" cx="170" cy="685" rx="24" ry="14" transform="rotate(-15 170 685)" />
      <path class="detail-line" d="M 155 680 C 165 670 185 675 188 685" fill="none" />
      <circle class="detail-line" cx="165" cy="680" r="3" />
      <!-- Right Slipper -->
      <ellipse class="bold-line" cx="230" cy="685" rx="24" ry="14" transform="rotate(15 230 685)" />
      <path class="detail-line" d="M 215 680 C 225 670 245 675 248 685" fill="none" />
      <circle class="detail-line" cx="235" cy="680" r="3" />
    </svg>`,
  },
  {
    id: 'cozy-coffee-girl',
    title: 'Cozy Morning Coffee & Kitty',
    category: 'Cozy Life',
    subtitle: 'Warm sweater, hot chocolate & sleepy kitten',
    difficulty: 'Detailed',
    tags: ['girl', 'cat', 'coffee', 'cozy', 'sweater'],
    width: 600,
    height: 800,
    thumbnailSvg: '',
    lineArtSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
      <defs>
        <style>
          .line { stroke: #2D2426; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .bold-line { stroke: #2D2426; stroke-width: 4.5; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .solid-black { fill: #2D2426; stroke: #2D2426; stroke-width: 1; }
          .bg-fill { fill: #FFFFFF; }
        </style>
      </defs>
      
      <!-- Background / Wall & Window frame -->
      <rect class="bg-fill line" x="4" y="4" width="592" height="792" />
      
      <!-- Bookshelf Left -->
      <rect class="line" x="20" y="40" width="110" height="260" />
      <rect class="line" x="35" y="60" width="22" height="100" />
      <rect class="line" x="62" y="55" width="26" height="105" />
      <rect class="line" x="92" y="65" width="24" height="95" />
      <rect class="line" x="20" y="170" width="110" height="15" />
      <path class="line" d="M 35 250 C 35 210 50 195 75 195 C 100 195 115 210 115 250 Z" />
      <path class="line" d="M 60 210 C 60 190 75 180 85 190 C 95 200 85 220 70 220 Z" />

      <!-- Bookshelf Right -->
      <rect class="line" x="470" y="40" width="110" height="260" />
      <rect class="line" x="485" y="70" width="20" height="90" />
      <rect class="line" x="510" y="60" width="28" height="100" />
      <rect class="line" x="542" y="75" width="22" height="85" />
      <rect class="line" x="470" y="170" width="110" height="15" />
      <!-- Potted Plant on right shelf -->
      <path class="line" d="M 495 240 L 555 240 L 545 280 L 505 280 Z" />
      <path class="line" d="M 525 240 C 510 200 485 190 490 180 C 505 180 520 210 525 240 Z" />
      <path class="line" d="M 525 240 C 540 195 565 190 560 180 C 545 180 530 210 525 240 Z" />
      <path class="line" d="M 525 240 C 520 180 530 180 525 240 Z" />

      <!-- Cute Floating Sparkle / Hearts in background -->
      <path class="line" d="M 160 130 C 160 115 145 105 135 120 C 125 105 110 115 110 130 C 110 150 135 165 135 175 C 135 165 160 150 160 130 Z" />
      <path class="line" d="M 440 120 C 440 108 428 100 420 112 C 412 100 400 108 400 120 C 400 136 420 148 420 156 C 420 148 440 136 440 120 Z" />
      <path class="line" d="M 170 230 C 170 220 160 215 155 225 C 150 215 140 220 140 230 C 140 242 155 252 155 258 C 155 252 170 242 170 230 Z" />

      <!-- Giant Cozy Sofa / Cushion Behind Girl -->
      <path class="bold-line" d="M 80 580 C 60 400 120 280 200 250 C 230 240 370 240 400 250 C 480 280 540 400 520 580 Z" />

      <!-- Big Hair Bun / High Ponytail Top -->
      <path class="bold-line" d="M 220 180 C 200 120 250 60 300 60 C 350 60 400 120 380 180 C 360 200 240 200 220 180 Z" />
      <!-- Hair Texture Locks -->
      <path class="line" d="M 250 130 C 280 90 320 90 350 130" />
      <path class="line" d="M 270 160 C 290 110 320 110 335 160" />

      <!-- Giant Kawaii Hair Ribbon Bow -->
      <!-- Center Knot -->
      <path class="bold-line" d="M 285 165 C 285 155 315 155 315 165 C 315 190 285 190 285 165 Z" />
      <!-- Left Bow Loop -->
      <path class="bold-line" d="M 285 170 C 250 140 190 120 170 170 C 160 210 220 230 285 185 Z" />
      <path class="line" d="M 210 165 C 235 175 265 178 285 175" />
      <!-- Right Bow Loop -->
      <path class="bold-line" d="M 315 170 C 350 140 410 120 430 170 C 440 210 380 230 315 185 Z" />
      <path class="line" d="M 390 165 C 365 175 335 178 315 175" />
      <!-- Bow Ribbons Hanging -->
      <path class="bold-line" d="M 285 185 C 270 210 260 240 255 265 C 265 260 275 250 290 210 Z" />
      <path class="bold-line" d="M 315 185 C 330 210 340 240 345 265 C 335 260 325 250 310 210 Z" />

      <!-- Girl Hair Framing Face -->
      <path class="bold-line" d="M 180 280 C 160 380 180 460 210 500 C 225 460 215 360 220 290 Z" />
      <path class="bold-line" d="M 420 280 C 440 380 420 460 390 500 C 375 460 385 360 380 290 Z" />
      <!-- Top Bangs -->
      <path class="bold-line" d="M 215 270 C 240 320 270 330 300 290 C 330 330 360 320 385 270 C 360 230 240 230 215 270 Z" />
      <path class="line" d="M 255 275 C 270 305 285 305 295 285" />
      <path class="line" d="M 305 285 C 315 305 330 305 345 275" />

      <!-- Face Outline -->
      <path class="bold-line" d="M 220 285 C 220 370 260 410 300 410 C 340 410 380 370 380 285 Z" />
      <!-- Cute Eyelashes & Closed Happy Eyes -->
      <path class="bold-line" d="M 245 325 C 255 340 275 340 285 325" />
      <path class="line" d="M 240 325 L 235 320" />
      <path class="line" d="M 285 328 L 292 322" />
      <path class="bold-line" d="M 315 325 C 325 340 345 340 355 325" />
      <path class="line" d="M 315 328 L 308 322" />
      <path class="line" d="M 355 325 L 362 320" />
      <!-- Cute Blush Cheeks -->
      <ellipse class="line" cx="245" cy="355" rx="14" ry="8" />
      <ellipse class="line" cx="355" cy="355" rx="14" ry="8" />
      <!-- Sweet Smiling Mouth & Nose -->
      <circle class="solid-black" cx="300" cy="340" r="2.5" />
      <path class="bold-line" d="M 292 365 C 296 372 304 372 308 365" />

      <!-- Chunky Knit Turtleneck Sweater Collar -->
      <path class="bold-line" d="M 225 395 C 225 385 375 385 375 395 C 380 435 370 465 300 465 C 230 465 220 435 225 395 Z" />
      <!-- Turtleneck Knit Ribs -->
      <path class="line" d="M 250 400 L 248 455" />
      <path class="line" d="M 275 400 L 273 462" />
      <path class="line" d="M 300 400 L 300 465" />
      <path class="line" d="M 325 400 L 327 462" />
      <path class="line" d="M 350 400 L 352 455" />

      <!-- Sweater Body & Arms -->
      <!-- Left Shoulder & Sleeve -->
      <path class="bold-line" d="M 225 440 C 170 460 130 520 120 620 C 160 640 210 600 235 550 C 230 500 225 460 225 440 Z" />
      <!-- Right Shoulder & Sleeve -->
      <path class="bold-line" d="M 375 440 C 430 460 470 520 480 620 C 440 640 390 600 365 550 C 370 500 375 460 375 440 Z" />
      <!-- Torso / Chest -->
      <path class="bold-line" d="M 230 465 C 235 530 235 560 240 630 L 360 630 C 365 560 365 530 370 465 Z" />
      <!-- Cozy Sweater Knit Cable Patterns -->
      <path class="line" d="M 160 520 C 180 540 180 560 160 580" />
      <path class="line" d="M 440 520 C 420 540 420 560 440 580" />

      <!-- Girl Hands Holding Big Coffee Mug -->
      <!-- Left Hand -->
      <path class="bold-line" d="M 235 520 C 245 510 265 515 270 535 C 270 550 250 565 235 555 Z" />
      <!-- Right Hand -->
      <path class="bold-line" d="M 365 520 C 355 510 335 515 330 535 C 330 550 350 565 365 555 Z" />
      <!-- Coffee Mug -->
      <path class="bold-line" d="M 265 510 L 335 510 C 340 560 335 585 300 585 C 265 585 260 560 265 510 Z" />
      <!-- Heart on Coffee Mug -->
      <path class="bold-line" d="M 300 555 C 300 550 285 538 285 528 C 285 520 293 518 300 525 C 307 518 315 520 315 528 C 315 538 300 550 300 555 Z" />
      <!-- Steam Rising from Mug -->
      <path class="line" d="M 285 495 C 280 480 295 470 290 455" />
      <path class="line" d="M 310 495 C 315 480 300 470 305 455" />

      <!-- Sleeping Kitten on Lap / Pillow -->
      <!-- Pillow under Cat -->
      <path class="bold-line" d="M 140 680 C 140 630 460 630 460 680 C 460 740 140 740 140 680 Z" />
      <path class="line" d="M 120 700 C 130 750 470 750 480 700" />
      <!-- Cat Body (Curled up asleep) -->
      <path class="bold-line" d="M 210 650 C 190 610 250 580 330 580 C 410 580 440 630 410 670 C 370 700 240 700 210 650 Z" />
      
      <!-- Cat Head -->
      <path class="bold-line" d="M 220 640 C 200 620 220 590 250 600 C 270 610 270 640 250 655 C 230 660 215 650 220 640 Z" />
      <!-- Cat Left Ear -->
      <path class="bold-line" d="M 222 610 L 210 585 L 235 595 Z" />
      <!-- Cat Right Ear -->
      <path class="bold-line" d="M 245 600 L 258 580 L 265 605 Z" />
      <!-- Cat Closed Eyes & Snout -->
      <path class="line" d="M 225 628 C 228 633 234 633 236 628" />
      <path class="line" d="M 240 628 C 243 633 249 633 251 628" />
      <circle class="solid-black" cx="238" cy="635" r="1.5" />
      <path class="line" d="M 235 638 C 237 641 239 641 241 638" />
      <!-- Cat Cute Sleeping 'zzz' bubbles -->
      <path class="line" d="M 185 580 L 195 580 L 185 590 L 195 590" />
      <path class="line" d="M 175 560 L 182 560 L 175 568 L 182 568" />
      <!-- Cat Tail -->
      <path class="bold-line" d="M 405 645 C 430 630 440 660 415 675 C 390 690 350 685 340 675" />

      <!-- Blanket / Rug Texture Bottom -->
      <path class="line" d="M 40 730 C 180 710 420 710 560 730 L 560 790 L 40 790 Z" />
      <path class="line" d="M 80 755 C 200 740 400 740 520 755" />
    </svg>`,
  },
  {
    id: 'sweet-strawberry-cake',
    title: 'Strawberry Shortcake Paradise',
    category: 'Food',
    subtitle: 'Fluffy sponge cake with fresh strawberries & whipped cream',
    difficulty: 'Relaxing',
    tags: ['cake', 'dessert', 'strawberry', 'bakery', 'sweet'],
    width: 600,
    height: 800,
    thumbnailSvg: '',
    lineArtSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
      <defs>
        <style>
          .line { stroke: #2D2426; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .bold-line { stroke: #2D2426; stroke-width: 4.5; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .bg-fill { fill: #FFFFFF; }
        </style>
      </defs>
      
      <rect class="bg-fill line" x="4" y="4" width="592" height="792" />
      
      <!-- Cute Stars and Cherry Sprinkles Background -->
      <path class="line" d="M 120 120 L 125 105 L 130 120 L 145 125 L 130 130 L 125 145 L 120 130 L 105 125 Z" />
      <path class="line" d="M 480 140 L 485 128 L 490 140 L 502 145 L 490 150 L 485 162 L 480 150 L 468 145 Z" />
      <path class="line" d="M 90 260 L 94 250 L 98 260 L 108 264 L 98 268 L 94 278 L 90 268 L 80 264 Z" />
      <path class="line" d="M 500 280 L 504 270 L 508 280 L 518 284 L 508 288 L 504 298 L 500 288 L 490 284 Z" />

      <!-- Cake Pedestal Stand -->
      <ellipse class="bold-line" cx="300" cy="620" rx="220" ry="45" />
      <path class="bold-line" d="M 260 620 L 250 710 L 190 730 L 410 730 L 350 710 L 340 620 Z" />
      <ellipse class="line" cx="300" cy="730" rx="110" ry="18" />

      <!-- Cake Base / Bottom Sponge Layer -->
      <path class="bold-line" d="M 140 450 C 140 520 460 520 460 450 L 460 550 C 460 620 140 620 140 550 Z" />
      <!-- Cream Filling Middle Layer -->
      <path class="bold-line" d="M 140 485 C 180 500 220 475 260 495 C 300 515 340 480 380 500 C 420 515 440 490 460 495 L 460 525 C 430 535 390 510 350 530 C 310 545 270 510 230 530 C 190 545 160 520 140 530 Z" />
      <!-- Strawberries embedded in filling -->
      <path class="line" d="M 180 505 C 170 490 200 480 205 500 C 205 515 185 515 180 505 Z" />
      <path class="line" d="M 290 510 C 280 495 310 485 315 505 C 315 520 295 520 290 510 Z" />
      <path class="line" d="M 400 505 C 390 490 420 480 425 500 C 425 515 405 515 400 505 Z" />

      <!-- Middle Whipped Cream Drips -->
      <path class="bold-line" d="M 140 450 C 140 400 460 400 460 450 C 460 465 440 475 420 460 C 400 445 380 475 350 465 C 320 455 300 480 270 465 C 240 450 220 480 190 460 C 160 440 140 470 140 450 Z" />

      <!-- Top Sponge Tier -->
      <path class="bold-line" d="M 180 310 C 180 260 420 260 420 310 L 420 390 C 420 440 180 440 180 390 Z" />
      <!-- Whipped Cream Frosting Top Dome -->
      <ellipse class="bold-line" cx="300" cy="310" rx="120" ry="38" />

      <!-- Whipped Cream Swirls on Top -->
      <!-- Swirl 1 (Left) -->
      <path class="bold-line" d="M 200 290 C 190 260 220 240 230 255 C 240 270 230 295 200 290 Z" />
      <!-- Swirl 2 (Center-Left) -->
      <path class="bold-line" d="M 250 275 C 240 245 270 225 280 240 C 290 255 280 280 250 275 Z" />
      <!-- Swirl 3 (Center-Right) -->
      <path class="bold-line" d="M 320 275 C 310 245 340 225 350 240 C 360 255 350 280 320 275 Z" />
      <!-- Swirl 4 (Right) -->
      <path class="bold-line" d="M 370 290 C 360 260 390 240 400 255 C 410 270 400 295 370 290 Z" />

      <!-- Giant Center Strawberry on Top -->
      <path class="bold-line" d="M 300 170 C 250 180 240 250 300 275 C 360 250 350 180 300 170 Z" />
      <!-- Strawberry Leaves -->
      <path class="bold-line" d="M 300 170 C 280 150 260 160 270 175 C 285 175 295 170 300 170 Z" />
      <path class="bold-line" d="M 300 170 C 320 150 340 160 330 175 C 315 175 305 170 300 170 Z" />
      <path class="bold-line" d="M 300 170 C 300 140 310 140 305 168 Z" />
      <!-- Strawberry Seeds -->
      <ellipse class="line" cx="280" cy="205" rx="3" ry="5" />
      <ellipse class="line" cx="320" cy="205" rx="3" ry="5" />
      <ellipse class="line" cx="270" cy="235" rx="3" ry="5" />
      <ellipse class="line" cx="300" cy="230" rx="3" ry="5" />
      <ellipse class="line" cx="330" cy="235" rx="3" ry="5" />
      <ellipse class="line" cx="290" cy="255" rx="3" ry="5" />
      <ellipse class="line" cx="310" cy="255" rx="3" ry="5" />

      <!-- Cute Side Strawberries -->
      <path class="bold-line" d="M 215 310 C 190 320 185 350 215 365 C 245 350 240 320 215 310 Z" />
      <path class="bold-line" d="M 385 310 C 360 320 355 350 385 365 C 415 350 410 320 385 310 Z" />

      <!-- Kawaii Smiling Face on Top Cake Tier -->
      <path class="bold-line" d="M 270 350 C 275 360 285 360 290 350" />
      <path class="bold-line" d="M 310 350 C 315 360 325 360 330 350" />
      <ellipse class="line" cx="260" cy="365" rx="8" ry="5" />
      <ellipse class="line" cx="340" cy="365" rx="8" ry="5" />
      <path class="line" d="M 295 368 C 298 374 302 374 305 368" />
    </svg>`,
  },
  {
    id: 'kawaii-bunny-mascot',
    title: 'Fluffy Bunny & Sweet Heart',
    category: 'Cute',
    subtitle: 'Adorable mascot bunny holding a glowing heart with ribbons',
    difficulty: 'Easy',
    tags: ['bunny', 'rabbit', 'cute', 'heart', 'ribbon', 'mascot'],
    width: 600,
    height: 800,
    thumbnailSvg: '',
    lineArtSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
      <defs>
        <style>
          .line { stroke: #2D2426; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .bold-line { stroke: #2D2426; stroke-width: 4.5; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .solid-black { fill: #2D2426; stroke: #2D2426; stroke-width: 1; }
          .bg-fill { fill: #FFFFFF; }
        </style>
      </defs>
      
      <rect class="bg-fill line" x="4" y="4" width="592" height="792" />
      
      <!-- Floating Hearts Background -->
      <path class="line" d="M 100 150 C 100 135 85 125 75 140 C 65 125 50 135 50 150 C 50 170 75 185 75 195 C 75 185 100 170 100 150 Z" />
      <path class="line" d="M 520 180 C 520 165 505 155 495 170 C 485 155 470 165 470 180 C 470 200 495 215 495 225 C 495 215 520 200 520 180 Z" />
      <path class="line" d="M 120 380 C 120 368 108 360 100 372 C 92 360 80 368 80 380 C 80 396 100 408 100 416 C 100 408 120 396 120 380 Z" />
      <path class="line" d="M 500 420 C 500 408 488 400 480 412 C 472 400 460 408 460 420 C 460 436 480 448 480 456 C 480 448 500 436 500 420 Z" />

      <!-- Bunny Left Ear -->
      <path class="bold-line" d="M 180 300 C 130 180 150 80 210 100 C 250 115 240 200 230 280 Z" />
      <!-- Left Inner Ear -->
      <path class="line" d="M 185 250 C 160 180 175 120 205 125 C 225 135 220 190 215 240 Z" />
      <!-- Bunny Right Ear -->
      <path class="bold-line" d="M 370 280 C 360 200 350 115 390 100 C 450 80 470 180 420 300 Z" />
      <!-- Right Inner Ear -->
      <path class="line" d="M 385 240 C 380 190 375 135 395 125 C 425 120 440 180 415 250 Z" />

      <!-- Bunny Ribbon Bow on Left Ear -->
      <path class="bold-line" d="M 185 270 C 185 260 205 260 205 270 C 205 285 185 285 185 270 Z" />
      <path class="bold-line" d="M 185 272 C 160 250 120 240 110 270 C 105 295 145 305 185 280 Z" />
      <path class="bold-line" d="M 205 272 C 230 250 270 240 280 270 C 285 295 245 305 205 280 Z" />

      <!-- Bunny Big Round Head -->
      <path class="bold-line" d="M 150 370 C 130 270 210 250 300 250 C 390 250 470 270 450 370 C 475 440 430 510 300 510 C 170 510 125 440 150 370 Z" />

      <!-- Huge Sparkling Anime Eyes -->
      <!-- Left Eye -->
      <ellipse class="solid-black" cx="225" cy="380" rx="22" ry="28" />
      <ellipse fill="#FFFFFF" cx="218" cy="368" rx="8" ry="11" />
      <circle fill="#FFFFFF" cx="232" cy="392" r="4.5" />
      <!-- Right Eye -->
      <ellipse class="solid-black" cx="375" cy="380" rx="22" ry="28" />
      <ellipse fill="#FFFFFF" cx="368" cy="368" rx="8" ry="11" />
      <circle fill="#FFFFFF" cx="382" cy="392" r="4.5" />

      <!-- Cute Eyelashes -->
      <path class="bold-line" d="M 205 360 C 210 350 220 348 230 352" />
      <path class="bold-line" d="M 395 360 C 390 350 380 348 370 352" />

      <!-- Rosy Blush Circles -->
      <ellipse class="line" cx="195" cy="425" rx="20" ry="12" />
      <ellipse class="line" cx="405" cy="425" rx="20" ry="12" />

      <!-- Cute Bunny Snout & Mouth -->
      <path class="solid-black" d="M 294 395 L 306 395 L 300 404 Z" />
      <path class="bold-line" d="M 290 412 C 295 422 300 422 300 412 C 300 422 305 422 310 412" />

      <!-- Bunny Body -->
      <path class="bold-line" d="M 200 490 C 170 540 160 650 200 680 C 240 700 360 700 400 680 C 440 650 430 540 400 490 Z" />

      <!-- Fluffy Bunny Paws Holding Giant Heart -->
      <!-- Giant Heart in Front -->
      <path class="bold-line" d="M 300 640 C 300 620 220 540 220 480 C 220 430 270 420 300 460 C 330 420 380 430 380 480 C 380 540 300 620 300 640 Z" />
      
      <!-- Left Paw Clasping Heart -->
      <path class="bold-line" d="M 215 520 C 205 500 235 480 255 500 C 265 520 240 545 215 520 Z" />
      <!-- Right Paw Clasping Heart -->
      <path class="bold-line" d="M 385 520 C 395 500 365 480 345 500 C 335 520 360 545 385 520 Z" />

      <!-- Bunny Feet / Paws Bottom -->
      <ellipse class="bold-line" cx="210" cy="685" rx="35" ry="22" />
      <ellipse class="line" cx="210" cy="685" rx="18" ry="12" />
      <ellipse class="bold-line" cx="390" cy="685" rx="35" ry="22" />
      <ellipse class="line" cx="390" cy="685" rx="18" ry="12" />
    </svg>`,
  },
  {
    id: 'kitty-in-teacup',
    title: 'Kitty Latte Teacup',
    category: 'Cute',
    subtitle: 'Sweet kitten relaxing inside a pastel porcelain teacup',
    difficulty: 'Relaxing',
    tags: ['cat', 'teacup', 'latte', 'cute', 'tea'],
    width: 600,
    height: 800,
    thumbnailSvg: '',
    lineArtSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
      <defs>
        <style>
          .line { stroke: #2D2426; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .bold-line { stroke: #2D2426; stroke-width: 4.5; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .solid-black { fill: #2D2426; stroke: #2D2426; stroke-width: 1; }
          .bg-fill { fill: #FFFFFF; }
        </style>
      </defs>
      
      <rect class="bg-fill line" x="4" y="4" width="592" height="792" />
      
      <!-- Teacup Saucer / Plate -->
      <ellipse class="bold-line" cx="300" cy="640" rx="230" ry="40" />
      <ellipse class="line" cx="300" cy="640" rx="180" ry="28" />

      <!-- Teacup Body -->
      <path class="bold-line" d="M 120 440 C 120 600 480 600 480 440 Z" />
      <ellipse class="bold-line" cx="300" cy="440" rx="180" ry="35" />

      <!-- Teacup Handle -->
      <path class="bold-line" d="M 460 460 C 540 460 540 550 440 560" />
      <path class="line" d="M 455 480 C 510 480 510 535 445 542" />

      <!-- Decorative Heart on Teacup -->
      <path class="bold-line" d="M 300 550 C 300 540 270 510 270 485 C 270 465 290 460 300 475 C 310 460 330 465 330 485 C 330 510 300 540 300 550 Z" />

      <!-- Kitten Head Peeking Out -->
      <path class="bold-line" d="M 190 350 C 170 240 240 210 300 210 C 360 210 430 240 410 350 C 425 400 390 440 300 440 C 210 440 175 400 190 350 Z" />
      <!-- Kitten Ears -->
      <path class="bold-line" d="M 210 260 L 190 170 L 260 220 Z" />
      <path class="line" d="M 215 240 L 205 195 L 245 225 Z" />
      <path class="bold-line" d="M 390 260 L 410 170 L 340 220 Z" />
      <path class="line" d="M 385 240 L 395 195 L 355 225 Z" />

      <!-- Kitten Face -->
      <ellipse class="solid-black" cx="250" cy="330" rx="14" ry="18" />
      <circle fill="#FFFFFF" cx="245" cy="322" r="5" />
      <ellipse class="solid-black" cx="350" cy="330" rx="14" ry="18" />
      <circle fill="#FFFFFF" cx="345" cy="322" r="5" />

      <ellipse class="line" cx="225" cy="365" rx="15" ry="9" />
      <ellipse class="line" cx="375" cy="365" rx="15" ry="9" />
      <polygon class="solid-black" points="295,345 305,345 300,352" />
      <path class="bold-line" d="M 292 358 C 296 366 300 366 300 358 C 300 366 304 366 308 358" />

      <!-- Kitten Whiskers -->
      <path class="line" d="M 210 345 L 160 340" />
      <path class="line" d="M 210 355 L 155 360" />
      <path class="line" d="M 390 345 L 440 340" />
      <path class="line" d="M 390 355 L 445 360" />

      <!-- Paws Resting on Teacup Rim -->
      <ellipse class="bold-line" cx="230" cy="440" rx="28" ry="18" />
      <path class="line" d="M 220 445 L 220 455" />
      <path class="line" d="M 235 445 L 235 455" />

      <ellipse class="bold-line" cx="370" cy="440" rx="28" ry="18" />
      <path class="line" d="M 360 445 L 360 455" />
      <path class="line" d="M 375 445 L 375 455" />

      <!-- Steam Whimsical Hearts -->
      <path class="line" d="M 280 140 C 280 125 265 115 255 130 C 245 115 230 125 230 140 C 230 160 255 175 255 185 C 255 175 280 160 280 140 Z" />
      <path class="line" d="M 370 120 C 370 108 358 100 350 112 C 342 100 330 108 330 120 C 330 136 350 148 350 156 C 350 148 370 136 370 120 Z" />
    </svg>`,
  },
  {
    id: 'pastel-flower-bouquet',
    title: 'Spring Garden Flowers',
    category: 'Flowers',
    subtitle: 'Blossoming tulips, daisies, roses and lush leaves in a ribbon jar',
    difficulty: 'Detailed',
    tags: ['flowers', 'spring', 'blossom', 'nature', 'bouquet'],
    width: 600,
    height: 800,
    thumbnailSvg: '',
    lineArtSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
      <defs>
        <style>
          .line { stroke: #2D2426; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .bold-line { stroke: #2D2426; stroke-width: 4.5; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .bg-fill { fill: #FFFFFF; }
        </style>
      </defs>
      
      <rect class="bg-fill line" x="4" y="4" width="592" height="792" />
      
      <!-- Flower Vase / Jar -->
      <path class="bold-line" d="M 210 500 L 390 500 L 410 700 C 410 730 190 730 190 700 Z" />
      <ellipse class="bold-line" cx="300" cy="500" rx="90" ry="20" />
      <!-- Vase Bow Ribbon -->
      <ellipse class="bold-line" cx="300" cy="530" rx="20" ry="15" />
      <path class="bold-line" d="M 280 530 C 230 500 210 550 280 545 Z" />
      <path class="bold-line" d="M 320 530 C 370 500 390 550 320 545 Z" />
      <path class="line" d="M 290 545 L 265 620 L 285 610" />
      <path class="line" d="M 310 545 L 335 620 L 315 610" />

      <!-- Center Big Rose Bloom -->
      <circle class="bold-line" cx="300" cy="340" r="60" />
      <path class="line" d="M 300 300 C 330 300 340 330 320 350 C 300 370 270 340 285 320 Z" />
      <path class="line" d="M 260 320 C 240 350 280 390 320 380" />
      <path class="line" d="M 330 320 C 360 350 330 390 300 395" />

      <!-- Tulip Left -->
      <path class="bold-line" d="M 180 280 C 140 220 180 170 200 240 C 220 170 260 220 220 280 Z" />
      <path class="line" d="M 200 280 L 200 220" />

      <!-- Tulip Right -->
      <path class="bold-line" d="M 420 280 C 380 220 420 170 440 240 C 460 170 500 220 460 280 Z" />
      <path class="line" d="M 440 280 L 440 220" />

      <!-- Daisy Top Center -->
      <circle class="bold-line" cx="300" cy="180" r="25" />
      <!-- Petals around daisy -->
      <ellipse class="bold-line" cx="300" cy="120" rx="16" ry="32" />
      <ellipse class="bold-line" cx="300" cy="240" rx="16" ry="32" />
      <ellipse class="bold-line" cx="240" cy="180" rx="32" ry="16" />
      <ellipse class="bold-line" cx="360" cy="180" rx="32" ry="16" />
      <ellipse class="line" cx="255" cy="135" rx="25" ry="18" transform="rotate(-45 255 135)" />
      <ellipse class="line" cx="345" cy="135" rx="25" ry="18" transform="rotate(45 345 135)" />
      <ellipse class="line" cx="255" cy="225" rx="25" ry="18" transform="rotate(45 255 225)" />
      <ellipse class="line" cx="345" cy="225" rx="25" ry="18" transform="rotate(-45 345 225)" />

      <!-- Lush Leaves -->
      <path class="bold-line" d="M 150 420 C 100 370 90 320 140 340 C 180 360 180 400 150 420 Z" />
      <path class="line" d="M 150 420 L 115 330" />
      <path class="bold-line" d="M 450 420 C 500 370 510 320 460 340 C 420 360 420 400 450 420 Z" />
      <path class="line" d="M 450 420 L 485 330" />

      <!-- Stems -->
      <path class="bold-line" d="M 300 400 L 300 500" />
      <path class="bold-line" d="M 200 280 C 230 360 260 440 280 500" />
      <path class="bold-line" d="M 440 280 C 410 360 380 440 320 500" />
    </svg>`,
  },
  {
    id: 'cute-ribbon-sparkles',
    title: 'Kawaii Silk Bow & Gems',
    category: 'Fashion',
    subtitle: 'Fluffy silk ribbon bow with sparkling crystals & pearls',
    difficulty: 'Easy',
    tags: ['ribbon', 'bow', 'sparkles', 'fashion', 'cute'],
    width: 600,
    height: 800,
    thumbnailSvg: '',
    lineArtSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
      <defs>
        <style>
          .line { stroke: #2D2426; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .bold-line { stroke: #2D2426; stroke-width: 4.5; stroke-linecap: round; stroke-linejoin: round; fill: #FFFFFF; }
          .bg-fill { fill: #FFFFFF; }
        </style>
      </defs>
      
      <rect class="bg-fill line" x="4" y="4" width="592" height="792" />
      
      <!-- Sparkle Stars -->
      <path class="line" d="M 120 180 L 125 155 L 130 180 L 155 185 L 130 190 L 125 215 L 120 190 L 95 185 Z" />
      <path class="line" d="M 480 180 L 485 155 L 490 180 L 515 185 L 490 190 L 485 215 L 480 190 L 455 185 Z" />
      <path class="line" d="M 100 600 L 104 580 L 108 600 L 128 604 L 108 608 L 104 628 L 100 608 L 80 604 Z" />
      <path class="line" d="M 500 600 L 504 580 L 508 600 L 528 604 L 508 608 L 504 628 L 500 608 L 480 604 Z" />

      <!-- Center Knot Gem Brooch -->
      <circle class="bold-line" cx="300" cy="380" r="45" />
      <circle class="line" cx="300" cy="380" r="30" />
      <path class="line" d="M 300 350 L 300 410" />
      <path class="line" d="M 270 380 L 330 380" />

      <!-- Giant Left Bow Loop -->
      <path class="bold-line" d="M 270 350 C 180 240 80 270 60 380 C 50 470 160 520 270 420 Z" />
      <!-- Left Inner Crease -->
      <path class="line" d="M 120 370 C 180 380 230 370 270 360" />
      <path class="line" d="M 120 390 C 180 400 230 405 270 410" />

      <!-- Giant Right Bow Loop -->
      <path class="bold-line" d="M 330 350 C 420 240 520 270 540 380 C 550 470 440 520 330 420 Z" />
      <!-- Right Inner Crease -->
      <path class="line" d="M 480 370 C 420 380 370 370 330 360" />
      <path class="line" d="M 480 390 C 420 400 370 405 330 410" />

      <!-- Flowing Left Ribbon Tail -->
      <path class="bold-line" d="M 260 410 C 240 480 180 600 160 700 L 220 670 L 260 710 C 270 610 285 500 290 425 Z" />
      <!-- Flowing Right Ribbon Tail -->
      <path class="bold-line" d="M 340 410 C 360 480 420 600 440 700 L 380 670 L 340 710 C 330 610 315 500 310 425 Z" />

      <!-- Pearl String Drapes -->
      <path class="line" d="M 200 480 C 240 540 360 540 400 480" />
      <circle class="line" cx="240" cy="515" r="7" />
      <circle class="line" cx="300" cy="535" r="9" />
      <circle class="line" cx="360" cy="515" r="7" />
    </svg>`,
  },
];
