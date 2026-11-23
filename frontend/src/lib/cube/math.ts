import type { Axis, Mat3, NormalKey, Vec3 } from "./types";

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** Returns a * b. */
export function matMul(a: Mat3, b: Mat3): Mat3 {
  const out = new Array<number>(9);
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      let sum = 0;
      for (let k = 0; k < 3; k += 1) {
        sum += a[row * 3 + k]! * b[k * 3 + col]!;
      }
      out[row * 3 + col] = sum;
    }
  }
  return out as unknown as Mat3;
}

export function applyMat(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

export function transpose(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

export function vecEq(a: Vec3, b: Vec3): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

export function vecKey(v: Vec3): string {
  return `${v[0]},${v[1]},${v[2]}`;
}

const NORMAL_KEYS: readonly NormalKey[] = [
  "+x",
  "-x",
  "+y",
  "-y",
  "+z",
  "-z",
];

const NORMAL_VECTORS: Record<NormalKey, Vec3> = {
  "+x": [1, 0, 0],
  "-x": [-1, 0, 0],
  "+y": [0, 1, 0],
  "-y": [0, -1, 0],
  "+z": [0, 0, 1],
  "-z": [0, 0, -1],
};

export function vectorToNormal(v: Vec3): NormalKey {
  for (const key of NORMAL_KEYS) {
    if (vecEq(NORMAL_VECTORS[key], v)) return key;
  }
  throw new Error(`Not a unit axis normal: ${v.join(",")}`);
}

export function normalVector(key: NormalKey): Vec3 {
  return NORMAL_VECTORS[key];
}

/** A rotation of `quarterTurns` * 90 degrees about an axis (right-hand rule). */
export function rotationMatrix(axis: Axis, quarterTurns: number): Mat3 {
  const turns = ((quarterTurns % 4) + 4) % 4;
  switch (turns) {
    case 0:
      return IDENTITY;
    case 1:
      if (axis === 0) return [1, 0, 0, 0, 0, -1, 0, 1, 0];
      if (axis === 1) return [0, 0, 1, 0, 1, 0, -1, 0, 0];
      return [0, -1, 0, 1, 0, 0, 0, 0, 1];
    case 2:
      if (axis === 0) return [1, 0, 0, 0, -1, 0, 0, 0, -1];
      if (axis === 1) return [-1, 0, 0, 0, 1, 0, 0, 0, -1];
      return [-1, 0, 0, 0, -1, 0, 0, 0, 1];
    default:
      if (axis === 0) return [1, 0, 0, 0, 0, 1, 0, -1, 0];
      if (axis === 1) return [0, 0, -1, 0, 1, 0, 1, 0, 0];
      return [0, 1, 0, -1, 0, 0, 0, 0, 1];
  }
}

export function sameMatrix(a: Mat3, b: Mat3): boolean {
  return a.every((value, index) => value === b[index]);
}
