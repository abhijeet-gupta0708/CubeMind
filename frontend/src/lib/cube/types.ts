/**
 * Core cube types. The cube is modelled as 26 physical cubies, each with an
 * integer position on a 3x3x3 lattice and an exact integer rotation matrix.
 * This keeps the 3D view, the facelet notation and the editor in sync.
 */

export type Face = "U" | "R" | "F" | "D" | "L" | "B";

/** A sticker colour is named after the face it belongs to on a solved cube. */
export type StickerColor = Face;

export type Axis = 0 | 1 | 2;

/** A vector with integer components in [-1, 1]. */
export type Vec3 = readonly [number, number, number];

/** Row-major 3x3 matrix. Maps a local cubie vector into world space. */
export type Mat3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export type NormalKey = "+x" | "-x" | "+y" | "-y" | "+z" | "-z";

export interface Cubie {
  /** Stable identifier derived from the solved position. */
  id: string;
  position: Vec3;
  /** Rotation from the cubie's local frame to world space. */
  rotation: Mat3;
  /** Colours keyed by the cubie-local normal. */
  stickers: Partial<Record<NormalKey, StickerColor>>;
}

export interface CubeState {
  cubies: readonly Cubie[];
}

export type MoveFace =
  | "U"
  | "D"
  | "L"
  | "R"
  | "F"
  | "B"
  | "M"
  | "E"
  | "S"
  | "x"
  | "y"
  | "z";

/** 1 = clockwise quarter turn, 2 = half turn, 3 = counter-clockwise. */
export type MoveAmount = 1 | 2 | 3;

export interface Move {
  face: MoveFace;
  amount: MoveAmount;
}

export interface MoveDefinition {
  axis: Axis;
  layers: readonly [-1 | 0 | 1, ...(-1 | 0 | 1)[]];
  /** +1 follows the positive right-hand rule for that axis. */
  direction: 1 | -1;
}

export interface FaceletValidation {
  valid: boolean;
  errors: string[];
  counts: Record<StickerColor, number>;
}

export const FACES: readonly Face[] = ["U", "R", "F", "D", "L", "B"] as const;

export const FACE_NAMES: Record<Face, string> = {
  U: "Up",
  R: "Right",
  F: "Front",
  D: "Down",
  L: "Left",
  B: "Back",
};

/** Classic sticker palette, tuned for contrast on a dark surface. */
export const FACE_COLORS: Record<Face, string> = {
  U: "#f4f6f8",
  R: "#e5484d",
  F: "#2f9e68",
  D: "#f2d024",
  L: "#f0782a",
  B: "#3e63dd",
};

export const FACE_COLOR_NAMES: Record<Face, string> = {
  U: "White",
  R: "Red",
  F: "Green",
  D: "Yellow",
  L: "Orange",
  B: "Blue",
};

/** Background shade used on the dark cubelet body, per face, for depth. */
export const FACE_SOLVED_STRING = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";

export const EMPTY_FACELETS = "-".repeat(54);
