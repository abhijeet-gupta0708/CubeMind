import { MOVE_DEFINITIONS, moveLabel } from "./moves";
import type { Move, MoveAmount, MoveFace } from "./types";

const SCRAMBLE_FACES: readonly MoveFace[] = [
  "U",
  "R",
  "F",
  "D",
  "L",
  "B",
];

const AMOUNTS: readonly MoveAmount[] = [1, 2, 3];

export type RandomSource = () => number;

export interface ScrambleOptions {
  /** Total number of moves. Defaults to 20. */
  length?: number;
  /** Avoid a face turning twice in a row and A B A patterns on one axis. */
  random?: RandomSource;
}

/**
 * Generates a WCA-style random-move scramble. Every move is independent and
 * always valid: no face repeats immediately and no axis does A B A.
 */
export function generateScramble(options: ScrambleOptions = {}): Move[] {
  const random = options.random ?? Math.random;
  const length = Math.max(1, Math.floor(options.length ?? 20));
  const moves: Move[] = [];
  let previousFace: MoveFace | undefined;
  let previousAxis: number | undefined;
  let axisRun = 0;

  while (moves.length < length) {
    const face = SCRAMBLE_FACES[Math.floor(random() * SCRAMBLE_FACES.length)]!;
    if (face === previousFace) continue;
    const axis = MOVE_DEFINITIONS[face].axis;
    axisRun = axis === previousAxis ? axisRun + 1 : 0;
    if (axisRun >= 2) continue;

    const amount = AMOUNTS[Math.floor(random() * AMOUNTS.length)]!;
    moves.push({ face, amount });
    previousFace = face;
    previousAxis = axis;
  }

  return moves;
}

export function scrambleNotation(moves: readonly Move[]): string {
  return moves.map(moveLabel).join(" ");
}

export const SCRAMBLE_PRESETS = [
  { id: "easy", label: "Easy", length: 10, description: "10 moves" },
  { id: "medium", label: "Medium", length: 20, description: "20 moves" },
  { id: "hard", label: "Hard", length: 25, description: "25 moves" },
  { id: "expert", label: "Expert", length: 30, description: "30 moves" },
] as const;

export type ScramblePresetId = (typeof SCRAMBLE_PRESETS)[number]["id"];
