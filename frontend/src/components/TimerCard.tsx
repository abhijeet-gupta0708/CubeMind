import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import { formatDuration, formatSeconds } from "../lib/format";
import { useCubeWorkspace } from "../workspace/CubeWorkspace";
import { Badge, Button, IconButton } from "./ui";

export function TimerCard() {
  const { state, actions, elapsedMs } = useCubeWorkspace();
  const { timer, moveCount } = state;
  const running = timer.running;
  const turnsPerSecond = elapsedMs > 0 ? moveCount / (elapsedMs / 1000) : 0;

  return (
    <section className="surface" aria-labelledby="timer-title">
      <div className="panel-header">
        <h2 className="panel-title" id="timer-title">
          <Timer className="h-4 w-4 text-cyan-300" />
          Session timer
        </h2>
        <Badge tone={running ? "cyan" : "default"}>
          <span
            className={running ? "status-dot status-dot--info animate-pulse" : "status-dot"}
            aria-hidden="true"
          />
          {running ? "Running" : "Stopped"}
        </Badge>
      </div>

      <div className="panel-body space-y-3">
        <div
          className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-4 text-center"
          role="timer"
          aria-label={`Elapsed time ${formatDuration(elapsedMs)}`}
        >
          <div className="timer-digits">{formatDuration(elapsedMs)}</div>
          <div className="meta-label mt-1.5">
            {running ? "timing" : "elapsed"}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={running ? "danger" : "primary"}
            className="flex-1"
            onClick={actions.timerToggle}
            aria-label={running ? "Stop timer" : "Start timer"}
          >
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {running ? "Stop" : "Start"}
          </Button>
          <IconButton
            label="Reset timer"
            onClick={actions.timerReset}
            disabled={elapsedMs === 0}
          >
            <RotateCcw className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="surface-soft px-2.5 py-2">
            <div className="meta-label">
              Moves
            </div>
            <div className="mono mt-0.5 text-base">{moveCount}</div>
          </div>
          <div className="surface-soft px-2.5 py-2">
            <div className="meta-label">
              TPS
            </div>
            <div className="mono mt-0.5 text-base">
              {turnsPerSecond > 0 ? turnsPerSecond.toFixed(1) : "—"}
            </div>
          </div>
          <div className="surface-soft px-2.5 py-2">
            <div className="meta-label">
              Last
            </div>
            <div className="mono mt-0.5 text-base">
              {timer.lastMs !== null ? formatSeconds(timer.lastMs) : "—"}
            </div>
          </div>
        </div>

        <p className="text-[0.66rem] leading-relaxed text-muted-dim">
          Starts on your first manual or solution turn and stops automatically when the cube is
          solved. Reset independently at any time.
        </p>
      </div>
    </section>
  );
}
