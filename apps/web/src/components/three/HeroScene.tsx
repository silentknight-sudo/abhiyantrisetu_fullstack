'use client';

import { ContactShadows, Environment, Lightformer, Line } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import type { MotionValue } from 'motion/react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  brickTexture,
  concreteTexture,
  grassTexture,
  plasterTexture,
  soilTexture,
} from './textures';

/*
 * The Setu story in one scene: service providers on the left bank, clients' homes on the
 * right bank, and the bridge between them. Requests travel from homes to pros, and pros
 * walk (and supply trucks drive) across the bridge to the homes.
 */

const NAVY = '#1A3A52';
const NAVY_LIGHT = '#2E5675';
const ORANGE = '#FF9F43';
const BANK = '#EFE3CF';
const BANK_SIDE = '#D9C4A0';
const STEEL = '#9AA2AD';
const SKIN = '#C68B59';
const CREAM = '#FBF7F0';

const BANK_TOP = 1.2;
const DECK_Y = 1.45;
const BRIDGE_HALF = 5;
const PYLON_TOP = new THREE.Vector3(0, 5.6, 0);

type V3 = [number, number, number];

/** Point along a polyline at t ∈ [0, 1], by distance. */
function along(points: THREE.Vector3[], t: number, out: THREE.Vector3) {
  const lengths = points.slice(1).map((p, i) => p.distanceTo(points[i]!));
  const total = lengths.reduce((a, b) => a + b, 0);
  let d = t * total;
  for (let i = 0; i < lengths.length; i++) {
    const len = lengths[i]!;
    if (d <= len) return out.lerpVectors(points[i]!, points[i + 1]!, len === 0 ? 0 : d / len);
    d -= len;
  }
  return out.copy(points[points.length - 1]!);
}

function Bank({ side }: { side: -1 | 1 }) {
  const x = side * 7.8;
  return (
    <group>
      <mesh position={[x, BANK_TOP / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[5.6, BANK_TOP, 9]} />
        <meshStandardMaterial map={soilTexture([3, 1])} color={BANK_SIDE} roughness={1} />
      </mesh>
      <mesh position={[x, BANK_TOP + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5.6, 9]} />
        <meshStandardMaterial
          map={side < 0 ? concreteTexture([3, 5]) : grassTexture([4, 6])}
          color={side < 0 ? '#e8e2d6' : '#ffffff'}
          roughness={1}
        />
      </mesh>
    </group>
  );
}

function Leg({ from }: { from: V3 }) {
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
      <boxGeometry args={[0.34, length, 0.34]} />
      <meshStandardMaterial map={concreteTexture([1, 4])} color={NAVY_LIGHT} roughness={0.6} />
    </mesh>
  );
}

/** The bridge, with the A-shaped pylon and orange peak from the logo. */
function Bridge() {
  const cables = useMemo(() => {
    const out: [THREE.Vector3, THREE.Vector3][] = [];
    for (const side of [-1, 1]) {
      for (let i = 1; i <= 4; i++) {
        out.push([
          PYLON_TOP.clone().add(new THREE.Vector3(0, -0.4, 0)),
          new THREE.Vector3(side * i * 1.15, DECK_Y + 0.12, 0),
        ]);
      }
    }
    return out;
  }, []);
  return (
    <group>
      <mesh position={[0, DECK_Y, 0]} castShadow receiveShadow>
        <boxGeometry args={[BRIDGE_HALF * 2 + 1, 0.24, 1.8]} />
        <meshStandardMaterial map={concreteTexture([6, 1])} color="#c9ccd0" roughness={0.8} />
      </mesh>
      <mesh position={[0, DECK_Y + 0.125, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[BRIDGE_HALF * 2 + 1, 1.4]} />
        <meshStandardMaterial color="#3a3f45" roughness={0.9} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => -BRIDGE_HALF + 0.5 + i * 1.15).map((x) => (
        <mesh key={x} position={[x, DECK_Y + 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.5, 0.06]} />
          <meshStandardMaterial color="#f4f1ea" />
        </mesh>
      ))}
      {[-0.9, 0.9].map((z) => (
        <mesh key={z} position={[0, DECK_Y + 0.15, z]}>
          <boxGeometry args={[BRIDGE_HALF * 2 + 1, 0.06, 0.05]} />
          <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={0.25} />
        </mesh>
      ))}
      <Leg from={[-1.3, 0, 0]} />
      <Leg from={[1.3, 0, 0]} />
      <mesh position={[0, PYLON_TOP.y + 0.5, 0]} castShadow>
        <coneGeometry args={[0.38, 1.1, 4]} />
        <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={0.15} />
      </mesh>
      {cables.map(([a, b], i) => (
        <Line key={i} points={[a, b]} color={STEEL} lineWidth={1.2} />
      ))}
    </group>
  );
}

