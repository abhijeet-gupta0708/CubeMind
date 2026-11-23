import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleHelp,
  Eraser,
  Grid3x3,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { validateFacelets } from "../lib/cube/facelets";
import { FACES, FACE_COLORS, FACE_NAMES } from "../lib/cube/types";
import type { StickerColor } from "../lib/cube/types";
import { ApiError, api, type ValidationResponse } from "../lib/api";
import { useCubeWorkspace } from "../workspace/CubeWorkspace";
import { useToast } from "./Toaster";
import { ColorPalette, NetView } from "./NetView";
import { Badge, Button, Callout, Spinner, cn } from "./ui";

export function EditorPanel() {
  const { state, actions, facelets } = useCubeWorkspace();
  const { push } = useToast();
  const [selectedColor, setSelectedColor] = useState<StickerColor>("U");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ValidationResponse | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  const local = useMemo(() => validateFacelets(facelets), [facelets]);

  useEffect(() => {
    setResult(null);
    setCheckError(null);
  }, [facelets]);

  const selectedFaceIndex = selectedIndex !== null ? Math.floor(selectedIndex / 9) : null;
  const selectedFace = selectedFaceIndex !== null ? FACES[selectedFaceIndex] : undefined;
  const selectedRow = selectedIndex !== null ? Math.floor((selectedIndex % 9) / 3) + 1 : null;
  const selectedCol = selectedIndex !== null ? ((selectedIndex % 9) % 3) + 1 : null;
  const selectedSticker = selectedIndex !== null ? facelets[selectedIndex] : undefined;

  const paint = (index: number) => {
    setSelectedIndex(index);
    actions.paint(index, selectedColor);
  };

  const resetCentres = () => {
    actions.paintMany(
      FACES.map((color, index) => ({ index: index * 9 + 4, color })),
    );
    setSelectedIndex(null);
    push("Centres restored to the canonical U/R/F/D/L/B colours.", "info");
  };

  const resetCube = () => {
    actions.reset();
    setSelectedIndex(null);
    setResult(null);
    setCheckError(null);
    push("Cube reset to a solved state.", "info");
  };

  const checkSolvability = async () => {
    setChecking(true);
    setResult(null);
    setCheckError(null);
    try {
      const response = await api.validate(facelets);
      setResult(response);
      if (response.valid) {
        push("This sticker configuration is solvable.", "success", "Valid cube");
      } else {
        push(
          response.errors[0] ?? "The configuration is not a legal cube.",
          "error",
          "Impossible cube",
        );
      }
    } catch (caught) {
      const message =
        caught instanceof ApiError ? caught.message : "The validation request failed.";
      setCheckError(message);
      push(message, "error");
    } finally {
      setChecking(false);
    }
  };

  const showImpossible = result !== null && !result.valid;
  const errors = result?.errors ?? local.errors;

  return (
    <div className="grid gap-5 p-1 lg:grid-cols-[minmax(0,1fr)_290px]">
      <div className="min-w-0">
        <div className="surface-soft p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Grid3x3 className="h-4 w-4 text-violet-300" />
              <h3 className="text-xs font-semibold text-white">Sticker editor</h3>
              <Badge>{local.valid ? "counts valid" : "needs work"}</Badge>
            </div>
            <div className="font-mono text-[0.64rem] text-muted-dim">
              {selectedIndex !== null && selectedFace
                ? `${FACE_NAMES[selectedFace]} · row ${selectedRow} · col ${selectedCol} · ${selectedSticker}`
                : "Select a sticker to paint"}
            </div>
          </div>

          <NetView
            facelets={facelets}
            editable
            selectedIndex={selectedIndex}
            onSelect={paint}
            ariaLabel="Editable cube net. Choose a colour, then select any sticker."
          />

          <p className="mt-2 text-center text-[0.68rem] leading-relaxed text-muted-dim">
            Pick a colour on the right, then tap a sticker. The 3D view and solver state update
            immediately.
          </p>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Callout tone="info" icon={<CircleHelp className="h-4 w-4" />} title="Centres and orientation">
            The solver normalises whole-cube rotations by the centre colours, so you can paint a
            rotated cube as long as all six centres are distinct.
          </Callout>
          <Callout
            tone="warning"
            icon={<TriangleAlert className="h-4 w-4" />}
            title="Legal cubes only"
          >
            Nine stickers per colour is necessary but not sufficient. Corner/edge orientation and
            permutation parity are checked by the API.
          </Callout>
        </div>
      </div>

      <div className="space-y-3.5">
        <div className="surface-soft p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white">Paint colour</h3>
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted-dim">
              {FACE_NAMES[selectedColor]} {selectedColor}
            </span>
          </div>
          <div className="mt-2">
            <ColorPalette selected={selectedColor} onChange={setSelectedColor} />
          </div>
        </div>

        <div className="surface-soft p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white">Sticker counts</h3>
            <span className="font-mono text-[0.62rem] text-muted-dim">9 each</span>
          </div>
          <div className="mt-1.5">
            {FACES.map((face) => {
              const count = local.counts[face];
              const ok = count === 9;
              return (
                <div key={face} className="count-row">
                  <span
                    className="h-3 w-3 flex-none rounded-[3px] border border-black/30"
                    style={{ background: FACE_COLORS[face] }}
                    aria-hidden="true"
                  />
                  <span className="w-4 flex-none font-mono text-[0.66rem] text-muted">{face}</span>
                  <span className="count-bar" aria-hidden="true">
                    <span
                      style={{
                        width: `${Math.min(100, (count / 9) * 100)}%`,
                        background: ok ? FACE_COLORS[face] : "#ff7b7b",
                      }}
                    />
                  </span>
                  <span
                    className={cn(
                      "w-4 flex-none text-right font-mono text-[0.66rem]",
                      ok ? "text-muted" : "text-red-300",
                    )}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="surface-soft p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-white">Validation</h3>
            {result ? (
              <Badge tone={result.valid ? "success" : "danger"}>
                {result.valid ? "solvable" : "impossible"}
              </Badge>
            ) : local.valid ? (
              <Badge tone="success">counts ok</Badge>
            ) : (
              <Badge tone="warning">check counts</Badge>
            )}
          </div>

          {errors.length > 0 ? (
            <ul className="mt-2 space-y-1.5 text-[0.7rem] leading-relaxed text-red-200/90">
              {errors.slice(0, 4).map((error) => (
                <li key={error} className="flex gap-1.5">
                  <TriangleAlert className="mt-0.5 h-3 w-3 flex-none" />
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 flex items-start gap-1.5 text-[0.7rem] leading-relaxed text-muted">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-300" />
              Counts and centres look valid. Run a solvability check to test parity and orientation.
            </p>
          )}

          {showImpossible ? (
            <p className="mt-2 text-[0.68rem] leading-relaxed text-red-200/80">
              This paint pattern is not reachable from a solved cube. Adjust the stickers and check
              again.
            </p>
          ) : null}
          {result?.valid ? (
            <p className="mt-2 text-[0.68rem] leading-relaxed text-emerald-200/80">
              Corner orientation, edge orientation and permutation parity all pass.
            </p>
          ) : null}
          {checkError ? (
            <p className="mt-2 text-[0.68rem] leading-relaxed text-red-200/80">{checkError}</p>
          ) : null}

          <Button
            variant="secondary"
            block
            className="mt-3"
            onClick={checkSolvability}
            disabled={checking || !local.valid}
          >
            {checking ? <Spinner /> : <ShieldCheck className="h-4 w-4" />}
            {checking ? "Checking…" : "Check solvability"}
          </Button>
          {!local.valid ? (
            <p className="mt-1.5 text-center text-[0.64rem] text-muted-dim">
              Fix the sticker counts before checking.
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={resetCentres} disabled={checking}>
            <Eraser className="h-4 w-4" />
            Reset centres
          </Button>
          <Button variant="danger" onClick={resetCube} disabled={checking}>
            <RotateCcw className="h-4 w-4" />
            Reset cube
          </Button>
        </div>

        <p className="text-[0.64rem] leading-relaxed text-muted-dim">
          Facelet order is U, R, F, D, L, B — the same order used by the API and the 3D model. The
          current state is {state.cube.cubies.length} cubies.
        </p>
      </div>
    </div>
  );
}
