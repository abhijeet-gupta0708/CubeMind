import { applyMat, transpose, vectorToNormal } from "./math";
import {
  FACELET_REFS,
  isStickerColor,
  validateFacelets,
} from "./facelets";
import type {
  CubeState,
  Cubie,
  Mat3,
  NormalKey,
  StickerColor,
  Vec3,
} from "./types";

const IDENTITY_ROTATION: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** Builds the 26 visible cubies of a solved cube. */
export function createSolvedCube(): CubeState {
  const cubies: Cubie[] = [];
  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      for (let z = -1; z <= 1; z += 1) {
        if (x === 0 && y === 0 && z === 0) continue;
        const stickers: Partial<Record<NormalKey, StickerColor>> = {};
        if (x === 1) stickers["+x"] = "R";
        if (x === -1) stickers["-x"] = "L";
        if (y === 1) stickers["+y"] = "U";
        if (y === -1) stickers["-y"] = "D";
        if (z === 1) stickers["+z"] = "F";
        if (z === -1) stickers["-z"] = "B";
        cubies.push({
          id: `${x},${y},${z}`,
          position: [x, y, z] as Vec3,
          rotation: IDENTITY_ROTATION,
          stickers,
        });
      }
    }
  }
  return { cubies };
}

export function cloneCube(cube: CubeState): CubeState {
  return {
    cubies: cube.cubies.map((cubie) => ({
      ...cubie,
      stickers: { ...cubie.stickers },
    })),
  };
}

export function cubieAt(cube: CubeState, position: Vec3): Cubie | undefined {
  return cube.cubies.find(
    (cubie) =>
      cubie.position[0] === position[0] &&
      cubie.position[1] === position[1] &&
      cubie.position[2] === position[2],
  );
}

/** The colour visible on a given world-facing side of a cubie. */
export function stickerForWorldNormal(
  cubie: Cubie,
  worldNormal: Vec3,
): StickerColor | undefined {
  const local = transpose(cubie.rotation);
  const key = vectorToNormal(applyMat(local, worldNormal));
  return cubie.stickers[key];
}

/** Serialises the physical cubies into the 54-character Kociemba order. */
export function cubeToFacelets(cube: CubeState): string {
  return FACELET_REFS.map((ref) => {
    const cubie = cubieAt(cube, ref.position);
    if (!cubie) return "-";
    return stickerForWorldNormal(cubie, ref.normal) ?? "-";
  }).join("");
}

/**
 * Rebuilds a structurally solved cube and paints its visible stickers from a
 * facelet string. Colour permutations can be arbitrary; solvability is checked
 * separately by the server.
 */
export function cubeFromFacelets(facelets: string): CubeState {
  if (facelets.length !== 54) {
    throw new Error(`Expected 54 stickers, received ${facelets.length}.`);
  }
  for (const char of facelets) {
    if (!isStickerColor(char)) {
      throw new Error(`Unknown sticker colour "${char}".`);
    }
  }

  const cube = createSolvedCube();
  const byPosition = new Map(
    cube.cubies.map((cubie) => [cubie.position.join(","), cubie]),
  );
  for (const ref of FACELET_REFS) {
    const cubie = byPosition.get(ref.position.join(","));
    if (!cubie) continue;
    cubie.stickers[vectorToNormal(ref.normal)] = facelets[
      ref.index
    ] as StickerColor;
  }
  return cube;
}

/** Paints a single visible sticker. */
export function paintFacelet(
  cube: CubeState,
  index: number,
  color: StickerColor,
): CubeState {
  const ref = FACELET_REFS[index];
  if (!ref) throw new Error(`No facelet at index ${index}.`);
  return {
    cubies: cube.cubies.map((cubie) => {
      if (
        cubie.position[0] !== ref.position[0] ||
        cubie.position[1] !== ref.position[1] ||
        cubie.position[2] !== ref.position[2]
      ) {
        return cubie;
      }
      const local = transpose(cubie.rotation);
      const key = vectorToNormal(applyMat(local, ref.normal));
      return {
        ...cubie,
        stickers: { ...cubie.stickers, [key]: color },
      };
    }),
  };
}

export function isFaceletsSolved(facelets: string): boolean {
  if (facelets.length !== 54) return false;
  if (facelets.includes("-")) return false;
  for (let face = 0; face < 6; face += 1) {
    const group = facelets.slice(face * 9, face * 9 + 9);
    if (new Set(group).size !== 1) return false;
  }
  return true;
}

export function isCubeSolved(cube: CubeState): boolean {
  return isFaceletsSolved(cubeToFacelets(cube));
}

export function colorCounts(facelets: string): Record<StickerColor, number> {
  return validateFacelets(facelets).counts;
}
