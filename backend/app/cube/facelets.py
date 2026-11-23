"""Facelet geometry, Kociemba piece tables and geometric move permutations.

The frontend uses exactly the same facelet order:
U1..U9, R1..R9, F1..F9, D1..D9, L1..L9, B1..B9.
"""

from __future__ import annotations

from typing import Final

FACE_ORDER: Final[str] = "URFDLB"
SOLVED_FACELETS: Final[str] = "".join(face * 9 for face in FACE_ORDER)

# The six faces are indexed as 0..5 in FACE_ORDER order.
FACE_INDEX: Final[dict[str, int]] = {face: index for index, face in enumerate(FACE_ORDER)}

# World axes: x right, y up, z front.
Vector = tuple[int, int, int]


def _position(face: str, row: int, col: int) -> Vector:
    if face == "U":
        return (-1 + col, 1, -1 + row)
    if face == "R":
        return (1, 1 - row, 1 - col)
    if face == "F":
        return (-1 + col, 1 - row, 1)
    if face == "D":
        return (-1 + col, -1, 1 - row)
    if face == "L":
        return (-1, 1 - row, -1 + col)
    return (1 - col, 1 - row, -1)  # B


def _normal(face: str) -> Vector:
    return {
        "U": (0, 1, 0),
        "R": (1, 0, 0),
        "F": (0, 0, 1),
        "D": (0, -1, 0),
        "L": (-1, 0, 0),
        "B": (0, 0, -1),
    }[face]


FACELET_POSITIONS: Final[tuple[Vector, ...]] = tuple(
    _position(face, row, col)
    for face in FACE_ORDER
    for row in range(3)
    for col in range(3)
)
FACELET_NORMALS: Final[tuple[Vector, ...]] = tuple(
    _normal(face) for face in FACE_ORDER for _row in range(3) for _col in range(3)
)
REF_INDEX: Final[dict[tuple[Vector, Vector], int]] = {
    (FACELET_POSITIONS[i], FACELET_NORMALS[i]): i for i in range(54)
}


def _facelet(face: str, number: int) -> int:
    """1-based facelet number, e.g. U9 -> 8, R1 -> 9."""
    return FACE_INDEX[face] * 9 + number - 1


# Standard Kociemba corner slots: URF, UFL, ULB, UBR, DFR, DLF, DBL, DRB.
CORNER_FACELET: Final[tuple[tuple[int, int, int], ...]] = tuple(
    (
        _facelet(u, un),
        _facelet(r, rn),
        _facelet(f, fn),
    )
    for u, un, r, rn, f, fn in (
        ("U", 9, "R", 1, "F", 3),
        ("U", 7, "F", 1, "L", 3),
        ("U", 1, "L", 1, "B", 3),
        ("U", 3, "B", 1, "R", 3),
        ("D", 3, "F", 9, "R", 7),
        ("D", 1, "L", 9, "F", 7),
        ("D", 7, "B", 9, "L", 7),
        ("D", 9, "R", 9, "B", 7),
    )
)
CORNER_COLOR: Final[tuple[tuple[str, str, str], ...]] = (
    ("U", "R", "F"),
    ("U", "F", "L"),
    ("U", "L", "B"),
    ("U", "B", "R"),
    ("D", "F", "R"),
    ("D", "L", "F"),
    ("D", "B", "L"),
    ("D", "R", "B"),
)

# Standard Kociemba edge slots: UR, UF, UL, UB, DR, DF, DL, DB, FR, FL, BL, BR.
EDGE_FACELET: Final[tuple[tuple[int, int], ...]] = tuple(
    (_facelet(a, an), _facelet(b, bn))
    for a, an, b, bn in (
        ("U", 6, "R", 2),
        ("U", 8, "F", 2),
        ("U", 4, "L", 2),
        ("U", 2, "B", 2),
        ("D", 6, "R", 8),
        ("D", 2, "F", 8),
        ("D", 4, "L", 8),
        ("D", 8, "B", 8),
        ("F", 6, "R", 4),
        ("F", 4, "L", 6),
        ("B", 6, "L", 4),
        ("B", 4, "R", 6),
    )
)
EDGE_COLOR: Final[tuple[tuple[str, str], ...]] = (
    ("U", "R"),
    ("U", "F"),
    ("U", "L"),
    ("U", "B"),
    ("D", "R"),
    ("D", "F"),
    ("D", "L"),
    ("D", "B"),
    ("F", "R"),
    ("F", "L"),
    ("B", "L"),
    ("B", "R"),
)

