"""Kociemba two-phase Rubik's Cube solver.

Phase 1 drives the cube into the G1 subgroup (corner/edge orientation solved and
the four slice edges in the slice). Phase 2 solves the remaining permutation
using only half turns of side faces and quarter turns of U/D. The returned
sequence is replayed and verified before it leaves this module.
"""

from __future__ import annotations

import os
import threading
import time
from dataclasses import dataclass
from typing import Final

from .coords import (
    GOAL_SLICE,
    N_SLICE,
    N_SLICE_PERM,
    edge8_perm_rank,
    coordinates,
    corner_perm_rank,
    slice_perm_rank,
)
from .cubie import CubieCube, MOVE_CUBES, parse_facelets
from .facelets import MOVE_NAMES
from .tables import N_PHASE2_MOVES, SolverTables, get_tables


class CubeValidationError(ValueError):
    """The supplied facelet state is not a physically possible cube."""

    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__("; ".join(errors))


class SolveTimeout(RuntimeError):
    """The search hit its time or node budget."""


@dataclass(slots=True)
class Solution:
    moves: list[str]
    nodes: int
    elapsed_ms: float

    @property
    def length(self) -> int:
        return len(self.moves)

    @property
    def notation(self) -> str:
        return " ".join(self.moves)


def _simplify(moves: list[int]) -> list[int]:
    """Merges consecutive turns of the same face and drops identity pairs."""
    simplified: list[int] = []
    for move in moves:
        current = move
        while True:
            if not simplified or simplified[-1] // 3 != current // 3:
                simplified.append(current)
                break
            previous = simplified.pop()
            total = ((previous % 3) + 1 + (current % 3) + 1) % 4
            if total == 0:
                break
            current = (current // 3) * 3 + (0 if total == 1 else 1 if total == 2 else 2)
    return simplified


class _Search:
    def __init__(
        self,
        tables: SolverTables,
        cube: CubieCube,
        time_limit: float,
        node_limit: int,
    ) -> None:
        self.tables = tables
        self.cube = cube
        self.deadline = time.monotonic() + time_limit
        self.node_limit = node_limit
        self.nodes = 0
        self.phase2_moves = tables.phase2_moves

    def _tick(self) -> None:
        self.nodes += 1
        if self.nodes >= self.node_limit:
            raise SolveTimeout("Node budget exhausted before a solution was found.")
        if self.nodes % 4096 == 0 and time.monotonic() > self.deadline:
            raise SolveTimeout("Time budget exhausted before a solution was found.")

    def run(self) -> tuple[list[int], int]:
        twist, flip, slice_coord, _cp, _ep8, _sp = coordinates(self.cube)
        tables = self.tables

        if twist == 0 and flip == 0 and slice_coord == GOAL_SLICE and self.cube.is_solved():
            return [], 0

        for depth in range(0, 13):
            path: list[int] = []
            result = self._phase1(twist, flip, slice_coord, depth, -1, path)
            if result is not None:
                return _simplify(result), depth
        raise SolveTimeout("No phase-1 solution found within 12 moves.")

    def _phase1(
        self,
        twist: int,
        flip: int,
        slice_coord: int,
        depth: int,
        last_face: int,
        path: list[int],
    ) -> list[int] | None:
        self._tick()
        if depth == 0:
            if twist == 0 and flip == 0 and slice_coord == GOAL_SLICE:
                endpoint = self.cube
                for move in path:
                    endpoint = endpoint.multiply(MOVE_CUBES[move])
                phase2 = self._phase2(
                    corner_perm_rank(endpoint),
                    edge8_perm_rank(endpoint),
                    slice_perm_rank(endpoint.ep),
                )
                if phase2 is not None:
                    return path + phase2
            return None

        tables = self.tables
        heuristics = (
            tables.twist_slice_prune[twist * N_SLICE + slice_coord],
            tables.flip_slice_prune[flip * N_SLICE + slice_coord],
        )
        if max(heuristics) > depth:
            return None

        twist_table = tables.twist_move
        flip_table = tables.flip_move
        slice_table = tables.slice_move
        twist_prune = tables.twist_slice_prune
        flip_prune = tables.flip_slice_prune
        for move in range(18):
            face = move // 3
            if face == last_face:
                continue
            base = move
            next_twist = twist_table[twist * 18 + base]
            next_flip = flip_table[flip * 18 + base]
            next_slice = slice_table[slice_coord * 18 + base]
            if (
                twist_prune[next_twist * N_SLICE + next_slice] > depth - 1
                or flip_prune[next_flip * N_SLICE + next_slice] > depth - 1
            ):
                continue
            path.append(move)
            result = self._phase1(
                next_twist,
                next_flip,
                next_slice,
                depth - 1,
                face,
                path,
            )
            if result is not None:
                return result
            path.pop()
        return None

    def _phase2(self, cp: int, ep8: int, sp: int) -> list[int] | None:
        tables = self.tables
        minimum = max(
            tables.cp_slice_prune[cp * N_SLICE_PERM + sp],
            tables.ep_slice_prune[ep8 * N_SLICE_PERM + sp],
        )
        for depth in range(minimum, 19):
            path: list[int] = []
            result = self._phase2_search(cp, ep8, sp, depth, -1, path)
            if result is not None:
                return result
        return None

    def _phase2_search(
        self,
        cp: int,
        ep8: int,
        sp: int,
        depth: int,
        last_face: int,
        path: list[int],
    ) -> list[int] | None:
        self._tick()
        if depth == 0:
            if cp == 0 and ep8 == 0 and sp == 0:
                return list(path)
            return None

        tables = self.tables
        if (
            max(
                tables.cp_slice_prune[cp * N_SLICE_PERM + sp],
                tables.ep_slice_prune[ep8 * N_SLICE_PERM + sp],
            )
            > depth
        ):
            return None

        cp_table = tables.cp_move
        ep_table = tables.ep8_move
        sp_table = tables.sp_move
        cp_prune = tables.cp_slice_prune
        ep_prune = tables.ep_slice_prune
        for index in range(N_PHASE2_MOVES):
            move = self.phase2_moves[index]
            face = move // 3
            if face == last_face:
                continue
            next_cp = cp_table[cp * N_PHASE2_MOVES + index]
            next_ep8 = ep_table[ep8 * N_PHASE2_MOVES + index]
            next_sp = sp_table[sp * N_PHASE2_MOVES + index]
            if (
                cp_prune[next_cp * N_SLICE_PERM + next_sp] > depth - 1
                or ep_prune[next_ep8 * N_SLICE_PERM + next_sp] > depth - 1
            ):
                continue
            path.append(move)
            result = self._phase2_search(
                next_cp,
                next_ep8,
                next_sp,
                depth - 1,
                face,
                path,
            )
            if result is not None:
                return result
            path.pop()
        return None


class KociembaSolver:
    def __init__(
        self,
        tables: SolverTables | None = None,
        time_limit: float | None = None,
        node_limit: int | None = None,
    ) -> None:
        self.tables = tables if tables is not None else get_tables()
        self.time_limit = time_limit or float(os.environ.get("SOLVER_TIME_LIMIT", "20"))
        self.node_limit = node_limit or int(os.environ.get("SOLVER_NODE_LIMIT", "4000000"))

    def solve(self, facelets: str) -> Solution:
        started = time.perf_counter()
        cube, errors = parse_facelets(facelets)
        if cube is None or errors:
            raise CubeValidationError(errors or ["The cube could not be parsed."])

        search = _Search(self.tables, cube, self.time_limit, self.node_limit)
        move_indices, phase1_depth = search.run()
        moves = [MOVE_NAMES[index] for index in move_indices]

        # Replay the solution against a fresh parse: this is the guarantee that
        # CubeMind never returns a fabricated or unchecked solution.
        verifier = cube
        for move in move_indices:
            verifier = verifier.multiply(MOVE_CUBES[move])
        if not verifier.is_solved():
            raise RuntimeError("Internal error: generated solution did not solve the cube.")
        if phase1_depth < 0:  # pragma: no cover - defensive
            raise RuntimeError("Internal error: invalid search depth.")

        return Solution(
            moves=moves,
            nodes=search.nodes,
            elapsed_ms=(time.perf_counter() - started) * 1000,
        )


_lock = threading.Lock()
_solver: KociembaSolver | None = None


def get_solver() -> KociembaSolver:
    global _solver
    if _solver is None:
        with _lock:
            if _solver is None:
                _solver = KociembaSolver()
    return _solver
