import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { MOVE_DEFINITIONS, signedQuarterTurns } from "../lib/cube/moves";
import { normalVector } from "../lib/cube/math";
import { FACE_COLORS } from "../lib/cube/types";
import type { CubeState, Cubie, Mat3, Move, NormalKey } from "../lib/cube/types";
import { cn } from "./ui";

const SPACING = 1;
const BODY_SIZE = 0.95;
const STICKER_SIZE = 0.76;
const STICKER_OFFSET = BODY_SIZE / 2 + 0.006;

const NORMAL_KEYS: readonly NormalKey[] = ["+x", "-x", "+y", "-y", "+z", "-z"];

const STICKER_ROTATIONS: Record<NormalKey, [number, number, number]> = {
  "+x": [0, Math.PI / 2, 0],
  "-x": [0, -Math.PI / 2, 0],
  "+y": [-Math.PI / 2, 0, 0],
  "-y": [Math.PI / 2, 0, 0],
  "+z": [0, 0, 0],
  "-z": [0, Math.PI, 0],
};

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
  className?: string;
  ariaLabel?: string;
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

function CubieMesh({ cubie }: { cubie: Cubie }) {
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
        <meshStandardMaterial color="#090a0d" roughness={0.62} metalness={0.22} />
      </RoundedBox>
      {NORMAL_KEYS.map((key) => {
        const color = cubie.stickers[key];
        if (!color) return null;
        const normal = normalVector(key);
        return (
          <mesh
            key={key}
            position={[
              normal[0] * STICKER_OFFSET,
              normal[1] * STICKER_OFFSET,
              normal[2] * STICKER_OFFSET,
            ]}
            rotation={STICKER_ROTATIONS[key]}
          >
            <planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
            <meshStandardMaterial
              color={FACE_COLORS[color]}
              roughness={0.34}
              metalness={0.04}
              emissive={FACE_COLORS[color]}
              emissiveIntensity={0.045}
              side={THREE.FrontSide}
            />
          </mesh>
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

function CameraRig({
  autoRotate,
  resetSignal,
}: {
  autoRotate: boolean;
  resetSignal: number;
}) {
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    camera.position.set(4.9, 4.25, 6.7);
    camera.lookAt(0, 0, 0);
  }, [camera, resetSignal]);

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
      autoRotate={autoRotate}
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
}: {
  cube: CubeState;
  animation: CubeAnimation | null;
  onAnimationEnd: (id: string) => void;
  autoRotate: boolean;
  resetSignal: number;
}) {
  const movingRef = useRef<THREE.Group>(null);
  const startRef = useRef(0);
  const finishedRef = useRef<string | null>(null);
  const endRef = useRef(onAnimationEnd);

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
    }, animation.duration + 40);
    return () => window.clearTimeout(handle);
  }, [animation?.id, animation?.duration]);

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
    const raw = Math.min(1, Math.max(0, (performance.now() - startRef.current) / animation.duration));
    const eased = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
    const angle = (signedQuarterTurns(animation.move) * Math.PI * eased) / 2;
    const rotation = movingRef.current.rotation;
    rotation.set(0, 0, 0);
    if (definition.axis === 0) rotation.x = angle;
    else if (definition.axis === 1) rotation.y = angle;
    else rotation.z = angle;

    if (raw >= 1 && finishedRef.current !== animation.id) {
      finishedRef.current = animation.id;
      endRef.current(animation.id);
    }
  });

  return (
    <>
      <CameraRig autoRotate={autoRotate} resetSignal={resetSignal} />
      <ambientLight intensity={0.82} />
      <hemisphereLight args={["#cfd6ff", "#15161c", 0.55]} />
      <directionalLight position={[6, 9, 7]} intensity={1.55} color="#ffffff" />
      <directionalLight position={[-7, 3.5, -5]} intensity={0.62} color="#8b7cff" />
      <directionalLight position={[2, -6, 4]} intensity={0.38} color="#57d6e8" />
      <pointLight position={[0, 4.5, 4.5]} intensity={12} distance={16} color="#dfe4ff" />

      <StageScale>
        <group position={[0, 0, 0]}>
          {staticCubies.map((cubie) => (
            <CubieMesh key={cubie.id} cubie={cubie} />
          ))}
          <group ref={movingRef}>
            {movingCubies.map((cubie) => (
              <CubieMesh key={cubie.id} cubie={cubie} />
            ))}
          </group>
        </group>
        <ContactShadows
          position={[0, -2.15, 0]}
          opacity={0.48}
          scale={11}
          blur={2.6}
          far={4}
          resolution={512}
          color="#000000"
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
  className,
  ariaLabel = "Interactive 3D Rubik's Cube. Drag to rotate and scroll to zoom.",
}: CubeCanvasProps) {
  const handleEnd = onAnimationEnd ?? (() => undefined);

  return (
    <div className={cn("cube-stage__canvas", className)} role="img" aria-label={ariaLabel}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [4.9, 4.25, 6.7], fov: 32, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.08;
        }}
      >
        <CubeScene
          cube={cube}
          animation={animation}
          onAnimationEnd={handleEnd}
          autoRotate={autoRotate}
          resetSignal={resetSignal}
        />
      </Canvas>
    </div>
  );
}
