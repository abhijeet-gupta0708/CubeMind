"""Camera face scanning with OpenCV.

The scanner is real: it finds the cube face, warps it to a square, samples the
3x3 sticker grid and classifies each sticker colour. Lighting and white balance
vary in the real world, so every result includes per-sticker confidence and the
UI asks the user to confirm or correct the grid before using it.
"""

from __future__ import annotations

import base64
import binascii
from dataclasses import dataclass, field

import numpy as np

try:  # OpenCV is optional so the solver API can run on minimal hosts.
    import cv2
except Exception:  # pragma: no cover - exercised only when cv2 is absent
    cv2 = None  # type: ignore[assignment]

CV_AVAILABLE = cv2 is not None

WORK_SIZE = 300
CELL_SIZE = WORK_SIZE // 3


class ScanError(ValueError):
    """The supplied image could not be processed."""


class ScanUnavailable(RuntimeError):
    """OpenCV is not installed on this deployment."""


@dataclass(slots=True)
class ScanResult:
    stickers: list[str | None]
    confidences: list[float]
    warnings: list[str] = field(default_factory=list)
    quad_detected: bool = False
    average_color: str | None = None


def _decode_base64(payload: str) -> bytes:
    data = payload.strip()
    if data.startswith("data:"):
        comma = data.find(",")
        if comma == -1:
            raise ScanError("Malformed data URL.")
        data = data[comma + 1 :]
    try:
        raw = base64.b64decode(data, validate=True)
    except (binascii.Error, ValueError) as error:
        raise ScanError("Image is not valid base64.") from error
    if len(raw) < 500:
        raise ScanError("Image is empty or too small.")
    return raw


def _order_quad(points: np.ndarray) -> np.ndarray:
    points = points.reshape(4, 2).astype("float32")
    ordered = np.zeros((4, 2), dtype="float32")
    sums = points.sum(axis=1)
    diffs = np.diff(points, axis=1).reshape(-1)
    ordered[0] = points[np.argmin(sums)]  # top-left
    ordered[2] = points[np.argmax(sums)]  # bottom-right
    ordered[1] = points[np.argmin(diffs)]  # top-right
    ordered[3] = points[np.argmax(diffs)]  # bottom-left
    return ordered


def _find_face(image: np.ndarray) -> tuple[np.ndarray, bool]:
    height, width = image.shape[:2]
    scale = min(1.0, 1000.0 / max(height, width))
    if scale < 1.0:
        image = cv2.resize(image, (int(width * scale), int(height * scale)))

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (7, 7), 0)
    edges = cv2.Canny(blurred, 40, 120)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=2)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    image_area = image.shape[0] * image.shape[1]
    best: tuple[float, np.ndarray] | None = None
    for contour in contours:
        perimeter = cv2.arcLength(contour, True)
        if perimeter <= 0:
            continue
        polygon = cv2.approxPolyDP(contour, 0.03 * perimeter, True)
        if len(polygon) != 4 or not cv2.isContourConvex(polygon):
            continue
        area = cv2.contourArea(polygon)
        if area < image_area * 0.12:
            continue
        if best is None or area > best[0]:
            best = (area, polygon)

    if best is not None:
        corners = _order_quad(best[1])
        destination = np.array(
            [[0, 0], [WORK_SIZE - 1, 0], [WORK_SIZE - 1, WORK_SIZE - 1], [0, WORK_SIZE - 1]],
            dtype="float32",
        )
        warped = cv2.warpPerspective(image, cv2.getPerspectiveTransform(corners, destination), (WORK_SIZE, WORK_SIZE))
        return warped, True

    # Fallback: the UI draws a square guide in the middle of the frame, so crop
    # the central square rather than failing outright.
    side = int(min(image.shape[0], image.shape[1]) * 0.72)
    top = (image.shape[0] - side) // 2
    left = (image.shape[1] - side) // 2
    crop = image[top : top + side, left : left + side]
    warped = cv2.resize(crop, (WORK_SIZE, WORK_SIZE), interpolation=cv2.INTER_AREA)
    return warped, False


