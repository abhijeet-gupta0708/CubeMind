"""Cubie-level cube representation, validation and geometric move cubes."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

from .facelets import (
    CORNER_COLOR,
    CORNER_FACELET,
    EDGE_COLOR,
    EDGE_FACELET,
    FACE_ORDER,
    MOVE_NAMES,
    SOLVED_FACELETS,
    apply_facelet_permutation,
    facelet_permutation,
)


@dataclass(slots=True)
class CubieCube:
    cp: list[int]
    co: list[int]
    ep: list[int]
    eo: list[int]

    @classmethod
    def solved(cls) -> "CubieCube":
        return cls(
            cp=list(range(8)),
            co=[0] * 8,
            ep=list(range(12)),
            eo=[0] * 12,
        )

    def copy(self) -> "CubieCube":
        return CubieCube(
            cp=self.cp.copy(),
            co=self.co.copy(),
            ep=self.ep.copy(),
            eo=self.eo.copy(),
        )

    def multiply(self, other: "CubieCube") -> "CubieCube":
        """Compose two cubes: apply self, then other."""
        cp = [0] * 8
        co = [0] * 8
        ep = [0] * 12
        eo = [0] * 12
        for i in range(8):
            source = other.cp[i]
            cp[i] = self.cp[source]
            co[i] = (self.co[source] + other.co[i]) % 3
        for i in range(12):
            source = other.ep[i]
            ep[i] = self.ep[source]
            eo[i] = (self.eo[source] + other.eo[i]) % 2
        return CubieCube(cp=cp, co=co, ep=ep, eo=eo)

    def is_solved(self) -> bool:
        return (
            self.cp == list(range(8))
            and self.co == [0] * 8
            and self.ep == list(range(12))
            and self.eo == [0] * 12
        )

    def to_facelets(self) -> str:
        facelets = ["?"] * 54
        for face_index, face in enumerate(FACE_ORDER):
            facelets[face_index * 9 + 4] = face
        for slot in range(8):
            piece = self.cp[slot]
            orientation = self.co[slot]
            for n in range(3):
                facelets[CORNER_FACELET[slot][(n + orientation) % 3]] = CORNER_COLOR[
                    piece
                ][n]
        for slot in range(12):
            piece = self.ep[slot]
            orientation = self.eo[slot]
            for n in range(2):
                facelets[EDGE_FACELET[slot][(n + orientation) % 2]] = EDGE_COLOR[piece][n]
        return "".join(facelets)


def _permutation_parity(permutation: list[int]) -> int:
    inversions = 0
    for i in range(len(permutation)):
        for j in range(i + 1, len(permutation)):
            if permutation[i] > permutation[j]:
                inversions += 1
    return inversions % 2


def count_facelets(facelets: str) -> dict[str, int]:
    counts = {face: 0 for face in FACE_ORDER}
    for char in facelets:
        if char in counts:
            counts[char] += 1
    return counts


def validate_facelets(facelets: str) -> list[str]:
    """Returns a human-readable list of problems; empty means solvable."""
    errors: list[str] = []
    facelets = facelets.strip().upper()
    if len(facelets) != 54:
        return [f"Expected 54 stickers, received {len(facelets)}."]

    invalid = sorted({char for char in facelets if char not in FACE_ORDER})
    if invalid:
        errors.append(
            "Unknown sticker colour(s): " + ", ".join(repr(char) for char in invalid) + "."
        )

    counts = count_facelets(facelets)
    wrong = [f"{face} ({counts[face]})" for face in FACE_ORDER if counts[face] != 9]
    if wrong:
        errors.append("Each colour must occur exactly nine times, got " + ", ".join(wrong) + ".")

    for face_index, face in enumerate(FACE_ORDER):
        centre = facelets[face_index * 9 + 4]
        if centre != face:
            errors.append(f"{face} centre must be {face} to keep the cube orientation fixed.")
            break

    if errors:
        return errors

    _cube, parse_errors = parse_facelets(facelets)
    return parse_errors


def parse_facelets(facelets: str) -> tuple[CubieCube | None, list[str]]:
    """Parses the 54-character facelet string into a CubieCube.

    Validates piece identity, orientation sums and permutation parity.
    """
    facelets = facelets.strip().upper()
    if len(facelets) != 54:
        return None, [f"Expected 54 stickers, received {len(facelets)}."]
    if any(char not in FACE_ORDER for char in facelets):
        return None, ["The cube contains an unknown sticker colour."]

    counts = count_facelets(facelets)
    if any(counts[face] != 9 for face in FACE_ORDER):
        return None, ["Each colour must occur exactly nine times."]
    for face_index, face in enumerate(FACE_ORDER):
        if facelets[face_index * 9 + 4] != face:
            return None, [f"{face} centre must be {face}."]

    errors: list[str] = []
    cp = [-1] * 8
    co = [0] * 8
    used_corners: set[int] = set()

    for slot in range(8):
        found: tuple[int, int] | None = None
        duplicates: list[tuple[int, int]] = []
        for piece in range(8):
            for orientation in range(3):
                if all(
                    facelets[CORNER_FACELET[slot][(orientation + k) % 3]]
                    == CORNER_COLOR[piece][k]
                    for k in range(3)
                ):
                    if found is None:
                        found = (piece, orientation)
                    else:
                        duplicates.append((piece, orientation))
        if found is None:
            errors.append(f"Corner slot {slot + 1} does not match a real corner piece.")
            continue
        piece, orientation = found
        if piece in used_corners:
            errors.append(f"Corner piece {piece + 1} appears more than once.")
        used_corners.add(piece)
        cp[slot] = piece
        co[slot] = orientation

    ep = [-1] * 12
    eo = [0] * 12
    used_edges: set[int] = set()
    for slot in range(12):
        found_edge: tuple[int, int] | None = None
        for piece in range(12):
            for orientation in range(2):
                if all(
                    facelets[EDGE_FACELET[slot][(orientation + k) % 2]]
                    == EDGE_COLOR[piece][k]
                    for k in range(2)
                ):
                    if found_edge is None:
                        found_edge = (piece, orientation)
        if found_edge is None:
            errors.append(f"Edge slot {slot + 1} does not match a real edge piece.")
            continue
        piece, orientation = found_edge
        if piece in used_edges:
            errors.append(f"Edge piece {piece + 1} appears more than once.")
        used_edges.add(piece)
        ep[slot] = piece
        eo[slot] = orientation

    if errors:
        return None, errors

    if sum(co) % 3 != 0:
        errors.append("Corner orientation sum is impossible (not divisible by 3).")
    if sum(eo) % 2 != 0:
        errors.append("Edge orientation sum is impossible (not divisible by 2).")
    if _permutation_parity(cp) != _permutation_parity(ep):
        errors.append("Corner and edge permutation parity do not match.")

    if errors:
        return None, errors
    return CubieCube(cp=cp, co=co, ep=ep, eo=eo), []


def _build_move_cubes() -> tuple[CubieCube, ...]:
    cubes: list[CubieCube] = []
    for name in MOVE_NAMES:
        face = name[0]
        amount = 2 if name.endswith("2") else 3 if name.endswith("'") else 1
        permutation = facelet_permutation(face, amount)
        moved = apply_facelet_permutation(SOLVED_FACELETS, permutation)
        cube, errors = parse_facelets(moved)
        if errors or cube is None:
            raise RuntimeError(f"Failed to build move cube {name}: {errors}")
        cubes.append(cube)
    return tuple(cubes)


MOVE_CUBES: Final[tuple[CubieCube, ...]] = _build_move_cubes()


def apply_move(cube: CubieCube, move_index: int) -> CubieCube:
    return cube.multiply(MOVE_CUBES[move_index])


def apply_move_names(cube: CubieCube, moves: list[str]) -> CubieCube:
    from .facelets import MOVE_NAMES

    index = {name: i for i, name in enumerate(MOVE_NAMES)}
    result = cube
    for move in moves:
        result = result.multiply(MOVE_CUBES[index[move]])
    return result
