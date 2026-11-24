import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { MOVE_DEFINITIONS, signedQuarterTurns } from "../lib/cube/moves";
import { normalVector } from "../lib/cube/math";
import { prefersReducedMotion } from "../lib/motion";
import { FACE_COLORS } from "../lib/cube/types";
import type {
  CubeState,
  Cubie,
  Mat3,
  Move,
  MoveFace,
  NormalKey,
} from "../lib/cube/types";
import { cn } from "./ui";

const SPACING = 1;
const BODY_SIZE = 0.95;
const STICKER_SIZE = 0.76;
const STICKER_OFFSET = BODY_SIZE / 2 + 0.006;
const FOCUS_OUTLINE = STICKER_SIZE + 0.075;
const FOCUS_LIFT = 0.004;

/** Human-readable face names used by the stage cue and camera focus. */
export const FACE_NAMES: Record<MoveFace, string> = {
  U: "upper",
  D: "lower",
  L: "left",
  R: "right",
  F: "front",
  B: "back",
  M: "middle",
  E: "equator",
  S: "standing",
  x: "whole cube",
  y: "whole cube",
  z: "whole cube",
};

/**
 * Spherical views used before a turn. A slight oblique angle keeps the cube
 * legible while bringing the moving face, slice or axis into clear view.
 */
const FOCUS_VIEWS: Partial<Record<MoveFace, { theta: number; phi: number }>> = {
  U: { theta: 0.42, phi: 0.46 },
  D: { theta: 0.42, phi: Math.PI - 0.46 },
  R: { theta: Math.PI / 2, phi: 1.08 },
  L: { theta: -Math.PI / 2, phi: 1.08 },
  F: { theta: 0, phi: 1.08 },
  B: { theta: Math.PI, phi: 1.08 },
  M: { theta: Math.PI / 2.6, phi: 1.04 },
  E: { theta: 0.42, phi: 0.58 },
  S: { theta: 0.28, phi: 1.04 },
  x: { theta: Math.PI / 2, phi: 1.04 },
  y: { theta: 0.42, phi: 0.58 },
  z: { theta: 0.28, phi: 1.04 },
};

const NORMAL_KEYS: readonly NormalKey[] = ["+x", "-x", "+y", "-y", "+z", "-z"];

const STICKER_ROTATIONS: Record<NormalKey, [number, number, number]> = {
  "+x": [0, Math.PI / 2, 0],
  "-x": [0, -Math.PI / 2, 0],
  "+y": [-Math.PI / 2, 0, 0],
  "-y": [Math.PI / 2, 0, 0],
  "+z": [0, 0, 0],
  "-z": [0, Math.PI, 0],
};

export type ViewCommand =
  | { id: number; kind: "orbit"; dx: number; dy: number }
  | { id: number; kind: "zoom"; factor: number };

export interface CubeAnimation {
  id: string;
  move: Move;
  cubeBefore: CubeState;
  duration: number;
}

export interface CubeCanvasProps {
  cube: CubeState;
  animation?: CubeAnimation | null;
  onAnimationEnd?: (id: string) => void;
  autoRotate?: boolean;
  resetSignal?: number;
  viewCommand?: ViewCommand | null;
  light?: boolean;
  className?: string;
  ariaLabel?: string;
}

