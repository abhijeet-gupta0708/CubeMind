import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { applyMove, invertMove, moveLabel } from "../lib/cube/moves";
import {
  createSolvedCube,
  cubeToFacelets,
  isCubeSolved,
  paintFacelet,
} from "../lib/cube/cubie";
import type { CubeState, Move, MoveAmount, MoveFace, StickerColor } from "../lib/cube/types";

export type MoveSource =
  | "user"
  | "solution"
  | "solution-back"
  | "scramble"
  | "undo"
  | "redo";

export interface QueuedMove {
  id: string;
  move: Move;
  source: MoveSource;
  duration: number;
  solutionIndex?: number;
  originalMove?: Move;
}

export interface ActiveAnimation extends QueuedMove {
  cubeBefore: CubeState;
}

export interface HistoryEntry {
  id: string;
  label: string;
  source: MoveSource;
  at: number;
}

export interface SolutionState {
  moves: Move[];
  raw: string[];
  index: number;
  playing: boolean;
  startCube: CubeState;
  verified: boolean;
  apiElapsedMs: number;
  apiNodes: number;
  normalized: boolean;
  completed: boolean;
  completedMs: number | null;
  verificationError: string | null;
}

export interface TimerState {
  startedAt: number | null;
  baseMs: number;
  running: boolean;
  lastMs: number | null;
}

export interface WorkspaceState {
  cube: CubeState;
  queue: QueuedMove[];
  animation: ActiveAnimation | null;
  history: HistoryEntry[];
  past: Move[];
  future: Move[];
  solution: SolutionState | null;
  scramble: Move[] | null;
  scramblePreset: string;
  moveCount: number;
  timer: TimerState;
  solved: boolean;
  celebrate: boolean;
  sequence: number;
}

const LAST_TIME_KEY = "cubemind:last-time";

function readLastTime(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LAST_TIME_KEY);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function initialTimer(): TimerState {
  return {
    startedAt: null,
    baseMs: 0,
    running: false,
    lastMs: readLastTime(),
  };
}

function initialState(): WorkspaceState {
  return {
    cube: createSolvedCube(),
    queue: [],
    animation: null,
    history: [],
    past: [],
    future: [],
    solution: null,
    scramble: null,
    scramblePreset: "medium",
    moveCount: 0,
    timer: initialTimer(),
    solved: true,
    celebrate: false,
    sequence: 0,
  };
}

// Educational turns include a short camera-focus phase before the layer moves.
// Scrambles stay quick because they are not meant to be followed move by move.
const DURATION: Record<MoveSource, number> = {
  user: 340,
  solution: 420,
  "solution-back": 340,
  scramble: 82,
  undo: 300,
  redo: 300,
};

function beginNext(state: WorkspaceState): WorkspaceState {
  if (state.animation || state.queue.length === 0) return state;
  const [next, ...rest] = state.queue;
  if (!next) return state;
  return {
    ...state,
    queue: rest,
    animation: { ...next, cubeBefore: state.cube },
  };
}

function startTimer(state: WorkspaceState, now: number): TimerState {
  if (state.timer.running) return state.timer;
  return {
    ...state.timer,
    baseMs: state.solved ? 0 : state.timer.baseMs,
    startedAt: now,
    running: true,
  };
}

function enqueue(
  state: WorkspaceState,
  source: MoveSource,
  move: Move,
  extra: { solutionIndex?: number; originalMove?: Move } = {},
  now = Date.now(),
): WorkspaceState {
  const queued: QueuedMove = {
    id: `move-${state.sequence + 1}`,
    move,
    source,
    duration: DURATION[source],
    ...extra,
  };
  let next: WorkspaceState = {
    ...state,
    sequence: state.sequence + 1,
    queue: [...state.queue, queued],
  };
  if (source === "user" || source === "solution") {
    next = { ...next, timer: startTimer(next, now) };
  }
  return beginNext(next);
}

function resetTimer(timer: TimerState): TimerState {
  return { ...timer, startedAt: null, baseMs: 0, running: false };
}

