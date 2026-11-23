"""Move tables and pruning tables for the Kociemba two-phase search.

The tables are generated once and cached to disk. They depend only on the cube
geometry, so the cache is versioned and validated on load.
"""

from __future__ import annotations

import logging
import os
import pickle
import threading
import time
from array import array
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from .coords import (
    GOAL_SLICE,
    N_FLIP,
    N_PERM8,
    N_SLICE,
    N_SLICE_PERM,
    N_TWIST,
    canonical_ep_for_slice,
    decode_slice_perm,
    decode_twist,
    decode_flip,
    get_flip,
    get_twist,
    perm_rank,
    perm_unrank,
    slice_perm_rank,
    slice_rank,
)
from .cubie import MOVE_CUBES

LOGGER = logging.getLogger("cubemind.solver")

CACHE_VERSION = 5
PHASE2_MOVES: tuple[int, ...] = (0, 1, 2, 9, 10, 11, 4, 7, 13, 16)
N_PHASE2_MOVES = len(PHASE2_MOVES)

DEFAULT_CACHE = Path(__file__).resolve().parents[2] / ".cache" / "kociemba_tables.pkl"


@dataclass(slots=True)
class SolverTables:
    twist_move: list[int]
    flip_move: list[int]
    slice_move: list[int]
    cp_move: list[int]
    ep8_move: list[int]
    sp_move: list[int]
    twist_slice_prune: bytearray
    flip_slice_prune: bytearray
    cp_slice_prune: bytearray
    ep_slice_prune: bytearray
    phase2_moves: tuple[int, ...] = PHASE2_MOVES
    version: int = CACHE_VERSION

    def as_cache(self) -> dict[str, object]:
        return {
            "version": self.version,
            "twist_move": self.twist_move,
            "flip_move": self.flip_move,
            "slice_move": self.slice_move,
            "cp_move": self.cp_move,
            "ep8_move": self.ep8_move,
            "sp_move": self.sp_move,
            "twist_slice_prune": self.twist_slice_prune,
            "flip_slice_prune": self.flip_slice_prune,
            "cp_slice_prune": self.cp_slice_prune,
            "ep_slice_prune": self.ep_slice_prune,
        }


def _build_twist_move() -> list[int]:
    table = [0] * (N_TWIST * 18)
    permutations = [cube.cp for cube in MOVE_CUBES]
    orientations = [cube.co for cube in MOVE_CUBES]
    for twist in range(N_TWIST):
        co = decode_twist(twist)
        base = twist * 18
        for move in range(18):
            cp = permutations[move]
            mco = orientations[move]
            table[base + move] = get_twist(
                [(co[cp[i]] + mco[i]) % 3 for i in range(8)]
            )
    return table


def _build_flip_move() -> list[int]:
    table = [0] * (N_FLIP * 18)
    permutations = [cube.ep for cube in MOVE_CUBES]
    orientations = [cube.eo for cube in MOVE_CUBES]
    for flip in range(N_FLIP):
        eo = decode_flip(flip)
        base = flip * 18
        for move in range(18):
            ep = permutations[move]
            meo = orientations[move]
            table[base + move] = get_flip(
                [(eo[ep[i]] + meo[i]) % 2 for i in range(11)]
            )
    return table


def _build_slice_move() -> list[int]:
    table = [0] * (N_SLICE * 18)
    permutations = [cube.ep for cube in MOVE_CUBES]
    for rank in range(N_SLICE):
        ep = canonical_ep_for_slice(rank)
        base = rank * 18
        for move in range(18):
            perm = permutations[move]
            table[base + move] = slice_rank([ep[perm[i]] for i in range(12)])
    return table


def _build_cp_move() -> list[int]:
    table = [0] * (N_PERM8 * N_PHASE2_MOVES)
    permutations = [MOVE_CUBES[move].cp for move in PHASE2_MOVES]
    for rank in range(N_PERM8):
        cp = perm_unrank(rank, 8)
        base = rank * N_PHASE2_MOVES
        for index, perm in enumerate(permutations):
            table[base + index] = perm_rank([cp[perm[i]] for i in range(8)])
    return table


def _build_ep8_move() -> list[int]:
    table = [0] * (N_PERM8 * N_PHASE2_MOVES)
    permutations = [MOVE_CUBES[move].ep for move in PHASE2_MOVES]
    identity = list(range(12))
    for rank in range(N_PERM8):
        ep = perm_unrank(rank, 8) + [8, 9, 10, 11]
        base = rank * N_PHASE2_MOVES
        for index, perm in enumerate(permutations):
            moved = [ep[perm[i]] for i in range(8)]
            table[base + index] = perm_rank(moved)
    return table


def _build_sp_move() -> list[int]:
    table = [0] * (N_SLICE_PERM * N_PHASE2_MOVES)
    permutations = [MOVE_CUBES[move].ep for move in PHASE2_MOVES]
    for rank in range(N_SLICE_PERM):
        ep = list(range(8)) + decode_slice_perm(rank)
        base = rank * N_PHASE2_MOVES
        for index, perm in enumerate(permutations):
            moved = [ep[perm[i]] - 8 for i in range(8, 12)]
            table[base + index] = perm_rank(moved)
    return table