/** A low-poly person. Providers wear an orange hard hat; clients do not. */
function Person({ provider, tint }: { provider: boolean; tint: string }) {
  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow>
        <capsuleGeometry args={[0.17, 0.42, 4, 10]} />
        <meshStandardMaterial color={tint} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.92, 0]} castShadow>
        <sphereGeometry args={[0.15, 16, 12]} />
        <meshStandardMaterial color={SKIN} roughness={0.8} />
      </mesh>
      {provider && (
        <>
          <mesh position={[0, 1.0, 0]} castShadow>
            <sphereGeometry args={[0.17, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={ORANGE} roughness={0.4} />
          </mesh>
          <mesh position={[0.2, 0.32, 0]} castShadow>
            <boxGeometry args={[0.16, 0.13, 0.1]} />
            <meshStandardMaterial color={ORANGE} />
          </mesh>
        </>
      )}
    </group>
  );
}

function Glass({ p, s }: { p: V3; s: [number, number] }) {
  return (
    <mesh position={p}>
      <planeGeometry args={s} />
      <meshStandardMaterial color="#9fc3d6" roughness={0.08} metalness={0.5} />
    </mesh>
  );
}

/** A two-storey home: plastered walls, windows, a sloped roof or a flat terrace. */
function House({ position, tall = false }: { position: V3; tall?: boolean }) {
  if (tall) {
    // a society tower: concrete frame, balconies and lit windows
    return (
      <group position={position}>
        <mesh position={[0, 1.7, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 3.4, 1.2]} />
          <meshStandardMaterial map={plasterTexture([1, 3])} color="#d9dde2" roughness={0.85} />
        </mesh>
        {Array.from({ length: 5 }).map((_, i) => (
          <group key={i}>
            <mesh position={[0, 0.45 + i * 0.62, 0.62]} castShadow>
              <boxGeometry args={[1, 0.05, 0.18]} />
              <meshStandardMaterial color={NAVY} />
            </mesh>
            <Glass p={[0, 0.65 + i * 0.62, 0.605]} s={[0.8, 0.3]} />
          </group>
        ))}
        <mesh position={[0.3, 3.55, -0.2]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.3, 14]} />
          <meshStandardMaterial color="#1d1f21" />
        </mesh>
      </group>
    );
  }
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.3, 1.1, 1.1]} />
        <meshStandardMaterial map={plasterTexture([1, 1])} color={CREAM} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.48, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.05, 0.75, 4]} />
        <meshStandardMaterial color="#b4532a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.3, 0.56]}>
        <planeGeometry args={[0.3, 0.58]} />
        <meshStandardMaterial color="#7a4a24" />
      </mesh>
      {[-0.4, 0.4].map((x) => (
        <Glass key={x} p={[x, 0.68, 0.556]} s={[0.26, 0.26]} />
      ))}
    </group>
  );
}

