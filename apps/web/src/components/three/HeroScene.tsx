'use client';

import { ContactShadows, Line } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import type { MotionValue } from 'motion/react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const NAVY = '#1A3A52';
const NAVY_LIGHT = '#2E5675';
const ORANGE = '#FF9F43';
const SAND = '#F1E6D3';
const STEEL = '#9AA2AD';

const PYLON_TOP = new THREE.Vector3(0, 6.2, 0);
const DECK_Y = 1.6;

/** A leg of the A-shaped pylon, from a base point up to the shared apex. */
function Leg({ from }: { from: [number, number, number] }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const dir = PYLON_TOP.clone().sub(a);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize(),
    );
    return { position: a.clone().add(dir.multiplyScalar(0.5)), quaternion: q, length: len };
  }, [from]);
  return (
    <mesh position={position} quaternion={quaternion} castShadow>
      <boxGeometry args={[0.38, length, 0.38]} />
      <meshStandardMaterial color={NAVY} roughness={0.55} metalness={0.15} />
    </mesh>
  );
}

function Bridge() {
  const cables = useMemo(() => {
    const out: [THREE.Vector3, THREE.Vector3][] = [];
    for (const side of [-1, 1]) {
      for (let i = 1; i <= 6; i++) {
        const x = side * i * 1.05;
        out.push([
          PYLON_TOP.clone().add(new THREE.Vector3(0, -0.4, 0)),
          new THREE.Vector3(x, DECK_Y + 0.15, 0),
        ]);
      }
    }
    return out;
  }, []);

  return (
    <group>
      {/* deck */}
      <mesh position={[0, DECK_Y, 0]} castShadow receiveShadow>
        <boxGeometry args={[15, 0.28, 1.6]} />
        <meshStandardMaterial color={NAVY_LIGHT} roughness={0.6} />
      </mesh>
      {/* orange edge stripe along the deck */}
      <mesh position={[0, DECK_Y + 0.16, 0.81]}>
        <boxGeometry args={[15, 0.06, 0.04]} />
        <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={0.25} />
      </mesh>
      {/* piers */}
      {[-6, 6].map((x) => (
        <mesh key={x} position={[x, DECK_Y / 2, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.34, DECK_Y, 16]} />
          <meshStandardMaterial color={STEEL} roughness={0.7} />
        </mesh>
      ))}
      {/* the "A" pylon, echoing the logo */}
      <Leg from={[-1.5, 0, 0]} />
      <Leg from={[1.5, 0, 0]} />
      <mesh position={[0, 2.6, 0]} castShadow>
        <boxGeometry args={[1.6, 0.22, 0.3]} />
        <meshStandardMaterial color={STEEL} />
      </mesh>
      {/* orange peak */}
      <mesh position={[0, PYLON_TOP.y + 0.55, 0]} castShadow>
        <coneGeometry args={[0.42, 1.2, 4]} />
        <meshStandardMaterial
          color={ORANGE}
          roughness={0.35}
          emissive={ORANGE}
          emissiveIntensity={0.15}
        />
      </mesh>
      {cables.map(([a, b], i) => (
        <Line key={i} points={[a, b]} color={STEEL} lineWidth={1.2} />
      ))}
    </group>
  );
}

