import { History, Redo2, Undo2 } from "lucide-react";
import { useCubeWorkspace } from "../workspace/CubeWorkspace";
import type { MoveSource } from "../workspace/CubeWorkspace";
import { Badge, IconButton, cn } from "./ui";

const SOURCE_LABEL: Record<MoveSource, string> = {
  user: "You",
  solution: "Solver",
  "solution-back": "Solver",
  scramble: "Scramble",
  undo: "Undo",
  redo: "Redo",
};

const SOURCE_TONE: Record<MoveSource, string> = {
  user: "text-white",
  solution: "text-violet-200",
  "solution-back": "text-violet-200",
  scramble: "text-cyan-200",
  undo: "text-amber-200",
  redo: "text-emerald-200",
};

export function HistoryCard() {
  const { state, actions, canUndo, canRedo, busy } = useCubeWorkspace();
  const recent = [...state.history].reverse().slice(0, 10);

  return (
    <section className="surface" aria-labelledby="history-title">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="history-title">
            <History className="h-4 w-4 text-cyan-300" />
            Move history
          </h2>
          <p className="mt-1 text-[0.72rem] text-muted">
            {state.history.length} move{state.history.length === 1 ? "" : "s"} this sequence
          </p>
        </div>
        <div className="flex gap-1.5">
          <IconButton
            label="Undo last move"
            size="sm"
            onClick={actions.undo}
            disabled={!canUndo}
          >
            <Undo2 className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="Redo move"
            size="sm"
            onClick={actions.redo}
            disabled={!canRedo}
          >
            <Redo2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      <div className="panel-body">
        {recent.length === 0 ? (
          <div className="empty-state py-6">
            <History className="h-5 w-5 opacity-40" />
            <p>
              {busy
                ? "Animating…"
                : "Turn a face, play a solution move or undo to start a history."}
            </p>
          </div>
        ) : (
          <ul className="max-h-56 overflow-y-auto scroll-thin pr-1">
            {recent.map((entry, position) => (
              <li key={entry.id} className="history-row">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="w-5 flex-none text-right font-mono text-[0.6rem] text-muted-dim">
                    {state.history.length - position}
                  </span>
                  <span className="history-move">{entry.label}</span>
                  <span
                    className={cn(
                      "font-mono text-[0.6rem] uppercase tracking-[0.08em]",
                      SOURCE_TONE[entry.source],
                    )}
                  >
                    {SOURCE_LABEL[entry.source]}
                  </span>
                </div>
                <span className="flex-none font-mono text-[0.62rem] text-muted-dim">
                  {new Date(entry.at).toLocaleTimeString([], {
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="divider-dashed mt-2 pt-2.5">
          <div className="flex items-center justify-between gap-2">
            <Badge>{state.moveCount} applied</Badge>
            <span className="text-[0.66rem] text-muted-dim">
              Ctrl/⌘ + Z undo · Shift + Ctrl/⌘ + Z redo
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
