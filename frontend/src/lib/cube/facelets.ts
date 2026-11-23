import type { Face, FaceletValidation, StickerColor, Vec3 } from "./types";
import { FACES } from "./types";
import { normalizeFacelets } from "./orientation";

export interface FaceletRef {
  face: Face;
  row: number;
  col: number;
  position: Vec3;
  normal: Vec3;
  index: number;
}

/** World-space position of a facelet on a solved cube. */
function positionFor(face: Face, row: number, col: number): Vec3 {
  switch (face) {
    case "U":
      return [-1 + col, 1, -1 + row];
    case "R":
      return [1, 1 - row, 1 - col];
    case "F":
      return [-1 + col, 1 - row, 1];
    case "D":
      return [-1 + col, -1, 1 - row];
    case "L":
      return [-1, 1 - row, -1 + col];
    case "B":
      return [1 - col, 1 - row, -1];
  }
}

function normalFor(face: Face): Vec3 {
  switch (face) {
    case "U":
      return [0, 1, 0];
    case "R":
      return [1, 0, 0];
    case "F":
      return [0, 0, 1];
    case "D":
      return [0, -1, 0];
    case "L":
      return [-1, 0, 0];
    case "B":
      return [0, 0, -1];
  }
}

export const FACE_INDEX: Record<Face, number> = {
  U: 0,
  R: 1,
  F: 2,
  D: 3,
  L: 4,
  B: 5,
};

/**
 * Facelet order matches the Kociemba notation:
 * U1..U9, R1..R9, F1..F9, D1..D9, L1..L9, B1..B9.
 */
export const FACELET_REFS: readonly FaceletRef[] = FACES.flatMap((face) => {
  const refs: FaceletRef[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const index = FACE_INDEX[face] * 9 + row * 3 + col;
      refs.push({
        face,
        row,
        col,
        position: positionFor(face, row, col),
        normal: normalFor(face),
        index,
      });
    }
  }
  return refs;
});

export function faceletIndex(face: Face, row: number, col: number): number {
  return FACE_INDEX[face] * 9 + row * 3 + col;
}

export function isStickerColor(value: string): value is StickerColor {
  return value.length === 1 && (FACES as readonly string[]).includes(value);
}

/** Validates colour counts and fixed centres. Full solvability lives server-side. */
export function validateFacelets(facelets: string): FaceletValidation {
  const errors: string[] = [];
  const counts = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 } as Record<
    StickerColor,
    number
  >;

  if (facelets.length !== 54) {
    errors.push(`Expected 54 stickers, received ${facelets.length}.`);
  }

  for (let index = 0; index < Math.min(54, facelets.length); index += 1) {
    const char = facelets[index]!;
    if (isStickerColor(char)) {
      counts[char] += 1;
    } else {
      errors.push(`Sticker ${index + 1} has an unknown colour "${char}".`);
    }
  }

  for (const face of FACES) {
    if (counts[face] !== 9) {
      errors.push(`${face} has ${counts[face]} stickers; each colour needs 9.`);
    }
  }

  const normalization = normalizeFacelets(facelets);
  if (normalization.error) {
    errors.push(normalization.error);
  }

  return { valid: errors.length === 0, errors, counts };
}