/** Cars looping across the deck. */
function Traffic() {
  const cars = useRef<THREE.Group>(null);
  const specs = useMemo(
    () => [
      { lane: 0.38, speed: 1.6, offset: 0, color: ORANGE },
      { lane: 0.38, speed: 1.6, offset: 7, color: '#FFFFFF' },
      { lane: -0.38, speed: -1.3, offset: 3, color: '#FFFFFF' },
      { lane: -0.38, speed: -1.3, offset: 10, color: ORANGE },
    ],
    [],
  );
  useFrame(({ clock }) => {
    cars.current?.children.forEach((c, i) => {
      const s = specs[i]!;
      const span = 15;
      const x = ((((clock.elapsedTime * s.speed + s.offset) % span) + span) % span) - span / 2;
      c.position.set(x, DECK_Y + 0.28, s.lane);
    });
  });
  return (
    <group ref={cars}>
      {specs.map((s, i) => (
        <mesh key={i} castShadow>
          <boxGeometry args={[0.55, 0.26, 0.32]} />
          <meshStandardMaterial color={s.color} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function City() {
  const blocks = useMemo(() => {
    let seed = 11;
    const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    return Array.from({ length: 16 }, (_, i) => ({
      x: 4.2 + (i % 4) * 1.05 + rand() * 0.3,
      z: -2.2 - Math.floor(i / 4) * 1.1 + rand() * 0.3,
      h: 1.2 + rand() * 3.6,
      w: 0.7 + rand() * 0.25,
      tone: rand() > 0.5 ? NAVY : NAVY_LIGHT,
    }));
  }, []);
  return (
    <group>
      {blocks.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]} castShadow receiveShadow>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshStandardMaterial color={b.tone} roughness={0.7} />
        </mesh>
      ))}
      {/* spire tower */}
      <mesh position={[7.6, 3.2, -1.4]} castShadow>
        <boxGeometry args={[0.6, 6.4, 0.6]} />
        <meshStandardMaterial color={NAVY} roughness={0.5} />
      </mesh>
      <mesh position={[7.6, 7, -1.4]} castShadow>
        <coneGeometry args={[0.28, 1.4, 4]} />
        <meshStandardMaterial color={NAVY} />
      </mesh>
    </group>
  );
}

/** Tower crane whose jib slowly swings. */
function Crane() {
  const jib = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (jib.current) jib.current.rotation.y = Math.sin(clock.elapsedTime * 0.35) * 0.9;
  });
  return (
    <group position={[-6.4, 0, -2.4]}>
      <mesh position={[0, 2.8, 0]} castShadow>
        <boxGeometry args={[0.26, 5.6, 0.26]} />
        <meshStandardMaterial color={ORANGE} roughness={0.5} />
      </mesh>
      <group ref={jib} position={[0, 5.6, 0]}>
        <mesh position={[1.1, 0, 0]} castShadow>
          <boxGeometry args={[3.8, 0.18, 0.18]} />
          <meshStandardMaterial color={ORANGE} />
        </mesh>
        <mesh position={[-0.9, -0.2, 0]} castShadow>
          <boxGeometry args={[0.5, 0.4, 0.4]} />
          <meshStandardMaterial color={NAVY} />
        </mesh>
        <mesh position={[2.6, -0.9, 0]}>
          <boxGeometry args={[0.02, 1.8, 0.02]} />
          <meshStandardMaterial color={STEEL} />
        </mesh>
        <mesh position={[2.6, -1.9, 0]} castShadow>
          <boxGeometry args={[0.4, 0.3, 0.4]} />
          <meshStandardMaterial color={NAVY_LIGHT} />
        </mesh>
      </group>
      {/* half-built block next to the crane */}
      <mesh position={[1.2, 0.9, 0.4]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 1.8, 1.4]} />
        <meshStandardMaterial color="#E4D4BB" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Rig({ progress }: { progress: MotionValue<number> }) {
  const world = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Vector3(1, 2.4, -0.5), []);
  useFrame(({ camera, pointer, clock }, dt) => {
    const p = progress.get();
    // Scroll orbits and lowers the camera; the pointer adds a little parallax.
    const angle = 0.55 - p * 1.1 + pointer.x * 0.12;
    const radius = 23 - p * 5;
    const desired = new THREE.Vector3(
      Math.sin(angle) * radius,
      7.5 - p * 3.2 + pointer.y * 0.8,
      Math.cos(angle) * radius,
    );
    camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
    camera.lookAt(target);
    if (world.current) world.current.position.y = Math.sin(clock.elapsedTime * 0.6) * 0.08;
  });
  return (
    <group ref={world}>
      <Bridge />
      <Traffic />
      <City />
      <Crane />
      {/* river under the bridge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[40, 3.2]} />
        <meshStandardMaterial color="#ABC2D4" roughness={0.25} metalness={0.1} />
      </mesh>
    </group>
  );
}

export default function HeroScene({
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
      camera={{ position: [9, 6, 14], fov: 36 }}
      gl={{ antialias: true, alpha: true }}
      aria-label="3D illustration of a bridge leading into a city"
    >
      <fog attach="fog" args={['#F6EFE3', 22, 48]} />
      <hemisphereLight args={['#FFF6E8', SAND, 0.9]} />
      <directionalLight
        position={[8, 14, 8]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[30, 64]} />
        <meshStandardMaterial color={SAND} roughness={1} />
      </mesh>
      <ContactShadows position={[0, 0.02, 0]} opacity={0.25} scale={30} blur={2.4} far={8} />
      <Rig progress={progress} />
    </Canvas>
  );
}