type Action =
  | { type: "TURN"; face: MoveFace; amount: MoveAmount }
  | { type: "FINISH"; token: string }
  | { type: "SCRAMBLE"; moves: Move[]; preset: string }
  | { type: "RESET" }
  | { type: "LOAD_CUBE"; cube: CubeState }
  | { type: "PAINT"; index: number; color: StickerColor }
  | {
      type: "PAINT_MANY";
      entries: ReadonlyArray<{ index: number; color: StickerColor }>;
    }
  | { type: "UNDO" }
  | { type: "REDO" }
  | {
      type: "SOLUTION_LOADED";
      moves: Move[];
      raw: string[];
      verified: boolean;
      apiElapsedMs: number;
      apiNodes: number;
      normalized: boolean;
    }
  | { type: "SOLUTION_NEXT" }
  | { type: "SOLUTION_PREV" }
  | { type: "SOLUTION_PLAY" }
  | { type: "SOLUTION_PAUSE" }
  | { type: "SOLUTION_RESTART" }
  | { type: "SOLUTION_EXIT" }
  | { type: "TIMER_TOGGLE" }
  | { type: "TIMER_RESET" }
  | { type: "DISMISS_CELEBRATION" };

function isScrambleActive(state: WorkspaceState): boolean {
  return (
    state.animation?.source === "scramble" ||
    state.queue.some((item) => item.source === "scramble")
  );
}

function nextSolutionMove(state: WorkspaceState): WorkspaceState {
  const solution = state.solution;
  if (!solution || solution.completed || solution.index >= solution.moves.length) {
    return state;
  }
  if (state.animation || state.queue.length > 0) return state;
  const move = solution.moves[solution.index];
  if (!move) return state;
  return enqueue(state, "solution", move, { solutionIndex: solution.index });
}

function previousSolutionMove(state: WorkspaceState): WorkspaceState {
  const solution = state.solution;
  if (!solution || solution.index <= 0) return state;
  if (state.animation || state.queue.length > 0) return state;
  const move = solution.moves[solution.index - 1];
  if (!move) return state;
  let base = state;
  if (solution.completed) {
    base = {
      ...state,
      timer: resetTimer(state.timer),
      solved: isCubeSolved(state.cube),
    };
  }
  return enqueue(base, "solution-back", invertMove(move), {
    solutionIndex: solution.index - 1,
  });
}

