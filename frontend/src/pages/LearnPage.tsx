import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Box,
  ChevronDown,
  CircleHelp,
  Layers3,
  Lightbulb,
  ListChecks,
  MousePointer2,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { KEYBOARD_SHORTCUTS } from "../data/shortcuts";
import { parseMove } from "../lib/cube/moves";
import { useDemoCube } from "../components/DemoCube";
import { CubeCanvas } from "../components/CubeCanvas";
import { Badge, Button, Callout, SectionHeading, cn } from "../components/ui";

const NOTATION_GROUPS = [
  {
    title: "Face turns",
    icon: Box,
    token: "U D L R F B",
    body: "Each capital letter turns one outer face a quarter turn clockwise as you look directly at that face. U is up, D is down, L is left, R is right, F is front and B is back.",
    examples: ["R", "U", "F"],
  },
  {
    title: "Prime turns",
    icon: RotateCw,
    token: "R' U' F'",
    body: "An apostrophe means counter-clockwise — the inverse of the plain turn. R followed by R' puts the cube back exactly where it started.",
    examples: ["R'", "U'", "F'"],
  },
  {
    title: "Double turns",
    icon: Sparkles,
    token: "R2 U2 F2",
    body: "A 2 means a half turn: 180 degrees. Direction no longer matters, so there is no such thing as R2 prime.",
    examples: ["R2", "U2", "F2"],
  },
  {
    title: "Slice turns",
    icon: Layers3,
    token: "M E S",
    body: "Slices turn the middle layer only. M follows L, E follows D and S follows F. They move centres, which is why the solver normalises orientation by centres.",
    examples: ["M", "E'", "S2"],
  },
  {
    title: "Whole-cube rotations",
    icon: RotateCw,
    token: "x y z",
    body: "Lowercase x, y and z rotate the entire cube without changing which pieces are solved. x follows R, y follows U and z follows F. They reorient your view, not the puzzle.",
    examples: ["x", "y'", "z2"],
  },
  {
    title: "Reading a sequence",
    icon: BookOpen,
    token: "R U R' U'",
    body: "Spaces separate moves and are read left to right. Parentheses group triggers for rhythm. Algorithms assume a solved top face and a fixed front unless the case says otherwise.",
    examples: ["(R U R' U')", "F R U R' U' F'"],
  },
] as const;

const METHOD_STEPS = [
  {
    title: "The white cross",
    goal: "Four white edges around the white centre, with side colours matching their centres.",
    detail:
      "Start by putting the white edges opposite their target. Turn the bottom layer to line up a side colour, then bring the edge down. There is no single algorithm here — look for the shortest safe route.",
    tip: "Check the side stickers, not just the white ones. A cross with mismatched sides is not finished.",
  },
  {
    title: "First-layer corners",
    goal: "All four white corners in place, completing the first layer.",
    detail:
      "Bring a white corner above its target slot and repeat the insertion trigger R' D' R D until it drops in with white facing down. If a corner is stuck in the wrong slot, take it out first.",
    algorithm: "R' D' R D",
    tip: "Keep the white cross on the bottom while inserting corners. Repeating the trigger four times restores the corner to the top.",
  },
  {
    title: "Middle-layer edges",
    goal: "Four middle edges inserted, completing the first two layers.",
    detail:
      "Find an edge in the top layer that belongs in the middle. Line its side colour up with a centre, then insert it away from that side using the right or left trigger.",
    algorithm: "Right: U R U' R' U' F' U F · Left: U' L' U L U F U' F'",
    tip: "If an edge is already in the middle but flipped, insert any other edge to eject it, then try again.",
  },
  {
    title: "The yellow cross",
    goal: "A yellow cross on the top face, regardless of corner orientation.",
    detail:
      "Use F R U R' U' F' and repeat with U turns. The dot becomes a line, the line becomes an L, and the L becomes the cross. Hold the line horizontally and the L in the top-left.",
    algorithm: "F R U R' U' F'",
    tip: "This step only orients edges. Do not worry about corners yet.",
  },
  {
    title: "Orient yellow corners",
    goal: "The entire top face yellow.",
    detail:
      "Hold the cube with an unoriented yellow corner in the front-right and repeat Sune. Between repetitions, turn only the U layer to bring the next corner into position.",
    algorithm: "R U R' U R U2 R'",
    tip: "The rest of the cube may look scrambled between repetitions. Trust the process and keep the same front.",
  },
  {
    title: "Permute yellow corners",
    goal: "Each top corner in its correct position, even if twisted.",
    detail:
      "Find a corner that is already in the right slot and hold it at the front-right. Apply the corner cycle to move the other three into place.",
    algorithm: "U R U' L' U R' U' L",
    tip: "If no corner is correct, apply the cycle once from any orientation, then look again.",
  },
  {
    title: "Permute yellow edges",
    goal: "The cube solved.",
    detail:
      "Cycle the remaining top edges into place. One common edge cycle is shown here; keep a solved edge fixed and repeat if needed.",
    algorithm: "F2 U L R' F2 L' R U F2",
    tip: "Check that your first two layers stay intact after each repetition.",
  },
] as const;

