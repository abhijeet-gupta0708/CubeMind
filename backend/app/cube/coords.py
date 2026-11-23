"""Coordinate encodings used by the two-phase search."""

from __future__ import annotations

from math import comb
from typing import Final

from .cubie import CubieCube

FACTORIAL: Final[tuple[int, ...]] = (1, 1, 2, 6, 24, 120, 720, 5040, 40320)
N_TWIST: Final[int] = 2187  # 3^7
N_FLIP: Final[int] = 2048  # 2^11
N_SLICE: Final[int] = 495  # C(12, 4)
N_PERM8: Final[int] = 40320  # 8!
N_SLICE_PERM: Final[int] = 24  # 4!
GOAL_SLICE: Final[int] = sum(
    comb(position, index + 1) for index, position in enumerate((8, 9, 10, 11))
)


def perm_rank(permutation: list[int]) -> int:
    """Lexicographic rank of a permutation of 0..n-1."""
    n = len(permutation)
    rank = 0
    for i in range(n):
        smaller = 0
        current = permutation[i]
        for j in range(i + 1, n):
            if permutation[j] < current:
                smaller += 1
        rank += smaller * FACTORIAL[n - 1 - i]
    return rank


def perm_unrank(rank: int, n: int) -> list[int]:
    elements = list(range(n))
    permutation: list[int] = []
    for i in range(n):
        factorial = FACTORIAL[n - 1 - i]
        index = rank // factorial
        rank %= factorial
        permutation.append(elements.pop(index))
    return permutation


def get_twist(co: list[int]) -> int:
    twist = 0
    for i in range(7):
        twist = twist * 3 + co[i]
    return twist


def decode_twist(twist: int) -> list[int]:
    co = [0] * 8
    parity = 0
    for i in range(6, -1, -1):
        co[i] = twist % 3
        parity += co[i]
        twist //= 3
    co[7] = (3 - parity % 3) % 3
    return co


def get_flip(eo: list[int]) -> int:
    flip = 0
    for i in range(11):
        flip = flip * 2 + eo[i]
    return flip


def decode_flip(flip: int) -> list[int]:
    eo = [0] * 12
    parity = 0
    for i in range(10, -1, -1):
        eo[i] = flip % 2
        parity += eo[i]
        flip //= 2
    eo[11] = parity % 2
    return eo


def slice_rank_from_positions(positions: list[int]) -> int:
    """Colex rank of the four positions occupied by slice edges (0..494)."""
    return sum(comb(position, index + 1) for index, position in enumerate(sorted(positions)))


def slice_positions(rank: int) -> list[int]:
    positions: list[int] = []
    for index in range(4, 0, -1):
        position = 11
        while position >= index and comb(position, index) > rank:
            position -= 1
        positions.append(position)
        rank -= comb(position, index)
    return sorted(positions)


def slice_rank(ep: list[int]) -> int:
    return slice_rank_from_positions([i for i in range(12) if ep[i] >= 8])


def canonical_ep_for_slice(rank: int) -> list[int]:
    slice_slots = set(slice_positions(rank))
    ep = [0] * 12
    non_slice = 0
    slice_edge = 8
    for slot in range(12):
        if slot in slice_slots:
            ep[slot] = slice_edge
            slice_edge += 1
        else:
            ep[slot] = non_slice
            non_slice += 1
    return ep


def slice_perm_rank(ep: list[int]) -> int:
    return perm_rank([edge - 8 for edge in ep[8:12]])


def decode_slice_perm(rank: int) -> list[int]:
    return [edge + 8 for edge in perm_unrank(rank, 4)]


def corner_perm_rank(cube: CubieCube) -> int:
    return perm_rank(cube.cp)


def edge8_perm_rank(cube: CubieCube) -> int:
    return perm_rank(cube.ep[:8])


def coordinates(cube: CubieCube) -> tuple[int, int, int, int, int, int]:
    return (
        get_twist(cube.co),
        get_flip(cube.eo),
        slice_rank(cube.ep),
        corner_perm_rank(cube),
        edge8_perm_rank(cube),
        slice_perm_rank(cube.ep),
    )