function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case "TURN": {
      if (isScrambleActive(state)) return state;
      if (state.animation?.source === "solution" || state.solution?.playing) {
        return state;
      }
      let base = state;
      if (state.solution) {
        base = { ...state, solution: null, celebrate: false, past: [], future: [] };
      }
      return enqueue(base, "user", { face: action.face, amount: action.amount });
    }

    case "FINISH": {
      const anim = state.animation;
      if (!anim || anim.id !== action.token) return state;
      const now = Date.now();
      const cube = applyMove(anim.cubeBefore, anim.move);
      const solved = isCubeSolved(cube);

      let timer = state.timer;
      let elapsed =
        timer.baseMs + (timer.running && timer.startedAt ? now - timer.startedAt : 0);
      if (solved && (timer.running || timer.startedAt !== null || timer.baseMs > 0)) {
        timer = {
          ...timer,
          startedAt: null,
          baseMs: elapsed,
          running: false,
          lastMs: elapsed,
        };
        elapsed = timer.baseMs;
      }

      let past = state.past;
      let future = state.future;
      let moveCount = state.moveCount;
      switch (anim.source) {
        case "user":
          past = [...past, anim.move];
          future = [];
          moveCount += 1;
          break;
        case "solution":
          moveCount += 1;
          break;
        case "solution-back":
          moveCount = Math.max(0, moveCount - 1);
          break;
        case "undo":
          past = past.slice(0, -1);
          if (anim.originalMove) future = [...future, anim.originalMove];
          moveCount = Math.max(0, moveCount - 1);
          break;
        case "redo":
          if (anim.originalMove) past = [...past, anim.originalMove];
          future = future.slice(0, -1);
          moveCount += 1;
          break;
        case "scramble":
          break;
      }

      const history =
        anim.source === "scramble"
          ? state.history
          : [
              ...state.history,
              {
                id: anim.id,
                label: moveLabel(anim.originalMove ?? anim.move),
                source: anim.source === "solution-back" ? "solution" : anim.source,
                at: now,
              },
            ].slice(-120);

      let solution = state.solution;
      let celebrate = state.celebrate;
      if (solution) {
        if (anim.source === "solution" && anim.solutionIndex !== undefined) {
          const index = anim.solutionIndex + 1;
          const complete = index >= solution.moves.length;
          const completedSolved = complete && solved;
          solution = {
            ...solution,
            index,
            completed: completedSolved,
            completedMs: completedSolved ? timer.baseMs || elapsed : null,
            verificationError:
              complete && !solved
                ? "The cube did not reach a solved state. Restart the solution and try again."
                : null,
            playing: complete ? false : solution.playing,
          };
          if (completedSolved) celebrate = true;
        } else if (
          anim.source === "solution-back" &&
          anim.solutionIndex !== undefined
        ) {
          solution = {
            ...solution,
            index: anim.solutionIndex,
            completed: false,
            completedMs: null,
            verificationError: null,
            playing: false,
          };
        }
      }

      let next: WorkspaceState = {
        ...state,
        cube,
        animation: null,
        history,
        past,
        future,
        moveCount,
        timer,
        solved,
        solution,
        celebrate,
      };

      if (
        solution &&
        anim.source === "solution" &&
        solution.playing &&
        !solution.completed &&
        solution.index < solution.moves.length
      ) {
        const following = solution.moves[solution.index];
        if (following) {
          next = enqueue(next, "solution", following, {
            solutionIndex: solution.index,
          });
        }
      }

      return beginNext(next);
    }

    case "SCRAMBLE": {
      if (state.animation || state.queue.length > 0) return state;
      let next: WorkspaceState = {
        ...state,
        cube: createSolvedCube(),
        animation: null,
        queue: [],
        solution: null,
        history: [],
        past: [],
        future: [],
        moveCount: 0,
        solved: false,
        scramble: action.moves,
        scramblePreset: action.preset,
        celebrate: false,
        timer: resetTimer(state.timer),
      };
      for (const move of action.moves) {
        const queued: QueuedMove = {
          id: `move-${next.sequence + 1}`,
          move,
          source: "scramble",
          duration: DURATION.scramble,
        };
        next = {
          ...next,
          sequence: next.sequence + 1,
          queue: [...next.queue, queued],
        };
      }
      if (action.moves.length === 0) {
        return { ...next, solved: true };
      }
      return beginNext({ ...next, timer: { ...next.timer, startedAt: null, running: false } });
    }

    case "RESET":
      return {
        ...state,
        cube: createSolvedCube(),
        queue: [],
        animation: null,
        solution: null,
        scramble: null,
        history: [],
        past: [],
        future: [],
        moveCount: 0,
        solved: true,
        celebrate: false,
        timer: resetTimer(state.timer),
      };

    case "LOAD_CUBE":
    case "PAINT":
    case "PAINT_MANY": {
      if (state.animation || state.queue.length > 0) return state;
      let cube = state.cube;
      if (action.type === "LOAD_CUBE") {
        cube = action.cube;
      } else if (action.type === "PAINT") {
        cube = paintFacelet(state.cube, action.index, action.color);
      } else {
        cube = action.entries.reduce(
          (current, entry) => paintFacelet(current, entry.index, entry.color),
          state.cube,
        );
      }
      return {
        ...state,
        cube,
        solution: null,
        scramble: null,
        history: [],
        past: [],
        future: [],
        moveCount: 0,
        solved: isCubeSolved(cube),
        celebrate: false,
        timer: resetTimer(state.timer),
      };
    }

    case "UNDO": {
      if (state.animation || state.queue.length > 0 || state.solution) return state;
      if (isScrambleActive(state) || state.past.length === 0) return state;
      const original = state.past[state.past.length - 1];
      if (!original) return state;
      return enqueue(state, "undo", invertMove(original), { originalMove: original });
    }

    case "REDO": {
      if (state.animation || state.queue.length > 0 || state.solution) return state;
      if (state.future.length === 0) return state;
      const original = state.future[state.future.length - 1];
      if (!original) return state;
      return enqueue(state, "redo", original, { originalMove: original });
    }

    case "SOLUTION_LOADED": {
      if (state.animation || state.queue.length > 0) return state;
      const solved = isCubeSolved(state.cube);
      return {
        ...state,
        animation: null,
        queue: [],
        solution: {
          moves: action.moves,
          raw: action.raw,
          index: 0,
          playing: false,
          startCube: state.cube,
          verified: action.verified,
          apiElapsedMs: action.apiElapsedMs,
          apiNodes: action.apiNodes,
          normalized: action.normalized,
          completed: solved && action.moves.length === 0,
          completedMs: solved && action.moves.length === 0 ? 0 : null,
          verificationError: null,
        },
        history: [],
        past: [],
        future: [],
        moveCount: 0,
        timer: resetTimer(state.timer),
        solved,
        celebrate: false,
      };
    }

    case "SOLUTION_NEXT":
      if (state.solution?.playing) return state;
      return nextSolutionMove(state);

    case "SOLUTION_PREV":
      return previousSolutionMove(state);

    case "SOLUTION_PLAY": {
      if (!state.solution || state.solution.completed) return state;
      if (state.animation || state.queue.length > 0) {
        return { ...state, solution: { ...state.solution, playing: true } };
      }
      const playing = { ...state, solution: { ...state.solution, playing: true } };
      return nextSolutionMove(playing);
    }

    case "SOLUTION_PAUSE":
      if (!state.solution) return state;
      return { ...state, solution: { ...state.solution, playing: false } };

    case "SOLUTION_RESTART": {
      if (!state.solution || state.animation || state.queue.length > 0) return state;
      const solution = state.solution;
      return {
        ...state,
        cube: solution.startCube,
        solution: {
          ...solution,
          index: 0,
          playing: false,
          completed: false,
          completedMs: null,
          verificationError: null,
        },
        history: [],
        past: [],
        future: [],
        moveCount: 0,
        solved: isCubeSolved(solution.startCube),
        celebrate: false,
        timer: resetTimer(state.timer),
      };
    }

    case "SOLUTION_EXIT": {
      if (!state.solution) return state;
      return {
        ...state,
        solution: null,
        celebrate: false,
        timer: {
          ...state.timer,
          startedAt: null,
          baseMs:
            state.timer.baseMs +
            (state.timer.running && state.timer.startedAt
              ? Date.now() - state.timer.startedAt
              : 0),
          running: false,
        },
      };
    }

    case "TIMER_TOGGLE": {
      const now = Date.now();
      if (state.timer.running && state.timer.startedAt) {
        const elapsed = state.timer.baseMs + now - state.timer.startedAt;
        return {
          ...state,
          timer: {
            ...state.timer,
            baseMs: elapsed,
            startedAt: null,
            running: false,
            lastMs: elapsed,
          },
        };
      }
      return {
        ...state,
        timer: {
          ...state.timer,
          startedAt: now,
          running: true,
        },
      };
    }

    case "TIMER_RESET":
      return { ...state, timer: resetTimer(state.timer) };

    case "DISMISS_CELEBRATION":
      return { ...state, celebrate: false };

    default:
      return state;
  }
}

