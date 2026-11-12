"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { useRef } from "react";
import type * as THREE from "three";
import { Coin, type CoinKind } from "./coin";
import type { SceneProps } from "./scene-types";

/** Materializes (scale 0.9 → 1, critically damped) then sways slowly; static under reduced motion. */
function Spinner({ kind, reduced, coarse }: { kind: CoinKind; reduced: boolean; coarse: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    t.current += dt;
    const s = reduced ? 1 : 1 - 0.1 * Math.exp(-t.current * 7);
    g.scale.setScalar(s);
    g.rotation.y = reduced ? -0.35 : -0.35 + Math.sin(t.current * 0.5) * 0.22; // ~12.6 s per sway
    g.rotation.x = 0.18;
  });
  return (
    <group ref={ref}>
      <Coin kind={kind} radius={1.15} segments={coarse ? 48 : 72} />
    </group>
  );
}

export default function CoinCanvas({ frameloop, dpr, reduced, coarse, onReady, kind }: SceneProps & { kind: CoinKind }) {
  return (
    <Canvas frameloop={frameloop} dpr={dpr} gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0.3, 5.2], fov: 35 }} onCreated={() => onReady?.()} aria-hidden>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 4, 5]} intensity={1.8} />
      <Environment resolution={64}>
        <Lightformer form="rect" intensity={2.5} position={[0, 3, 3]} scale={[6, 2, 1]} />
        <Lightformer form="ring" intensity={1.5} position={[-3, 0, 2]} scale={2} />
      </Environment>
      <Spinner kind={kind} reduced={reduced} coarse={coarse} />
      <ContactShadows position={[0, -1.45, 0]} opacity={0.35} scale={5} blur={2.4} far={3} frames={reduced ? 1 : Infinity} />
    </Canvas>
  );
}
