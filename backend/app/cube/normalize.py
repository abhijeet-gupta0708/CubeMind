"""Centre-based orientation normalisation for Kociemba input."""

from __future__ import annotations

from .facelets import FACE_ORDER


def normalize_facelets(facelets: str) -> tuple[str, str | None]:
    """Relabels colours so the U/R/F/D/L/B centres are canonical.

    Whole-cube and slice turns move the centres; solving is invariant under a
    colour relabelling, and moves are positional, so normalisation lets the
    solver accept any physically valid orientation.
    """
    text = facelets.strip().upper()
    if len(text) != 54:
        return text, f"Expected 54 stickers, received {len(text)}."
    if any(char not in FACE_ORDER for char in text):
        return text, "The cube contains an unknown sticker colour."

    mapping: dict[str, str] = {}
    for index, face in enumerate(FACE_ORDER):
        centre = text[index * 9 + 4]
        if centre in mapping:
            return text, "Two faces share a centre colour; centres must be six distinct colours."
        mapping[centre] = face

    normalized = "".join(mapping.get(char, char) for char in text)
    return normalized, None
