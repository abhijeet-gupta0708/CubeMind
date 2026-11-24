import { Component, lazy, Suspense, useEffect, useRef, type ReactNode } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { scrollBehavior } from "./lib/motion";
import { ThemeProvider } from "./lib/theme";
import { Shell } from "./components/Shell";
import { ToastProvider } from "./components/Toaster";
import { Button } from "./components/ui";
import { CubeWorkspaceProvider } from "./workspace/CubeWorkspace";
const SolverPage = lazy(() => import("./pages/SolverPage"));
const LearnPage = lazy(() => import("./pages/LearnPage"));
const AlgorithmsPage = lazy(() => import("./pages/AlgorithmsPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));

const TITLES: Record<string, string> = {
  "/": "CubeMind — Verified 3D cube solver",
  "/learn": "Learn cube notation — CubeMind",
  "/algorithms": "Algorithm library — CubeMind",
  "/about": "About CubeMind — A real two-phase cube solver",
};

function ScrollAndTitle() {
  const location = useLocation();
  const initialPath = useRef(location.pathname);

  useEffect(() => {
    if (initialPath.current === location.pathname) return;
    document.getElementById("main-content")?.focus();
  }, [location.pathname]);

  useEffect(() => {
    document.title = TITLES[location.pathname] ?? "CubeMind — Cube studio";
    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      const timer = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
      }, 60);
      return () => window.clearTimeout(timer);
    }
    window.scrollTo({ top: 0, behavior: "auto" });
    return undefined;
  }, [location.pathname, location.hash]);

  return null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("CubeMind crashed", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-bg flex min-h-screen items-center justify-center px-4">
          <div className="surface max-w-md p-7 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Cube workspace failed
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              The cube workspace hit an unexpected error. Reloading usually clears it; your current
              cube state is not stored on the server.
            </p>
            <pre className="mt-3 max-h-24 overflow-auto rounded-lg border border-white/[0.07] bg-black/25 p-2 text-left font-mono text-[0.65rem] text-red-200/80">
              {this.state.error.message}
            </pre>
            <Button
              variant="primary"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4" />
              Reload CubeMind
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function NotFound() {
  return (
    <div className="page-shell flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <div className="eyebrow">404 · page not found</div>
      <h1 className="display-title mt-3">This route doesn&apos;t exist.</h1>
      <p className="lead mt-3 max-w-md">
        The cube is still solvable. Head back to the studio and pick up where you left off.
      </p>
      <Link to="/" className="btn btn-primary mt-5">
        <ArrowLeft className="h-4 w-4" />
        Back to the solver
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <MotionConfig reducedMotion="user">
          <ToastProvider>
            <CubeWorkspaceProvider>
              <ScrollAndTitle />
              <Shell>
                <Suspense
                  fallback={
                    <div className="page-shell flex min-h-[50vh] items-center justify-center">
                      <p className="meta-label">Loading the workbench…</p>
                    </div>
                  }
                >
                  <Routes>
                    <Route path="/" element={<SolverPage />} />
                    <Route path="/learn" element={<LearnPage />} />
                    <Route path="/algorithms" element={<AlgorithmsPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </Shell>
            </CubeWorkspaceProvider>
          </ToastProvider>
        </MotionConfig>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