/** A client's house mid-renovation: bamboo scaffold and a pro painting the wall. */
function RenovationSite({ position }: { position: V3 }) {
  const brush = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (brush.current) brush.current.position.y = 1.15 + Math.sin(clock.elapsedTime * 2.4) * 0.22;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 1.6, 1.1]} />
        <meshStandardMaterial map={brickTexture([1, 1])} roughness={0.9} />
      </mesh>
      {/* the freshly painted half */}
      <mesh position={[-0.37, 0.8, 0.552]}>
        <planeGeometry args={[0.76, 1.6]} />
        <meshStandardMaterial map={plasterTexture([1, 1])} color="#fbe7c8" roughness={0.9} />
      </mesh>
      {[-0.85, 0, 0.85].map((x) => (
        <mesh key={x} position={[x, 1, 0.95]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 2, 6]} />
          <meshStandardMaterial color="#b68a4c" />
        </mesh>
      ))}
      {[0.55, 1.35].map((y) => (
        <mesh key={y} position={[0, y, 0.95]} castShadow>
          <boxGeometry args={[1.8, 0.04, 0.25]} />
          <meshStandardMaterial color="#a0703a" />
        </mesh>
      ))}
      <group position={[0.25, 0.57, 0.9]} rotation={[0, Math.PI, 0]}>
        <Person provider tint={NAVY} />
      </group>
      <group ref={brush} position={[0.1, 1.15, 0.6]}>
        <mesh>
          <boxGeometry args={[0.18, 0.08, 0.05]} />
          <meshStandardMaterial color={ORANGE} />
        </mesh>
      </group>
    </group>
  );
}

/** A new house under construction: concrete frame with rebar still showing. */
function ConstructionSite({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.2, 1.3]} />
        <meshStandardMaterial map={concreteTexture([1, 1])} />
      </mesh>
      {[-0.7, 0.7].flatMap((x) =>
        [-0.55, 0.55].map((z) => (
          <group key={`${x}${z}`}>
            <mesh position={[x, 0.75, z]} castShadow>
              <boxGeometry args={[0.14, 1.3, 0.14]} />
              <meshStandardMaterial map={concreteTexture([1, 2])} />
            </mesh>
            <mesh position={[x, 1.55, z]}>
              <cylinderGeometry args={[0.012, 0.012, 0.3, 4]} />
              <meshStandardMaterial color="#5b5f63" metalness={0.6} />
            </mesh>
          </group>
        )),
      )}
      <mesh position={[0, 1.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.7, 0.1, 1.4]} />
        <meshStandardMaterial map={concreteTexture([1, 1])} color="#b8bcc2" />
      </mesh>
      <mesh position={[0.45, 0.42, 0]} castShadow>
        <boxGeometry args={[0.5, 0.45, 1]} />
        <meshStandardMaterial map={brickTexture([1, 1])} />
      </mesh>
    </group>
  );
}

/** A small backhoe loader (the "JCB" every Indian site knows). */
function Backhoe({ position }: { position: V3 }) {
  const arm = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (arm.current) arm.current.rotation.z = -0.5 + Math.sin(clock.elapsedTime * 0.9) * 0.25;
  });
  const YELLOW = '#f2b705';
  return (
    <group position={position} rotation={[0, 0.5, 0]} scale={0.8}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.4, 0.45, 0.8]} />
        <meshStandardMaterial color={YELLOW} roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[-0.2, 0.95, 0]} castShadow>
        <boxGeometry args={[0.6, 0.55, 0.7]} />
        <meshStandardMaterial color="#2b2f33" roughness={0.3} metalness={0.4} />
      </mesh>
      {[-0.45, 0.45].flatMap((x) =>
        [-0.42, 0.42].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.22, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.14, 14]} />
            <meshStandardMaterial color="#1d1f21" roughness={0.9} />
          </mesh>
        )),
      )}
      <group ref={arm} position={[0.7, 0.7, 0]}>
        <mesh position={[0.45, 0, 0]} castShadow>
          <boxGeometry args={[0.9, 0.12, 0.12]} />
          <meshStandardMaterial color={YELLOW} />
        </mesh>
        <mesh position={[0.95, -0.15, 0]} castShadow>
          <boxGeometry args={[0.22, 0.3, 0.4]} />
          <meshStandardMaterial color="#2b2f33" />
        </mesh>
      </group>
    </group>
  );
}

