'use client';

import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import type { MotionValue } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  brickTexture,
  concreteTexture,
  grassTexture,
  plasterTexture,
  soilTexture,
} from './textures';

const NAVY = '#1A3A52';
const ORANGE = '#FF9F43';
const STEEL = '#5b5f63';
const BAMBOO = '#b68a4c';
const SAND = '#d8b57a';
const WOOD = '#7a4a24';
const GLASS = '#9fc3d6';

const FLOOR_H = 3;
const W = 8; // x
const D = 6; // z
/** Bottom of the slab over floor n (walls run from 0.6 up, 3 high, slabs 0.3 thick). */
const slabY = (n: number) => 0.3 + n * (FLOOR_H + 0.3);

type V3 = [number, number, number];

/**
 * A group that rises into place while `at <= stage < until`, and sinks away otherwise,
 * so temporary site work (rebar, props, scaffolding) leaves once its stage is over.
 */
function Stage({
  stage,
  at,
  until = Infinity,
  children,
}: {
  stage: number;
  at: number;
  until?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const on = stage >= at && stage < until;
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
  color = '#ffffff',
  map,
  roughness = 0.85,
  metalness = 0,
  emissive,
  opacity,
}: {
  p: V3;
  s: V3;
  color?: string;
  map?: THREE.Texture;
  roughness?: number;
  metalness?: number;
  emissive?: number;
  opacity?: number;
}) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={color}
        map={map}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive ? color : '#000000'}
        emissiveIntensity={emissive ?? 0}
        transparent={opacity !== undefined}
        opacity={opacity ?? 1}
      />
    </mesh>
  );
}

function Rod({
  from,
  to,
  r = 0.03,
  color = STEEL,
}: {
  from: V3;
  to: V3;
  r?: number;
  color?: string;
}) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize(),
    );
    return { pos: a.add(b).multiplyScalar(0.5), quat: q, len: dir.length() };
  }, [from, to]);
  return (
    <mesh position={pos} quaternion={quat} castShadow>
      <cylinderGeometry args={[r, r, len, 6]} />
      <meshStandardMaterial color={color} roughness={0.6} metalness={color === STEEL ? 0.6 : 0} />
    </mesh>
  );
}

/** Walls go from exposed brick, to grey cement plaster, to the painted finish. */
function Walls({ finish }: { finish: 'brick' | 'plaster' | 'paint' }) {
  const material = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.92 }), []);
  useEffect(() => {
    material.map = finish === 'brick' ? brickTexture([2, 2]) : plasterTexture([2, 2]);
    material.color.set(
      finish === 'brick' ? '#ffffff' : finish === 'plaster' ? '#b9b5ad' : '#fff3e2',
    );
    material.needsUpdate = true;
  }, [finish, material]);
  const walls: { p: V3; s: V3 }[] = [];
  for (const level of [0, 1]) {
    const y = 0.6 + level * (FLOOR_H + 0.3) + FLOOR_H / 2;
    walls.push({ p: [0, y, -D / 2 + 0.12], s: [W - 0.3, FLOOR_H, 0.22] });
    walls.push({ p: [-W / 2 + 0.12, y, 0], s: [0.22, FLOOR_H, D - 0.3] });
    walls.push({ p: [W / 2 - 0.12, y, 0], s: [0.22, FLOOR_H, D - 0.3] });
    // front wall with door and window openings
    walls.push({ p: [-W / 4 - 0.6, y, D / 2 - 0.12], s: [W / 2 - 1.2, FLOOR_H, 0.22] });
    walls.push({ p: [W / 4 + 0.6, y, D / 2 - 0.12], s: [W / 2 - 1.2, FLOOR_H, 0.22] });
    walls.push({ p: [0, y + FLOOR_H / 2 - 0.35, D / 2 - 0.12], s: [2.4, 0.7, 0.22] });
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

/** Bamboo scaffolding tied along the front, as on most Indian sites. */
function Scaffolding() {
  const z = D / 2 + 0.7;
  const xs = [-W / 2 - 0.2, -W / 4, 0, W / 4, W / 2 + 0.2];
  const levels = [1.2, 2.6, 4, 5.4, 6.8];
  return (
    <group>
      {xs.map((x) => (
        <Rod key={x} from={[x, 0, z]} to={[x, 7.6, z]} r={0.05} color={BAMBOO} />
      ))}
      {levels.map((y) => (
        <group key={y}>
          <Rod from={[xs[0]!, y, z]} to={[xs.at(-1)!, y, z]} r={0.04} color={BAMBOO} />
          <Box p={[0, y + 0.05, z + 0.25]} s={[W + 0.4, 0.06, 0.5]} color="#a0703a" />
        </group>
      ))}
    </group>
  );
}

/** Concrete mixer: orange drum on a frame with wheels. */
function Mixer({ position }: { position: V3 }) {
  const drum = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (drum.current) drum.current.rotation.y += dt * 2;
  });
  return (
    <group position={position} rotation={[0, 0.6, 0]}>
      <Box p={[0, 0.45, 0]} s={[1.2, 0.12, 0.7]} color={STEEL} metalness={0.5} />
      <group position={[0, 1.05, 0]} rotation={[0, 0, 0.5]}>
        <mesh ref={drum} castShadow>
          <cylinderGeometry args={[0.32, 0.5, 1, 14]} />
          <meshStandardMaterial color={ORANGE} roughness={0.5} metalness={0.2} />
        </mesh>
      </group>
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} position={[x, 0.25, 0.4]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.1, 14]} />
          <meshStandardMaterial color="#222" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** Sand heap, stacked cement bags and a pallet of bricks. */
