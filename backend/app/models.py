"""Pydantic request and response schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Face = Literal["U", "R", "F", "D", "L", "B"]


class CubeSubmission(BaseModel):
    cube: str = Field(
        ...,
        min_length=54,
        max_length=54,
        description="54 facelets in U,R,F,D,L,B order (nine per face).",
        examples=["UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"],
    )


class SolveResponse(BaseModel):
    solution: list[str]
    moveCount: int
    notation: str
    verified: bool
    normalized: bool
    elapsedMs: float
    nodes: int


class ValidationResponse(BaseModel):
    valid: bool
    errors: list[str]
    counts: dict[str, int]
    normalizedCube: str
    normalized: bool


class ScrambleRequest(BaseModel):
    length: int = Field(20, ge=5, le=40)


class ScrambleResponse(BaseModel):
    moves: list[str]
    notation: str
    length: int


class ScanRequest(BaseModel):
    image: str = Field(..., min_length=100, max_length=12_000_000)
    face: Face | None = None


class ScanResponse(BaseModel):
    stickers: list[str | None]
    confidences: list[float]
    warnings: list[str]
    quadDetected: bool
    averageColor: str | None
    face: Face | None = None


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str
    solver: str
    tablesCached: bool
    tablesLoaded: bool
    scanning: bool


class ErrorBody(BaseModel):
    message: str
    code: str
    details: object | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody
