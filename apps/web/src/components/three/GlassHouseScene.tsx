'use client';

import { Environment, Lightformer } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import type { MotionValue } from 'motion/react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { concreteTexture, plasterTexture } from './textures';

/*
 * The modern glass house from the Setu photo, built while the visitor scrolls: footing,
 * then each floor (slab, columns, glazing with warm interiors), then the cantilevered roof
 * and the rooftop block, in a sunset light.
 */

const FLOORS = 4;
const FH = 2.2; // floor height
const W = 11;
const D = 6;
const GROUND = 0.9; // height of the stone plinth the house sits on
const DARK = '#22262b';

/** Build progress 0-1 of a part that appears between `from` and `to` (both 0-1). */
const part = (p: number, from: number, to: number) =>
  THREE.MathUtils.clamp((p - from) / (to - from), 0, 1);
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** A group that drops into place and grows as its share of the build progresses. */
function Built({
  progress,
  from,
  to,
  children,
}: {
  progress: MotionValue<number>;
  from: number;
  to: number;
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const t = ease(part(progress.get(), from, to));
    g.visible = t > 0.001;
    g.scale.set(1, Math.max(t, 0.001), 1);
    g.position.y = (1 - t) * 1.5;
  });
  return <group ref={ref}>{children}</group>;
}

function Slab({ y, w = W, d = D, z = 0 }: { y: number; w?: number; d?: number; z?: number }) {
  return (
    <mesh position={[0, y, z]} castShadow receiveShadow>
      <boxGeometry args={[w, 0.22, d]} />
      <meshStandardMaterial color={DARK} roughness={0.5} metalness={0.3} />
    </mesh>
  );
}

