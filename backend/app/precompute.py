"""Generate the solver pruning cache ahead of time.

Usage:
    python -m app.precompute
    python -m app.precompute --force
"""

from __future__ import annotations

import argparse
import logging
import sys
import time

from .cube.tables import build_tables, cache_path, save_tables

logging.basicConfig(level=logging.INFO, format="%(message)s")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--force",
        action="store_true",
        help="Rebuild tables even if a cache already exists.",
    )
    args = parser.parse_args()

    path = cache_path()
    if path.exists() and not args.force:
        print(f"Solver table cache already exists at {path}")
        print("Use --force to rebuild it.")
        return 0

    started = time.perf_counter()
    print(f"Generating Kociemba tables -> {path}")
    print("This is a one-time cost; the cache is reused by the API.")
    tables = build_tables(log=print)
    save_tables(tables, path)
    print(f"Done in {time.perf_counter() - started:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
