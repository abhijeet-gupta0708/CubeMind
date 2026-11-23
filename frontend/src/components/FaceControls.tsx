import { ChevronDown, Layers3 } from "lucide-react";
import { FACE_COLORS, FACE_NAMES } from "../lib/cube/types";
import type { Face, MoveAmount, MoveFace } from "../lib/cube/types";

const FACE_MOVES: readonly Face[] = ["U", "R", "F", "D", "L", "B"];
const EXTRA_MOVES: readonly { face: MoveFace; label: string; hint: string }[] = [
  { face: "M", label: "M", hint: "Middle slice, like L" },
  { face: "E", label: "E", hint: "Equator slice, like D" },
  { face: "S", label: "S", hint: "Standing slice, like F" },
  { face: "x", label: "x", hint: "Whole cube, like R" },
  { face: "y", label: "y", hint: "Whole cube, like U" },
  { face: "z", label: "z", hint: "Whole cube, like F" },
];

const AMOUNTS: readonly { amount: MoveAmount; suffix: string; title: string }[] = [
  { amount: 3, suffix: "'", title: "counter-clockwise" },
  { amount: 2, suffix: "2", title: "half turn" },
  { amount: 1, suffix: "", title: "clockwise" },
];

export function FaceControls({
  onTurn,
  disabled = false,
}: {
  onTurn: (face: MoveFace, amount: MoveAmount) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="face-grid" role="group" aria-label="Face turns">
        {FACE_MOVES.map((face) => (
          <div key={face} className="face-control">
            <div className="face-control__label">
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-[2px]"
                  style={{ background: FACE_COLORS[face] }}
                  aria-hidden="true"
                />
                {face}
              </span>
              <span className="hidden normal-case tracking-normal text-dim sm:inline">
                {FACE_NAMES[face]}
              </span>
            </div>
            <div className="face-control__row">
              {AMOUNTS.map(({ amount, suffix, title }) => (
                <button
                  key={amount}
                  type="button"
                  className="face-turn"
                  disabled={disabled}
                  aria-label={`${FACE_NAMES[face]} ${title} (${face}${suffix})`}
                  title={`${face}${suffix}`}
                  onClick={() => onTurn(face, amount)}
                >
                  {face}
                  <span className="text-[0.6rem] opacity-80">{suffix}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <details className="group mt-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-lg px-1 text-xs font-medium text-muted transition-colors hover:text-white">
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
          <Layers3 className="h-3.5 w-3.5" />
          Slice &amp; whole-cube moves
        </summary>
        <div className="face-grid mt-2" role="group" aria-label="Slice and whole-cube moves">
          {EXTRA_MOVES.map(({ face, hint }) => (
            <div key={face} className="face-control">
              <div className="face-control__label" title={hint}>
                <span className="text-violet-300">{face}</span>
                <span className="h-2 w-2 rounded-full bg-violet-400/60" aria-hidden="true" />
              </div>
              <div className="face-control__row">
                {AMOUNTS.map(({ amount, suffix, title }) => (
                  <button
                    key={amount}
                    type="button"
                    className="face-turn"
                    disabled={disabled}
                    aria-label={`${hint}, ${title} (${face}${suffix})`}
                    title={`${face}${suffix} — ${hint}`}
                    onClick={() => onTurn(face, amount)}
                  >
                    {face}
                    <span className="text-[0.6rem] opacity-80">{suffix}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
