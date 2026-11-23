import { useCallback, useEffect, useRef, useState } from "react";
import { applyMove } from "../lib/cube/moves";
import { createSolvedCube } from "../lib/cube/cubie";
import type { CubeState, Move } from "../lib/cube/types";
import type { CubeAnimation } from "./CubeCanvas";

export function useDemoCube(speed = 300) {
  const [cube, setCube] = useState<CubeState>(createSolvedCube);
  const [queue, setQueue] = useState<Move[]>([]);
  const [animation, setAnimation] = useState<CubeAnimation | null>(null);
  const animationRef = useRef<CubeAnimation | null>(null);

  useEffect(() => {
    animationRef.current = animation;
  }, [animation]);

  useEffect(() => {
    if (animation || queue.length === 0) return;
    const next = queue[0];
    if (!next) return;
    const id = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setQueue((current) => current.slice(1));
    setAnimation({ id, move: next, cubeBefore: cube, duration: speed });
  }, [animation, queue, cube, speed]);

  const finish = useCallback((id: string) => {
    const current = animationRef.current;
    if (!current || current.id !== id) return;
    animationRef.current = null;
    setCube((state) => applyMove(state, current.move));
    setAnimation(null);
  }, []);

  const play = useCallback((moves: Move[]) => {
    animationRef.current = null;
    setAnimation(null);
    setCube(createSolvedCube());
    setQueue([...moves]);
  }, []);

  const turn = useCallback((move: Move) => {
    setQueue((current) => [...current, move]);
  }, []);

  const reset = useCallback(() => {
    animationRef.current = null;
    setAnimation(null);
    setQueue([]);
    setCube(createSolvedCube());
  }, []);

  return {
    cube,
    animation,
    finish,
    play,
    turn,
    reset,
    busy: animation !== null || queue.length > 0,
    queued: queue.length,
  };
}
