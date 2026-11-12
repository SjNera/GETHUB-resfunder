"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, MeshDistortMaterial } from "@react-three/drei";
import { useRef } from "react";
import type * as THREE from "three";
import type { SceneProps } from "./scene-types";

function Orb({ reduced, coarse }: { reduced: boolean; coarse: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current && !reduced) ref.current.rotation.y += dt * 0.08; // one turn ≈ 78 s
  });
  return (
    <mesh ref={ref} scale={1.65}>
      <sphereGeometry args={[1, coarse ? 96 : 160, coarse ? 96 : 160]} />
      <MeshDistortMaterial
        color="#ff8a1c"
        distort={reduced ? 0.18 : 0.26}
        speed={reduced ? 0 : 0.7}
        roughness={0.12}
        metalness={0.15}
        clearcoat={1}
        clearcoatRoughness={0.08}
        envMapIntensity={1.4}
      />
    </mesh>
  );
}

/** The Liquid Brokers-style orb for the dark "How it works" stage. */
export default function OrbCanvas({ frameloop, dpr, reduced, coarse, onReady }: SceneProps) {
  return (
    <Canvas frameloop={frameloop} dpr={dpr} gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0, 6], fov: 40 }} onCreated={() => onReady?.()} aria-hidden>
      <ambientLight intensity={0.15} />
      <pointLight position={[-3, 2.5, 3]} intensity={60} color="#ffd29c" />
      <pointLight position={[3, -2, 2]} intensity={40} color="#7d8cff" />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={3} position={[-3, 3, 4]} scale={[4, 2, 1]} color="#ffe2bf" />
        <Lightformer form="rect" intensity={1.5} position={[4, -2, 3]} scale={[3, 3, 1]} color="#8fa0ff" />
        <Lightformer form="ring" intensity={2} position={[0, 0, -5]} scale={6} color="#ff8a1c" />
      </Environment>
      <Orb reduced={reduced} coarse={coarse} />
    </Canvas>
  );
}
