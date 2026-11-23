import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Box,
  BookOpen,
  Camera,
  CheckCircle2,
  CircleDot,
  Crosshair,
  Grid3x3,
  Keyboard,
  RotateCcw,
  RotateCw,
  ScanLine,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Undo2,
  Redo2,
  Wand2,
} from "lucide-react";
import { ApiError, api } from "../lib/api";
import { isFaceletsSolved } from "../lib/cube/cubie";
import { FACE_INDEX, validateFacelets } from "../lib/cube/facelets";
import { parseMove } from "../lib/cube/moves";
import { generateScramble, SCRAMBLE_PRESETS, type ScramblePresetId } from "../lib/cube/scramble";
import type { Face, Move, MoveAmount, MoveFace, StickerColor } from "../lib/cube/types";
import { formatDuration, formatSeconds } from "../lib/format";
import { KEYBOARD_SHORTCUTS } from "../data/shortcuts";
import { useApiHealth } from "../hooks/useApiHealth";
import { useCubeWorkspace } from "../workspace/CubeWorkspace";
import { Celebration } from "../components/Celebration";
import { CubeCanvas } from "../components/CubeCanvas";
import { EditorPanel } from "../components/EditorPanel";
import { FaceControls } from "../components/FaceControls";
import { HistoryCard } from "../components/HistoryCard";
import { ScannerDialog } from "../components/ScannerDialog";
import { ScrambleCard } from "../components/ScrambleCard";
import { SolutionPanel } from "../components/SolutionPanel";
import { SolveCard, type SolveFailure } from "../components/SolveCard";
import { TimerCard } from "../components/TimerCard";
import { useToast } from "../components/Toaster";
import { Badge, Button, Modal, Segmented, cn } from "../components/ui";

type WorkspaceTab = "cube" | "editor";

const KEY_TO_FACE: Record<string, MoveFace> = {
  u: "U",
  d: "D",
  l: "L",
  r: "R",
  f: "F",
  b: "B",
  m: "M",
  e: "E",
  s: "S",
  x: "x",
  y: "y",
  z: "z",
};

