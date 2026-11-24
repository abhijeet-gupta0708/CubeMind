import { Link } from "react-router-dom";
import {
  Accessibility,
  ArrowRight,
  Boxes,
  Camera,
  CheckCircle2,
  CircleDot,
  Code2,
  Cpu,
  ExternalLink,
  Layers3,
  Lock,
  RefreshCw,
  ScanLine,
  Server,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useApiHealth, relativeTime } from "../hooks/useApiHealth";
import { Badge, Callout, SectionHeading, Stat, cn } from "../components/ui";

const ENDPOINTS = [
  {
    method: "GET",
    path: "/health",
    description:
      "Service status, solver table readiness and whether OpenCV scanning is installed.",
  },
  {
    method: "POST",
    path: "/solve",
    description:
      "Accepts 54 facelets. Validates legality, runs two-phase search and returns a verified solution.",
  },
  {
    method: "POST",
    path: "/validate",
    description:
      "Checks counts, centres, corner/edge orientation and permutation parity without solving.",
  },
  {
    method: "POST",
    path: "/scramble",
    description: "Generates a WCA-style random-move scramble between 5 and 40 moves.",
  },
  {
    method: "POST",
    path: "/scan/detect",
    description:
      "Finds a cube face in an image, warps it square, samples nine stickers and returns confidences.",
  },
] as const;

const STACK = [
  {
    icon: Code2,
    title: "Frontend",
    detail: "React 19, TypeScript, Vite, Tailwind, Three.js",
    body: "A 26-cubie model with exact integer rotation matrices keeps the 3D view, the sticker editor and the solver payload in sync.",
  },
  {
    icon: Cpu,
    title: "Solver",
    detail: "Pure-Python two-phase Kociemba",
    body: "Coordinate encodings, move tables and pruning tables are generated locally and cached. Every returned sequence is replayed through the cube model.",
  },
  {
    icon: Server,
    title: "API",
    detail: "FastAPI + Pydantic",
    body: "Typed endpoints, structured error envelopes, CORS configuration and a non-blocking table warm-up on startup.",
  },
  {
    icon: Camera,
    title: "Vision",
    detail: "OpenCV, in memory",
    body: "Contour detection, perspective warp, white balance and HSV/chroma classification. The UI asks you to confirm every grid before applying it.",
  },
] as const;