function SiteMaterials() {
  return (
    <group position={[-W / 2 - 2.6, 0, -1]}>
      <mesh position={[0, 0.45, 1.8]} castShadow receiveShadow>
        <coneGeometry args={[1.2, 0.9, 20]} />
        <meshStandardMaterial color={SAND} roughness={1} />
      </mesh>
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <Box
            key={`${row}-${col}`}
            p={[col * 0.55 - 0.55, 0.12 + row * 0.22, -0.8]}
            s={[0.5, 0.2, 0.32]}
            color="#d9d4c7"
            roughness={0.95}
          />
        )),
      )}
      <Box p={[0, 0.4, -2.2]} s={[1.4, 0.8, 0.9]} map={brickTexture([1, 1])} />
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
  const concrete = concreteTexture([1, 1]);
  const pegs: [number, number][] = [
    [-W / 2 - 0.4, -D / 2 - 0.4],
    [W / 2 + 0.4, -D / 2 - 0.4],
    [W / 2 + 0.4, D / 2 + 0.4],
    [-W / 2 - 0.4, D / 2 + 0.4],
  ];

  return (
    <group>
      {/* Soil test & design: pegs with the string line marking the plot, survey tripod */}
      <Stage stage={stage} at={0} until={3}>
        {pegs.map(([x, z], i) => {
          const [nx, nz] = pegs[(i + 1) % 4]!;
          return (
            <group key={i}>
              <Box p={[x, 0.35, z]} s={[0.1, 0.7, 0.1]} color={WOOD} />
              <Rod from={[x, 0.55, z]} to={[nx, 0.55, nz]} r={0.012} color="#f5f0e6" />
            </group>
          );
        })}
        <group position={[W / 2 + 2, 0, D / 2 + 1.5]}>
          {[0, 2.1, 4.2].map((a) => (
            <Rod
              key={a}
              from={[Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4]}
              to={[0, 1.3, 0]}
              r={0.025}
              color="#c9a227"
            />
          ))}
          <Box p={[0, 1.4, 0]} s={[0.25, 0.18, 0.18]} color={NAVY} metalness={0.3} />
        </group>
      </Stage>

      {/* Excavation: the pit and the heap of dug earth */}
      <Stage stage={stage} at={1} until={4}>
        <Box
          p={[0, 0.03, 0]}
          s={[W + 0.8, 0.06, D + 0.8]}
          map={soilTexture([3, 3])}
          color="#6e4d2e"
        />
        <mesh position={[W / 2 + 2.2, 0.5, -D / 2]} castShadow receiveShadow>
          <coneGeometry args={[1.3, 1, 18]} />
          <meshStandardMaterial map={soilTexture([2, 2])} roughness={1} />
        </mesh>
      </Stage>

      {/* Foundation: footings with rebar starters */}
      <Stage stage={stage} at={2}>
        {columns.map(([x, z], i) => (
          <Box key={i} p={[x, 0.15, z]} s={[0.9, 0.3, 0.9]} map={concrete} />
        ))}
      </Stage>
      <Stage stage={stage} at={2} until={4}>
        {columns.map(([x, z], i) =>
          [-0.08, 0.08].flatMap((dx) =>
            [-0.08, 0.08].map((dz) => (
              <Rod
                key={`${i}${dx}${dz}`}
                from={[x + dx, 0.3, z + dz]}
                to={[x + dx, 1.4, z + dz]}
                r={0.018}
              />
            )),
          ),
        )}
      </Stage>

      {/* Plinth beam and floor */}
      <Stage stage={stage} at={3}>
        <Box p={[0, 0.38, 0]} s={[W, 0.45, D]} map={concrete} />
      </Stage>

      {/* Columns, with bars sticking out of the top until the slab is cast */}
      <Stage stage={stage} at={4}>
        {columns.map(([x, z], i) => (
          <Box
            key={i}
            p={[x, 0.6 + FLOOR_H + 0.15, z]}
            s={[0.3, FLOOR_H * 2 + 0.6, 0.3]}
            map={concrete}
          />
        ))}
      </Stage>
      <Stage stage={stage} at={4} until={6}>
        {columns.map(([x, z], i) => (
          <Rod key={i} from={[x, slabY(2) + 0.1, z]} to={[x, slabY(2) + 1.1, z]} r={0.02} />
        ))}
      </Stage>

      {/* Slabs, held up by steel props while they cure */}
      <Stage stage={stage} at={5}>
        <Box p={[0, slabY(1) + 0.15, 0]} s={[W + 0.4, 0.3, D + 0.4]} map={concrete} />
        <Box p={[0, slabY(2) + 0.15, 0]} s={[W + 0.4, 0.3, D + 0.4]} map={concrete} />
      </Stage>
      <Stage stage={stage} at={5} until={7}>
        {[-2.4, 0, 2.4].flatMap((x) =>
          [-1.5, 1.5].flatMap((z) => [
            <Rod key={`a${x}${z}`} from={[x, 0.6, z]} to={[x, slabY(1), z]} r={0.04} />,
            <Rod key={`b${x}${z}`} from={[x, slabY(1) + 0.3, z]} to={[x, slabY(2), z]} r={0.04} />,
          ]),
        )}
      </Stage>

      {/* Brickwork, then cement plaster, then the painted finish */}
      <Stage stage={stage} at={6}>
        <Walls finish={stage >= 9 ? 'paint' : stage >= 8 ? 'plaster' : 'brick'} />
      </Stage>
      <Stage stage={stage} at={6} until={9}>
        <Scaffolding />
      </Stage>

      {/* Plumbing & electrical: rainwater pipe, supply line, conduit */}
      <Stage stage={stage} at={7}>
        <Rod
          from={[W / 2 + 0.06, 0.2, 1.6]}
          to={[W / 2 + 0.06, slabY(2) + 0.4, 1.6]}
          r={0.07}
          color="#e8e6e1"
        />
        <Rod
          from={[W / 2 + 0.06, 0.2, -1.6]}
          to={[W / 2 + 0.06, slabY(2) + 0.4, -1.6]}
          r={0.05}
          color="#3f7fd0"
        />
        <Box p={[W / 2 + 0.05, 1.8, 0]} s={[0.1, 0.5, 0.35]} color="#d8d4cc" />
      </Stage>

      {/* Site materials and the mixer stay until handover */}
      <Stage stage={stage} at={1} until={9}>
        <SiteMaterials />
      </Stage>
      <Stage stage={stage} at={4} until={9}>
        <Mixer position={[W / 2 + 2.4, 0, 2.2]} />
      </Stage>

      {/* Finishing & handover */}
      <Stage stage={stage} at={9}>
        <Box p={[0, 0.03, 0]} s={[W + 7, 0.04, D + 7]} map={grassTexture([5, 5])} />
        {/* main door with frame */}
        <Box p={[0, 0.6 + 1.15, D / 2 - 0.02]} s={[1.3, 2.3, 0.1]} color={WOOD} roughness={0.6} />
        <Box p={[0, 0.6 + 2.35, D / 2 + 0.02]} s={[1.5, 0.12, 0.14]} color={NAVY} />
        {/* front window on the upper floor */}
        <Box
          p={[0, slabY(1) + 1.5, D / 2 - 0.02]}
          s={[2.3, 1.5, 0.06]}
          color={GLASS}
          roughness={0.08}
          metalness={0.4}
          opacity={0.75}
        />
        {[-W / 4 - 0.6, W / 4 + 0.6].flatMap((x) =>
          [slabY(0) + 0.15, slabY(1)].map((y) => (
            <group key={`${x}-${y}`}>
              <Box
                p={[x, y + 1.8, D / 2 + 0.02]}
                s={[1.5, 1.3, 0.08]}
                color="#2b2f33"
                metalness={0.5}
                roughness={0.4}
              />
              <Box
                p={[x, y + 1.8, D / 2 + 0.07]}
                s={[1.3, 1.1, 0.04]}
                color={GLASS}
                roughness={0.05}
                metalness={0.5}
                opacity={0.8}
              />
              {/* chhajja sunshade */}
              <Box
                p={[x, y + 2.6, D / 2 + 0.3]}
                s={[1.9, 0.08, 0.6]}
                map={plasterTexture([1, 1])}
                color="#efe4d2"
              />
            </group>
          )),
        )}
        {/* terrace parapet with railing and the black rooftop water tank */}
        {(
          [
            [
              [0, slabY(2) + 0.6, -D / 2 - 0.1],
              [W + 0.4, 0.6, 0.15],
            ],
            [
              [-W / 2 - 0.1, slabY(2) + 0.6, 0],
              [0.15, 0.6, D + 0.4],
            ],
            [
              [W / 2 + 0.1, slabY(2) + 0.6, 0],
              [0.15, 0.6, D + 0.4],
            ],
          ] as [V3, V3][]
        ).map(([p, s], i) => (
          <Box key={i} p={p} s={s} color={NAVY} />
        ))}
        <Rod
          from={[-W / 2 - 0.1, slabY(2) + 1.1, D / 2 + 0.1]}
          to={[W / 2 + 0.1, slabY(2) + 1.1, D / 2 + 0.1]}
          r={0.03}
          color="#2b2f33"
        />
        {Array.from({ length: 13 }, (_, i) => -W / 2 + i * (W / 12)).map((x) => (
          <Rod
            key={x}
            from={[x, slabY(2) + 0.3, D / 2 + 0.1]}
            to={[x, slabY(2) + 1.1, D / 2 + 0.1]}
            r={0.015}
            color="#2b2f33"
          />
        ))}
        <mesh position={[2.4, slabY(2) + 1.05, -1.4]} castShadow>
          <cylinderGeometry args={[0.6, 0.6, 1.2, 20]} />
          <meshStandardMaterial color="#1d1f21" roughness={0.5} />
        </mesh>
        {/* boundary wall with gate */}
        {(
          [
            [
              [-W / 2 - 2.5, 0.5, D / 2 + 2.8],
              [3.4, 1, 0.2],
            ],
            [
              [W / 2 + 2.5, 0.5, D / 2 + 2.8],
              [3.4, 1, 0.2],
            ],
          ] as [V3, V3][]
        ).map(([p, s], i) => (
          <Box key={i} p={p} s={s} map={plasterTexture([1, 1])} color="#efe4d2" />
        ))}
        <Box
          p={[0, 0.65, D / 2 + 2.8]}
          s={[W - 0.4, 1.3, 0.06]}
          color="#2b2f33"
          metalness={0.6}
          roughness={0.35}
          opacity={0.85}
        />
        {[-6.3, 6.4].map((x) => (
          <group key={x} position={[x, 0, -1]}>
            <Rod from={[0, 0, 0]} to={[0, 1.6, 0]} r={0.1} color="#6b4423" />
            <mesh position={[0, 2.2, 0]} castShadow>
              <icosahedronGeometry args={[0.9, 1]} />
              <meshStandardMaterial color="#557a3c" roughness={0.95} flatShading />
            </mesh>
          </group>
        ))}
      </Stage>
    </group>
  );
}

