import {
  BadgeCheck,
  ClipboardCopy,
  Cpu,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import { validateFacelets } from "../lib/cube/facelets";
import { isFaceletsSolved } from "../lib/cube/cubie";
import { copyText } from "../lib/clipboard";
import { formatSeconds } from "../lib/format";
import { scrollBehavior } from "../lib/motion";
import type { ApiStatus } from "../hooks/useApiHealth";
import type { HealthResponse } from "../lib/api";
import { useCubeWorkspace } from "../workspace/CubeWorkspace";
import { useToast } from "./Toaster";
import { Badge, Button, Callout, Spinner, cn } from "./ui";

export interface SolveFailure {
  message: string;
  details: string[];
}

export function SolveCard({
  status,
  health,
  healthError,
  refreshing,
  onRefresh,
  onSolve,
  solving,
  solveError,
  onCopyState,
}: {
  status: ApiStatus;
  health: HealthResponse | null;
  healthError: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onSolve: () => void;
  solving: boolean;
  solveError: SolveFailure | null;
  onCopyState?: () => void;
}) {
  const { state, facelets, busy, scrambling } = useCubeWorkspace();
  const { push } = useToast();
  const validation = validateFacelets(facelets);
  const solved = isFaceletsSolved(facelets);
  const solution = state.solution;
  const offline = status === "offline";
  const checking = status === "loading";

  const disabledReason = offline
    ? "Solver API is offline."
    : checking
      ? "Checking the solver API."
      : solved
        ? "The cube is already solved."
        : !validation.valid
          ? "Fix the sticker errors first."
          : busy || scrambling
            ? "Wait for the cube animation to finish."
            : null;

  const handleCopy = async () => {
    const copied = await copyText(facelets);
    if (copied) {
      push("Cube state copied as 54 facelets.", "success", "Copied");
      onCopyState?.();
    } else {
      push(
        "Unable to copy. Select the text and copy it manually, or allow clipboard access in your browser.",
        "error",
      );
    }
  };

  return (
    <section className="surface" aria-labelledby="solver-card-title">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="solver-card-title">
            <Cpu className="h-4 w-4 text-violet-300" />
            Solver engine
          </h2>
          <p className="mt-1 text-[0.72rem] text-muted">Two-phase Kociemba · server-side</p>
        </div>
        <button
          type="button"
          className="icon-btn icon-btn--sm"
          aria-label="Re-check the solver API"
          title="Re-check API"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </button>
      </div>

      <div className="panel-body space-y-3.5">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "status-dot",
                status === "online" && "status-dot--ok",
                status === "offline" && "status-dot--error",
                status === "loading" && "status-dot--loading",
              )}
            />
            <span className="text-xs font-medium text-white">
              {checking
                ? "Connecting to API…"
                : offline
                  ? "Solver API unreachable"
                  : "Solver API online"}
            </span>
          </div>
          <Badge tone={offline ? "danger" : checking ? "warning" : "success"}>
            {offline ? "Offline" : checking ? "Checking" : `v${health?.version ?? "1.0.0"}`}
          </Badge>
        </div>

        {offline ? (
          <Callout
            tone="warning"
            icon={<WifiOff className="h-4 w-4" />}
            title="Start the FastAPI backend"
          >
            <p>{healthError ?? "The browser could not reach the solver."}</p>
            <p className="mt-2 font-mono text-[0.7rem] leading-relaxed opacity-90">
              cd backend
              <br />
              .venv\Scripts\activate
              <br />
              uvicorn app.main:app --port 8000
            </p>
            <p className="mt-2">
              In production, set <code>VITE_API_URL</code> to the deployed API origin.
            </p>
          </Callout>
        ) : (
          <dl className="grid grid-cols-2 gap-2 text-[0.72rem]">
            <div className="surface-soft px-2.5 py-2">
              <dt className="text-muted-dim">Method</dt>
              <dd className="mt-0.5 font-mono text-[0.7rem] text-white">two-phase</dd>
            </div>
            <div className="surface-soft px-2.5 py-2">
              <dt className="text-muted-dim">Tables</dt>
              <dd className="mt-0.5 flex items-center gap-1 font-mono text-[0.7rem] text-white">
                {health?.tablesLoaded ? (
                  <span className="text-emerald-300">loaded</span>
                ) : health?.tablesCached ? (
                  <span className="text-amber-200">warming</span>
                ) : (
                  <span className="text-amber-200">building</span>
                )}
              </dd>
            </div>
            <div className="surface-soft px-2.5 py-2">
              <dt className="text-muted-dim">Scanner</dt>
              <dd className="mt-0.5 font-mono text-[0.7rem] text-white">
                {health?.scanning ? "OpenCV ready" : "unavailable"}
              </dd>
            </div>
            <div className="surface-soft px-2.5 py-2">
              <dt className="text-muted-dim">Verification</dt>
              <dd className="mt-0.5 flex items-center gap-1 font-mono text-[0.7rem] text-white">
                <ShieldCheck className="h-3 w-3 text-emerald-300" />
                replay
              </dd>
            </div>
          </dl>
        )}

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {validation.valid ? (
                <BadgeCheck className="h-4 w-4 flex-none text-emerald-300" />
              ) : (
                <TriangleAlert className="h-4 w-4 flex-none text-red-300" />
              )}
              <div>
                <p className="text-xs font-medium text-white">
                  {solved
                    ? "Cube is solved"
                    : validation.valid
                      ? "Sticker state is valid"
                      : "Sticker state needs attention"}
                </p>
                <p className="mt-0.5 text-[0.68rem] leading-relaxed text-muted">
                  {solved
                    ? "Scramble or paint the cube to run a solve."
                    : validation.valid
                      ? "54 stickers · nine per colour · centres aligned."
                      : validation.errors[0] ?? "The sticker counts are inconsistent."}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="flex h-11 w-11 flex-none items-center justify-center rounded-lg text-muted-dim transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Copy cube state"
              title="Copy 54-character state"
              onClick={handleCopy}
            >
              <ClipboardCopy className="h-3.5 w-3.5" />
            </button>
          </div>
          {!validation.valid && validation.errors.length > 1 ? (
            <p className="mt-2 text-[0.68rem] text-red-300/80">
              +{validation.errors.length - 1} more validation issue
              {validation.errors.length - 1 === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>

        <Button
          variant="primary"
          block
          onClick={onSolve}
          disabled={solving || Boolean(disabledReason)}
          title={disabledReason ?? "Run the two-phase solver"}
        >
          {solving ? <Spinner /> : <Sparkles className="h-4 w-4" />}
          {solving
            ? "Searching…"
            : solved
              ? "Cube already solved"
              : !validation.valid
                ? "Fix sticker errors"
                : offline
                  ? "Solver offline"
                  : "Solve cube"}
        </Button>
        {disabledReason && !solved && validation.valid && !offline ? (
          <p className="-mt-1 text-center text-[0.68rem] text-muted-dim">{disabledReason}</p>
        ) : null}

        {solveError ? (
          <Callout
            tone="danger"
            icon={<TriangleAlert className="h-4 w-4" />}
            title="Could not solve this cube"
          >
            <p>{solveError.message}</p>
            {solveError.details.length > 0 ? (
              <ul className="mt-2 space-y-1 pl-4">
                {solveError.details.slice(0, 4).map((detail) => (
                  <li key={detail} className="list-disc">
                    {detail}
                  </li>
                ))}
              </ul>
            ) : null}
          </Callout>
        ) : null}

        {solution ? (
          <div className="rounded-xl border border-violet-400/20 bg-violet-500/[0.07] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="meta-label">
                Last solve
              </span>
              <Badge tone="violet">{solution.moves.length} moves</Badge>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[0.68rem] text-muted">
              <div>
                <span className="text-muted-dim">api </span>
                {formatSeconds(solution.apiElapsedMs)}
              </div>
              <div>
                <span className="text-muted-dim">nodes </span>
                {solution.apiNodes.toLocaleString()}
              </div>
            </div>
            <button
              type="button"
              className="link-btn mt-1 !min-h-11 !text-xs"
              onClick={() =>
                document
                  .getElementById("solution-panel")
                  ?.scrollIntoView({ behavior: scrollBehavior(), block: "start" })
              }
            >
              Jump to playback
            </button>
          </div>
        ) : null}

        <p className="text-[0.66rem] leading-relaxed text-muted-dim">
          The server validates corner/edge orientation and parity, searches both phases, then replays
          the solution before returning it.
        </p>
      </div>
    </section>
  );
}