# (axis, layers, direction) where direction follows the right-hand rule.
MOVE_GEOMETRY: Final[dict[str, tuple[int, tuple[int, ...], int]]] = {
    "U": (1, (1,), -1),
    "D": (1, (-1,), 1),
    "R": (0, (1,), -1),
    "L": (0, (-1,), 1),
    "F": (2, (1,), -1),
    "B": (2, (-1,), 1),
    "M": (0, (0,), 1),
    "E": (1, (0,), 1),
    "S": (2, (0,), -1),
    "x": (0, (-1, 0, 1), -1),
    "y": (1, (-1, 0, 1), -1),
    "z": (2, (-1, 0, 1), -1),
}

MOVE_NAMES: Final[tuple[str, ...]] = tuple(
    face + suffix
    for face in "URFDLB"
    for suffix in ("", "2", "'")
)
MOVE_FACE_INDEX: Final[tuple[int, ...]] = tuple(
    "URFDLB".index(name[0]) for name in MOVE_NAMES
)


def rotation_matrix(axis: int, quarter_turns: int) -> tuple[int, ...]:
    turns = quarter_turns % 4
    if turns == 0:
        return (1, 0, 0, 0, 1, 0, 0, 0, 1)
    if turns == 1:
        if axis == 0:
            return (1, 0, 0, 0, 0, -1, 0, 1, 0)
        if axis == 1:
            return (0, 0, 1, 0, 1, 0, -1, 0, 0)
        return (0, -1, 0, 1, 0, 0, 0, 0, 1)
    if turns == 2:
        if axis == 0:
            return (1, 0, 0, 0, -1, 0, 0, 0, -1)
        if axis == 1:
            return (-1, 0, 0, 0, 1, 0, 0, 0, -1)
        return (-1, 0, 0, 0, -1, 0, 0, 0, 1)
    if axis == 0:
        return (1, 0, 0, 0, 0, 1, 0, -1, 0)
    if axis == 1:
        return (0, 0, -1, 0, 1, 0, 1, 0, 0)
    return (0, 1, 0, -1, 0, 0, 0, 0, 1)


def _apply_matrix(matrix: tuple[int, ...], vector: Vector) -> Vector:
    return (
        matrix[0] * vector[0] + matrix[1] * vector[1] + matrix[2] * vector[2],
        matrix[3] * vector[0] + matrix[4] * vector[1] + matrix[5] * vector[2],
        matrix[6] * vector[0] + matrix[7] * vector[1] + matrix[8] * vector[2],
    )


def _one_quarter_permutation(face: str) -> list[int]:
    axis, layers, direction = MOVE_GEOMETRY[face]
    rotation = rotation_matrix(axis, direction)
    permutation = list(range(54))
    for index in range(54):
        position = FACELET_POSITIONS[index]
        if position[axis] not in layers:
            continue
        new_position = _apply_matrix(rotation, position)
        new_normal = _apply_matrix(rotation, FACELET_NORMALS[index])
        permutation[index] = REF_INDEX[(new_position, new_normal)]
    return permutation


def facelet_permutation(face: str, amount: int) -> list[int]:
    """Destination index for every sticker after a clockwise/prime/double turn."""
    one = _one_quarter_permutation(face)
    permutation = list(range(54))
    for _ in range(amount):
        permutation = [one[destination] for destination in permutation]
    return permutation


def apply_facelet_permutation(facelets: str, permutation: list[int]) -> str:
    result = ["?"] * 54
    for source, destination in enumerate(permutation):
        result[destination] = facelets[source]
    return "".join(result)
