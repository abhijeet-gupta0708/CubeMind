import random

import pytest

from app.cube.coords import (
    GOAL_SLICE,
    decode_flip,
    decode_twist,
    get_flip,
    get_twist,
    perm_rank,
    perm_unrank,
    slice_positions,
    slice_rank_from_positions,
)
from app.cube.cubie import MOVE_CUBES, CubieCube, parse_facelets, validate_facelets
from app.cube.facelets import (
    EDGE_FACELET,
    MOVE_NAMES,
    SOLVED_FACELETS,
    apply_facelet_permutation,
    facelet_permutation,
)
from app.cube.solver import KociembaSolver
from app.scramble import generate_scramble

FACE_TURNS = "URFDLB"


def cube_for(moves: list[str]) -> CubieCube:
    cube = CubieCube.solved()
    for move in moves:
        cube = cube.multiply(MOVE_CUBES[MOVE_NAMES.index(move)])
    return cube


def facelets_for(moves: list[str]) -> str:
    return cube_for(moves).to_facelets()


def random_scramble(rng: random.Random, length: int = 25) -> list[str]:
    moves: list[str] = []
    last = None
    for _ in range(length):
        face = rng.choice([face for face in FACE_TURNS if face != last])
        moves.append(face + rng.choice(("", "2", "'")))
        last = face
    return moves


@pytest.fixture(scope="module")
def solver() -> KociembaSolver:
    return KociembaSolver()


def test_solved_facelets_are_canonical():
    assert CubieCube.solved().to_facelets() == SOLVED_FACELETS
    assert not validate_facelets(SOLVED_FACELETS)


def test_move_inverses_restore_state():
    solved = CubieCube.solved()
    for name in MOVE_NAMES:
        base = name[0]
        inverse = name if name.endswith("2") else base if name.endswith("'") else base + "'"
        result = (
            solved.multiply(MOVE_CUBES[MOVE_NAMES.index(name)])
            .multiply(MOVE_CUBES[MOVE_NAMES.index(inverse)])
        )
        assert result.is_solved(), (name, inverse)


def test_four_quarter_turns_restore_state():
    for face in FACE_TURNS:
        cube = CubieCube.solved()
        index = MOVE_NAMES.index(face)
        for _ in range(4):
            cube = cube.multiply(MOVE_CUBES[index])
        assert cube.is_solved(), face


def test_facelet_roundtrip():
    for seed in range(5):
        scramble = random_scramble(random.Random(seed))
        facelets = facelets_for(scramble)
        parsed, errors = parse_facelets(facelets)
        assert not errors
        assert parsed is not None
        assert parsed.to_facelets() == facelets


def test_coordinate_encodings_roundtrip():
    assert all(get_twist(decode_twist(t)) == t for t in range(2187))
    assert all(get_flip(decode_flip(t)) == t for t in range(2048))
    assert all(
        perm_unrank(perm_rank(perm_unrank(rank, 8)), 8) == perm_unrank(rank, 8)
        for rank in (0, 1, 999, 20_000, 40_319)
    )
    assert all(
        slice_positions(slice_rank_from_positions(slice_positions(rank))) == slice_positions(rank)
        for rank in range(495)
    )
    assert GOAL_SLICE == 494


def test_validation_rejects_wrong_counts():
    errors = validate_facelets("U" * 54)
    assert errors


def test_validation_rejects_flipped_edge():
    facelets = list(SOLVED_FACELETS)
    first, second = EDGE_FACELET[0]
    facelets[first], facelets[second] = facelets[second], facelets[first]
    errors = validate_facelets("".join(facelets))
    assert errors


def test_solve_solved_cube_returns_empty(solver):
    solution = solver.solve(SOLVED_FACELETS)
    assert solution.moves == []
    assert solution.length == 0


@pytest.mark.parametrize("seed", [3, 11, 29])
def test_solver_solves_arbitrary_scrambles(solver, seed):
    scramble = random_scramble(random.Random(seed))
    facelets = facelets_for(scramble)
    solution = solver.solve(facelets)
    assert 0 < solution.length <= 30
    assert " ".join(solution.moves) == solution.notation

    result = cube_for(scramble + solution.moves)
    assert result.is_solved()
    # Re-parse the solved result and check the canonical string as a second gate.
    assert result.to_facelets() == SOLVED_FACELETS


def test_whole_cube_rotation_is_normalised(solver):
    rotated = apply_facelet_permutation(SOLVED_FACELETS, facelet_permutation("x", 1))
    assert rotated != SOLVED_FACELETS
    from app.cube.normalize import normalize_facelets

    normalized, error = normalize_facelets(rotated)
    assert error is None
    assert normalized == SOLVED_FACELETS
    assert solver.solve(normalized).moves == []


def test_scramble_generator_produces_legal_moves():
    scramble = generate_scramble(30, random.Random(7))
    assert scramble.length == 30
    assert len(scramble.moves) == 30
    faces = [move[0] for move in scramble.moves]
    for first, second in zip(faces, faces[1:]):
        assert first != second
    facelets = facelets_for(scramble.moves)
    assert not validate_facelets(facelets)
    assert facelets != SOLVED_FACELETS