export interface WorkspaceActions {
  turn(face: MoveFace, amount: MoveAmount): void;
  finish(token: string): void;
  scramble(moves: Move[], preset: string): void;
  reset(): void;
  undo(): void;
  redo(): void;
  loadCube(cube: CubeState): void;
  paint(index: number, color: StickerColor): void;
  paintMany(entries: ReadonlyArray<{ index: number; color: StickerColor }>): void;
  loadSolution(input: {
    moves: Move[];
    raw: string[];
    verified: boolean;
    apiElapsedMs: number;
    apiNodes: number;
    normalized: boolean;
  }): void;
  solutionNext(): void;
  solutionPrev(): void;
  solutionPlay(): void;
  solutionPause(): void;
  solutionRestart(): void;
  solutionExit(): void;
  timerToggle(): void;
  timerReset(): void;
  dismissCelebration(): void;
}

interface WorkspaceValue {
  state: WorkspaceState;
  actions: WorkspaceActions;
  busy: boolean;
  scrambling: boolean;
  facelets: string;
  elapsedMs: number;
  canUndo: boolean;
  canRedo: boolean;
  currentSolutionMove: Move | null;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function useTimerValue(timer: TimerState): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!timer.running || !timer.startedAt) return;
    setNow(Date.now());
    const handle = window.setInterval(() => setNow(Date.now()), 50);
    return () => window.clearInterval(handle);
  }, [timer.running, timer.startedAt]);
  if (!timer.running || !timer.startedAt) return timer.baseMs;
  return timer.baseMs + Math.max(0, now - timer.startedAt);
}