export default function AboutPage() {
  const health = useApiHealth();

  return (
    <div className="page-shell pb-16 pt-8 sm:pt-10">
      <header className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="eyebrow">Under the hood</div>
          <h1 className="display-title mt-3">A solver you can inspect.</h1>
          <p className="lead mt-4 max-w-xl">
            CubeMind pairs a genuine two-phase search with an honest 3D model, a sticker editor and
            a camera path that says when it is unsure. Nothing is hidden behind a canned answer.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/" className="btn btn-primary">
              Open the solver
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/learn" className="btn btn-secondary">
              Learn the notation
            </Link>
          </div>
        </div>

        <div className="surface p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "status-dot",
                  health.status === "online" && "status-dot--ok",
                  health.status === "offline" && "status-dot--error",
                  health.status === "loading" && "status-dot--loading",
                )}
              />
              <h2 className="text-sm font-semibold text-white">Live deployment</h2>
            </div>
            <button
              type="button"
              className="icon-btn icon-btn--sm"
              aria-label="Refresh API status"
              title="Refresh status"
              onClick={() => void health.refresh()}
              disabled={health.refreshing}
            >
              <RefreshCw className={cn("h-4 w-4", health.refreshing && "animate-spin")} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="API" value={health.status === "online" ? "online" : health.status === "offline" ? "offline" : "checking"} />
            <Stat label="Version" value={health.health?.version ?? "—"} />
            <Stat
              label="Solver tables"
              value={
                health.health?.tablesLoaded
                  ? "loaded"
                  : health.health?.tablesCached
                    ? "warming"
                    : "building"
              }
            />
            <Stat label="Scanner" value={health.health?.scanning ? "OpenCV" : "off"} />
          </div>

          <p className="mt-3 text-[0.68rem] leading-relaxed text-muted">
            {health.status === "offline"
              ? health.error ?? "The API could not be reached."
              : `Checked ${relativeTime(health.checkedAt)}. The solver loads its cached tables in the background so health checks answer immediately.`}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="violet">Kociemba</Badge>
            <Badge tone="cyan">FastAPI</Badge>
            <Badge>OpenCV</Badge>
            <Badge>React 19</Badge>
          </div>
        </div>
      </header>

      <section className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Cubies modelled", value: "26" },
          { label: "Stickers", value: "54" },
          { label: "Typical solution", value: "20–24" },
          { label: "Images stored", value: "0" },
        ].map((item) => (
          <Stat key={item.label} label={item.label} value={item.value} />
        ))}
      </section>

      <section className="mt-16 grid gap-5 lg:grid-cols-2">
        <div className="surface p-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <h2 className="text-base font-semibold text-white">What it is</h2>
          </div>
          <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-muted">
            <li>A genuine two-phase Kociemba solver running on a FastAPI backend.</li>
            <li>A 3D cube with 26 physical cubies, animated turns and a shared state model.</li>
            <li>A sticker editor that validates counts and asks the API to check solvability.</li>
            <li>A real camera scanner with per-sticker confidence and manual correction.</li>
            <li>Keyboard-first controls, visible focus and reduced-motion support.</li>
          </ul>
        </div>
        <div className="surface p-6">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-200" />
            <h2 className="text-base font-semibold text-white">What it is not</h2>
          </div>
          <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-muted">
            <li>It does not guarantee the absolute shortest solution. Two-phase search is short and fast, not optimal.</li>
            <li>It does not store camera images, accounts or solve history on a server.</li>
            <li>It is not a WCA timer, an inspection tool or a competition platform.</li>
            <li>It is not affiliated with Spin Master, Rubik&apos;s or any cube manufacturer.</li>
            <li>It will not guess stickers it cannot see — it asks you to confirm or correct them.</li>
          </ul>
        </div>
      </section>

      <section className="mt-16">
        <SectionHeading
          eyebrow="How it works"
          title="Validate · search · replay."
          description="The solver is deliberately boring in the best way: no hidden heuristics, no hard-coded solutions, no pretending the cube is solved when it is not."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              number: "01",
              title: "Validate",
              body: "Parse the 54 facelets into corners and edges, map centres, then check orientation sums and parity. An impossible cube stops here with a specific reason.",
            },
            {
              number: "02",
              title: "Search",
              body: "Phase one reaches the G1 subgroup where only U, D and half turns remain. Phase two finishes without disturbing what phase one restored.",
            },
            {
              number: "03",
              title: "Replay",
              body: "The candidate sequence is applied to the parsed cube. If the final facelets are not uniform, the API refuses to return the solution.",
            },
          ].map((step) => (
            <article key={step.number} className="step-card">
              <span className="step-number">{step.number}</span>
              <h3 className="text-sm font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">{step.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Callout tone="info" icon={<Zap className="h-4 w-4" />} title="Search budget">
            The local deployment allows 20 seconds and four million nodes. A typical random scramble
            is solved in about a second; pathological cases are cut off cleanly with a 503 instead of
            hanging the request.
          </Callout>
          <Callout tone="info" icon={<Layers3 className="h-4 w-4" />} title="Orientation">
            Whole-cube rotations move the centres. Before solving, colours are relabelled by centre so
            the solver sees a canonical U/R/F/D/L/B cube; the physical state is unchanged.
          </Callout>
        </div>
      </section>

      <section className="mt-16">
        <SectionHeading
          eyebrow="Architecture"
          title="Four small, honest layers."
          description="The frontend never invents a solution and the backend never draws a cube. Each side has one job and a shared notation."
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {STACK.map(({ icon: Icon, title, detail, body }) => (
            <article key={title} className="surface p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/25 bg-violet-500/10">
                    <Icon className="h-4 w-4 text-violet-300" />
                  </span>
                  <h3 className="text-sm font-semibold text-white">{title}</h3>
                </div>
                <span className="meta-label">
                  {detail}
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <SectionHeading
          eyebrow="API"
          title="Five endpoints, one error shape."
          description="Requests and responses are typed. Errors always arrive as { error: { message, code, details } } so the UI can show a useful message instead of a spinner forever."
        />
        <div className="mt-6 surface overflow-hidden">
          {ENDPOINTS.map((endpoint, index) => (
            <div
              key={endpoint.path}
              className={cn(
                "flex flex-col gap-1.5 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4",
                index !== ENDPOINTS.length - 1 && "border-b border-white/[0.06]",
              )}
            >
              <div className="flex flex-none items-center gap-2.5">
                <span
                  className={cn(
                    "w-12 rounded-md border px-1.5 py-0.5 text-center font-mono text-[0.58rem] font-semibold",
                    endpoint.method === "GET"
                      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                      : "border-violet-400/30 bg-violet-400/10 text-violet-200",
                  )}
                >
                  {endpoint.method}
                </span>
                <code className="font-mono text-xs text-white">{endpoint.path}</code>
              </div>
              <p className="text-[0.72rem] leading-relaxed text-muted">{endpoint.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.68rem] text-muted-dim">
            Interactive OpenAPI docs are available at <code className="mono">/docs</code> on the API
            origin.
          </p>
          <a
            href={`${(import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "")}/docs`}
            target="_blank"
            rel="noreferrer"
            className="link-btn"
          >
            Open API docs
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>

      <section className="mt-16 grid gap-5 lg:grid-cols-3">
        <div className="surface p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            <h2 className="text-sm font-semibold text-white">Privacy</h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            There are no accounts, analytics scripts or third-party trackers. Camera frames go only
            to your detection endpoint, are analysed in memory and are never persisted. Solve history
            lives in the browser session.
          </p>
        </div>
        <div className="surface p-5">
          <div className="flex items-center gap-2">
            <Accessibility className="h-4 w-4 text-cyan-300" />
            <h2 className="text-sm font-semibold text-white">Accessibility</h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Semantic landmarks, labelled controls, 44px targets, visible focus rings, a skip link and
            a reduced-motion path. Colour is never the only status cue; counts include text and every
            sticker has a spoken label.
          </p>
        </div>
        <div className="surface p-5">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-violet-300" />
            <h2 className="text-sm font-semibold text-white">Demo data</h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            This is a fictional demonstration project. Cube configurations are generated locally or
            entered by you; no user data is included. The Rubik&apos;s Cube name is used descriptively
            only.
          </p>
        </div>
      </section>

      <section className="mt-16">
        <SectionHeading
          eyebrow="Run it"
          title="Two processes, one shared contract."
          description="The frontend proxies /api to the FastAPI server in development. In production, set VITE_API_URL to the public API origin and allow your frontend origin in the API's CORS list."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="surface p-5">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-cyan-300" />
              <h3 className="text-sm font-semibold text-white">Backend</h3>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-white/[0.07] bg-black/25 p-3 font-mono text-[0.7rem] leading-relaxed text-muted">
              {`cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000`}
            </pre>
            <p className="mt-2 text-[0.68rem] leading-relaxed text-muted-dim">
              The first cold start builds the Kociemba tables and caches them under{" "}
              <code className="mono">backend/.cache</code>.
            </p>
          </div>
          <div className="surface p-5">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-violet-300" />
              <h3 className="text-sm font-semibold text-white">Frontend</h3>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-white/[0.07] bg-black/25 p-3 font-mono text-[0.7rem] leading-relaxed text-muted">
              {`cd frontend
npm install
npm run dev
# open http://localhost:5173`}
            </pre>
            <p className="mt-2 text-[0.68rem] leading-relaxed text-muted-dim">
              Set <code className="mono">VITE_API_URL</code> for a deployed API. Without it, the dev
              proxy and same-origin production build use relative paths.
            </p>
          </div>
        </div>
        <Callout
          tone="warning"
          icon={<ScanLine className="h-4 w-4" />}
          className="mt-4"
          title="Camera needs HTTPS (or localhost)"
        >
          Browsers only expose <code>getUserMedia</code> in a secure context. Localhost is treated as
          secure; a deployed site must use HTTPS. Uploading a photo remains available if a camera is
          missing or permission is denied.
        </Callout>
      </section>

      <section className="surface mt-16 overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="eyebrow">Built for clarity</div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
              See the next move, not a black box.
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted">
              Scramble a cube, run a verified solution and step through every highlighted move on the
              3D model.
            </p>
          </div>
          <Link to="/" className="btn btn-primary flex-none">
            <Sparkles className="h-4 w-4" />
            Open the solver
          </Link>
        </div>
      </section>

      <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-[0.68rem] text-muted-dim">
        <CircleDot className="h-3 w-3" />
        CubeMind is a fictional demonstration project. No affiliation with the Rubik&apos;s brand.
      </p>
    </div>
  );
}
