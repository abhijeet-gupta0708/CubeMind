import { Copy, Shuffle, Sparkles } from "lucide-react";
import { copyText } from "../lib/clipboard";
import { scrambleNotation, SCRAMBLE_PRESETS, type ScramblePresetId } from "../lib/cube/scramble";
import type { Move } from "../lib/cube/types";
import { useToast } from "./Toaster";
import { Badge, Button, Spinner, cn } from "./ui";

export function ScrambleCard({
  preset,
  onPresetChange,
  onScramble,
  generating,
  lastScramble,
  disabled = false,
}: {
  preset: ScramblePresetId;
  onPresetChange: (preset: ScramblePresetId) => void;
  onScramble: () => void;
  generating: boolean;
  lastScramble: Move[] | null;
  disabled?: boolean;
}) {
  const { push } = useToast();
  const notation = lastScramble ? scrambleNotation(lastScramble) : "";

  const handleCopy = async () => {
    if (!notation) return;
    const copied = await copyText(notation);
    if (copied) push("Scramble notation copied.", "success");
    else push("The clipboard is not available in this browser.", "error");
  };

  return (
    <section className="surface" aria-labelledby="scramble-title">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="scramble-title">
            <Shuffle className="h-4 w-4 text-cyan-300" />
            Scramble
          </h2>
          <p className="mt-1 text-[0.72rem] text-muted">WCA-style random moves</p>
        </div>
        {lastScramble ? <Badge tone="cyan">{lastScramble.length} moves</Badge> : <Badge>Idle</Badge>}
      </div>

      <div className="panel-body space-y-3.5">
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Scramble difficulty">
          {SCRAMBLE_PRESETS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={cn("chip justify-between", preset === option.id && "chip--active")}
              aria-pressed={preset === option.id}
              onClick={() => onPresetChange(option.id)}
              disabled={disabled || generating}
            >
              <span>{option.label}</span>
              <span className="font-mono text-[0.62rem] opacity-60">{option.length}</span>
            </button>
          ))}
        </div>

        <Button
          variant="cyan"
          block
          onClick={onScramble}
          disabled={disabled || generating}
        >
          {generating ? <Spinner /> : <Sparkles className="h-4 w-4" />}
          {generating ? "Generating…" : "Scramble & reset timer"}
        </Button>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted-dim">
              Notation
            </span>
            <button
              type="button"
              className="flex min-h-9 items-center gap-1.5 rounded-md px-2 text-[0.68rem] font-medium text-muted transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
              onClick={handleCopy}
              disabled={!notation}
            >
              <Copy className="h-3 w-3" />
              Copy
            </button>
          </div>
          <div className="min-h-[4.25rem] rounded-xl border border-white/[0.06] bg-black/20 p-2.5">
            {notation ? (
              <p className="mono text-[0.78rem] leading-relaxed text-[#cfd4e0]">{notation}</p>
            ) : (
              <p className="text-[0.72rem] leading-relaxed text-muted-dim">
                Generate a scramble to see the notation and apply it to the cube.
              </p>
            )}
          </div>
        </div>

        <p className="text-[0.66rem] leading-relaxed text-muted-dim">
          Uses the backend generator when online and falls back to the local WCA-style generator.
          Applying a scramble clears the solution and resets the timer.
        </p>
      </div>
    </section>
  );
}
