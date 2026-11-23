import { FACE_INDEX } from "./facelets";
import type { Face } from "./types";
import { FACES } from "./types";

export interface NormalizationResult {
  facelets: string;
  changed: boolean;
  error?: string;
}

/**
 * Whole-cube rotations and slice moves move the centres. Kociemba expects the
 * U/R/F/D/L/B centres in their canonical positions, so relabel the colours by
 * centre before solving or validating. The relabelling is a bijection, so a
 * cube that is solved after normalisation is also physically solved.
 */
export function normalizeFacelets(facelets: string): NormalizationResult {
  if (facelets.length !== 54) {
    return {
      facelets,
      changed: false,
      error: `Expected 54 stickers, received ${facelets.length}.`,
    };
  }

  const centres = FACES.map((face) => facelets[FACE_INDEX[face] * 9 + 4]);
  const mapping = new Map<string, Face>();

  for (let index = 0; index < centres.length; index += 1) {
    const centre = centres[index]!;
    const face = FACES[index]!;
    if (!(FACES as readonly string[]).includes(centre)) {
      return {
        facelets,
        changed: false,
        error: `The ${face} centre has an unknown colour "${centre}".`,
      };
    }
    if (mapping.has(centre)) {
      return {
        facelets,
        changed: false,
        error: `Two faces share the ${centre} centre; centres must be six distinct colours.`,
      };
    }
    mapping.set(centre, face);
  }

  let changed = false;
  const normalized = Array.from(facelets, (char) => {
    const target = mapping.get(char);
    if (!target) return char;
    if (target !== char) changed = true;
    return target;
  }).join("");

  return { facelets: normalized, changed };
}
