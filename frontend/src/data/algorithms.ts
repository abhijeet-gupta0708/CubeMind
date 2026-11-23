export type AlgorithmCategory = "fundamentals" | "f2l" | "oll" | "pll" | "patterns";

export type AlgorithmDifficulty = "Beginner" | "Intermediate" | "Advanced";

export interface CubeAlgorithm {
  id: string;
  name: string;
  category: AlgorithmCategory;
  notation: string;
  description: string;
  difficulty: AlgorithmDifficulty;
  note?: string;
}

export const ALGORITHM_CATEGORIES: ReadonlyArray<{
  id: AlgorithmCategory | "all";
  label: string;
  description: string;
}> = [
  {
    id: "all",
    label: "All",
    description: "Every trigger, case and pattern in the library.",
  },
  {
    id: "fundamentals",
    label: "Fundamentals",
    description: "Short triggers that appear inside longer algorithms.",
  },
  {
    id: "f2l",
    label: "F2L",
    description: "First-two-layers insertion triggers. Setup determines the case.",
  },
  {
    id: "oll",
    label: "OLL",
    description: "Orientation of the last layer — making the top face one colour.",
  },
  {
    id: "pll",
    label: "PLL",
    description: "Permutation of the last layer — moving solved pieces into place.",
  },
  {
    id: "patterns",
    label: "Patterns",
    description: "Decorative sequences for practice and demonstration.",
  },
];

