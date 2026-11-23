import { useMemo, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, X } from "lucide-react";
import { formatDuration } from "../lib/format";
import { Button } from "./ui";

const CONFETTI_COLORS = ["#8b7cff", "#57d6e8", "#5ee0a0", "#f5c451", "#ff7b7b", "#ffffff"];

interface ConfettiPiece {
  left: number;
  delay: number;
  duration: number;
  drift: number;
  spin: number;
  color: string;
  width: number;
  height: number;
}

export function Celebration({
  onDismiss,
  onScramble,
  elapsedMs,
  moveCount,
}: {
  onDismiss: () => void;
  onScramble?: () => void;
  elapsedMs?: number | null;
  moveCount?: number;
}) {
  const pieces = useMemo<ConfettiPiece[]>(
    () =>
      Array.from({ length: 38 }, (_, index) => ({
        left: (index * 37 + 11) % 100,
        delay: (index % 9) * 0.11,
        duration: 2.1 + ((index * 7) % 13) / 10,
        drift: ((index * 53) % 180) - 90,
        spin: 240 + ((index * 71) % 540),
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length]!,
        width: 5 + (index % 3) * 3,
        height: 9 + (index % 4) * 3,
      })),
    [],
  );

  return (
    <div className="celebration" role="status" aria-live="assertive">
      <div aria-hidden="true">
        {pieces.map((piece, index) => (
          <span
            key={index}
            className="confetti-piece"
            style={
              {
                left: `${piece.left}%`,
                background: piece.color,
                width: piece.width,
                height: piece.height,
                "--delay": `${piece.delay}s`,
                "--duration": `${piece.duration}s`,
                "--drift": `${piece.drift}px`,
                "--spin": `${piece.spin}deg`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <motion.div
        className="celebration__card"
        initial={{ opacity: 0, y: 20, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 20 }}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/40 bg-violet-500/15 shadow-[0_0_42px_-12px_rgba(139,124,255,0.9)]">
          <Check className="h-7 w-7 text-violet-200" strokeWidth={2.5} />
        </div>
        <div className="mt-4 flex items-center justify-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-cyan-300">
            Verified solved state
          </span>
        </div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
          Cube solved successfully!
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Every sticker matches its face and the solver&apos;s replay check passed.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          {typeof elapsedMs === "number" && elapsedMs > 0 ? (
            <div className="surface-soft px-3 py-2">
              <div className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-muted-dim">
                Time
              </div>
              <div className="mono mt-0.5 text-lg">{formatDuration(elapsedMs)}</div>
            </div>
          ) : null}
          {typeof moveCount === "number" && moveCount > 0 ? (
            <div className="surface-soft px-3 py-2">
              <div className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-muted-dim">
                Moves
              </div>
              <div className="mono mt-0.5 text-lg">{moveCount}</div>
            </div>
          ) : null}
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {onScramble ? (
            <Button variant="primary" onClick={onScramble}>
              <Sparkles className="h-4 w-4" />
              New scramble
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onDismiss}>
            <X className="h-4 w-4" />
            Keep exploring
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
