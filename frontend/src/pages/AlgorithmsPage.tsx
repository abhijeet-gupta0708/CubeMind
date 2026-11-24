import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Copy,
  Info,
  ListFilter,
  Play,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
import {
  ALGORITHMS,
  ALGORITHM_CATEGORIES,
  type AlgorithmCategory,
  type CubeAlgorithm,
} from "../data/algorithms";
import { parseSequence } from "../lib/cube/moves";
import { copyText } from "../lib/clipboard";
import { useDemoCube } from "../components/DemoCube";
import { CubeCanvas } from "../components/CubeCanvas";
import { useToast } from "../components/Toaster";
import { Badge, Button, Callout, SectionHeading, cn } from "../components/ui";

type Filter = AlgorithmCategory | "all";

const FILTER_IDS = new Set<string>(["all", "fundamentals", "f2l", "oll", "pll", "patterns"]);

function difficultyTone(difficulty: CubeAlgorithm["difficulty"]) {
  if (difficulty === "Beginner") return "success" as const;
  if (difficulty === "Intermediate") return "cyan" as const;
  return "violet" as const;
}

export default function AlgorithmsPage() {
  const { push } = useToast();
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>(() => {
    const requested = searchParams.get("filter");
    return requested && FILTER_IDS.has(requested) ? (requested as Filter) : "all";
  });
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(ALGORITHMS[0]!.id);
  const demo = useDemoCube(310);

  useEffect(() => {
    const requested = searchParams.get("filter");
    if (requested && FILTER_IDS.has(requested)) setFilter(requested as Filter);
  }, [searchParams]);

  const selected = ALGORITHMS.find((algorithm) => algorithm.id === selectedId) ?? ALGORITHMS[0]!;
  const selectedCategory = ALGORITHM_CATEGORIES.find((category) => category.id === selected.category);

  const counts = useMemo(() => {
    const map = new Map<Filter, number>();
    map.set("all", ALGORITHMS.length);
    for (const category of ALGORITHM_CATEGORIES) {
      if (category.id === "all") continue;
      map.set(
        category.id,
        ALGORITHMS.filter((algorithm) => algorithm.category === category.id).length,
      );
    }
    return map;
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return ALGORITHMS.filter((algorithm) => {
      if (filter !== "all" && algorithm.category !== filter) return false;
      if (!term) return true;
      return (
        algorithm.name.toLowerCase().includes(term) ||
        algorithm.notation.toLowerCase().includes(term) ||
        algorithm.description.toLowerCase().includes(term) ||
        algorithm.category.includes(term)
      );
    });
  }, [filter, query]);

  const activeCategory = ALGORITHM_CATEGORIES.find((category) => category.id === filter);

  const playAlgorithm = (algorithm: CubeAlgorithm) => {
    setSelectedId(algorithm.id);
    demo.play(parseSequence(algorithm.notation));
  };

  const copyAlgorithm = async (algorithm: CubeAlgorithm) => {
    const copied = await copyText(algorithm.notation);
    if (copied) push(`${algorithm.name} notation copied.`, "success");
    else
      push(
        "Unable to copy. Select the text and copy it manually, or allow clipboard access in your browser.",
        "error",
      );
  };

  return (
    <div className="page-shell pb-16 pt-8 sm:pt-10">
      <header>
        <div className="eyebrow">Algorithm index</div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display-title">A library you can actually play.</h1>
            <p className="lead mt-3 max-w-2xl">
              Triggers, last-layer cases and useful patterns. Load any sequence onto the practice
              cube and watch the exact notation turn it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="violet">{ALGORITHMS.length} algorithms</Badge>
            <Link to="/learn#notation" className="btn btn-secondary btn-sm">
              <BookOpen className="h-4 w-4" />
              Read the notation
            </Link>
          </div>
        </div>
      </header>

      <div className="mt-8 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <aside className="order-first xl:order-last xl:sticky xl:top-[88px]">
          <div className="surface p-3">
            <div className="cube-stage h-[300px]">
              <CubeCanvas
                cube={demo.cube}
                animation={demo.animation}
                onAnimationEnd={demo.finish}
                ariaLabel={`Practice cube demonstrating ${selected.name}`}
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
                  {demo.busy ? `Playing · ${demo.queued + 1}` : "Ready"}
                </div>
                <Badge tone="violet">Demo cube</Badge>
              </div>
              <div className="cube-stage__bottom">
                <div className="stage-pill">{selected.name}</div>
              </div>
            </div>

            <div className="mt-3 px-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="violet">{selectedCategory?.label ?? selected.category}</Badge>
                <Badge tone={difficultyTone(selected.difficulty)}>{selected.difficulty}</Badge>
              </div>
              <h2 className="mt-2 text-base font-semibold tracking-tight text-white">
                {selected.name}
              </h2>
              <div className="algorithm-notation mt-2">{selected.notation}</div>
              <p className="mt-2 text-xs leading-relaxed text-muted">{selected.description}</p>
              {selected.note ? (
                <p className="mt-2 flex gap-1.5 text-[0.68rem] leading-relaxed text-muted-dim">
                  <Info className="mt-0.5 h-3 w-3 flex-none text-cyan-300" />
                  {selected.note}
                </p>
              ) : null}
              <div className="mt-3 flex gap-2">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => playAlgorithm(selected)}
                  disabled={demo.busy}
                >
                  <Play className="h-4 w-4" />
                  Play demo
                </Button>
                <Button variant="secondary" onClick={() => demo.reset()}>
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
              <button
                type="button"
                className="link-btn mt-1 !min-h-11 !text-[0.7rem]"
                onClick={() => void copyAlgorithm(selected)}
              >
                <Copy className="h-3 w-3" />
                Copy notation
              </button>
            </div>
          </div>

          <Callout
            tone="info"
            icon={<Sparkles className="h-4 w-4" />}
            className="mt-4"
            title="Demos start solved"
          >
            A demonstration shows the algorithm&apos;s effect on a solved cube. It is not a claim that
            the algorithm solves that resulting pattern.
          </Callout>
        </aside>

        <div className="min-w-0">
          <div className="surface p-3.5">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scroll-thin">
                <ListFilter className="h-4 w-4 flex-none text-muted-dim" />
                {ALGORITHM_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={cn("chip flex-none", filter === category.id && "chip--active")}
                    aria-pressed={filter === category.id}
                    onClick={() => setFilter(category.id)}
                  >
                    {category.label}
                    <span className="mono text-[0.62rem]">
                      {counts.get(category.id) ?? 0}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="field sm:max-w-xs">
                  <Search className="h-4 w-4 flex-none text-muted-dim" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search name or notation…"
                    aria-label="Search algorithms"
                  />
                </div>
                <p className="text-[0.7rem] text-muted-dim">
                  {activeCategory?.description ?? "Every algorithm in the library."}
                </p>
              </div>
            </div>

            <div className="divider-dashed my-3.5" />

            {filtered.length === 0 ? (
              <div className="empty-state py-12">
                <Search className="h-6 w-6 opacity-40" />
                <p className="font-medium text-white">
                  {query
                    ? `No algorithms match “${query}” in ${activeCategory?.label ?? "All"}.`
                    : `No algorithms in ${activeCategory?.label ?? "All"} match the current filters.`}
                </p>
                <p>Try another search term or clear the category filter.</p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2">
                {filtered.map((algorithm) => {
                  const isSelected = algorithm.id === selectedId;
                  return (
                    <article
                      key={algorithm.id}
                      className={cn(
                        "algorithm-card",
                        isSelected && "border-violet-400/40 bg-violet-500/[0.045]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="truncate text-sm font-semibold text-white">
                            {algorithm.name}
                          </h2>
                          <p className="meta-label mt-0.5">
                            {algorithm.category}
                          </p>
                        </div>
                        <Badge tone={difficultyTone(algorithm.difficulty)}>
                          {algorithm.difficulty}
                        </Badge>
                      </div>

                      <div className="algorithm-notation">{algorithm.notation}</div>
                      <p className="flex-1 text-xs leading-relaxed text-muted">
                        {algorithm.description}
                      </p>
                      {algorithm.note ? (
                        <p className="text-[0.66rem] leading-relaxed text-muted-dim">
                          {algorithm.note}
                        </p>
                      ) : null}
                      <div className="flex items-center gap-2">
                        <Button
                          variant={isSelected ? "primary" : "secondary"}
                          size="sm"
                          className="flex-1"
                          onClick={() => playAlgorithm(algorithm)}
                          aria-pressed={isSelected}
                        >
                          <Play className="h-3.5 w-3.5" />
                          {isSelected ? "Replay demo" : "Play demo"}
                        </Button>
                        <button
                          type="button"
                          className="icon-btn icon-btn--sm"
                          aria-label={`Copy ${algorithm.name} notation`}
                          title="Copy notation"
                          onClick={() => void copyAlgorithm(algorithm)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.7rem] text-muted-dim">
              Showing {filtered.length} of {ALGORITHMS.length} algorithms.
            </p>
            <Link to="/" className="link-btn">
              Solve a real cube
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <section className="mt-16">
        <SectionHeading
          eyebrow="How to use this"
          title="Load the case, then watch the shape change."
          description="Algorithms are tools with setup conditions. The demo shows the moves honestly; recognising when to reach for them is the real skill."
        />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Read before you play",
              body: "Say the notation out loud — face letter, then prime or double. If you cannot read it, the animation will look like magic.",
            },
            {
              title: "Watch the rhythm",
              body: "Triggers are grouped for a reason. Notice where a sexy move or sledgehammer hides inside a longer case.",
            },
            {
              title: "Practise the setup",
              body: "A great algorithm applied to the wrong case is just noise. Learn the recognition pattern before the speed.",
            },
          ].map((item) => (
            <div key={item.title} className="surface p-5">
              <h3 className="text-sm font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