export const ALGORITHMS: CubeAlgorithm[] = [
  {
    id: "sexy-move",
    name: "Sexy move",
    category: "fundamentals",
    notation: "R U R' U'",
    description:
      "A four-move trigger that appears inside F2L inserts, OLL algorithms and corner work. Practise it until it needs no thought.",
    difficulty: "Beginner",
    note: "Applying it six times returns the cube to solved.",
  },
  {
    id: "reverse-sexy",
    name: "Reverse sexy",
    category: "fundamentals",
    notation: "U R U' R'",
    description:
      "The inverse of the sexy move. Useful when a pair or corner needs to come back out of a slot.",
    difficulty: "Beginner",
  },
  {
    id: "sledgehammer",
    name: "Sledgehammer",
    category: "fundamentals",
    notation: "R' F R F'",
    description:
      "A compact trigger that flips the front-right edge pair. It shows up in F2L and several OLL cases.",
    difficulty: "Intermediate",
  },
  {
    id: "hedgeslammer",
    name: "Hedgeslammer",
    category: "fundamentals",
    notation: "F R' F' R",
    description: "The inverse of the sledgehammer; the two are often paired in drills.",
    difficulty: "Intermediate",
  },
  {
    id: "f2l-right",
    name: "Right-slot insert",
    category: "f2l",
    notation: "R U' R'",
    description:
      "A basic front-right insertion trigger when the corner and edge are paired above the slot.",
    difficulty: "Beginner",
    note: "This is a trigger, not a complete F2L case table. The pair must be set up correctly.",
  },
  {
    id: "f2l-left",
    name: "Left-slot insert",
    category: "f2l",
    notation: "L' U L",
    description:
      "The mirror of the right-slot insert. Use it when the prepared pair belongs in the front-left slot.",
    difficulty: "Beginner",
    note: "Setup matters: rotate U until the pair sits above its target slot.",
  },
  {
    id: "f2l-split",
    name: "Pair split",
    category: "f2l",
    notation: "R U R'",
    description:
      "Separates a joined pair so it can be re-paired with a different U turn. A common repair move when a pair is stuck.",
    difficulty: "Intermediate",
  },
  {
    id: "oll-sune",
    name: "Sune (OLL 27)",
    category: "oll",
    notation: "R U R' U R U2 R'",
    description:
      "Orients three top corners while leaving the rest of the last layer intact. Hold the oriented corner in a consistent position.",
    difficulty: "Intermediate",
    note: "Applied to a solved cube it creates a recognisable corner-orientation pattern.",
  },
  {
    id: "oll-antisune",
    name: "Anti-Sune (OLL 26)",
    category: "oll",
    notation: "R U2 R' U' R U' R'",
    description: "The mirror of Sune, used for the opposite three-corner orientation case.",
    difficulty: "Intermediate",
  },
  {
    id: "oll-cross",
    name: "Yellow cross (OLL 45)",
    category: "oll",
    notation: "F R U R' U' F'",
    description:
      "The classic edge-orientation trigger for the line case. Set up the line horizontally before applying it.",
    difficulty: "Beginner",
    note: "Applied blindly it changes the top edges; it is not a one-size-fits-all yellow-cross fix.",
  },
  {
    id: "oll-33",
    name: "T-shape (OLL 33)",
    category: "oll",
    notation: "R U R' U' R' F R F'",
    description:
      "An OLL case with a T-shaped yellow block. It combines a sexy move with a sledgehammer-style finish.",
    difficulty: "Advanced",
  },
  {
    id: "oll-21",
    name: "Double Sune (OLL 21)",
    category: "oll",
    notation: "R U2 R' U' R U R' U' R U' R'",
    description:
      "A longer orientation case built from two Sune-like sections. Practise the rhythm before chasing speed.",
    difficulty: "Advanced",
  },
  {
    id: "t-perm",
    name: "T-perm",
    category: "pll",
    notation: "R U R' U' R' F R2 U' R' U' R U R' F'",
    description:
      "Swaps two adjacent last-layer corners and two opposite edges. One of the most recognisable PLL cases.",
    difficulty: "Intermediate",
  },
  {
    id: "y-perm",
    name: "Y-perm",
    category: "pll",
    notation: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
    description:
      "Swaps diagonal corners and two edges. Often used as a fallback when a PLL case is not recognised.",
    difficulty: "Advanced",
  },
  {
    id: "ua-perm",
    name: "Ua-perm",
    category: "pll",
    notation: "R U' R U R U R U' R' U' R2",
    description:
      "A three-edge cycle for the last layer. Hold the solved edge at the back and check the cycle direction.",
    difficulty: "Intermediate",
  },
  {
    id: "ub-perm",
    name: "Ub-perm",
    category: "pll",
    notation: "R2 U R U R' U' R' U' R' U R'",
    description: "The opposite three-edge cycle to Ua. The two are mirror solutions of the same shape.",
    difficulty: "Intermediate",
  },
  {
    id: "h-perm",
    name: "H-perm",
    category: "pll",
    notation: "M2 U M2 U2 M2 U M2",
    description:
      "Swaps both pairs of opposite last-layer edges. Slice-heavy and satisfying to execute.",
    difficulty: "Intermediate",
  },
  {
    id: "z-perm",
    name: "Z-perm",
    category: "pll",
    notation: "M2 U M2 U M' U2 M2 U2 M' U2",
    description:
      "Swaps adjacent edge pairs across the last layer. Uses the middle slice, so keep the cube steady.",
    difficulty: "Advanced",
  },
  {
    id: "aa-perm",
    name: "Aa-perm",
    category: "pll",
    notation: "x R' U R' D2 R U' R' D2 R2 x'",
    description:
      "Cycles three last-layer corners. The leading and trailing whole-cube rotations keep the final orientation tidy.",
    difficulty: "Advanced",
  },
  {
    id: "ab-perm",
    name: "Ab-perm",
    category: "pll",
    notation: "x R2 D2 R U R' D2 R U' R x'",
    description: "The mirror corner cycle to Aa. Watch the D2 moves — they are easy to rush.",
    difficulty: "Advanced",
  },
  {
    id: "checkerboard",
    name: "Checkerboard",
    category: "patterns",
    notation: "M2 E2 S2",
    description:
      "A slice-only pattern that creates a checkerboard on every face. A good drill for controlled middle-slice turns.",
    difficulty: "Intermediate",
    note: "This is a pattern, not a solving algorithm.",
  },
  {
    id: "cube-in-a-cube",
    name: "Cube in a cube",
    category: "patterns",
    notation: "F L F U' R U F2 L2 U' L' B D' B' L2 U",
    description:
      "A decorative sequence that forms a smaller cube pattern on each face. Long enough to reward clean notation reading.",
    difficulty: "Advanced",
    note: "This is a pattern, not a solving algorithm.",
  },
];
