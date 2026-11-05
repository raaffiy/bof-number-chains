export interface Team {
  id: string;
  name: string;
  themeColor: {
    primary: string;
    border: string;
    bg: string;
    glow: string;
    badge: string;
  };
  members: {
    name: string;
  }[];
}

export interface BoardStep {
  stepIndex: number;
  variable: string;
  formula: string;
  explanation: string;
  result: number;
}

export interface GameBoard {
  id: number;
  title: string;
  difficulty: "Mudah" | "Sedang" | "Sulit" | "Sangat Sulit" | "Master";
  difficultyColor: string;
  points: number;
  targetVariable: string;
  steps: BoardStep[];
  correctAnswer: number;
}

export const TEAMS_DATA: Team[] = [
  {
    id: "ft",
    name: "Fakultas Teknik",
    themeColor: {
      primary: "from-blue-600 to-indigo-600",
      border: "border-blue-500",
      bg: "bg-blue-950/40",
      glow: "rgba(59, 130, 246, 0.5)",
      badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    },
    members: [
      { name: "Sandy Kristian"},
      { name: "Axel Giovanni"},
      { name: "Hanif Pratama"},
      { name: "Yesaya Kevin"},
    ],
  },
  {
    id: "fasilkom",
    name: "Fakultas Ilmu Komputer",
    themeColor: {
      primary: "from-cyan-500 to-teal-600",
      border: "border-cyan-400",
      bg: "bg-cyan-950/40",
      glow: "rgba(6, 182, 212, 0.5)",
      badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    },
    members: [
      { name: "Maxwell Salvador"},
      { name: "Shakira Amirah"},
      { name: "Kevin Lius"},
      { name: "Xaviera Putri"},
    ],
  },
  {
    id: "fk",
    name: "Fakultas Kedokteran",
    themeColor: {
      primary: "from-emerald-500 to-green-600",
      border: "border-emerald-400",
      bg: "bg-emerald-950/40",
      glow: "rgba(16, 185, 129, 0.5)",
      badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
    members: [
      { name: "Jessica Margaretha"},
      { name: "Naufal Hafizh"},
      { name: "Sarah Firdaus"},
      { name: "Kenji Wibawa"},
    ],
  },
  {
    id: "fmipa",
    name: "Fakultas MIPA",
    themeColor: {
      primary: "from-purple-600 to-pink-600",
      border: "border-purple-400",
      bg: "bg-purple-950/40",
      glow: "rgba(168, 85, 247, 0.5)",
      badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    },
    members: [
      { name: "Kiana Almira"},
      { name: "Gregorius Aldo"},
      { name: "Christopher Chen"},
      { name: "Amanda Clarissa"},
    ],
  },
  {
    id: "feb",
    name: "Fakultas Ekonomi & Bisnis",
    themeColor: {
      primary: "from-amber-500 to-orange-600",
      border: "border-amber-400",
      bg: "bg-amber-950/40",
      glow: "rgba(245, 158, 11, 0.5)",
      badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    },
    members: [
      { name: "Davin Alamsyah"},
      { name: "Lyora Wijaya"},
      { name: "Edward Santoso"},
      { name: "Fathan Mahendra"},
    ],
  },
];

export const BOARDS_DATA: GameBoard[] = [
  {
    id: 1,
    title: "Papan 01: Linear Arithmetics",
    difficulty: "Mudah",
    difficultyColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    points: 100,
    targetVariable: "E",
    steps: [
      {
        stepIndex: 1,
        variable: "A",
        formula: "15",
        explanation: "Titik awal perhitungan: A = 15",
        result: 15,
      },
      {
        stepIndex: 2,
        variable: "B",
        formula: "A × 4 + 10",
        explanation: "B = (15 × 4) + 10 = 60 + 10 = 70",
        result: 70,
      },
      {
        stepIndex: 3,
        variable: "C",
        formula: "B ÷ 2 - 5",
        explanation: "C = (70 ÷ 2) - 5 = 35 - 5 = 30",
        result: 30,
      },
      {
        stepIndex: 4,
        variable: "D",
        formula: "C²",
        explanation: "D = 30² = 900",
        result: 900,
      },
      {
        stepIndex: 5,
        variable: "E",
        formula: "D ÷ 30 + 18",
        explanation: "E = (900 ÷ 30) + 18 = 30 + 18 = 48",
        result: 48,
      },
    ],
    correctAnswer: 48,
  },
  {
    id: 2,
    title: "Papan 02: Radical Equations",
    difficulty: "Sedang",
    difficultyColor: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    points: 200,
    targetVariable: "E",
    steps: [
      {
        stepIndex: 1,
        variable: "A",
        formula: "64",
        explanation: "Titik awal perhitungan: A = 64",
        result: 64,
      },
      {
        stepIndex: 2,
        variable: "B",
        formula: "√A × 9 + 8",
        explanation: "B = (√64 × 9) + 8 = (8 × 9) + 8 = 72 + 8 = 80",
        result: 80,
      },
      {
        stepIndex: 3,
        variable: "C",
        formula: "B ÷ 4 + 15",
        explanation: "C = (80 ÷ 4) + 15 = 20 + 15 = 35",
        result: 35,
      },
      {
        stepIndex: 4,
        variable: "D",
        formula: "C × 3 - 25",
        explanation: "D = (35 × 3) - 25 = 105 - 25 = 80",
        result: 80,
      },
      {
        stepIndex: 5,
        variable: "E",
        formula: "D ÷ 5 + √144",
        explanation: "E = (80 ÷ 5) + 12 = 16 + 12 = 28",
        result: 28,
      },
    ],
    correctAnswer: 28,
  },
  {
    id: 3,
    title: "Papan 03: Factorial & Pythagorean",
    difficulty: "Sulit",
    difficultyColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    points: 300,
    targetVariable: "E",
    steps: [
      {
        stepIndex: 1,
        variable: "A",
        formula: "5! ÷ 10",
        explanation: "5! = 5 × 4 × 3 × 2 × 1 = 120; A = 120 ÷ 10 = 12",
        result: 12,
      },
      {
        stepIndex: 2,
        variable: "B",
        formula: "A² + 25",
        explanation: "B = 12² + 25 = 144 + 25 = 169",
        result: 169,
      },
      {
        stepIndex: 3,
        variable: "C",
        formula: "√B × 6 - 8",
        explanation: "C = (√169 × 6) - 8 = (13 × 6) - 8 = 78 - 8 = 70",
        result: 70,
      },
      {
        stepIndex: 4,
        variable: "D",
        formula: "C ÷ 7 × 12",
        explanation: "D = (70 ÷ 7) × 12 = 10 × 12 = 120",
        result: 120,
      },
      {
        stepIndex: 5,
        variable: "E",
        formula: "(D - 20) ÷ 4 + 17",
        explanation: "E = ((120 - 20) ÷ 4) + 17 = (100 ÷ 4) + 17 = 25 + 17 = 42",
        result: 42,
      },
    ],
    correctAnswer: 42,
  },
  {
    id: 4,
    title: "Papan 04: Nested Logic Chain",
    difficulty: "Sangat Sulit",
    difficultyColor: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    points: 400,
    targetVariable: "E",
    steps: [
      {
        stepIndex: 1,
        variable: "A",
        formula: "48",
        explanation: "Titik awal perhitungan: A = 48",
        result: 48,
      },
      {
        stepIndex: 2,
        variable: "B",
        formula: "(A ÷ 3) + 14",
        explanation: "B = (48 ÷ 3) + 14 = 16 + 14 = 30",
        result: 30,
      },
      {
        stepIndex: 3,
        variable: "C",
        formula: "B² ÷ 15",
        explanation: "C = 30² ÷ 15 = 900 ÷ 15 = 60",
        result: 60,
      },
      {
        stepIndex: 4,
        variable: "D",
        formula: "(C × 4 - 40) ÷ 8",
        explanation: "D = (240 - 40) ÷ 8 = 200 ÷ 8 = 25",
        result: 25,
      },
      {
        stepIndex: 5,
        variable: "E",
        formula: "√D × 18 - 15",
        explanation: "E = (√25 × 18) - 15 = (5 × 18) - 15 = 90 - 15 = 75",
        result: 75,
      },
    ],
    correctAnswer: 75,
  },
  {
    id: 5,
    title: "Papan 05: Grand Master Finale",
    difficulty: "Master",
    difficultyColor: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    points: 500,
    targetVariable: "E",
    steps: [
      {
        stepIndex: 1,
        variable: "A",
        formula: "72",
        explanation: "Titik awal perhitungan: A = 72",
        result: 72,
      },
      {
        stepIndex: 2,
        variable: "B",
        formula: "(A ÷ 4) + √81",
        explanation: "B = (72 ÷ 4) + 9 = 18 + 9 = 27",
        result: 27,
      },
      {
        stepIndex: 3,
        variable: "C",
        formula: "B × 5 - 35",
        explanation: "C = (27 × 5) - 35 = 135 - 35 = 100",
        result: 100,
      },
      {
        stepIndex: 4,
        variable: "D",
        formula: "√C × 15 + 50",
        explanation: "D = (√100 × 15) + 50 = (10 × 15) + 50 = 150 + 50 = 200",
        result: 200,
      },
      {
        stepIndex: 5,
        variable: "E",
        formula: "(D ÷ 8) × 7 - 31",
        explanation: "E = ((200 ÷ 8) × 7) - 31 = (25 × 7) - 31 = 175 - 31 = 144",
        result: 144,
      },
    ],
    correctAnswer: 144,
  },
];