const FAQ = [
  {
    question: "Does CubeMind always find the shortest solution?",
    answer:
      "No. It runs a two-phase Kociemba search, which finds short, high-quality solutions but does not guarantee the absolute shortest sequence. God's number in the half-turn metric is 20, while typical two-phase results land in the low twenties.",
  },
  {
    question: "How does it decide a cube is impossible?",
    answer:
      "Before searching, the API checks sticker counts, fixed centres, corner orientation, edge orientation and permutation parity. A cube that violates any of these laws cannot be reached by legal turns, no matter how it is solved.",
  },
  {
    question: "What do the camera scan and editor actually change?",
    answer:
      "They change the same shared cube state used by the 3D view and the solver. Painting a sticker or applying a scanned face immediately updates the live model; no separate hidden copy exists.",
  },
  {
    question: "Are camera images stored?",
    answer:
      "No. The browser sends an image payload to the detection endpoint, OpenCV analyses it in memory, and the server returns the nine stickers. Nothing is written to disk or sent to a third party.",
  },
  {
    question: "Is the timer WCA-compliant?",
    answer:
      "No. It is a practice timer that starts on your first turn and stops when the cube is solved. It has no inspection countdown, no Stackmat integration and no competition rules.",
  },
] as const;

export default function LearnPage() {
  const demo = useDemoCube(340);
  const [lastMove, setLastMove] = useState<string | null>(null);

  const demoMove = (token: string) => {
    demo.turn(parseMove(token));
    setLastMove(token);
  };

  const resetDemo = () => {
    demo.reset();
    setLastMove(null);
  };

  const palette: Array<{ label: string; icon: typeof Box }> = [
    { label: "6 faces", icon: Box },
    { label: "12 move types", icon: RotateCw },
    { label: "7-step method", icon: ListChecks },
    { label: "Keyboard ready", icon: MousePointer2 },
  ];

  return (
    <div className="page-shell pb-16 pt-8 sm:pt-10">
      <header className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="eyebrow">Notation lab</div>
          <h1 className="display-title mt-3">Learn the moves. Own the solve.</h1>
          <p className="lead mt-4 max-w-xl">
            Every algorithm is a sentence written in face turns. Learn the vocabulary here, then
            read any solution in the studio without guessing.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {palette.map(({ label, icon: Icon }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-1.5 text-[0.7rem] text-muted"
              >
                <Icon className="h-3.5 w-3.5 text-violet-300" />
                {label}
              </span>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/" className="btn btn-primary">
              Try the solver
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/algorithms" className="btn btn-secondary">
              Browse algorithms
            </Link>
          </div>
        </div>

        <div className="surface p-3">
          <div className="cube-stage h-[280px] sm:h-[310px]">
            <CubeCanvas
              cube={demo.cube}
              animation={demo.animation}
              onAnimationEnd={demo.finish}
              ariaLabel="Practice demo cube"
            />
            <div className="cube-stage__top">
              <div className="stage-pill">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    demo.busy ? "bg-violet-400" : "bg-emerald-400",
                  )}
                  aria-hidden="true"
                />
                {demo.busy ? "Animating" : "Demo cube"}
              </div>
              <Badge tone="violet">Not your solve</Badge>
            </div>
            <div className="cube-stage__bottom">
              <div className="stage-pill">
                <Lightbulb className="h-3 w-3" />
                {lastMove ? `Last: ${lastMove}` : "Try a move"}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {["R", "U", "R'", "U'", "F", "F'"].map((token) => (
              <button
                key={token}
                type="button"
                className="chip min-w-11 flex-1 justify-center font-mono"
                onClick={() => demoMove(token)}
                aria-label={`Apply ${token} to the demo cube`}
              >
                {token}
              </button>
            ))}
            <Button variant="ghost" size="sm" onClick={resetDemo} className="flex-none">
              Reset
            </Button>
          </div>
          <p className="mt-2 text-center text-[0.68rem] leading-relaxed text-muted-dim">
            A separate practice cube. Your solver workspace is untouched.
          </p>
        </div>
      </header>

      <section id="notation" className="mt-16 scroll-mt-24">
        <SectionHeading
          eyebrow="01 · Notation"
          title="Six faces. Four suffixes. No mystery."
          description="CubeMind accepts the standard face turns plus middle slices and whole-cube rotations. Primes and doubles work on all of them."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {NOTATION_GROUPS.map((group) => {
            const Icon = group.icon;
            return (
              <article key={group.title} className="surface p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                      <Icon className="h-4 w-4 text-violet-300" />
                    </span>
                    <h3 className="text-sm font-semibold text-white">{group.title}</h3>
                  </div>
                  <span className="mono rounded-md border border-white/[0.07] bg-black/20 px-1.5 py-0.5 text-[0.62rem] text-cyan-200">
                    {group.token}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted">{group.body}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {group.examples.map((example) => (
                    <span
                      key={example}
                      className="rounded-md border border-white/[0.07] bg-white/[0.02] px-1.5 py-1 font-mono text-[0.64rem] text-muted"
                    >
                      {example}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
        <Callout
          tone="info"
          icon={<CircleHelp className="h-4 w-4" />}
          className="mt-4"
          title="The one rule to remember"
        >
          A move is always read as if you are looking directly at that face. R turns the right face
          clockwise from the right, even when the right face is not facing you on screen.
        </Callout>
      </section>

      <section id="method" className="mt-16 scroll-mt-24">
        <SectionHeading
          eyebrow="02 · Method"
          title="A layer-by-layer route you can actually follow."
          description="This beginner method is separate from the two-phase solver. It is here so you can learn why the cube comes apart and comes back together."
        />
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {METHOD_STEPS.map((step, index) => (
            <article key={step.title} className="step-card">
              <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="text-sm font-semibold text-white">{step.title}</h3>
              <p className="mt-1 text-[0.72rem] leading-relaxed text-cyan-200/80">{step.goal}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted">{step.detail}</p>
              {"algorithm" in step && step.algorithm ? (
                <div className="mt-3 rounded-lg border border-white/[0.07] bg-black/20 px-2.5 py-2">
                  <div className="meta-label">
                    Algorithm
                  </div>
                  <div className="mono mt-1 text-[0.72rem] leading-relaxed text-muted">
                    {step.algorithm}
                  </div>
                </div>
              ) : null}
              <p className="mt-3 flex gap-1.5 text-[0.68rem] leading-relaxed text-muted-dim">
                <Lightbulb className="mt-0.5 h-3 w-3 flex-none text-amber-200" />
                {step.tip}
              </p>
            </article>
          ))}
        </div>
        <Callout tone="warning" className="mt-4" title="Practice beats memorisation">
          Algorithms only work from their setup position. If a case does not match, adjust the top
          layer or take the pair out and start again — forcing a trigger usually makes the state
          worse.
        </Callout>
      </section>

      <section id="shortcuts" className="mt-16 scroll-mt-24">
        <SectionHeading
          eyebrow="03 · Shortcuts"
          title="Keep your hands on the cube."
          description="The solver workspace is fully usable with a keyboard. Turn faces, step through a solution and undo without reaching for the mouse."
        />
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="surface p-2">
            {KEYBOARD_SHORTCUTS.map((shortcut) => (
              <div
                key={shortcut.description}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-white/[0.07] px-3 py-2.5 last:border-b-0"
              >
                <span className="text-xs text-muted">{shortcut.description}</span>
                <span className="flex flex-wrap items-center gap-1">
                  {shortcut.keys.map((key) => (
                    <kbd key={key} className="kbd">
                      {key}
                    </kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
          <div className="surface p-5">
            <div className="flex items-center gap-2">
              <MousePointer2 className="h-4 w-4 text-cyan-300" />
              <h3 className="text-sm font-semibold text-white">Precision tips</h3>
            </div>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
              <li>Use the face-turn buttons for double turns; the keyboard maps plain and prime.</li>
              <li>Drag the 3D scene to orbit, then reset the view from the crosshair button.</li>
              <li>Press Space during playback to pause without losing your place.</li>
              <li>Undo is disabled during playback so the solution index stays honest.</li>
            </ul>
            <Button variant="secondary" className="mt-4 w-full" onClick={resetDemo}>
              Reset practice cube
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-16">
        <SectionHeading eyebrow="04 · Questions" title="The short answers." />
        <div className="mt-5 space-y-2.5">
          {FAQ.map((item) => (
            <details key={item.question} className="group surface-soft px-4">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-medium text-white">
                {item.question}
                <ChevronDown className="h-4 w-4 flex-none text-muted transition-transform group-open:rotate-180" />
              </summary>
              <p className="pb-4 text-xs leading-relaxed text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="surface mt-16 overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="eyebrow">Ready?</div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
              Put the notation to work.
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted">
              Scramble the cube, run a verified solution and watch each highlighted move play out on
              the 3D model.
            </p>
          </div>
          <Link to="/" className="btn btn-primary flex-none">
            Open the solver
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