/** One storey: columns, a glass curtain wall with mullions, warm rooms and a railing. */
function Storey({ level }: { level: number }) {
  const y0 = GROUND + level * FH;
  const glow = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffb35c',
        emissive: '#ff9a3c',
        emissiveIntensity: 0.9 - level * 0.12,
        roughness: 0.9,
      }),
    [level],
  );
  const mullions = Array.from({ length: 12 }, (_, i) => -W / 2 + 0.5 + i * ((W - 1) / 11));
  return (
    <group>
      {/* warm interior box behind the glass */}
      <mesh position={[0, y0 + FH / 2, -0.2]} material={glow}>
        <boxGeometry args={[W - 1, FH - 0.3, D - 1]} />
      </mesh>
      {/* glass curtain wall on the front and right side */}
      <mesh position={[0, y0 + FH / 2, D / 2 - 0.35]}>
        <planeGeometry args={[W - 0.9, FH - 0.25]} />
        <meshPhysicalMaterial
          color="#ffd7a3"
          roughness={0.05}
          metalness={0.2}
          transparent
          opacity={0.35}
          envMapIntensity={1.5}
        />
      </mesh>
      <mesh position={[W / 2 - 0.45, y0 + FH / 2, -0.2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[D - 1, FH - 0.25]} />
        <meshPhysicalMaterial
          color="#ffd7a3"
          roughness={0.05}
          metalness={0.2}
          transparent
          opacity={0.35}
        />
      </mesh>
      {mullions.map((x) => (
        <mesh key={x} position={[x, y0 + FH / 2, D / 2 - 0.32]} castShadow>
          <boxGeometry args={[0.07, FH - 0.2, 0.07]} />
          <meshStandardMaterial color={DARK} metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      {/* transom bar */}
      <mesh position={[0, y0 + FH - 0.55, D / 2 - 0.32]}>
        <boxGeometry args={[W - 0.9, 0.06, 0.06]} />
        <meshStandardMaterial color={DARK} metalness={0.6} roughness={0.35} />
      </mesh>
      {/* structural columns */}
      {[-W / 2 + 0.3, -1.2, W / 2 - 0.3].map((x) => (
        <mesh key={x} position={[x, y0 + FH / 2, D / 2 - 0.25]} castShadow>
          <boxGeometry args={[0.32, FH, 0.32]} />
          <meshStandardMaterial map={concreteTexture([1, 2])} color="#bfc3c7" roughness={0.7} />
        </mesh>
      ))}
      {/* balcony glass railing on the upper floors */}
      {level > 0 ? (
        <mesh position={[0, y0 + 0.5, D / 2 + 0.1]}>
          <planeGeometry args={[W - 0.2, 0.8]} />
          <meshPhysicalMaterial color="#cfe3ee" transparent opacity={0.25} roughness={0.05} />
        </mesh>
      ) : null}
      <Slab y={y0 + FH} w={W + 0.4} d={D + 0.6} z={0.1} />
    </group>
  );
}

/** Rounded tree silhouettes around the plot, as in the photo. */
function Trees() {
  const trees = useMemo(() => {
    const r = (n: number) => ((Math.sin(n * 91.7) + 1) / 2) * 1;
    return Array.from({ length: 22 }, (_, i) => {
      const a = (i / 22) * Math.PI * 2;
      const rad = 13 + r(i) * 5;
      return {
        p: [Math.cos(a) * rad, 0, Math.sin(a) * rad * 0.8] as [number, number, number],
        s: 0.7 + r(i + 3) * 1.1,
      };
    }).filter((t) => t.p[2] < 1);
  }, []);
  return (
    <group>
      {trees.map((t, i) => (
        <mesh key={i} position={[t.p[0], t.s, t.p[2]]} castShadow>
          <icosahedronGeometry args={[t.s, 1]} />
          <meshStandardMaterial color="#2c3a26" roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Building({ progress }: { progress: MotionValue<number> }) {
  // 0.00-0.12 plinth, 0.12-0.72 four storeys, 0.72-0.86 roof, 0.86-0.95 rooftop block
  const span = (0.72 - 0.12) / FLOORS;
  return (
    <group position={[0, 0, 0]}>
      <Built progress={progress} from={0} to={0.12}>
        <mesh position={[0, GROUND / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[W + 1, GROUND, D + 1.4]} />
          <meshStandardMaterial map={concreteTexture([3, 1])} color="#9a9ea3" roughness={0.9} />
        </mesh>
        {/* the side stair core in light stone */}
        <mesh position={[-W / 2 - 0.9, GROUND + FH, -0.8]} castShadow>
          <boxGeometry args={[1.6, FH * 2, 3]} />
          <meshStandardMaterial map={plasterTexture([1, 2])} color="#c8c9c7" roughness={0.8} />
        </mesh>
      </Built>
      {Array.from({ length: FLOORS }, (_, level) => (
        <Built
          key={level}
          progress={progress}
          from={0.12 + level * span}
          to={0.12 + (level + 1) * span}
        >
          <Storey level={level} />
        </Built>
      ))}
      <Built progress={progress} from={0.72} to={0.86}>
        {/* thin cantilevered roof plate */}
        <mesh position={[0, GROUND + FLOORS * FH + 0.3, 0.3]} castShadow>
          <boxGeometry args={[W + 2.6, 0.18, D + 2]} />
          <meshStandardMaterial color={DARK} roughness={0.4} metalness={0.4} />
        </mesh>
      </Built>
      <Built progress={progress} from={0.86} to={0.95}>
        <mesh position={[-1, GROUND + FLOORS * FH + 0.85, -1]} castShadow>
          <boxGeometry args={[2.2, 0.9, 1.4]} />
          <meshStandardMaterial map={concreteTexture([1, 1])} color="#8f9399" />
        </mesh>
      </Built>
    </group>
  );
}

function Rig({ progress }: { progress: MotionValue<number> }) {
  const target = useMemo(() => new THREE.Vector3(0, 4.2, 0), []);
  useFrame(({ camera, pointer }, dt) => {
    const p = progress.get();
    // starts low and close at the footing, rises and pulls back as the floors go up
    const angle = 0.55 - p * 0.35 + pointer.x * 0.06;
    // on narrow (phone) screens, back off until the whole building fits the width
    const cam = camera as THREE.PerspectiveCamera;
    const fit = (W / 2 + 2) / (Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect);
    const r = Math.max(20 + p * 6, fit * 0.95);
    const desired = new THREE.Vector3(Math.sin(angle) * r, 3 + p * 6, Math.cos(angle) * r);
    camera.position.lerp(desired, 1 - Math.pow(0.003, dt));
    target.y = 1.5 + p * 3.5;
    camera.lookAt(target);
  });
  return null;
}

export default function GlassHouseScene({
  progress,
  active,
}: {
  progress: MotionValue<number>;
  active: boolean;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      frameloop={active ? 'always' : 'demand'}
      camera={{ position: [10, 4, 18], fov: 36 }}
      gl={{ antialias: true, alpha: true }}
      aria-label="3D glass house being built floor by floor at sunset"
    >
      <fog attach="fog" args={['#f2a65a', 26, 60]} />
      <hemisphereLight args={['#ffcf9a', '#3a2f3a', 0.55]} />
      {/* low sun from the right, as in the photo */}
      <directionalLight
        position={[18, 6, 4]}
        intensity={2.6}
        color="#ffb066"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
      />
      <Environment resolution={128}>
        <Lightformer intensity={2} position={[20, 4, 0]} scale={[20, 6, 1]} color="#ff9a3c" />
        <Lightformer intensity={0.5} position={[-20, 10, 0]} scale={[20, 10, 1]} color="#7d8ab8" />
      </Environment>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[30, 64]} />
        <meshStandardMaterial color="#3b3a2f" roughness={1} />
      </mesh>
      <Trees />
      <Building progress={progress} />
      <Rig progress={progress} />
    </Canvas>
  );
}