def _sample_cells(warped: np.ndarray) -> list[tuple[int, int, int]]:
    colors: list[tuple[int, int, int]] = []
    for row in range(3):
        for col in range(3):
            margin = int(CELL_SIZE * 0.24)
            y0 = row * CELL_SIZE + margin
            y1 = (row + 1) * CELL_SIZE - margin
            x0 = col * CELL_SIZE + margin
            x1 = (col + 1) * CELL_SIZE - margin
            patch = warped[y0:y1, x0:x1].reshape(-1, 3).astype(np.float32)
            if patch.size == 0:
                colors.append((0, 0, 0))
                continue
            # Median rejects specular highlights and the printed sticker border.
            median = np.median(patch, axis=0)
            colors.append((int(median[0]), int(median[1]), int(median[2])))
    return colors


def _white_balance(colors: list[tuple[int, int, int]]) -> list[tuple[int, int, int]]:
    """Grey-world correction, clamped so saturated cube colours keep their hue."""
    array = np.array(colors, dtype=np.float32)
    means = array.mean(axis=0) + 1e-3
    target = float(means.mean())
    # Gentle correction only: aggressive grey-world tints a white sticker
    # whenever the other eight stickers are strongly coloured.
    gains = np.clip(target / means, 0.85, 1.18)
    balanced = np.clip(array * gains, 0, 255)
    return [tuple(int(value) for value in row) for row in balanced]


def _classify(color: tuple[int, int, int]) -> tuple[str | None, float, int, int, int]:
    blue, green, red = color
    hsv = cv2.cvtColor(np.uint8([[[blue, green, red]]]), cv2.COLOR_BGR2HSV)[0, 0]
    hue, saturation, value = (int(hsv[0]), int(hsv[1]), int(hsv[2]))

    if value < 32:
        return None, 0.0, hue, saturation, value

    brightest = max(blue, green, red)
    chroma = (brightest - min(blue, green, red)) / max(brightest, 1)
    if chroma < 0.26 and value > 65:
        confidence = (1.0 - chroma / 0.26) * min(1.0, value / 150.0)
        return "U", round(max(0.6, min(0.99, confidence)), 3), hue, saturation, value

    if hue < 9 or hue >= 168:
        label, ideal = "R", 0
    elif hue < 23:
        label, ideal = "L", 16
    elif hue < 38:
        label, ideal = "D", 30
    elif hue < 86:
        label, ideal = "F", 60
    elif hue < 138:
        label, ideal = "B", 120
    else:
        label, ideal = "R", 176

    distance = min(abs(hue - ideal), 180 - abs(hue - ideal))
    saturation_factor = min(1.0, saturation / 95.0)
    confidence = max(0.0, 1.0 - distance / 34.0) * saturation_factor
    if saturation < 35:
        confidence *= 0.5
    return label, round(min(0.99, confidence), 3), hue, saturation, value


def detect_face(image_payload: str) -> ScanResult:
    if not CV_AVAILABLE:
        raise ScanUnavailable("Camera scanning needs OpenCV, which is not installed.")
    raw = _decode_base64(image_payload)
    buffer = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if image is None:
        raise ScanError("The image could not be decoded. Use JPEG or PNG.")

    warped, quad_detected = _find_face(image)
    colors = _white_balance(_sample_cells(warped))
    stickers: list[str | None] = []
    confidences: list[float] = []
    warnings: list[str] = []

    for color in colors:
        label, confidence, _hue, saturation, value = _classify(color)
        stickers.append(label)
        confidences.append(confidence)
        if label is None:
            warnings.append("A sticker was too dark to identify.")
        elif confidence < 0.45:
            warnings.append("Some stickers have low confidence; check the grid before applying it.")

    if not quad_detected:
        warnings.append("Could not detect the cube outline; the central square was used. Align the face inside the guide.")
    if stickers.count("U") > 4:
        warnings.append("Several stickers read as white — watch out for glare.")
    if any(sticker is None for sticker in stickers):
        warnings.append("Tap a cell to correct any stickers the scanner could not identify.")

    # De-duplicate warnings while preserving order.
    warnings = list(dict.fromkeys(warnings))
    average_hsv = cv2.cvtColor(np.uint8([[list(colors[4])]]), cv2.COLOR_BGR2HSV)[0, 0]
    average_label, _conf, _h, _s, _v = _classify(colors[4])
    del average_hsv

    return ScanResult(
        stickers=stickers,
        confidences=confidences,
        warnings=warnings,
        quad_detected=quad_detected,
        average_color=average_label,
    )
