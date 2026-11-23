import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowRight, Camera, Menu, Sparkles, X } from "lucide-react";
import { CubeMark, Logo } from "./Logo";
import { cn } from "./ui";

const NAV_ITEMS: ReadonlyArray<{ to: string; label: string; end?: boolean }> = [
  { to: "/", label: "Solver", end: true },
  { to: "/learn", label: "Learn" },
  { to: "/algorithms", label: "Algorithms" },
  { to: "/about", label: "About" },
];

export function Shell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const onSolver = location.pathname === "/";

  return (
    <div className="app-bg">
      <div className="noise" aria-hidden="true" />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-violet-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <header className="app-header">
        <div className="page-shell flex h-[68px] items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={onSolver ? "/?scan=1" : "/"}
              className="btn btn-primary hidden sm:inline-flex"
            >
              {onSolver ? (
                <>
                  <Camera className="h-4 w-4" />
                  Scan a cube
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Open solver
                </>
              )}
            </Link>
            <button
              type="button"
              className="icon-btn md:hidden"
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div id="mobile-navigation" className="mobile-nav md:hidden">
            <nav className="page-shell flex flex-col gap-1 py-3" aria-label="Mobile">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex min-h-12 items-center justify-between rounded-xl px-3.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-white/[0.07] text-white"
                        : "text-muted hover:bg-white/[0.04] hover:text-white",
                    )
                  }
                >
                  {item.label}
                  <ArrowRight className="h-4 w-4 opacity-40" />
                </NavLink>
              ))}
              <Link
                to={onSolver ? "/?scan=1" : "/"}
                className="btn btn-primary mt-2 w-full"
              >
                {onSolver ? <Camera className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {onSolver ? "Scan a cube" : "Open solver"}
              </Link>
            </nav>
          </div>
        ) : null}
      </header>

      <main id="main-content">{children}</main>

      <footer className="mt-20 border-t border-white/[0.06]">
        <div className="page-shell py-12">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1.4fr]">
            <div>
              <Logo />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
                A focused 3D cube studio with a real two-phase Kociemba solver, step-by-step
                playback, a sticker editor and camera scanning.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="status-dot status-dot--ok" />
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-dim">
                  No account · no tracking
                </span>
              </div>
            </div>

            <div>
              <h2 className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-dim">
                Product
              </h2>
              <ul className="mt-3 space-y-1">
                {NAV_ITEMS.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-dim">
                Learn
              </h2>
              <ul className="mt-3 space-y-1">
                <li>
                  <Link
                    to="/learn#notation"
                    className="inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-white"
                  >
                    Notation
                  </Link>
                </li>
                <li>
                  <Link
                    to="/learn#method"
                    className="inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-white"
                  >
                    Beginner method
                  </Link>
                </li>
                <li>
                  <Link
                    to="/algorithms?filter=pll"
                    className="inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-white"
                  >
                    PLL algorithms
                  </Link>
                </li>
                <li>
                  <Link
                    to="/learn#shortcuts"
                    className="inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-white"
                  >
                    Keyboard shortcuts
                  </Link>
                </li>
              </ul>
            </div>

            <div className="surface-soft p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <CubeMark className="h-6 w-6" />
                Under the hood
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                The solver is a genuine two-phase Kociemba implementation running on FastAPI. Every
                returned sequence is replayed and verified before it reaches the browser.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="badge">Kociemba</span>
                <span className="badge">FastAPI</span>
                <span className="badge">OpenCV</span>
                <span className="badge">Three.js</span>
              </div>
            </div>
          </div>

          <div className="divider-dashed mt-10 flex flex-col gap-3 pt-5 text-xs text-muted-dim sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 CubeMind. A fictional demonstration project.</p>
            <p className="max-w-md leading-relaxed">
              Not affiliated with Spin Master or the Rubik&apos;s brand. Camera frames are sent only
              to the detection endpoint and are never stored.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