def _build_pruning(
    move_a: list[int],
    move_b: list[int],
    size_a: int,
    size_b: int,
    stride_a: int,
    stride_b: int,
    moves: int,
    goal_a: int,
    goal_b: int,
    label: str,
) -> bytearray:
    started = time.perf_counter()
    total = size_a * size_b
    distances = bytearray(b"\xff") * total
    start = goal_a * size_b + goal_b
    distances[start] = 0
    queue = array("I", [start])
    head = 0
    while head < len(queue):
        current = queue[head]
        head += 1
        a = current // size_b
        b = current - a * size_b
        depth = distances[current] + 1
        base_a = a * stride_a
        base_b = b * stride_b
        for move in range(moves):
            next_a = move_a[base_a + move]
            next_b = move_b[base_b + move]
            nxt = next_a * size_b + next_b
            if distances[nxt] == 255:
                distances[nxt] = depth
                queue.append(nxt)
    LOGGER.info(
        "Built %s pruning table: %s entries in %.1fs (max depth %d)",
        label,
        f"{total:,}",
        time.perf_counter() - started,
        max(distances),
    )
    return distances


def build_tables(log: Callable[[str], None] | None = None) -> SolverTables:
    logger = LOGGER
    if log is not None:
        # Allow the CLI to surface progress without configuring logging.
        class _Adapter:
            def info(self, message: str, *args: object) -> None:
                log(message % args if args else message)

        logger = _Adapter()  # type: ignore[assignment]

    started = time.perf_counter()
    logger.info("Building Kociemba move tables...")
    twist_move = _build_twist_move()
    flip_move = _build_flip_move()
    slice_move = _build_slice_move()
    cp_move = _build_cp_move()
    ep8_move = _build_ep8_move()
    sp_move = _build_sp_move()
    logger.info("Move tables ready in %.1fs", time.perf_counter() - started)

    twist_slice_prune = _build_pruning(
        twist_move,
        slice_move,
        N_TWIST,
        N_SLICE,
        18,
        18,
        18,
        0,
        GOAL_SLICE,
        "twist x slice",
    )
    flip_slice_prune = _build_pruning(
        flip_move,
        slice_move,
        N_FLIP,
        N_SLICE,
        18,
        18,
        18,
        0,
        GOAL_SLICE,
        "flip x slice",
    )
    cp_slice_prune = _build_pruning(
        cp_move,
        sp_move,
        N_PERM8,
        N_SLICE_PERM,
        N_PHASE2_MOVES,
        N_PHASE2_MOVES,
        N_PHASE2_MOVES,
        0,
        0,
        "corner perm x slice perm",
    )
    ep_slice_prune = _build_pruning(
        ep8_move,
        sp_move,
        N_PERM8,
        N_SLICE_PERM,
        N_PHASE2_MOVES,
        N_PHASE2_MOVES,
        N_PHASE2_MOVES,
        0,
        0,
        "edge perm x slice perm",
    )
    logger.info("All solver tables ready in %.1fs", time.perf_counter() - started)
    return SolverTables(
        twist_move=twist_move,
        flip_move=flip_move,
        slice_move=slice_move,
        cp_move=cp_move,
        ep8_move=ep8_move,
        sp_move=sp_move,
        twist_slice_prune=twist_slice_prune,
        flip_slice_prune=flip_slice_prune,
        cp_slice_prune=cp_slice_prune,
        ep_slice_prune=ep_slice_prune,
    )


def save_tables(tables: SolverTables, path: Path = DEFAULT_CACHE) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    with temporary.open("wb") as handle:
        pickle.dump(tables.as_cache(), handle, protocol=5)
    temporary.replace(path)
    LOGGER.info("Cached solver tables at %s (%.1f MB)", path, path.stat().st_size / 1e6)


def load_tables(path: Path = DEFAULT_CACHE) -> SolverTables | None:
    if not path.exists():
        return None
    try:
        with path.open("rb") as handle:
            data = pickle.load(handle)
        if not isinstance(data, dict) or data.get("version") != CACHE_VERSION:
            return None
        tables = SolverTables(**data)  # type: ignore[arg-type]
        if len(tables.twist_move) != N_TWIST * 18:
            return None
        if len(tables.twist_slice_prune) != N_TWIST * N_SLICE:
            return None
        return tables
    except Exception:  # pragma: no cover - corrupt cache should rebuild
        LOGGER.warning("Could not load solver table cache; rebuilding.", exc_info=True)
        return None


_lock = threading.Lock()
_tables: SolverTables | None = None


def cache_path() -> Path:
    configured = os.environ.get("KOCIEMBA_TABLES_PATH")
    return Path(configured) if configured else DEFAULT_CACHE


def get_tables() -> SolverTables:
    global _tables
    if _tables is not None:
        return _tables
    with _lock:
        if _tables is not None:
            return _tables
        path = cache_path()
        tables = load_tables(path)
        if tables is None:
            LOGGER.info("No solver cache found; generating tables (one-time cost).")
            tables = build_tables()
            try:
                save_tables(tables, path)
            except OSError:
                LOGGER.warning("Could not write solver table cache.", exc_info=True)
        _tables = tables
        return _tables


def tables_ready() -> bool:
    return _tables is not None or cache_path().exists()


def tables_loaded() -> bool:
    return _tables is not None
