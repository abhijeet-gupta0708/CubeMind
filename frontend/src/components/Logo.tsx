import { Link } from "react-router-dom";
import { cn } from "./ui";

export function CubeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("h-8 w-8", className)}
      fill="none"
    >
      <defs>
        <linearGradient id="cm-top" x1="8" y1="8" x2="54" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d7d2ff" />
          <stop offset="1" stopColor="#8b7cff" />
        </linearGradient>
        <linearGradient id="cm-left" x1="10" y1="24" x2="32" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7b69f5" />
          <stop offset="1" stopColor="#4b3fa8" />
        </linearGradient>
        <linearGradient id="cm-right" x1="32" y1="36" x2="54" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#57d6e8" />
          <stop offset="1" stopColor="#2b8c9d" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="62" height="62" rx="15" fill="#14161b" stroke="rgba(255,255,255,0.1)" />
      <path d="M32 11 53 23.5 32 36 11 23.5Z" fill="url(#cm-top)" />
      <path d="M11 23.5 32 36v17.5L11 41Z" fill="url(#cm-left)" />
      <path d="M53 23.5 32 36v17.5L53 41Z" fill="url(#cm-right)" />
      <path
        d="M32 11 53 23.5 32 36 11 23.5Zm0 0v25m-21-12.5L32 36l21-12.5M32 53.5V36"
        stroke="#0b0c0f"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      className="group flex items-center gap-2.5 rounded-lg"
      aria-label={compact ? "CubeMind home" : undefined}
    >
      <CubeMark className="h-9 w-9 transition-transform duration-300 group-hover:-rotate-6" />
      {compact ? null : (
        <span className="flex flex-col leading-none">
          <span className="text-[0.98rem] font-semibold tracking-[-0.02em] text-white">
            CubeMind
          </span>
          <span className="mt-1 font-mono text-[0.56rem] uppercase tracking-[0.17em] text-muted-dim">
            Cube studio
          </span>
        </span>
      )}
    </Link>
  );
}
