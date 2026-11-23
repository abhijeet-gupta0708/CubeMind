import type { CSSProperties } from "react";
import { FACE_COLORS, FACE_NAMES, FACES } from "../lib/cube/types";
import type { Face, StickerColor } from "../lib/cube/types";
import { FACE_INDEX } from "../lib/cube/facelets";
import { cn } from "./ui";

const SLOT_ORDER: readonly Face[] = ["U", "L", "F", "R", "B", "D"];

export interface NetViewProps {
  facelets: string;
  editable?: boolean;
  selectedIndex?: number | null;
  onSelect?: (index: number) => void;
  compact?: boolean;
  className?: string;
  ariaLabel?: string;
}

function colorForSticker(sticker: string | undefined): string {
  if (!sticker) return "#2a2d35";
  if (sticker in FACE_COLORS) return FACE_COLORS[sticker as StickerColor];
  return "#2a2d35";
}

export function NetView({
  facelets,
  editable = false,
  selectedIndex = null,
  onSelect,
  compact = false,
  className,
  ariaLabel = "Cube net showing all six faces",
}: NetViewProps) {
  return (
    <div className={cn("net-scroll scroll-thin", className)}>
      <div className="cube-net" role="group" aria-label={ariaLabel}>
        {SLOT_ORDER.map((face) => {
          const faceIndex = FACE_INDEX[face];
          return (
            <div key={face} className={`net-slot--${face}`}>
              <div className="net-label">
                <span
                  className="inline-block h-2 w-2 rounded-[2px]"
                  style={{ background: FACE_COLORS[face] }}
                  aria-hidden="true"
                />
                {face} <span className="text-dim">· {FACE_NAMES[face]}</span>
              </div>
              <div
                className={cn("net-face", compact && "net-face--compact")}
                role="group"
                aria-label={`${FACE_NAMES[face]} face`}
              >
                {Array.from({ length: 9 }, (_, cell) => {
                  const row = Math.floor(cell / 3);
                  const col = cell % 3;
                  const index = faceIndex * 9 + cell;
                  const sticker = facelets[index] ?? "-";
                  const colour = colorForSticker(sticker);
                  const isCenter = cell === 4;
                  const style = { "--cell-color": colour } as CSSProperties;
                  const label = `${FACE_NAMES[face]} face, row ${row + 1}, column ${col + 1}${
                    sticker in FACE_COLORS ? `: ${FACE_NAMES[sticker as Face]}` : ": empty"
                  }`;

                  if (editable) {
                    return (
                      <button
                        key={index}
                        type="button"
                        className={cn(
                          "net-cell",
                          "net-cell--editable",
                          isCenter && "net-cell--center",
                          selectedIndex === index && "net-cell--selected",
                        )}
                        style={style}
                        aria-label={label}
                        aria-pressed={selectedIndex === index}
                        onClick={() => onSelect?.(index)}
                      />
                    );
                  }

                  return (
                    <div
                      key={index}
                      className={cn("net-cell", isCenter && "net-cell--center")}
                      style={style}
                      title={label}
                      aria-label={label}
                      role="img"
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MiniFace({
  face,
  colors,
  selected,
  onSelect,
  confidences,
}: {
  face: Face;
  colors: Array<StickerColor | null>;
  selected?: number | null;
  onSelect?: (index: number) => void;
  confidences?: number[];
}) {
  return (
    <div className="scan-grid" role="group" aria-label={`${FACE_NAMES[face]} scanned face`}>
      {colors.map((color, index) => {
        const confidence = confidences?.[index];
        return (
          <button
            key={index}
            type="button"
            className="scan-cell"
            style={{ "--cell-color": color ? FACE_COLORS[color] : "#262a31" } as CSSProperties}
            aria-label={`${FACE_NAMES[face]} row ${Math.floor(index / 3) + 1}, column ${
              (index % 3) + 1
            }: ${color ? FACE_NAMES[color] : "unknown"}`}
            aria-pressed={selected === index}
            onClick={() => onSelect?.(index)}
          >
            {confidence !== undefined ? (
              <span
                className="scan-cell__confidence"
                style={{
                  background:
                    confidence >= 0.7
                      ? "#5ee0a0"
                      : confidence >= 0.45
                        ? "#f5c451"
                        : "#ff7b7b",
                }}
                title={`Confidence ${(confidence * 100).toFixed(0)}%`}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function ColorPalette({
  selected,
  onChange,
  label = "Sticker colour",
}: {
  selected: StickerColor;
  onChange: (color: StickerColor) => void;
  label?: string;
}) {
  return (
    <div className="palette" role="group" aria-label={label}>
      {FACES.map((color) => (
        <button
          key={color}
          type="button"
          className="swatch"
          style={{ "--swatch": FACE_COLORS[color] } as CSSProperties}
          aria-label={`${FACE_NAMES[color]} ${color}`}
          aria-pressed={selected === color}
          title={`${FACE_NAMES[color]} (${color})`}
          onClick={() => onChange(color)}
        >
          <span className="swatch__color" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
