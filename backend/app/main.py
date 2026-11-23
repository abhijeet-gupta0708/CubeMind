"""CubeMind FastAPI application."""

from __future__ import annotations

import logging
import threading
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import __version__
from .api import router
from .config import settings

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("cubemind")


def _warm_solver() -> None:
    from .cube.solver import get_solver

    try:
        get_solver()
        logger.info("Kociemba solver tables are loaded.")
    except Exception:  # pragma: no cover - keep the API alive if the cache fails
        logger.exception("Could not warm the solver tables.")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Loading the cached tables is quick; generating them is not. Keep startup
    # non-blocking so health checks answer while a cold cache builds.
    threading.Thread(target=_warm_solver, name="solver-warmup", daemon=True).start()
    yield


app = FastAPI(
    title="CubeMind API",
    description=(
        "A real two-phase Kociemba Rubik's Cube solver with sticker validation, "
        "scramble generation and OpenCV camera-face detection."
    ),
    version=__version__,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.allow_all_origins else settings.allowed_origins,
    allow_credentials=not settings.allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


def _error(message: str, code: str, details: Any = None, status_code: int = 400) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"message": message, "code": code, "details": jsonable_encoder(details)}},
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict) and "message" in detail:
        return _error(
            str(detail.get("message")),
            str(detail.get("code", "http_error")),
            detail.get("details"),
            exc.status_code,
        )
    return _error(str(detail), "http_error", None, exc.status_code)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    return _error(
        "The request body is invalid.",
        "validation_error",
        exc.errors(),
        status_code=422,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled API error", exc_info=exc)
    return _error("An unexpected server error occurred.", "internal_error", None, status_code=500)


@app.get("/", include_in_schema=False)
def index() -> dict[str, Any]:
    return {
        "service": "cubemind-api",
        "version": __version__,
        "docs": "/docs",
        "health": "/health",
    }


app.include_router(router)
app.include_router(router, prefix="/api", include_in_schema=False)


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
