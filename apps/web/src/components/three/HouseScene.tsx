'use client';

import { ContactShadows } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import type { MotionValue } from 'motion/react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const NAVY = '#1A3A52';
const ORANGE = '#FF9F43';
const CONCRETE = '#B9BEC6';
const BRICK = '#C8643B';
const PLASTER = '#F4EEE4';
const SOIL = '#8A5A2B';

const FLOOR_H = 3;
const W = 8; // x
const D = 6; // z

/**
 * A group that rises into place once `stage >= at`, and sinks away if the visitor
 * scrolls back above that stage.
 */
function Stage({ stage, at, children }: { stage: number; at: number; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const on = stage >= at;
    const k = 1 - Math.pow(0.0005, dt);
    g.position.y = THREE.MathUtils.lerp(g.position.y, on ? 0 : 6, k);
    const s = THREE.MathUtils.lerp(g.scale.x, on ? 1 : 0.001, k);
    g.scale.setScalar(s);
    g.visible = s > 0.01;
  });
  return (
    <group ref={ref} position={[0, 6, 0]} scale={0.001}>
      {children}
    </group>
  );
}

function Box({
  p,
  s,
  color,
  emissive,
}: {
  p: [number, number, number];
  s: [number, number, number];
  color: string;
  emissive?: number;
}) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={color}
        roughness={0.8}
        emissive={emissive ? color : '#000000'}
        emissiveIntensity={emissive ?? 0}
      />
    </mesh>
  );
}

/** Walls that change from exposed brick to plaster when plastering is done. */
function Walls({ plastered }: { plastered: boolean }) {
  // One material shared by every wall, so a single colour animation repaints them all.
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: BRICK, roughness: 0.9 }),
    [],
  );
  const brick = useMemo(() => new THREE.Color(BRICK), []);
  const plaster = useMemo(() => new THREE.Color(PLASTER), []);
  useFrame((_, dt) => material.color.lerp(plastered ? plaster : brick, 1 - Math.pow(0.01, dt)));
  const walls: { p: [number, number, number]; s: [number, number, number] }[] = [];
  for (const level of [0, 1]) {
    const y = 0.45 + level * (FLOOR_H + 0.3) + FLOOR_H / 2;
    walls.push({ p: [0, y, -D / 2 + 0.12], s: [W - 0.3, FLOOR_H, 0.22] });
    walls.push({ p: [-W / 2 + 0.12, y, 0], s: [0.22, FLOOR_H, D - 0.3] });
    walls.push({ p: [W / 2 - 0.12, y, 0], s: [0.22, FLOOR_H, D - 0.3] });
    // front wall in two parts, leaving the door and window opening
    walls.push({ p: [-W / 4 - 0.6, y, D / 2 - 0.12], s: [W / 2 - 1.2, FLOOR_H, 0.22] });
    walls.push({ p: [W / 4 + 0.6, y, D / 2 - 0.12], s: [W / 2 - 1.2, FLOOR_H, 0.22] });
  }
  return (
    <group>
      {walls.map((w, i) => (
        <mesh key={i} position={w.p} material={material} castShadow receiveShadow>
          <boxGeometry args={w.s} />
        </mesh>
      ))}
    </group>
  );
}

