import { useEffect, useRef, useState } from "react";
import {
  CameraOff,
  Check,
  CircleHelp,
  ImageUp,
  Loader2,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Shield,
  TriangleAlert,
  Eraser,
} from "lucide-react";
import { ApiError, api, type ScanResponse } from "../lib/api";
import { isStickerColor } from "../lib/cube/facelets";
import { FACES, FACE_COLORS, FACE_NAMES } from "../lib/cube/types";
import type { Face, StickerColor } from "../lib/cube/types";
import { useToast } from "./Toaster";
import { ColorPalette, MiniFace } from "./NetView";
import { Badge, Button, Callout, Modal, Spinner, cn } from "./ui";

type CameraState =
  | "idle"
  | "starting"
  | "live"
  | "denied"
  | "unsupported"
  | "unavailable"
  | "error";

const EMPTY_GRID: Array<StickerColor | null> = Array.from({ length: 9 }, () => null);

export function ScannerDialog({
  open,
  onClose,
  onApply,
  scanningAvailable,
  apiStatus,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (face: Face, colors: StickerColor[]) => void;
  scanningAvailable: boolean | null;
  apiStatus: "loading" | "online" | "offline";
}) {
  const { push } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [face, setFace] = useState<Face>("F");
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [stickers, setStickers] = useState<Array<StickerColor | null>>(EMPTY_GRID);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState<StickerColor>("U");
  const [scanError, setScanError] = useState<string | null>(null);

  const scanningBlocked = scanningAvailable === false;

  // Start the webcam only while the dialog is open and scanning is available.
  useEffect(() => {
    if (!open) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
      setPreview(null);
      setResult(null);
      setStickers(EMPTY_GRID);
      setScanError(null);
      setSelectedCell(null);
      setCameraState("idle");
      setCameraError(null);
      return;
    }

    if (scanningBlocked) {
      setCameraState("unavailable");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("unsupported");
      return;
    }

    let cancelled = false;
    setCameraState("starting");
    setCameraError(null);

    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
      })
      .then((media) => {
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = media;
        setStream(media);
        setCameraState("live");
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        const name = caught instanceof DOMException ? caught.name : "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          setCameraState("denied");
          setCameraError("Camera permission was denied. Upload a photo instead.");
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setCameraState("error");
          setCameraError("No camera was found. Upload a photo instead.");
        } else {
          setCameraState("error");
          setCameraError(
            caught instanceof Error ? caught.message : "The camera could not be started.",
          );
        }
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    };
  }, [open, scanningBlocked]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
    return () => {
      video.srcObject = null;
    };
  }, [stream, open]);

  const scanPayload = async (payload: string, targetFace: Face) => {
    if (scanningBlocked) {
      setScanError("Camera scanning is unavailable because the backend has no OpenCV support.");
      return;
    }
    setScanning(true);
    setScanError(null);
    setSelectedCell(null);
    try {
      const response = await api.scan(payload, targetFace);
      setResult(response);
      setStickers(
        response.stickers.map((sticker) =>
          sticker && isStickerColor(sticker) ? sticker : null,
        ),
      );
    } catch (caught) {
      const message =
        caught instanceof ApiError ? caught.message : "The face could not be scanned.";
      setScanError(message);
      setResult(null);
      setStickers(EMPTY_GRID);
    } finally {
      setScanning(false);
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      setScanError("The camera is not ready yet. Give it a moment and try again.");
      return;
    }
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setScanError("This browser cannot read the camera frame.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.9);
    setPreview(data);
    void scanPayload(data, face);
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      push("Choose a JPEG or PNG image.", "error");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      push("That image is larger than 8 MB. Choose a smaller photo.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = typeof reader.result === "string" ? reader.result : "";
      if (!data) {
        setScanError("The image could not be read.");
        return;
      }
      const image = new Image();
      image.onload = () => {
        const canvas = canvasRef.current ?? document.createElement("canvas");
        const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          setScanError("This browser cannot process the image.");
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const resized = canvas.toDataURL("image/jpeg", 0.9);
        setPreview(resized);
        void scanPayload(resized, face);
      };
      image.onerror = () => setScanError("The image file could not be decoded.");
      image.src = data;
    };
    reader.onerror = () => setScanError("The image file could not be read.");
    reader.readAsDataURL(file);
  };

  const changeFace = (nextFace: Face) => {
    setFace(nextFace);
    setResult(null);
    setStickers(EMPTY_GRID);
    setScanError(null);
    setSelectedCell(null);
  };

  const applyGrid = () => {
    const complete = stickers.every((sticker): sticker is StickerColor => sticker !== null);
    if (!complete) {
      push("Identify all nine stickers before applying this face.", "info");
      return;
    }
    onApply(face, stickers);
    push(`${FACE_NAMES[face]} face applied to the cube.`, "success", "Face scanned");
    onClose();
  };

  const identified = stickers.filter(Boolean).length;
  const allIdentified = identified === 9;
  const cameraLive = cameraState === "live" && Boolean(stream);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Scan a cube face"
      description="Hold one face inside the guide, capture it, then confirm the nine stickers. Repeat for each face."
      size={880}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <div className="scanner-frame">
            {preview ? (
              <img src={preview} alt="Captured cube face" />
            ) : (
              <video ref={videoRef} playsInline muted autoPlay aria-label="Camera preview" />
            )}
            {!preview ? <div className="scanner-guide" aria-hidden="true" /> : null}

            {!preview && cameraState !== "live" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 p-4 text-center">
                {cameraState === "starting" ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin text-violet-300" />
                    <p className="text-xs text-muted">Requesting camera permission…</p>
                  </>
                ) : cameraState === "unavailable" ? (
                  <>
                    <CameraOff className="h-6 w-6 text-amber-200" />
                    <p className="text-xs text-muted">
                      Camera scanning is unavailable because the backend has no OpenCV support.
                      Install the Python OpenCV dependency and restart the API to enable it.
                    </p>
                  </>
                ) : (
                  <>
                    <CameraOff className="h-6 w-6 text-muted" />
                    <p className="text-xs text-muted">
                      {cameraError ??
                        "The camera is not running. Upload a photo instead of capturing one."}
                    </p>
                  </>
                )}
              </div>
            ) : null}

            {scanning ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
                <p className="text-xs text-muted">Detecting stickers…</p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {preview ? (
              <>
                <Button
                  variant="primary"
                  onClick={() => void scanPayload(preview, face)}
                  disabled={scanning || scanningBlocked}
                >
                  <RefreshCw className="h-4 w-4" />
                  Scan again
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPreview(null);
                    setResult(null);
                    setStickers(EMPTY_GRID);
                    setScanError(null);
                  }}
                  disabled={scanning}
                >
                  <RotateCcw className="h-4 w-4" />
                  Retake
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                onClick={capture}
                disabled={!cameraLive || scanning || scanningBlocked}
              >
                <ScanLine className="h-4 w-4" />
                Capture face
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              disabled={scanning || scanningBlocked}
            >
              <ImageUp className="h-4 w-4" />
              Upload photo
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                handleFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>

          {apiStatus === "offline" ? (
            <Callout tone="warning" icon={<TriangleAlert className="h-4 w-4" />}>
              The detection API is offline. Start the backend before scanning.
            </Callout>
          ) : null}

          <Callout tone="info" icon={<Shield className="h-4 w-4" />} title="Privacy">
            Frames are sent to the detection endpoint as an image payload, analysed in memory and
            never stored. Nothing leaves your own backend.
          </Callout>

          <div className="surface-soft p-3">
            <div className="flex items-center gap-2">
              <CircleHelp className="h-3.5 w-3.5 text-cyan-300" />
              <p className="text-[0.72rem] font-medium text-white">Getting a clean read</p>
            </div>
            <ul className="mt-1.5 space-y-1 text-[0.68rem] leading-relaxed text-muted">
              <li>Fill the guide with one face and keep the cube square to the camera.</li>
              <li>Avoid glare from lamps or windows; white stickers are the usual culprit.</li>
              <li>Check the centre sticker first — it anchors the whole colour mapping.</li>
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted-dim">
                Which face is this?
              </span>
              <Badge tone={result?.quadDetected ? "success" : "default"}>
                {result?.quadDetected ? "outline found" : "guided crop"}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6" role="group" aria-label="Face being scanned">
              {FACES.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={cn("chip justify-center !px-2", face === option && "chip--active")}
                  aria-pressed={face === option}
                  onClick={() => changeFace(option)}
                  title={`${FACE_NAMES[option]} face`}
                >
                  <span
                    className="h-2 w-2 rounded-[2px]"
                    style={{ background: FACE_COLORS[option] }}
                    aria-hidden="true"
                  />
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="surface-soft p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white">
                {result ? `${identified} of 9 stickers` : "Detected grid"}
              </span>
              {result?.averageColor ? (
                <Badge tone="cyan">centre {result.averageColor}</Badge>
              ) : null}
            </div>

            <MiniFace
              face={face}
              colors={stickers}
              selected={selectedCell}
              onSelect={setSelectedCell}
              confidences={result?.confidences}
            />

            <p className="mt-2 text-center text-[0.66rem] leading-relaxed text-muted-dim">
              {result
                ? "Tap a cell, then choose the correct colour below it."
                : "Capture or upload a photo to detect this face."}
            </p>

            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted-dim">
                  Correct a sticker
                </span>
                <span className="font-mono text-[0.6rem] text-muted-dim">
                  {selectedCell !== null ? `cell ${selectedCell + 1}` : "no cell"}
                </span>
              </div>
              <ColorPalette
                selected={selectedColor}
                onChange={(color) => {
                  setSelectedColor(color);
                  if (selectedCell !== null) {
                    setStickers((current) => {
                      const next = [...current];
                      next[selectedCell] = color;
                      return next;
                    });
                  }
                }}
              />
            </div>

            <div className="mt-2 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                disabled={selectedCell === null}
                onClick={() => {
                  if (selectedCell === null) return;
                  setStickers((current) => {
                    const next = [...current];
                    next[selectedCell] = null;
                    return next;
                  });
                }}
              >
                <Eraser className="h-3.5 w-3.5" />
                Clear cell
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                disabled={!result}
                onClick={() => {
                  if (!result) return;
                  setStickers(
                    result.stickers.map((sticker) =>
                      sticker && isStickerColor(sticker) ? sticker : null,
                    ),
                  );
                  setSelectedCell(null);
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset grid
              </Button>
            </div>
          </div>

          {result && result.warnings.length > 0 ? (
            <Callout tone="warning" icon={<TriangleAlert className="h-4 w-4" />} title="Scanner notes">
              <ul className="space-y-1">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </Callout>
          ) : null}

          {scanError ? (
            <Callout tone="danger" icon={<TriangleAlert className="h-4 w-4" />}>
              {scanError}
            </Callout>
          ) : null}

          <Button
            variant="primary"
            block
            onClick={applyGrid}
            disabled={!allIdentified || scanning}
          >
            {scanning ? <Spinner /> : <Check className="h-4 w-4" />}
            Apply {FACE_NAMES[face]} face to cube
          </Button>
          <p className="text-center text-[0.66rem] text-muted-dim">
            Applying a face updates the shared cube state. Scan the remaining faces one at a time.
          </p>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
    </Modal>
  );
}