/** Providers' side: a workshop, a materials yard, a backhoe and pros waiting for work. */
function ProviderBank() {
  return (
    <group>
      <group position={[-8.6, BANK_TOP, -2.4]}>
        <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 1.4, 1.6]} />
          <meshStandardMaterial map={brickTexture([2, 1])} roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.5, 0]} castShadow>
          <boxGeometry args={[2.4, 0.12, 1.8]} />
          <meshStandardMaterial color={NAVY} metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.5, 0.81]}>
          <planeGeometry args={[0.9, 1]} />
          <meshStandardMaterial color={ORANGE} />
        </mesh>
      </group>
      {/* materials yard: cement bags, a brick stack and a sand heap */}
      <group position={[-9.6, BANK_TOP, 1.8]}>
        {[0, 1, 2].flatMap((i) =>
          [0, 1].map((j) => (
            <mesh key={`${i}${j}`} position={[i * 0.42, 0.11 + j * 0.2, 0]} castShadow>
              <boxGeometry args={[0.38, 0.18, 0.55]} />
              <meshStandardMaterial color="#d9d4c7" roughness={0.95} />
            </mesh>
          )),
        )}
        <mesh position={[1.6, 0.3, 0]} castShadow>
          <boxGeometry args={[0.7, 0.6, 0.7]} />
          <meshStandardMaterial map={brickTexture([1, 1])} />
        </mesh>
        <mesh position={[0.6, 0.3, -1.1]} castShadow>
          <coneGeometry args={[0.6, 0.6, 16]} />
          <meshStandardMaterial color="#d8b57a" roughness={1} />
        </mesh>
      </group>
      <Backhoe position={[-9.2, BANK_TOP, -0.2]} />
      {[
        [-7.4, -1.6],
        [-6.9, 2.2],
      ].map(([x, z], i) => (
        <group key={i} position={[x!, BANK_TOP, z!]} rotation={[0, Math.PI / 2, 0]}>
          <Person provider tint={NAVY} />
        </group>
      ))}
    </group>
  );
}

/** Clients' side: homes, a society tower, and Setu work in progress. */
function ClientBank() {
  return (
    <group>
      <House position={[7.2, BANK_TOP, -2.6]} />
      <RenovationSite position={[9.1, BANK_TOP, -0.6]} />
      <ConstructionSite position={[7.4, BANK_TOP, 2.6]} />
      <House position={[9.7, BANK_TOP, 2.4]} tall />
      <House position={[9.6, BANK_TOP, -3.3]} tall />
      {[
        [8.4, 1.0],
        [6.6, -0.6],
      ].map(([x, z], i) => (
        <group key={i} position={[x!, BANK_TOP, z!]} rotation={[0, -Math.PI / 2, 0]}>
          <Person provider={false} tint={i ? '#5E8C4A' : '#7C3F06'} />
        </group>
      ))}
    </group>
  );
}