export default function SolverPage() {
  const workspace = useCubeWorkspace();
  const { state, actions, busy, scrambling, facelets, elapsedMs, canUndo, canRedo } = workspace;
  const { push } = useToast();
  const apiHealth = useApiHealth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState<WorkspaceTab>("cube");
  const [preset, setPreset] = useState<ScramblePresetId>(
    state.scramblePreset as ScramblePresetId,
  );
  const [lastScramble, setLastScramble] = useState<Move[] | null>(state.scramble);
  const [solving, setSolving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [solveError, setSolveError] = useState<SolveFailure | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [viewReset, setViewReset] = useState(0);
  const solveRequest = useRef(0);

  useEffect(() => {
    setLastScramble(state.scramble);
  }, [state.scramble]);

  useEffect(() => {
    setPreset(state.scramblePreset as ScramblePresetId);
  }, [state.scramblePreset]);

  useEffect(() => {
    setSolveError(null);
  }, [facelets]);

  useEffect(() => {
    if (searchParams.get("scan") !== "1") return;
    setScannerOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("scan");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleSolve = useCallback(async () => {
    if (solving || busy || scrambling) return;
    const validation = validateFacelets(facelets);
    if (!validation.valid) {
      const failure = {
        message: "This sticker configuration cannot be solved.",
        details: validation.errors,
      };
      setSolveError(failure);
      push(validation.errors[0] ?? "Fix the sticker errors first.", "error", "Invalid cube");
      return;
    }
    if (isFaceletsSolved(facelets)) {
      push("The cube is already solved — scramble or paint it first.", "info");
      return;
    }
    if (apiHealth.status === "offline") {
      push("The solver API is offline. Start the backend and retry.", "error");
      return;
    }

    const requestId = solveRequest.current + 1;
    solveRequest.current = requestId;
    setSolving(true);
    setSolveError(null);
    try {
      const response = await api.solve(facelets);
      if (solveRequest.current !== requestId) return;
      if (!response.verified) {
        throw new ApiError(
          "The server returned a solution that did not pass its replay check.",
          502,
          "unverified_solution",
        );
      }
      const moves = response.solution.map(parseMove);
      actions.loadSolution({
        moves,
        raw: response.solution,
        verified: response.verified,
        apiElapsedMs: response.elapsedMs,
        apiNodes: response.nodes,
        normalized: response.normalized,
      });
      setTab("cube");
      push(
        `Solved in ${response.moveCount} moves in ${formatSeconds(response.elapsedMs)}.`,
        "success",
        "Solution ready",
      );
      window.setTimeout(() => {
        document
          .getElementById("solution-panel")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 90);
    } catch (caught) {
      if (solveRequest.current !== requestId) return;
      const failure =
        caught instanceof ApiError
          ? { message: caught.message, details: caught.details }
          : {
              message:
                caught instanceof Error ? caught.message : "The solve request failed unexpectedly.",
              details: [],
            };
      setSolveError(failure);
      push(failure.message, "error", "Could not solve");
    } finally {
      if (solveRequest.current === requestId) setSolving(false);
    }
  }, [actions, apiHealth.status, busy, facelets, push, scrambling, solving]);

  const handleScramble = useCallback(async () => {
    if (busy || scrambling || generating || solving) return;
    const option = SCRAMBLE_PRESETS.find((item) => item.id === preset) ?? SCRAMBLE_PRESETS[1]!;
    setGenerating(true);
    setSolveError(null);
    setTab("cube");
    let moves: Move[];
    let fallback = false;
    try {
      const response = await api.scramble(option.length);
      moves = response.moves.map(parseMove);
    } catch {
      moves = generateScramble({ length: option.length });
      fallback = true;
    }
    try {
      setLastScramble(moves);
      actions.scramble(moves, option.id);
      push(
        fallback
          ? "API unreachable — applied a locally generated scramble."
          : `${option.label} scramble applied · ${moves.length} moves.`,
        fallback ? "info" : "success",
        "Scrambled",
      );
    } finally {
      setGenerating(false);
    }
  }, [actions, busy, generating, preset, push, scrambling, solving]);

  const handleReset = () => {
    actions.reset();
    setLastScramble(null);
    setSolveError(null);
    setTab("cube");
    push("Cube reset to a solved state.", "info");
  };

  const openScanner = () => {
    if (busy || scrambling) {
      push("Wait for the cube animation to finish before scanning.", "info");
      return;
    }
    setScannerOpen(true);
  };

  const applyScannedFace = (face: Face, colors: StickerColor[]) => {
    if (busy || scrambling) {
      push("Wait for the cube animation to finish, then apply the face again.", "error");
      return;
    }
    const start = FACE_INDEX[face] * 9;
    actions.paintMany(colors.map((color, index) => ({ index: start + index, color })));
    setTab("cube");
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")
      ) {
        return;
      }
      if (scannerOpen || shortcutsOpen) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) actions.redo();
        else actions.undo();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if (event.key === " ") {
        if (state.solution) {
          event.preventDefault();
          if (state.solution.playing) actions.solutionPause();
          else actions.solutionPlay();
        }
        return;
      }
      if (event.key === "ArrowRight") {
        if (state.solution) {
          event.preventDefault();
          actions.solutionNext();
        }
        return;
      }
      if (event.key === "ArrowLeft") {
        if (state.solution) {
          event.preventDefault();
          actions.solutionPrev();
        }
        return;
      }

      const face = KEY_TO_FACE[event.key.toLowerCase()];
      if (!face) return;
      event.preventDefault();
      const amount: MoveAmount = event.shiftKey ? 3 : 1;
      actions.turn(face, amount);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actions, scannerOpen, shortcutsOpen, state.solution]);

  const solved = state.solved && !busy;
  const statusLabel = scrambling ? "Scrambling" : busy ? "Animating" : solved ? "Solved" : "Scrambled";
  const solvedCount = validateFacelets(facelets).valid;

  return (
    <>
      <div className="page-shell pb-16 pt-8 sm:pt-10">
        <header className="pb-6">
          <div className="eyebrow">Solver studio</div>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="display-title">
                The cube, <span className="gradient-text">solved properly.</span>
              </h1>
              <p className="lead mt-3 max-w-2xl">
                Scramble, solve and replay every move on a real 3D cube. The two-phase Kociemba
                solver validates the sticker state and verifies its own solution before playback.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                tone={
                  apiHealth.status === "online"
                    ? "success"
                    : apiHealth.status === "offline"
                      ? "danger"
                      : "warning"
                }
                icon={<CircleDot className="h-3 w-3" />}
              >
                {apiHealth.status === "online"
                  ? "API online"
                  : apiHealth.status === "offline"
                    ? "API offline"
                    : "Connecting"}
              </Badge>
              <Button variant="secondary" onClick={openScanner}>
                <Camera className="h-4 w-4" />
                Scan
              </Button>
              <Button variant="ghost" onClick={() => setShortcutsOpen(true)}>
                <Keyboard className="h-4 w-4" />
                Shortcuts
              </Button>
            </div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="min-w-0 space-y-5">
            <section className="surface" aria-labelledby="workspace-title">
              <div className="panel-header flex-wrap items-center">
                <div>
                  <h2 className="panel-title" id="workspace-title">
                    <Box className="h-4 w-4 text-violet-300" />
                    Cube workspace
                  </h2>
                  <p className="mt-1 text-[0.72rem] text-muted">
                    {solvedCount
                      ? "Every sticker is valid · 9 per colour"
                      : "Sticker counts need attention"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    tone={solved ? "success" : scrambling || busy ? "warning" : "violet"}
                  >
                    {statusLabel}
                  </Badge>
                  <Segmented
                    label="Workspace mode"
                    value={tab}
                    onChange={setTab}
                    options={[
                      { value: "cube", label: "3D", icon: <Box className="h-3.5 w-3.5" /> },
                      {
                        value: "editor",
                        label: "Editor",
                        icon: <Grid3x3 className="h-3.5 w-3.5" />,
                      },
                    ]}
                  />
                </div>
              </div>

              <div className="p-2.5 sm:p-3">
                {tab === "cube" ? (
                  <div className="cube-stage h-[400px] sm:h-[480px] xl:h-[540px]">
                    <CubeCanvas
                      cube={state.cube}
                      animation={state.animation}
                      onAnimationEnd={(token) => actions.finish(token)}
                      autoRotate={autoRotate}
                      resetSignal={viewReset}
                    />

                    <div className="cube-stage__top">
                      <div className="stage-pill">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: solved ? "#5ee0a0" : "#8b7cff" }}
                          aria-hidden="true"
                        />
                        {statusLabel}
                        <span className="text-dim">·</span>
                        {state.moveCount} moves
                      </div>
                      <div className="stage-tools">
                        <button
                          type="button"
                          className="stage-tool"
                          aria-label={autoRotate ? "Stop auto-rotation" : "Start auto-rotation"}
                          aria-pressed={autoRotate}
                          title="Auto-rotate"
                          onClick={() => setAutoRotate((value) => !value)}
                        >
                          <RotateCw className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="stage-tool"
                          aria-label="Reset camera view"
                          title="Reset view"
                          onClick={() => setViewReset((value) => value + 1)}
                        >
                          <Crosshair className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="stage-tool"
                          aria-label="Scan a cube face with the camera"
                          title="Scan a face"
                          onClick={openScanner}
                        >
                          <ScanLine className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="cube-stage__bottom">
                      <div className="stage-pill hidden sm:inline-flex">
                        Drag to orbit · scroll or pinch to zoom
                      </div>
                      <div className="stage-pill ml-auto">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            state.timer.running ? "bg-emerald-400" : "bg-white/30",
                          )}
                          aria-hidden="true"
                        />
                        <span className="text-white">{formatDuration(elapsedMs)}</span>
                        <span className="text-dim">·</span>
                        {state.moveCount} turns
                      </div>
                    </div>

                    {state.celebrate ? (
                      <Celebration
                        elapsedMs={state.timer.lastMs ?? elapsedMs}
                        moveCount={state.moveCount}
                        onDismiss={actions.dismissCelebration}
                        onScramble={() => {
                          actions.dismissCelebration();
                          void handleScramble();
                        }}
                      />
                    ) : null}
                  </div>
                ) : (
                  <div role="tabpanel" aria-label="Sticker editor">
                    <EditorPanel />
                  </div>
                )}
              </div>

              <div className="border-t border-white/[0.06] p-3">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={actions.undo} disabled={!canUndo}>
                    <Undo2 className="h-4 w-4" />
                    Undo
                  </Button>
                  <Button variant="ghost" size="sm" onClick={actions.redo} disabled={!canRedo}>
                    <Redo2 className="h-4 w-4" />
                    Redo
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4" />
                    Reset cube
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={openScanner}
                    disabled={busy || scrambling}
                  >
                    <Camera className="h-4 w-4" />
                    Scan face
                  </Button>

                  <div className="ml-auto flex flex-wrap gap-2">
                    <Button
                      variant="cyan"
                      size="sm"
                      onClick={() => void handleScramble()}
                      disabled={busy || scrambling || generating || solving}
                    >
                      <Shuffle className="h-4 w-4" />
                      {generating ? "Generating…" : "Scramble"}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void handleSolve()}
                      disabled={
                        solving ||
                        busy ||
                        scrambling ||
                        apiHealth.status === "offline" ||
                        solved
                      }
                    >
                      {solving ? (
                        <Sparkles className="h-4 w-4 animate-pulse" />
                      ) : (
                        <Wand2 className="h-4 w-4" />
                      )}
                      {solving ? "Solving…" : solved ? "Already solved" : "Solve cube"}
                    </Button>
                  </div>
                </div>

                {tab === "cube" ? (
                  <>
                    <FaceControls
                      onTurn={actions.turn}
                      disabled={busy || scrambling || solving}
                    />
                    <p className="mt-3 text-[0.66rem] leading-relaxed text-muted-dim">
                      Keyboard: <span className="kbd">U</span> <span className="kbd">R</span>{" "}
                      <span className="kbd">F</span> turn clockwise, hold{" "}
                      <span className="kbd">Shift</span> for prime. Slices and whole-cube rotations
                      are under the fold.
                    </p>
                  </>
                ) : (
                  <p className="text-[0.68rem] leading-relaxed text-muted-dim">
                    Painting updates the live 3D cube immediately. Switch back to the 3D view to
                    turn faces, scramble or solve.
                  </p>
                )}
              </div>
            </section>

            <SolutionPanel
              onSolve={() => void handleSolve()}
              solving={solving}
              solveDisabled={apiHealth.status === "offline" || busy || scrambling}
            />

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="surface p-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-400/10">
                    <BookOpen className="h-4 w-4 text-cyan-300" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Learn while you solve</h2>
                    <p className="text-[0.7rem] text-muted">Notation, method and shortcuts</p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  The solver gives you the shortest route it finds. Understanding the notation makes
                  every move legible — and the beginner method explains why the cube comes back
                  together.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to="/learn" className="btn btn-secondary btn-sm">
                    Learn notation
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link to="/algorithms" className="btn btn-ghost btn-sm">
                    Algorithm library
                  </Link>
                </div>
              </section>

              <section className="surface p-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-400/10">
                    <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Verified, not hard-coded</h2>
                    <p className="text-[0.7rem] text-muted">Two-phase search · replay check</p>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-muted">
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-300" />
                    The API rejects impossible corners, edges and parity before searching.
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-300" />
                    Each sequence is replayed through the cube model and must end solved.
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-300" />
                    Camera frames are processed in memory and never written to disk.
                  </li>
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShortcutsOpen(true)}>
                    <Keyboard className="h-4 w-4" />
                    Shortcut sheet
                  </Button>
                  <Link to="/about" className="btn btn-ghost btn-sm">
                    How it works
                  </Link>
                </div>
              </section>
            </div>
          </div>

          <aside className="min-w-0 space-y-5" aria-label="Solver controls">
            <SolveCard
              status={apiHealth.status}
              health={apiHealth.health}
              healthError={apiHealth.error}
              refreshing={apiHealth.refreshing}
              onRefresh={() => void apiHealth.refresh()}
              onSolve={() => void handleSolve()}
              solving={solving}
              solveError={solveError}
            />
            <ScrambleCard
              preset={preset}
              onPresetChange={setPreset}
              onScramble={() => void handleScramble()}
              generating={generating}
              lastScramble={lastScramble}
              disabled={busy || scrambling || solving}
            />
            <TimerCard />
            <HistoryCard />
            <div className="surface-dashed p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <ScanLine className="h-4 w-4 text-violet-300" />
                Camera scanning
              </div>
              <p className="mt-1.5 text-[0.7rem] leading-relaxed text-muted">
                {apiHealth.health?.scanning
                  ? "OpenCV face detection is ready. Scan one face at a time, confirm the grid, then apply it to the cube."
                  : apiHealth.status === "offline"
                    ? "The detection API is unreachable. Start the backend to enable scanning."
                    : "Scanning is unavailable on this deployment because OpenCV is not installed."}
              </p>
              <Button variant="secondary" block className="mt-3" onClick={openScanner}>
                <Camera className="h-4 w-4" />
                Open scanner
              </Button>
            </div>
          </aside>
        </div>
      </div>

      <ScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onApply={applyScannedFace}
        scanningAvailable={apiHealth.health?.scanning ?? null}
        apiStatus={apiHealth.status}
      />

      <Modal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        title="Keyboard shortcuts"
        description="Every action is available on the on-screen controls; these keys make live turning faster."
        size={620}
      >
        <div className="space-y-1.5">
          {KEYBOARD_SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.description}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2"
            >
              <span className="text-xs text-muted">{shortcut.description}</span>
              <span className="flex items-center gap-1">
                {shortcut.keys.map((key) => (
                  <kbd key={key} className="kbd">
                    {key}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[0.7rem] leading-relaxed text-muted-dim">
          Double turns are available from the face-turn buttons. Shortcuts are ignored while typing
          in a field or while a dialog is open.
        </p>
      </Modal>
    </>
  );
}
