import { matMul, rotationMatrix } from "./math";
import type {
  Axis,
  CubeState,
  Mat3,
  Move,
  MoveAmount,
  MoveDefinition,
  MoveFace,
  Vec3,
} from "./types";

export const MOVE_DEFINITIONS: Record<MoveFace, MoveDefinition> = {
  U: { axis: 1, layers: [1], direction: -1 },
  D: { axis: 1, layers: [-1], direction: 1 },
  R: { axis: 0, layers: [1], direction: -1 },
  L: { axis: 0, layers: [-1], direction: 1 },
  F: { axis: 2, layers: [1], direction: -1 },
  B: { axis: 2, layers: [-1], direction: 1 },
  M: { axis: 0, layers: [0], direction: 1 },
  E: { axis: 1, layers: [0], direction: 1 },
  S: { axis: 2, layers: [0], direction: -1 },
  x: { axis: 0, layers: [-1, 0, 1], direction: -1 },
  y: { axis: 1, layers: [-1, 0, 1], direction: -1 },
  z: { axis: 2, layers: [-1, 0, 1], direction: -1 },
};

const MOVE_FACES: readonly MoveFace[] = [
  "U",
  "R",
  "F",
  "D",
  "L",
  "B",
  "M",
  "E",
  "S",
  "x",
  "y",
  "z",
];

/**
 * Signed quarter turns for a move. Prime turns animate the short way round
 * (one quarter in the opposite direction) rather than three quarters.
 */
export function signedQuarterTurns(move: Move): number {
  const direction = MOVE_DEFINITIONS[move.face].direction;
  if (move.amount === 2) return 2 * direction;
  if (move.amount === 3) return -1 * direction;
  return direction;
}

export function rotationForMove(move: Move): Mat3 {
  const { axis } = MOVE_DEFINITIONS[move.face];
  return rotationMatrix(axis, signedQuarterTurns(move));
}

function cubieInLayer(position: Vec3, axis: Axis, layers: readonly number[]) {
  return layers.includes(position[axis]);
}

/** Applies one quarter turn to the selected layers. */
function turnLayers(
  cube: CubeState,
  axis: Axis,
  layers: readonly number[],
  quarterTurns: number,
): CubeState {
  const rotation = rotationMatrix(axis, quarterTurns);
  return {
    cubies: cube.cubies.map((cubie) => {
      if (!cubieInLayer(cubie.position, axis, layers)) return cubie;
      return {
        ...cubie,
        position: [
          rotation[0] * cubie.position[0] +
            rotation[1] * cubie.position[1] +
            rotation[2] * cubie.position[2],
          rotation[3] * cubie.position[0] +
            rotation[4] * cubie.position[1] +
            rotation[5] * cubie.position[2],
          rotation[6] * cubie.position[0] +
            rotation[7] * cubie.position[1] +
            rotation[8] * cubie.position[2],
        ] as Vec3,
        rotation: matMul(rotation, cubie.rotation),
      };
    }),
  };
}

export function applyMove(cube: CubeState, move: Move): CubeState {
  const def = MOVE_DEFINITIONS[move.face];
  const quarters = signedQuarterTurns(move);
  const steps = Math.abs(quarters);
  const sign = Math.sign(quarters);
  let next = cube;
  for (let step = 0; step < steps; step += 1) {
    next = turnLayers(next, def.axis, def.layers, sign);
  }
  return next;
}

export function applyMoves(cube: CubeState, moves: readonly Move[]): CubeState {
  return moves.reduce((state, move) => applyMove(state, move), cube);
}

export function invertMove(move: Move): Move {
  const amount: MoveAmount =
    move.amount === 1 ? 3 : move.amount === 3 ? 1 : 2;
  return { face: move.face, amount };
}

export function invertMoves(moves: readonly Move[]): Move[] {
  return [...moves].reverse().map(invertMove);
}

export function moveLabel(move: Move): string {
  return `${move.face}${move.amount === 2 ? "2" : move.amount === 3 ? "'" : ""}`;
}

export function moveKey(move: Move): string {
  return moveLabel(move);
}

export function sequenceLabel(moves: readonly Move[]): string {
  return moves.map(moveLabel).join(" ");
}

const TOKEN_PATTERN = /^([UDLRFBMESudlrfbmes]|[XYZxyz])(['’2]?)$/;

export function parseMove(token: string): Move {
  const normalized = token.trim().replace("’", "'");
  const match = TOKEN_PATTERN.exec(normalized);
  if (!match) {
    throw new Error(`"${token}" is not valid cube notation.`);
  }
  const rawFace = match[1]!;
  const suffix = match[2] ?? "";
  let face: MoveFace;
  if (rawFace === "X" || rawFace === "x") face = "x";
  else if (rawFace === "Y" || rawFace === "y") face = "y";
  else if (rawFace === "Z" || rawFace === "z") face = "z";
  else face = rawFace.toUpperCase() as MoveFace;

  const amount: MoveAmount = suffix === "2" ? 2 : suffix === "'" ? 3 : 1;
  return { face, amount };
}

export function parseSequence(sequence: string): Move[] {
  const tokens = sequence
    .replace(/[()[\],]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return tokens.map(parseMove);
}

/** Rotates a whole-cube orientation without changing the represented state. */
export function rotateCubeOrientation(move: Move): Move {
  if (!["x", "y", "z"].includes(move.face)) {
    throw new Error("Only whole-cube rotations are supported here.");
  }
  return move;
}

export function isWideMove(move: Move): boolean {
  return ["x", "y", "z"].includes(move.face);
}

export function allQuarterMoves(): Move[] {
  return MOVE_FACES.flatMap((face) => [
    { face, amount: 1 as const },
    { face, amount: 2 as const },
    { face, amount: 3 as const },
  ]);
}