/** Pros walking from the provider bank across the bridge to a home, then back. */
function Walkers() {
  const group = useRef<THREE.Group>(null);
  const routes = useMemo(() => {
    const p = (x: number, z: number, y = BANK_TOP) => new THREE.Vector3(x, y, z);
    const onDeck = (x: number, z: number) => p(x, z, DECK_Y + 0.12);
    return [
      {
        pts: [
          p(-7.4, -1.6),
          p(-5.2, -0.4),
          onDeck(-4.6, -0.4),
          onDeck(4.6, -0.4),
          p(5.4, -0.4),
          p(7.2, -2),
        ],
        dur: 16,
        off: 0,
      },
      {
        pts: [
          p(-8.2, 0.4),
          p(-5.2, 0.4),
          onDeck(-4.6, 0.4),
          onDeck(4.6, 0.4),
          p(5.4, 0.4),
          p(7.6, 1.8),
        ],
        dur: 18,
        off: 0.45,
      },
      {
        pts: [
          p(-6.9, 2.2),
          p(-5.2, -0.1),
          onDeck(-4.6, -0.1),
          onDeck(4.6, -0.1),
          p(5.4, -0.1),
          p(8.8, -0.4),
        ],
        dur: 20,
        off: 0.75,
      },
    ];
  }, []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const ahead = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    group.current?.children.forEach((child, i) => {
      const r = routes[i]!;
      // 0→0.45 walk there, 0.45→0.55 work at the home, 0.55→1 walk back.
      const c = (clock.elapsedTime / r.dur + r.off) % 1;
      const t = c < 0.45 ? c / 0.45 : c < 0.55 ? 1 : 1 - (c - 0.55) / 0.45;
      along(r.pts, t, tmp);
      along(r.pts, Math.min(1, Math.max(0, t + (c < 0.5 ? 0.01 : -0.01))), ahead);
      const walking = c < 0.45 || c > 0.55;
      child.position.set(
        tmp.x,
        tmp.y + (walking ? Math.abs(Math.sin(clock.elapsedTime * 9 + i)) * 0.06 : 0),
        tmp.z,
      );
      if (walking) child.lookAt(ahead.x, child.position.y, ahead.z);
    });
  });
  return (
    <group ref={group}>
      {routes.map((_, i) => (
        <group key={i}>
          <group rotation={[0, Math.PI / 2, 0]}>
            <Person provider tint={i === 1 ? NAVY_LIGHT : NAVY} />
          </group>
        </group>
      ))}
    </group>
  );
}

/** A supplier truck delivering materials across the bridge. */
function Truck() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const c = (clock.elapsedTime / 11) % 1;
    if (ref.current) ref.current.position.set(-8.6 + c * 17.2, DECK_Y + 0.12, 0.55);
    // Up the ramp onto the deck and down the other side.
    if (ref.current) {
      const x = ref.current.position.x;
      ref.current.position.y = Math.abs(x) > BRIDGE_HALF + 0.5 ? BANK_TOP : DECK_Y + 0.12;
      ref.current.visible = c < 0.95;
    }
  });
  return (
    <group ref={ref}>
      <mesh position={[0.35, 0.32, 0]} castShadow>
        <boxGeometry args={[0.45, 0.42, 0.42]} />
        <meshStandardMaterial color={ORANGE} />
      </mesh>
      <mesh position={[-0.3, 0.38, 0]} castShadow>
        <boxGeometry args={[0.85, 0.55, 0.46]} />
        <meshStandardMaterial color={CREAM} />
      </mesh>
      {[-0.5, 0.35].map((x) =>
        [-0.22, 0.22].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.1, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.06, 12]} />
            <meshStandardMaterial color={NAVY} />
          </mesh>
        )),
      )}
    </group>
  );
}

