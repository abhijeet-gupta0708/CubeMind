import base64
import random

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.cube.cubie import MOVE_CUBES, CubieCube, parse_facelets, validate_facelets
from app.cube.facelets import MOVE_NAMES, SOLVED_FACELETS
from app.main import app

FACES = "URFDLB"
BGR = {
    "U": (238, 238, 238),
    "R": (45, 45, 210),
    "F": (60, 165, 70),
    "D": (40, 210, 232),
    "L": (30, 120, 235),
    "B": (205, 85, 35),
}


def scramble_facelets(seed: int = 5, length: int = 20) -> tuple[list[str], str]:
    rng = random.Random(seed)
    moves: list[str] = []
    last = None
    for _ in range(length):
        face = rng.choice([face for face in FACES if face != last])
        moves.append(face + rng.choice(("", "2", "'")))
        last = face
    cube = CubieCube.solved()
    for move in moves:
        cube = cube.multiply(MOVE_CUBES[MOVE_NAMES.index(move)])
    return moves, cube.to_facelets()


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["solver"] == "kociemba-two-phase"
    assert body["service"] == "cubemind-api"


def test_health_is_also_available_under_api_prefix(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_validate_solved(client):
    response = client.post("/validate", json={"cube": SOLVED_FACELETS})
    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is True
    assert body["errors"] == []
    assert body["counts"] == {face: 9 for face in FACES}


def test_validate_rejects_impossible_cube(client):
    facelets = list(SOLVED_FACELETS)
    # Swap the two stickers of one edge: colour counts stay balanced but the
    # cube is physically impossible.
    facelets[5], facelets[10] = facelets[10], facelets[5]
    response = client.post("/validate", json={"cube": "".join(facelets)})
    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is False
    assert body["errors"]


def test_solve_solved_cube(client):
    response = client.post("/solve", json={"cube": SOLVED_FACELETS})
    assert response.status_code == 200
    body = response.json()
    assert body["solution"] == []
    assert body["moveCount"] == 0
    assert body["verified"] is True
    assert body["notation"] == ""


def test_solve_scrambled_cube_and_verify(client):
    scramble, facelets = scramble_facelets(seed=12)
    response = client.post("/solve", json={"cube": facelets})
    assert response.status_code == 200
    body = response.json()
    assert len(body["solution"]) > 0
    assert body["moveCount"] == len(body["solution"])
    assert 1 <= body["moveCount"] <= 30
    assert body["verified"] is True

    cube = CubieCube.solved()
    for move in scramble + body["solution"]:
        cube = cube.multiply(MOVE_CUBES[MOVE_NAMES.index(move)])
    assert cube.is_solved()


def test_solve_rejects_invalid_cube(client):
    response = client.post("/solve", json={"cube": "U" * 54})
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "invalid_cube"
    assert body["error"]["details"]


def test_solve_rejects_wrong_length(client):
    response = client.post("/solve", json={"cube": "U" * 53})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_validate_normalises_whole_cube_rotation(client):
    # A whole-cube turn moves the centres. The API should relabel by centre and
    # still accept the cube as solved.
    from app.cube.facelets import apply_facelet_permutation, facelet_permutation

    rotated = apply_facelet_permutation(SOLVED_FACELETS, facelet_permutation("x", 1))
    response = client.post("/validate", json={"cube": rotated})
    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is True
    assert body["normalized"] is True
    assert body["normalizedCube"] == SOLVED_FACELETS


def test_scramble_endpoint(client):
    response = client.post("/scramble", json={"length": 25})
    assert response.status_code == 200
    body = response.json()
    assert body["length"] == 25
    assert len(body["moves"]) == 25
    assert body["notation"] == " ".join(body["moves"])
    cube = CubieCube.solved()
    for move in body["moves"]:
        cube = cube.multiply(MOVE_CUBES[MOVE_NAMES.index(move)])
    assert not validate_facelets(cube.to_facelets())
    assert cube.to_facelets() != SOLVED_FACELETS


def test_scramble_length_is_clamped_or_rejected(client):
    too_short = client.post("/scramble", json={"length": 2})
    assert too_short.status_code == 422


def _synthetic_face_image() -> str:
    layout = ["U", "R", "F", "D", "L", "B", "R", "F", "U"]
    canvas = np.full((600, 600, 3), 95, dtype=np.uint8)
    size = 420
    left = top = 90
    cell = size // 3
    for row in range(3):
        for col in range(3):
            color = BGR[layout[row * 3 + col]]
            y0 = top + row * cell
            x0 = left + col * cell
            canvas[y0 : y0 + cell, x0 : x0 + cell] = color
            cv2.rectangle(canvas, (x0, y0), (x0 + cell, y0 + cell), (20, 20, 20), 3)
    cv2.rectangle(canvas, (left, top), (left + size, top + size), (10, 10, 10), 5)
    ok, encoded = cv2.imencode(".jpg", canvas, [int(cv2.IMWRITE_JPEG_QUALITY), 96])
    assert ok
    return "data:image/jpeg;base64," + base64.b64encode(encoded.tobytes()).decode()


def test_scan_detects_known_colours(client):
    response = client.post("/scan/detect", json={"image": _synthetic_face_image()})
    assert response.status_code == 200
    body = response.json()
    assert body["stickers"] == ["U", "R", "F", "D", "L", "B", "R", "F", "U"]
    assert len(body["confidences"]) == 9
    assert body["quadDetected"] is True
    assert all(confidence > 0 for confidence in body["confidences"])


def test_scan_rejects_bad_image(client):
    response = client.post("/scan/detect", json={"image": "not-an-image" * 20})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_image"


def test_cors_headers(client):
    response = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") in ("*", "http://localhost:5173")


def test_unknown_route_uses_error_envelope(client):
    response = client.get("/nope")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "http_error"