export function CubeWorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const elapsedMs = useTimerValue(state.timer);

  useEffect(() => {
    if (state.timer.lastMs !== null) {
      window.localStorage.setItem(LAST_TIME_KEY, String(state.timer.lastMs));
    }
  }, [state.timer.lastMs]);

  const actions = useMemo<WorkspaceActions>(
    () => ({
      turn: (face, amount) => dispatch({ type: "TURN", face, amount }),
      finish: (token) => dispatch({ type: "FINISH", token }),
      scramble: (moves, preset) => dispatch({ type: "SCRAMBLE", moves, preset }),
      reset: () => dispatch({ type: "RESET" }),
      undo: () => dispatch({ type: "UNDO" }),
      redo: () => dispatch({ type: "REDO" }),
      loadCube: (cube) => dispatch({ type: "LOAD_CUBE", cube }),
      paint: (index, color) => dispatch({ type: "PAINT", index, color }),
      paintMany: (entries) => dispatch({ type: "PAINT_MANY", entries }),
      loadSolution: (input) =>
        dispatch({
          type: "SOLUTION_LOADED",
          moves: input.moves,
          raw: input.raw,
          verified: input.verified,
          apiElapsedMs: input.apiElapsedMs,
          apiNodes: input.apiNodes,
          normalized: input.normalized,
        }),
      solutionNext: () => dispatch({ type: "SOLUTION_NEXT" }),
      solutionPrev: () => dispatch({ type: "SOLUTION_PREV" }),
      solutionPlay: () => dispatch({ type: "SOLUTION_PLAY" }),
      solutionPause: () => dispatch({ type: "SOLUTION_PAUSE" }),
      solutionRestart: () => dispatch({ type: "SOLUTION_RESTART" }),
      solutionExit: () => dispatch({ type: "SOLUTION_EXIT" }),
      timerToggle: () => dispatch({ type: "TIMER_TOGGLE" }),
      timerReset: () => dispatch({ type: "TIMER_RESET" }),
      dismissCelebration: () => dispatch({ type: "DISMISS_CELEBRATION" }),
    }),
    [],
  );

  const busy = Boolean(state.animation) || state.queue.length > 0;
  const scrambling =
    state.animation?.source === "scramble" ||
    state.queue.some((item) => item.source === "scramble");
  const facelets = useMemo(() => cubeToFacelets(state.cube), [state.cube]);
  const solution = state.solution;
  const currentSolutionMove =
    solution && solution.index < solution.moves.length
      ? solution.moves[solution.index] ?? null
      : null;

  const value = useMemo<WorkspaceValue>(
    () => ({
      state,
      actions,
      busy,
      scrambling,
      facelets,
      elapsedMs,
      canUndo: state.past.length > 0 && !busy && !solution && !scrambling,
      canRedo: state.future.length > 0 && !busy && !solution && !scrambling,
      currentSolutionMove,
    }),
    [
      state,
      actions,
      busy,
      scrambling,
      facelets,
      elapsedMs,
      solution,
      currentSolutionMove,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useCubeWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useCubeWorkspace must be used inside CubeWorkspaceProvider.");
  }
  return value;
}