/** Glowing requests that arc from clients' homes over the bridge to the pros. */
function Requests() {
  const group = useRef<THREE.Group>(null);
  const curves = useMemo(
    () =>
      [
        [
          new THREE.Vector3(7.2, 3, -2.6),
          new THREE.Vector3(0, 7.4, -1),
          new THREE.Vector3(-7.4, 2.6, -1.6),
        ],
        [
          new THREE.Vector3(9.7, 4.8, 2.4),
          new THREE.Vector3(0, 8.2, 1),
          new THREE.Vector3(-8.2, 2.6, 0.4),
        ],
        [
          new THREE.Vector3(7.6, 3, 2.4),
          new THREE.Vector3(0, 6.8, 0.5),
          new THREE.Vector3(-6.9, 2.6, 2.2),
        ],
      ].map(([a, b, c]) => new THREE.QuadraticBezierCurve3(a!, b!, c!)),
    [],
  );
  useFrame(({ clock }) => {
    group.current?.children.forEach((orb, i) => {
      const t = (clock.elapsedTime / 6 + i / 3) % 1;
      orb.position.copy(curves[i]!.getPoint(t));
      const s = Math.sin(t * Math.PI);
      orb.scale.setScalar(0.4 + s * 0.8);
    });
  });
  return (
    <group>
      {curves.map((c, i) => (
        <Line
          key={i}
          points={c.getPoints(40)}
          color={ORANGE}
          lineWidth={1}
          dashed
          dashSize={0.25}
          gapSize={0.2}
          transparent
          opacity={0.5}
        />
      ))}
      <group ref={group}>
        {curves.map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.16, 16, 12]} />
            <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** The river: slightly glossy water whose ripples catch the light. */
function River() {
  const geo = useMemo(() => new THREE.PlaneGeometry(10, 9, 40, 36), []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position!.array), [geo]);
  useFrame(({ clock }) => {
    const pos = geo.attributes.position!;
    const t = clock.elapsedTime;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3]!;
      const y = base[i * 3 + 1]!;
      pos.setZ(i, Math.sin(x * 1.3 + t * 1.2) * 0.04 + Math.cos(y * 1.7 + t) * 0.03);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.25, 0]} receiveShadow>
      <meshStandardMaterial color="#6f97b3" roughness={0.12} metalness={0.35} />
    </mesh>
  );
}

/** Half the scene's width, in world units, that must stay in frame. */
const HALF_WIDTH = 11.4;

function Rig({ progress }: { progress: MotionValue<number> }) {
  const target = useMemo(() => new THREE.Vector3(0, 2.2, 0), []);
  useFrame(({ camera, pointer }, dt) => {
    const p = progress.get();
    const cam = camera as THREE.PerspectiveCamera;
    // Back off far enough that both banks fit the frame at its current aspect ratio.
    const halfTan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect;
    const fit = HALF_WIDTH / halfTan;
    // Starts high and wide to show both banks, then swings round and in as you scroll.
    const angle = 0.2 - p * 0.9 + pointer.x * 0.1;
    const radius = fit * (1 - p * 0.3);
    const desired = new THREE.Vector3(
      Math.sin(angle) * radius,
      radius * 0.36 - p * 4 + pointer.y * 0.8,
      Math.cos(angle) * radius,
    );
    camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
    camera.lookAt(target);
  });
  return null;
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
      camera={{ position: [6, 14, 36], fov: 34 }}
      gl={{ antialias: true, alpha: true }}
      aria-label="3D illustration: a bridge connecting service providers on one bank to clients' homes on the other"
    >
      <fog attach="fog" args={['#F6EFE3', 42, 75]} />
      <hemisphereLight args={['#eef4ff', BANK, 0.6]} />
      <directionalLight
        position={[8, 18, 10]}
        intensity={2.1}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <Environment resolution={128}>
        <Lightformer
          intensity={1.2}
          position={[0, 10, 0]}
          rotation-x={Math.PI / 2}
          scale={[30, 30, 1]}
          color="#fff6e8"
        />
        <Lightformer intensity={0.7} position={[-12, 4, 8]} scale={[14, 5, 1]} color="#dfeaff" />
      </Environment>
      <River />
      <ContactShadows position={[0, 0.03, 0]} opacity={0.25} scale={34} blur={2.4} far={8} />
      <Bank side={-1} />
      <Bank side={1} />
      <Bridge />
      <ProviderBank />
      <ClientBank />
      <Walkers />
      <Truck />
      <Requests />
      <Rig progress={progress} />
    </Canvas>
  );
}