function House({ stage }: { stage: number }) {
  const columns = useMemo(() => {
    const out: [number, number][] = [];
    for (const x of [-W / 2 + 0.25, 0, W / 2 - 0.25])
      for (const z of [-D / 2 + 0.25, D / 2 - 0.25]) out.push([x, z]);
    return out;
  }, []);
  const slabY = (n: number) => 0.45 + n * (FLOOR_H + 0.3);

  return (
    <group>
      {/* 1 survey pegs and string line */}
      <Stage stage={stage} at={0}>
        {[
          [-W / 2 - 0.4, -D / 2 - 0.4],
          [W / 2 + 0.4, -D / 2 - 0.4],
          [-W / 2 - 0.4, D / 2 + 0.4],
          [W / 2 + 0.4, D / 2 + 0.4],
        ].map(([x, z], i) => (
          <Box key={i} p={[x!, 0.35, z!]} s={[0.12, 0.7, 0.12]} color={ORANGE} />
        ))}
      </Stage>
      {/* 2 excavation */}
      <Stage stage={stage} at={1}>
        <Box p={[0, 0.02, 0]} s={[W + 0.6, 0.04, D + 0.6]} color={SOIL} />
      </Stage>
      {/* 3 foundation footings */}
      <Stage stage={stage} at={2}>
        {columns.map(([x, z], i) => (
          <Box key={i} p={[x, 0.15, z]} s={[0.9, 0.3, 0.9]} color={CONCRETE} />
        ))}
      </Stage>
      {/* 4 plinth */}
      <Stage stage={stage} at={3}>
        <Box p={[0, 0.3, 0]} s={[W, 0.3, D]} color="#9AA2AD" />
      </Stage>
      {/* 5 columns and beams */}
      <Stage stage={stage} at={4}>
        {columns.map(([x, z], i) => (
          <Box
            key={i}
            p={[x, 0.45 + FLOOR_H + 0.15, z]}
            s={[0.3, FLOOR_H * 2 + 0.6, 0.3]}
            color={CONCRETE}
          />
        ))}
      </Stage>
      {/* 6 slab casting */}
      <Stage stage={stage} at={5}>
        <Box p={[0, slabY(1), 0]} s={[W + 0.4, 0.3, D + 0.4]} color="#8C939D" />
        <Box p={[0, slabY(2), 0]} s={[W + 0.4, 0.3, D + 0.4]} color="#8C939D" />
      </Stage>
      {/* 7 brickwork, 9 plaster (colour change) */}
      <Stage stage={stage} at={6}>
        <Walls plastered={stage >= 8} />
      </Stage>
      {/* 8 plumbing and electrical */}
      <Stage stage={stage} at={7}>
        <Box p={[W / 2 + 0.05, 3.4, 1.6]} s={[0.1, 6.4, 0.1]} color="#2F6FDE" />
        <Box p={[W / 2 + 0.05, 3.4, -1.6]} s={[0.08, 6.4, 0.08]} color="#E6A100" />
      </Stage>
      {/* 10 finishing: windows, door, parapet, water tank, garden */}
      <Stage stage={stage} at={9}>
        <Box
          p={[0, 0.45 + 1.1, D / 2 - 0.05]}
          s={[1.2, 2.2, 0.08]}
          color={ORANGE}
          emissive={0.25}
        />
        <Box
          p={[0, slabY(1) + 1.7, D / 2 - 0.05]}
          s={[2.2, 1.4, 0.08]}
          color="#FFB870"
          emissive={0.4}
        />
        {[-W / 4 - 0.6, W / 4 + 0.6].map((x) =>
          [slabY(0) + 1.7, slabY(1) + 1.7].map((y) => (
            <Box
              key={`${x}-${y}`}
              p={[x, y, D / 2 + 0.01]}
              s={[1.3, 1.1, 0.06]}
              color="#FFB870"
              emissive={0.4}
            />
          )),
        )}
        <Box p={[0, slabY(2) + 0.45, -D / 2 + 0.1]} s={[W + 0.4, 0.6, 0.2]} color={NAVY} />
        <Box p={[0, slabY(2) + 0.45, D / 2 + 0.1]} s={[W + 0.4, 0.6, 0.2]} color={NAVY} />
        <Box p={[-W / 2 - 0.1, slabY(2) + 0.45, 0]} s={[0.2, 0.6, D + 0.4]} color={NAVY} />
        <Box p={[W / 2 + 0.1, slabY(2) + 0.45, 0]} s={[0.2, 0.6, D + 0.4]} color={NAVY} />
        <Box p={[2.4, slabY(2) + 0.7, -1.2]} s={[1, 1, 1]} color={ORANGE} />
        {[-5.4, 5.6].map((x) => (
          <group key={x} position={[x, 0, 2.6]}>
            <Box p={[0, 0.6, 0]} s={[0.15, 1.2, 0.15]} color="#7C3F06" />
            <mesh position={[0, 1.7, 0]} castShadow>
              <icosahedronGeometry args={[0.8, 0]} />
              <meshStandardMaterial color="#5E8C4A" roughness={0.9} flatShading />
            </mesh>
          </group>
        ))}
      </Stage>
    </group>
  );
}

function Rig({ stage, progress }: { stage: number; progress: MotionValue<number> }) {
  const target = useMemo(() => new THREE.Vector3(0, 2.6, 0), []);
  useFrame(({ camera, clock }, dt) => {
    const angle = 0.7 + progress.get() * 1.6 + Math.sin(clock.elapsedTime * 0.2) * 0.05;
    const r = 27;
    const desired = new THREE.Vector3(Math.sin(angle) * r, 11, Math.cos(angle) * r);
    camera.position.lerp(desired, 1 - Math.pow(0.002, dt));
    camera.lookAt(target);
  });
  return <House stage={stage} />;
}

export default function HouseScene({
  stage,
  progress,
  active,
}: {
  stage: number;
  progress: MotionValue<number>;
  active: boolean;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      frameloop={active ? 'always' : 'demand'}
      camera={{ position: [12, 8.5, 14], fov: 34 }}
      gl={{ antialias: true, alpha: true }}
      aria-label="3D house being built stage by stage"
    >
      <hemisphereLight args={['#FFF6E8', '#E4D4BB', 0.9]} />
      <directionalLight
        position={[10, 16, 8]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[16, 64]} />
        <meshStandardMaterial color="#EFE4D2" roughness={1} />
      </mesh>
      <ContactShadows position={[0, 0.03, 0]} opacity={0.4} scale={24} blur={2.2} far={10} />
      <Rig stage={stage} progress={progress} />
    </Canvas>
  );
}
