import { useEffect, useRef } from "react";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  ListOrdered,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  Wand2,
  X,
} from "lucide-react";
import { moveLabel } from "../lib/cube/moves";
import { formatDuration, formatSeconds } from "../lib/format";
import { useCubeWorkspace } from "../workspace/CubeWorkspace";
import { Badge, Button, Callout, Spinner, cn } from "./ui";

export function SolutionPanel({
  onSolve,
  solving,
  solveDisabled = false,
}: {
  onSolve: () => void;
  solving: boolean;
  solveDisabled?: boolean;
}) {
  const { state, actions, busy, currentSolutionMove } = useCubeWorkspace();
  const solution = state.solution;
  const currentRef = useRef<HTMLSpanElement | null>(null);

  const index = solution?.index ?? 0;
  const total = solution?.moves.length ?? 0;

  useEffect(() => {
    if (!solution) return;
    currentRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [solution, index]);

  if (!solution) {
    return (
      <section className="surface" id="solution-panel" aria-labelledby="solution-title">
        <div className="panel-header">
          <h2 className="panel-title" id="solution-title">
            <ListOrdered className="h-4 w-4 text-violet-300" />
            Solution playback
          </h2>
          <Badge>Not loaded</Badge>
        </div>
        <div className="panel-body">
          <div className="surface-dashed flex flex-col items-center gap-3 px-5 py-8 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/10">
              <Wand2 className="h-5 w-5 text-violet-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">No solution loaded yet</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">
                Scramble the cube or paint a state, then run the solver. Each move is highlighted,
                animated and checked by replaying the full sequence before it is shown.
              </p>
            </div>
            <Button variant="primary" onClick={onSolve} disabled={solving || solveDisabled}>
              {solving ? <Spinner /> : <Sparkles className="h-4 w-4" />}
              {solving ? "Solving…" : "Solve this cube"}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const completed = solution.completed && state.solved;
  const playing = solution.playing;
  const percent = completed ? 100 : total === 0 ? 0 : Math.round((index / total) * 100);
  const progressLabel = completed
    ? "Complete"
    : total === 0
      ? "No moves needed"
      : `Move ${index + 1} of ${total}`;
  const nextLabel = completed ? "Solved" : currentSolutionMove ? moveLabel(currentSolutionMove) : "—";
  const canPrev = index > 0 && !busy && !playing;
  const canNext = !completed && index < total && !busy && !playing;

  return (
    <section className="surface" id="solution-panel" aria-labelledby="solution-title">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="solution-title">
            <ListOrdered className="h-4 w-4 text-violet-300" />
            Solution playback
          </h2>
          <p className="mt-1 text-[0.72rem] text-muted">
            {completed
              ? "All moves applied and the solved state confirmed."
              : "Every move is a quarter turn on the live cube — nothing is faked."}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Badge tone="success" icon={<BadgeCheck className="h-3 w-3" />}>
            Verified
          </Badge>
          <Badge tone="violet">Kociemba</Badge>
        </div>
      </div>

      <div className="panel-body space-y-4">
        <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)]">
          <div className="current-move">
            <div className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-violet-200/80">
              {completed ? "Complete" : "Up next"}
            </div>
            <div className="current-move__label">{completed ? "✓" : nextLabel}</div>
            <div className="mt-1 text-[0.66rem] text-muted">
              {completed ? "Cube solved" : `${Math.max(0, total - index)} remaining`}
            </div>
          </div>

          <div className="min-w-0 space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted-dim">
                  Progress
                </div>
                <div className="mt-1 text-lg font-semibold tracking-tight text-white">
                  {progressLabel}
                </div>
              </div>
              <div className="mono text-sm text-muted">{percent}%</div>
            </div>

            <div
              className="progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={completed ? total : index}
              aria-label="Solution progress"
            >
              <div className="progress-fill" style={{ width: `${percent}%` }} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => (playing ? actions.solutionPause() : actions.solutionPlay())}
                disabled={completed || total === 0}
                aria-label={playing ? "Pause solution playback" : "Play solution"}
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playing ? "Pause" : "Play"}
              </Button>
              <Button
                variant="secondary"
                onClick={actions.solutionPrev}
                disabled={!canPrev}
                aria-label="Previous solution move"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Button
                variant="secondary"
                onClick={actions.solutionNext}
                disabled={!canNext}
                aria-label="Next solution move"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={actions.solutionRestart}
                disabled={busy || (index === 0 && !completed)}
                aria-label="Restart solution from the scrambled state"
              >
                <RotateCcw className="h-4 w-4" />
                Restart
              </Button>
              <Button
                variant="ghost"
                onClick={actions.solutionExit}
                disabled={busy}
                aria-label="Exit solution playback"
              >
                <X className="h-4 w-4" />
                Exit
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[0.64rem] uppercase tracking-[0.08em] text-muted-dim">
              <span>{total} moves</span>
              <span>API {formatSeconds(solution.apiElapsedMs)}</span>
              <span>{solution.apiNodes.toLocaleString()} nodes</span>
              {solution.normalized ? <span className="text-cyan-300/80">centres normalised</span> : null}
            </div>
          </div>
        </div>

        <div className="surface-soft p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted-dim">
              Move timeline
            </span>
            <span className="text-[0.7rem] text-muted">
              ← → to step · Space to play
            </span>
          </div>
          {total === 0 ? (
            <p className="py-2 text-xs text-muted">The cube was already solved; no moves were needed.</p>
          ) : (
            <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto scroll-thin py-1">
              {solution.moves.map((move, moveIndex) => {
                const done = moveIndex < index || completed;
                const current = !completed && moveIndex === index;
                return (
                  <span
                    key={`${moveIndex}-${moveLabel(move)}`}
                    ref={current ? currentRef : undefined}
                    className={cn(
                      "move-pill",
                      done && "move-pill--done",
                      current && "move-pill--current",
                      !done && !current && "move-pill--upcoming",
                    )}
                    title={`Move ${moveIndex + 1}: ${moveLabel(move)}`}
                  >
                    <span className="mr-1 text-[0.55rem] opacity-50">{moveIndex + 1}</span>
                    {moveLabel(move)}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {completed ? (
          <Callout tone="success" icon={<CircleCheck className="h-4 w-4" />} title="Cube solved successfully!">
            The final sticker state matches a solved cube
            {state.timer.lastMs ? ` in ${formatDuration(state.timer.lastMs)}` : ""}. Every move was
            replayed on the server before playback.
          </Callout>
        ) : null}

        {solution.verificationError ? (
          <Callout
            tone="danger"
            icon={<TriangleAlert className="h-4 w-4" />}
            title="Replay check failed"
          >
            {solution.verificationError}
          </Callout>
        ) : null}
      </div>
    </section>
  );
}
