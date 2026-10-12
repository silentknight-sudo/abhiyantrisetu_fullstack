'use client';

import { ContactShadows, Line } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import type { MotionValue } from 'motion/react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

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
        <meshStandardMaterial color={BANK_SIDE} roughness={1} />
      </mesh>
      <mesh position={[x, BANK_TOP + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5.6, 9]} />
        <meshStandardMaterial color={BANK} roughness={1} />
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
      <meshStandardMaterial color={NAVY} roughness={0.55} />
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
        <meshStandardMaterial color={NAVY_LIGHT} roughness={0.6} />
      </mesh>
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

function House({ position, tall = false }: { position: V3; tall?: boolean }) {
  const h = tall ? 3.4 : 1.1;
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={tall ? [1.2, h, 1.2] : [1.3, h, 1.1]} />
        <meshStandardMaterial color={tall ? NAVY_LIGHT : CREAM} roughness={0.85} />
      </mesh>
      {tall ? (
        Array.from({ length: 5 }).map((_, i) => (
          <mesh key={i} position={[0, 0.5 + i * 0.62, 0.61]}>
            <planeGeometry args={[0.8, 0.22]} />
            <meshStandardMaterial color="#FFB870" emissive="#FFB870" emissiveIntensity={0.5} />
          </mesh>
        ))
      ) : (
        <>
          <mesh position={[0, h + 0.38, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[1.05, 0.75, 4]} />
            <meshStandardMaterial color={ORANGE} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.32, 0.56]}>
            <planeGeometry args={[0.32, 0.6]} />
            <meshStandardMaterial color={NAVY} />
          </mesh>
        </>
      )}
    </group>
  );
}

/** Providers' side: a workshop, a materials yard and pros waiting for work. */
function ProviderBank() {
  return (
    <group>
      <group position={[-8.6, BANK_TOP, -2.4]}>
        <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 1.4, 1.6]} />
          <meshStandardMaterial color={NAVY} roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.5, 0]} castShadow>
          <boxGeometry args={[2.4, 0.18, 1.8]} />
          <meshStandardMaterial color={ORANGE} />
        </mesh>
      </group>
      {/* materials: bags of cement and a brick stack */}
      <group position={[-9.6, BANK_TOP, 1.8]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[i * 0.45, 0.15, 0]} castShadow>
            <boxGeometry args={[0.4, 0.3, 0.6]} />
            <meshStandardMaterial color="#B9BEC6" />
          </mesh>
        ))}
        <mesh position={[1.6, 0.3, 0]} castShadow>
          <boxGeometry args={[0.7, 0.6, 0.7]} />
          <meshStandardMaterial color="#C8643B" />
        </mesh>
      </group>
      {[
        [-7.4, -1.6],
        [-8.2, 0.4],
        [-6.9, 2.2],
      ].map(([x, z], i) => (
        <group key={i} position={[x!, BANK_TOP, z!]} rotation={[0, Math.PI / 2, 0]}>
          <Person provider tint={NAVY} />
        </group>
      ))}
    </group>
  );
}

/** Clients' side: homes and a society tower. */
function ClientBank() {
  return (
    <group>
      <House position={[7.2, BANK_TOP, -2.6]} />
      <House position={[9.1, BANK_TOP, -1.0]} />
      <House position={[7.6, BANK_TOP, 2.4]} />
      <House position={[9.7, BANK_TOP, 2.4]} tall />
      <House position={[9.6, BANK_TOP, -3.3]} tall />
      {[
        [8.4, 0.6],
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
      <hemisphereLight args={['#FFF6E8', BANK, 0.95]} />
      <directionalLight
        position={[6, 16, 10]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      {/* river */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[10, 9]} />
        <meshStandardMaterial color="#ABC2D4" roughness={0.25} metalness={0.1} />
      </mesh>
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