function shortestAngle(from: number, to: number): number {
  const delta = ((to - from + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return from + delta;
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

function quaternionFromMatrix(matrix: Mat3): THREE.Quaternion {
  const m4 = new THREE.Matrix4();
  m4.set(
    matrix[0],
    matrix[1],
    matrix[2],
    0,
    matrix[3],
    matrix[4],
    matrix[5],
    0,
    matrix[6],
    matrix[7],
    matrix[8],
    0,
    0,
    0,
    0,
    1,
  );
  return new THREE.Quaternion().setFromRotationMatrix(m4);
}

function CubieMesh({
  cubie,
  light,
  highlight = false,
}: {
  cubie: Cubie;
  light: boolean;
  highlight?: boolean;
}) {
  const quaternion = useMemo(() => quaternionFromMatrix(cubie.rotation), [cubie.rotation]);
  const position = useMemo<[number, number, number]>(
    () => [
      cubie.position[0] * SPACING,
      cubie.position[1] * SPACING,
      cubie.position[2] * SPACING,
    ],
    [cubie.position],
  );

  return (
    <group position={position} quaternion={quaternion}>
      <RoundedBox
        args={[BODY_SIZE, BODY_SIZE, BODY_SIZE]}
        radius={0.085}
        smoothness={3}
        creaseAngle={0.5}
      >
        <meshStandardMaterial
          color={highlight ? (light ? "#f3f4e4" : "#18251d") : light ? "#e7e9f1" : "#090a0d"}
          roughness={light ? 0.72 : 0.62}
          metalness={light ? 0.02 : 0.22}
        />
      </RoundedBox>
      {NORMAL_KEYS.map((key) => {
        const color = cubie.stickers[key];
        if (!color) return null;
        const normal = normalVector(key);
        const outlineOffset = STICKER_OFFSET;
        const stickerOffset = STICKER_OFFSET + (highlight ? FOCUS_LIFT : 0);
        return (
          <group key={key}>
            {highlight ? (
              <mesh
                position={[
                  normal[0] * outlineOffset,
                  normal[1] * outlineOffset,
                  normal[2] * outlineOffset,
                ]}
                rotation={STICKER_ROTATIONS[key]}
              >
                <planeGeometry args={[FOCUS_OUTLINE, FOCUS_OUTLINE]} />
                <meshBasicMaterial
                  color={light ? "#b98b09" : "#f5cc45"}
                  transparent
                  opacity={light ? 0.85 : 0.9}
                  depthWrite={false}
                  side={THREE.FrontSide}
                />
              </mesh>
            ) : null}
            <mesh
              position={[
                normal[0] * stickerOffset,
                normal[1] * stickerOffset,
                normal[2] * stickerOffset,
              ]}
              rotation={STICKER_ROTATIONS[key]}
            >
              <planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
              <meshStandardMaterial
                color={FACE_COLORS[color]}
                roughness={light ? 0.46 : 0.34}
                metalness={light ? 0 : 0.04}
                emissive={FACE_COLORS[color]}
                emissiveIntensity={highlight ? (light ? 0.1 : 0.2) : light ? 0 : 0.045}
                side={THREE.FrontSide}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function StageScale({ children }: { children: ReactNode }) {
  const width = useThree((state) => state.size.width);
  const scale = Math.min(1, Math.max(0.6, width / 640));
  return <group scale={scale}>{children}</group>;
}

const CAMERA_TARGET = new THREE.Vector3(0, 0.05, 0);
const CAMERA_HOME = new THREE.Vector3(4.9, 4.25, 6.7);
const MIN_DISTANCE = 5.4;
const MAX_DISTANCE = 12.5;

type ControlsLike = { update: () => void; enabled: boolean };

interface CameraFocus {
  token: string;
  duration: number;
  startedAt: number;
  fromTheta: number;
  toTheta: number;
  fromPhi: number;
  toPhi: number;
  fromRadius: number;
  toRadius: number;
}

function orbitCamera(camera: THREE.Camera, dx: number, dy: number) {
  const offset = camera.position.clone().sub(CAMERA_TARGET);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  spherical.theta += dx;
  spherical.phi = THREE.MathUtils.clamp(spherical.phi + dy, 0.12, Math.PI - 0.12);
  offset.setFromSpherical(spherical);
  camera.position.copy(CAMERA_TARGET).add(offset);
  camera.lookAt(CAMERA_TARGET);
}

function zoomCamera(camera: THREE.Camera, factor: number) {
  const offset = camera.position.clone().sub(CAMERA_TARGET);
  offset.setLength(
    THREE.MathUtils.clamp(offset.length() * factor, MIN_DISTANCE, MAX_DISTANCE),
  );
  camera.position.copy(CAMERA_TARGET).add(offset);
  camera.lookAt(CAMERA_TARGET);
}

function CameraRig({
  autoRotate,
  resetSignal,
  viewCommand,
  focusFace,
  focusToken,
  focusDuration,
}: {
  autoRotate: boolean;
  resetSignal: number;
  viewCommand?: ViewCommand | null;
  focusFace?: MoveFace | null;
  focusToken?: string | null;
  focusDuration: number;
}) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as unknown as ControlsLike | null;
  const focusRef = useRef<CameraFocus | null>(null);
  const focusActive = Boolean(focusFace && focusToken && focusDuration > 0);

  useEffect(() => {
    camera.position.copy(CAMERA_HOME);
    camera.lookAt(CAMERA_TARGET);
  }, [camera, resetSignal]);

  useEffect(() => {
    if (!viewCommand || focusActive) return;
    if (viewCommand.kind === "orbit") orbitCamera(camera, viewCommand.dx, viewCommand.dy);
    else zoomCamera(camera, viewCommand.factor);
    controls?.update();
  }, [camera, controls, viewCommand, focusActive]);

  useEffect(() => {
    const view = focusFace ? FOCUS_VIEWS[focusFace] : null;
    if (!focusActive || !focusToken || !view) {
      focusRef.current = null;
      if (controls) controls.enabled = true;
      return;
    }

    const spherical = new THREE.Spherical().setFromVector3(
      camera.position.clone().sub(CAMERA_TARGET),
    );
    focusRef.current = {
      token: focusToken,
      duration: focusDuration,
      startedAt: performance.now(),
      fromTheta: spherical.theta,
      toTheta: shortestAngle(spherical.theta, view.theta),
      fromPhi: spherical.phi,
      toPhi: view.phi,
      fromRadius: spherical.radius,
      toRadius: THREE.MathUtils.clamp(spherical.radius, 6.2, 10.5),
    };
    if (controls) controls.enabled = false;

    return () => {
      if (controls) controls.enabled = true;
    };
  }, [camera, controls, focusActive, focusFace, focusToken, focusDuration]);

  useFrame(() => {
    const focus = focusRef.current;
    if (!focus) return;
    const raw = THREE.MathUtils.clamp(
      (performance.now() - focus.startedAt) / focus.duration,
      0,
      1,
    );
    const eased = easeOutCubic(raw);
    const spherical = new THREE.Spherical(
      THREE.MathUtils.lerp(focus.fromRadius, focus.toRadius, eased),
      THREE.MathUtils.lerp(focus.fromPhi, focus.toPhi, eased),
      THREE.MathUtils.lerp(focus.fromTheta, focus.toTheta, eased),
    );
    camera.position.copy(CAMERA_TARGET).add(new THREE.Vector3().setFromSpherical(spherical));
    camera.lookAt(CAMERA_TARGET);
    controls?.update();
    if (raw >= 1) focusRef.current = null;
  });

  return (
    <OrbitControls
      makeDefault
      target={[0, 0.05, 0]}
      enablePan={false}
      enableDamping
      dampingFactor={0.075}
      rotateSpeed={0.72}
      zoomSpeed={0.75}
      minDistance={5.4}
      maxDistance={12.5}
      autoRotate={autoRotate && !focusActive}
      autoRotateSpeed={0.55}
    />
  );
}

function CubeScene({
  cube,
  animation,
  onAnimationEnd,
  autoRotate,
  resetSignal,
  viewCommand,
  light,
}: {
  cube: CubeState;
  animation: CubeAnimation | null;
  onAnimationEnd: (id: string) => void;
  autoRotate: boolean;
  resetSignal: number;
  viewCommand?: ViewCommand | null;
  light: boolean;
}) {
  const movingRef = useRef<THREE.Group>(null);
  const startRef = useRef(0);
  const finishedRef = useRef<string | null>(null);
  const endRef = useRef(onAnimationEnd);
  const reducedMotion = prefersReducedMotion();
  const focusDuration =
    animation && !reducedMotion && animation.duration >= 200
      ? Math.min(220, Math.round(animation.duration * 0.38))
      : 0;
  const totalDuration = reducedMotion ? 1 : (animation?.duration ?? 0);
  const turnDuration = Math.max(1, totalDuration - focusDuration);

  useEffect(() => {
    endRef.current = onAnimationEnd;
  }, [onAnimationEnd]);

  useEffect(() => {
    startRef.current = performance.now();
    finishedRef.current = null;
    if (movingRef.current) movingRef.current.rotation.set(0, 0, 0);
  }, [animation?.id]);

  // Animation frames pause in background/occluded tabs. Commit the turn on a
  // wall-clock fallback so the cube state never falls behind the queue.
  useEffect(() => {
    if (!animation) return;
    const token = animation.id;
    const handle = window.setTimeout(() => {
      if (finishedRef.current === token) return;
      finishedRef.current = token;
      endRef.current(token);
    }, totalDuration + 40);
    return () => window.clearTimeout(handle);
  }, [animation?.id, totalDuration]);

  const definition = animation ? MOVE_DEFINITIONS[animation.move.face] : null;

  const { staticCubies, movingCubies } = useMemo(() => {
    const baseCube = animation ? animation.cubeBefore : cube;
    if (!definition) {
      return { staticCubies: baseCube.cubies, movingCubies: [] as readonly Cubie[] };
    }
    const staticList: Cubie[] = [];
    const movingList: Cubie[] = [];
    for (const cubie of baseCube.cubies) {
      if (
        definition.layers.includes(
          cubie.position[definition.axis] as -1 | 0 | 1,
        )
      ) {
        movingList.push(cubie);
      } else {
        staticList.push(cubie);
      }
    }
    return { staticCubies: staticList, movingCubies: movingList };
  }, [animation, cube, definition]);

  useFrame(() => {
    if (!animation || !definition || !movingRef.current) return;
    const elapsed = performance.now() - startRef.current;
    const raw = Math.min(1, Math.max(0, (elapsed - focusDuration) / turnDuration));
    const eased = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
    const angle = (signedQuarterTurns(animation.move) * Math.PI * eased) / 2;
    const rotation = movingRef.current.rotation;
    rotation.set(0, 0, 0);
    if (definition.axis === 0) rotation.x = angle;
    else if (definition.axis === 1) rotation.y = angle;
    else rotation.z = angle;

    if (elapsed >= totalDuration && finishedRef.current !== animation.id) {
      finishedRef.current = animation.id;
      endRef.current(animation.id);
    }
  });

  return (
    <>
      <CameraRig
        autoRotate={autoRotate}
        resetSignal={resetSignal}
        viewCommand={viewCommand}
        focusFace={animation?.move.face ?? null}
        focusToken={animation?.id ?? null}
        focusDuration={focusDuration}
      />
      <ambientLight intensity={light ? 1.25 : 0.82} />
      <hemisphereLight
        args={[light ? "#ffffff" : "#dbe9df", light ? "#d9ded3" : "#0e1512", light ? 0.7 : 0.55]}
      />
      <directionalLight
        position={[6, 9, 7]}
        intensity={light ? 1.15 : 1.55}
        color="#ffffff"
      />
      <directionalLight
        position={[-7, 3.5, -5]}
        intensity={light ? 0.35 : 0.62}
        color="#f5cc45"
      />
      <directionalLight
        position={[2, -6, 4]}
        intensity={light ? 0.2 : 0.38}
        color="#61b7e8"
      />
      <pointLight
        position={[0, 4.5, 4.5]}
        intensity={light ? 4 : 12}
        distance={16}
        color={light ? "#ffffff" : "#f3f1df"}
      />

      <StageScale>
        <group position={[0, 0, 0]}>
          {staticCubies.map((cubie) => (
            <CubieMesh key={cubie.id} cubie={cubie} light={light} />
          ))}
          <group ref={movingRef}>
            {movingCubies.map((cubie) => (
              <CubieMesh
                key={cubie.id}
                cubie={cubie}
                light={light}
                highlight={focusDuration > 0}
              />
            ))}
          </group>
        </group>
        <ContactShadows
          position={[0, -2.15, 0]}
          opacity={light ? 0.2 : 0.48}
          scale={11}
          blur={light ? 3.4 : 2.6}
          far={4}
          resolution={512}
          color={light ? "#7c8f82" : "#000000"}
        />
      </StageScale>
    </>
  );
}

export function CubeCanvas({
  cube,
  animation = null,
  onAnimationEnd,
  autoRotate = false,
  resetSignal = 0,
  viewCommand = null,
  light = false,
  className,
  ariaLabel = "Interactive 3D Rubik's Cube. Drag to rotate and scroll to zoom.",
}: CubeCanvasProps) {
  const handleEnd = onAnimationEnd ?? (() => undefined);
  const endRef = useRef(handleEnd);

  useEffect(() => {
    endRef.current = handleEnd;
  }, [handleEnd]);

  // Some hosts do not deliver the initial ResizeObserver callback that
  // react-three-fiber uses to size its canvas. A short resize nudge guarantees
  // the stage is measured without changing the observer's normal behaviour.
  useEffect(() => {
    const handles = [
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), 0),
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), 120),
    ];
    return () => handles.forEach((handle) => window.clearTimeout(handle));
  }, []);

  // Keep queue progression independent of WebGL/RAF: the state must advance
  // even when the browser pauses rendering. The scene's own callback is
  // idempotent, and reducers ignore stale tokens.
  useEffect(() => {
    if (!animation) return;
    const token = animation.id;
    const duration = prefersReducedMotion() ? 1 : animation.duration;
    const handle = window.setTimeout(() => endRef.current(token), duration + 80);
    return () => window.clearTimeout(handle);
  }, [animation?.id, animation?.duration]);

  return (
    <div
      className={cn("cube-stage__canvas", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [4.9, 4.25, 6.7], fov: 32, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = light ? 1 : 1.08;
        }}
      >
        <CubeScene
          cube={cube}
          animation={animation}
          onAnimationEnd={handleEnd}
          autoRotate={autoRotate}
          resetSignal={resetSignal}
          viewCommand={viewCommand}
          light={light}
        />
      </Canvas>
    </div>
  );
}
