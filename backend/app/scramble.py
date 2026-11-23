"""Random-move scramble generation."""

from __future__ import annotations

import random
from dataclasses import dataclass

FACES = "URFDLB"
AXES = {"U": 1, "D": 1, "R": 0, "L": 0, "F": 2, "B": 2}
AMOUNTS = ("", "2", "'")
DEFAULT_LENGTH = 20
MAX_LENGTH = 40
MIN_LENGTH = 5


@dataclass(slots=True)
class Scramble:
    moves: list[str]
    length: int

    @property
    def notation(self) -> str:
        return " ".join(self.moves)


def generate_scramble(length: int = DEFAULT_LENGTH, rng: random.Random | None = None) -> Scramble:
    """WCA-style random moves: no immediate repeat and no A B A on one axis."""
    random_source = rng or random.SystemRandom()
    length = max(MIN_LENGTH, min(MAX_LENGTH, int(length)))
    moves: list[str] = []
    last_face: str | None = None
    last_axis: int | None = None
    axis_run = 0

    while len(moves) < length:
        face = random_source.choice(FACES)
        if face == last_face:
            continue
        axis = AXES[face]
        axis_run = axis_run + 1 if axis == last_axis else 0
        if axis_run >= 2:
            continue
        moves.append(face + random_source.choice(AMOUNTS))
        last_face = face
        last_axis = axis

    return Scramble(moves=moves, length=len(moves))
