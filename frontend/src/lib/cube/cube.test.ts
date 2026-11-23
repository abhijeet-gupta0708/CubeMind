import { describe, expect, it } from "vitest";
import {
  createSolvedCube,
  cubeFromFacelets,
  cubeToFacelets,
  isFaceletsSolved,
  paintFacelet,
} from "./cubie";
import {
  MOVE_DEFINITIONS,
  applyMove,
  applyMoves,
  invertMove,
  invertMoves,
  moveLabel,
  parseMove,
  parseSequence,
  signedQuarterTurns,
} from "./moves";
import { generateScramble, scrambleNotation } from "./scramble";
import { FACE_SOLVED_STRING, FACES } from "./types";
import type { Move, MoveFace } from "./types";
import { validateFacelets } from "./facelets";

const ALL_MOVE_FACES: MoveFace[] = [
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

function faceGroup(facelets: string, face: string): string {
  const index = FACES.indexOf(face as (typeof FACES)[number]);
  return facelets.slice(index * 9, index * 9 + 9);
}

describe("cube construction and serialisation", () => {
  it("starts solved in canonical facelet order", () => {
    expect(cubeToFacelets(createSolvedCube())).toBe(FACE_SOLVED_STRING);
    expect(isFaceletsSolved(FACE_SOLVED_STRING)).toBe(true);
  });

  it("round-trips cubies through facelets", () => {
    const scrambled = applyMoves(
      createSolvedCube(),
      parseSequence("R U R' U' F2 D L2 B'"),
    );
    const facelets = cubeToFacelets(scrambled);
    const rebuilt = cubeFromFacelets(facelets);
    expect(cubeToFacelets(rebuilt)).toBe(facelets);
    expect(cubeToFacelets(applyMove(rebuilt, parseMove("R")))).toBe(
      cubeToFacelets(applyMove(scrambled, parseMove("R"))),
    );
  });

  it("preserves colour counts through moves", () => {
    const cube = applyMoves(createSolvedCube(), parseSequence("R U2 B' L D2 F"));
    const { valid, counts } = validateFacelets(cubeToFacelets(cube));
    expect(valid).toBe(true);
    for (const face of FACES) expect(counts[face]).toBe(9);
  });
});

describe("move notation", () => {
  it("parses prime and double moves", () => {
    expect(parseMove("R")).toEqual({ face: "R", amount: 1 });
    expect(parseMove("U'")).toEqual({ face: "U", amount: 3 });
    expect(parseMove("F2")).toEqual({ face: "F", amount: 2 });
    expect(parseMove("x")).toEqual({ face: "x", amount: 1 });
    expect(parseSequence("R U R' U'").map(moveLabel)).toEqual([
      "R",
      "U",
      "R'",
      "U'",
    ]);
  });

  it("rejects invalid notation", () => {
    expect(() => parseMove("Q")).toThrow();
    expect(() => parseMove("R3")).toThrow();
    expect(() => parseMove("")).toThrow();
  });

  it("turns prime moves the short way for animation", () => {
    expect(signedQuarterTurns({ face: "R", amount: 1 })).toBe(-1);
    expect(signedQuarterTurns({ face: "R", amount: 3 })).toBe(1);
    expect(signedQuarterTurns({ face: "R", amount: 2 })).toBe(-2);
  });
});

describe("move group laws", () => {
  it.each(ALL_MOVE_FACES)("applying %s then its inverse restores the cube", (face) => {
    const solved = createSolvedCube();
    const forEachAmount: Move[] = [1, 2, 3].map((amount) => ({
      face,
      amount: amount as 1 | 2 | 3,
    }));
    for (const move of forEachAmount) {
      expect(cubeToFacelets(applyMove(applyMove(solved, move), invertMove(move)))).toBe(
        FACE_SOLVED_STRING,
      );
    }
  });

  it.each(ALL_MOVE_FACES)("four quarter turns of %s restore the cube", (face) => {
    const solved = createSolvedCube();
    const once = applyMove(solved, { face, amount: 1 });
    const twice = applyMove(once, { face, amount: 1 });
    const thrice = applyMove(twice, { face, amount: 1 });
    const four = applyMove(thrice, { face, amount: 1 });
    expect(cubeToFacelets(four)).toBe(FACE_SOLVED_STRING);
    // A half turn twice is also the identity.
    expect(cubeToFacelets(applyMove(applyMove(solved, { face, amount: 2 }), { face, amount: 2 }))).toBe(
      FACE_SOLVED_STRING,
    );
  });

  it("restores an arbitrary scrambled state after its inverse", () => {
    const scramble = parseSequence("R U2 F' L D B2 R' U");
    const scrambled = applyMoves(createSolvedCube(), scramble);
    const restored = applyMoves(scrambled, invertMoves(scramble));
    expect(cubeToFacelets(restored)).toBe(FACE_SOLVED_STRING);
    expect(cubeToFacelets(applyMove(applyMove(scrambled, parseMove("F")), parseMove("F'")))).toBe(
      cubeToFacelets(scrambled),
    );
  });

  it("performs a known U turn correctly", () => {
    const turn = applyMove(createSolvedCube(), parseMove("U"));
    const facelets = cubeToFacelets(turn);
    // Clockwise U sends the front top row to the left face.
    expect(faceGroup(facelets, "L")).toBe("FFF" + "LLL" + "LLL");
    expect(faceGroup(facelets, "F")).toBe("RRR" + "FFF" + "FFF");
  });
});

describe("facelet editor", () => {
  it("paints one sticker while leaving counts intact", () => {
    const cube = createSolvedCube();
    // Paint the upper-right sticker of the front face red (currently green).
    const painted = paintFacelet(cube, 2 * 9 + 2, "R");
    const facelets = cubeToFacelets(painted);
    expect(facelets[2 * 9 + 2]).toBe("R");
    expect(validateFacelets(facelets).counts.R).toBe(10);
    expect(validateFacelets(facelets).counts.F).toBe(8);
    expect(validateFacelets(facelets).valid).toBe(false);
  });

  it("allows a full arbitrary painting to be serialised", () => {
    let cube = createSolvedCube();
    // Mirror the front face colours from the back face to create an invalid
    // but representable configuration.
    const back = cubeToFacelets(cube).slice(4 * 9, 5 * 9);
    for (let i = 0; i < 9; i += 1) cube = paintFacelet(cube, 2 * 9 + i, "B");
    expect(back.length).toBe(9);
    expect(cubeToFacelets(cube).slice(2 * 9, 3 * 9)).toBe("BBBBBBBBB");
  });
});

describe("scramble generator", () => {
  it("generates the requested number of valid moves", () => {
    const scramble = generateScramble({ length: 30 });
    expect(scramble).toHaveLength(30);
    expect(scrambleNotation(scramble).split(" ")).toHaveLength(30);
    expect(scramble.every((move) => ALL_MOVE_FACES.includes(move.face))).toBe(true);
  });

  it("never repeats a face immediately or does A B A on one axis", () => {
    for (let run = 0; run < 50; run += 1) {
      const scramble = generateScramble({ length: 40 });
      for (let i = 1; i < scramble.length; i += 1) {
        expect(scramble[i]!.face).not.toBe(scramble[i - 1]!.face);
        if (i >= 2) {
          const axis = (move: Move) => MOVE_DEFINITIONS[move.face].axis;
          const sameAxis =
            axis(scramble[i]!) === axis(scramble[i - 1]!) &&
            axis(scramble[i]!) === axis(scramble[i - 2]!);
          expect(sameAxis).toBe(false);
        }
      }
    }
  });

  it("applies to a real cube and produces a valid facelet state", () => {
    const scramble = generateScramble({ length: 25 });
    const cube = applyMoves(createSolvedCube(), scramble);
    expect(validateFacelets(cubeToFacelets(cube)).valid).toBe(true);
    expect(isFaceletsSolved(cubeToFacelets(cube))).toBe(false);
  });
});
