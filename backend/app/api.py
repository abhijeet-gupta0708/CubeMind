"""HTTP routes."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from . import __version__
from .config import settings
from .cube.cubie import count_facelets, parse_facelets, validate_facelets
from .cube.normalize import normalize_facelets
from .cube.solver import CubeValidationError, SolveTimeout, get_solver
from .cube.tables import tables_loaded, tables_ready
from .models import (
    CubeSubmission,
    HealthResponse,
    ScanRequest,
    ScanResponse,
    ScrambleRequest,
    ScrambleResponse,
    SolveResponse,
    ValidationResponse,
)
from .scramble import generate_scramble
from .services.vision import CV_AVAILABLE, ScanError, ScanUnavailable, detect_face

logger = logging.getLogger("cubemind.api")
router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="cubemind-api",
        version=__version__,
        solver="kociemba-two-phase",
        tablesCached=tables_ready(),
        tablesLoaded=tables_loaded(),
        scanning=CV_AVAILABLE,
    )


@router.post("/validate", response_model=ValidationResponse)
def validate_cube(payload: CubeSubmission) -> ValidationResponse:
    raw = payload.cube.strip().upper()
    normalized, normalization_error = normalize_facelets(raw)
    errors: list[str] = []
    if normalization_error:
        errors.append(normalization_error)
    else:
        errors = validate_facelets(normalized)
    counts = count_facelets(normalized if not normalization_error else raw)
    return ValidationResponse(
        valid=not errors,
        errors=errors,
        counts=counts,
        normalizedCube=normalized,
        normalized=normalized != raw,
    )


@router.post("/solve", response_model=SolveResponse)
def solve_cube(payload: CubeSubmission) -> SolveResponse:
    raw = payload.cube.strip().upper()
    normalized, normalization_error = normalize_facelets(raw)
    if normalization_error:
        raise HTTPException(
            status_code=422,
            detail={
                "message": normalization_error,
                "code": "invalid_cube",
                "details": [normalization_error],
            },
        )

    cube, errors = parse_facelets(normalized)
    if cube is None or errors:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "This sticker configuration is not a solvable cube.",
                "code": "invalid_cube",
                "details": errors,
            },
        )

    try:
        solution = get_solver().solve(normalized)
    except CubeValidationError as error:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "This sticker configuration is not a solvable cube.",
                "code": "invalid_cube",
                "details": error.errors,
            },
        ) from error
    except SolveTimeout as error:
        logger.warning("Solver budget exhausted: %s", error)
        raise HTTPException(
            status_code=503,
            detail={
                "message": "The solver ran out of time. Please try again.",
                "code": "solver_timeout",
                "details": None,
            },
        ) from error

    return SolveResponse(
        solution=solution.moves,
        moveCount=solution.length,
        notation=solution.notation,
        verified=True,
        normalized=normalized != raw,
        elapsedMs=round(solution.elapsed_ms, 1),
        nodes=solution.nodes,
    )


@router.post("/scramble", response_model=ScrambleResponse)
def create_scramble(payload: ScrambleRequest) -> ScrambleResponse:
    scramble = generate_scramble(payload.length)
    return ScrambleResponse(
        moves=scramble.moves,
        notation=scramble.notation,
        length=scramble.length,
    )


@router.post("/scan/detect", response_model=ScanResponse)
def scan_face(payload: ScanRequest) -> ScanResponse:
    if not CV_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Camera scanning is unavailable because OpenCV is not installed.",
                "code": "scanning_unavailable",
                "details": None,
            },
        )
    if len(payload.image) * 3 / 4 > settings.max_image_bytes:
        raise HTTPException(
            status_code=413,
            detail={
                "message": "Image exceeds the size limit.",
                "code": "image_too_large",
                "details": {"maxBytes": settings.max_image_bytes},
            },
        )
    try:
        result = detect_face(payload.image)
    except ScanError as error:
        raise HTTPException(
            status_code=422,
            detail={"message": str(error), "code": "invalid_image", "details": None},
        ) from error
    except ScanUnavailable as error:
        raise HTTPException(
            status_code=503,
            detail={"message": str(error), "code": "scanning_unavailable", "details": None},
        ) from error

    return ScanResponse(
        stickers=result.stickers,
        confidences=result.confidences,
        warnings=result.warnings,
        quadDetected=result.quad_detected,
        averageColor=result.average_color,
        face=payload.face,
    )
