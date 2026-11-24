import { Link } from "react-router-dom";
import { cn } from "./ui";

export function CubeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("h-8 w-8", className)} fill="none">
      <rect x="1" y="1" width="62" height="62" rx="12" fill="#101814" stroke="#2a3b31" />
      <path d="M32 9 54 21.5 32 34 10 21.5Z" fill="#f3f3ec" />
      <path d="M10 21.5 32 34v21L10 42.5Z" fill="#e85443" />
      <path d="M54 21.5 32 34v21l22-12.5Z" fill="#3f84d8" />
      <g stroke="#101814" strokeWidth="1.4" strokeLinejoin="round" opacity="0.72">
        <path d="M17.3 15.2 39.3 27.7M24.7 11.9 46.7 24.4M17.3 28.2 39.3 40.7M24.7 24.9 46.7 37.4" />
        <path d="M10 28.8 32 41.3M10 36.1 32 48.6M17.3 25.7v20.5M24.7 29.8v20.5" />
        <path d="M54 28.8 32 41.3M54 36.1 32 48.6M46.7 25.7v20.5M39.3 29.8v20.5" />
        <path d="M32 9v25M10 21.5 32 34l22-12.5M32 55V34" />
      </g>
      <path d="M32 34 54 21.5v9L32 43Z" fill="#46ad72" opacity="0.92" />
      <path d="M10 21.5 32 34v9L10 30.5Z" fill="#ef8c35" opacity="0.92" />
      <path d="M27 13.4h10l-5 3Z" fill="#f5cc45" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5 rounded-lg" aria-label={compact ? "CubeMind home" : undefined}>
      <CubeMark className="h-9 w-9 transition-transform duration-300 group-hover:-rotate-6" />
      {compact ? null : (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[1.05rem] font-bold tracking-[-0.03em] text-white">
            CubeMind
          </span>
          <span className="mt-1 text-[0.62rem] font-medium text-muted-dim">Cube studio</span>
        </span>
      )}
    </Link>
  );
}