function Rig({ stage, progress }: { stage: number; progress: MotionValue<number> }) {
  const target = useMemo(() => new THREE.Vector3(0, 2.8, 0), []);
  useFrame(({ camera, clock }, dt) => {
    const angle = 0.7 + progress.get() * 1.6 + Math.sin(clock.elapsedTime * 0.2) * 0.05;
    const r = 28;
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
      {/* Soft daylight: sky fill, a warm sun and procedural reflections (no image files) */}
      <hemisphereLight args={['#eaf2ff', '#d8c7a8', 0.55]} />
      <directionalLight
        position={[12, 18, 9]}
        intensity={2.2}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <Environment resolution={128}>
        <Lightformer
          intensity={1.2}
          position={[0, 8, 0]}
          rotation-x={Math.PI / 2}
          scale={[20, 20, 1]}
          color="#fff6e8"
        />
        <Lightformer intensity={0.6} position={[-10, 3, 6]} scale={[10, 4, 1]} color="#dfeaff" />
      </Environment>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[17, 64]} />
        <meshStandardMaterial map={soilTexture([8, 8])} color="#e9dcc4" roughness={1} />
      </mesh>
      <ContactShadows position={[0, 0.05, 0]} opacity={0.45} scale={26} blur={2.4} far={10} />
      <Rig stage={stage} progress={progress} />
    </Canvas>
  );
}
