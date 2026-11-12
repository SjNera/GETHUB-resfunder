"use client";

import { useMemo } from "react";
import * as THREE from "three";

export type CoinKind = "check" | "clock" | "cross" | "diamond";

const STYLES: Record<CoinKind, { face: string; rim: string; glyph: string }> = {
  check: { face: "#2f9a54", rim: "#1c6b37", glyph: "#f2f1ee" },
  clock: { face: "#f2f1ee", rim: "#c9c6bf", glyph: "#121212" },
  cross: { face: "#d0402f", rim: "#8e1f14", glyph: "#f2f1ee" },
  diamond: { face: "#ff8a1c", rim: "#b35a00", glyph: "#121212" },
};

function Glyph({ kind, color, z }: { kind: CoinKind; color: string; z: number }) {
  const mat = <meshStandardMaterial color={color} roughness={0.35} metalness={0.1} />;
  const check = useMemo(() => {
    const path = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.38, 0.0, 0), new THREE.Vector3(-0.12, -0.26, 0), new THREE.Vector3(0.42, 0.3, 0)], false, "catmullrom", 0.05);
    return new THREE.TubeGeometry(path, 40, 0.075, 12, false);
  }, []);
  if (kind === "check")
    return (
      <mesh geometry={check} position={[0, 0, z]}>
        {mat}
      </mesh>
    );
  if (kind === "cross")
    return (
      <group position={[0, 0, z]}>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <capsuleGeometry args={[0.07, 0.62, 6, 12]} />
          {mat}
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]}>
          <capsuleGeometry args={[0.07, 0.62, 6, 12]} />
          {mat}
        </mesh>
      </group>
    );
  if (kind === "clock")
    return (
      <group position={[0, 0, z]}>
        <mesh>
          <torusGeometry args={[0.42, 0.05, 12, 48]} />
          {mat}
        </mesh>
        <mesh position={[0, 0.11, 0]}>
          <capsuleGeometry args={[0.045, 0.2, 6, 12]} />
          {mat}
        </mesh>
        <mesh position={[0.1, -0.05, 0]} rotation={[0, 0, Math.PI / 2.6]}>
          <capsuleGeometry args={[0.045, 0.16, 6, 12]} />
          {mat}
        </mesh>
      </group>
    );
  // generic diamond glyph (no third-party logo)
  return (
    <mesh position={[0, 0, z]} rotation={[0, 0, Math.PI / 4]} scale={[1, 1, 0.25]}>
      <boxGeometry args={[0.46, 0.46, 0.2]} />
      {mat}
    </mesh>
  );
}

/** A thick glossy coin facing +Z, with an embossed rim and a glyph on both faces. */
export function Coin({ kind, radius = 1, segments = 64 }: { kind: CoinKind; radius?: number; segments?: number }) {
  const s = STYLES[kind];
  const depth = 0.22;
  return (
    <group scale={radius}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1, 1, depth, segments]} />
        <meshPhysicalMaterial color={s.face} roughness={0.28} metalness={0.15} clearcoat={1} clearcoatRoughness={0.15} />
      </mesh>
      {[1, -1].map((side) => (
        <group key={side} rotation={[0, side === 1 ? 0 : Math.PI, 0]}>
          <mesh position={[0, 0, depth / 2]}>
            <torusGeometry args={[0.86, 0.045, 12, segments]} />
            <meshPhysicalMaterial color={s.rim} roughness={0.3} metalness={0.25} clearcoat={1} />
          </mesh>
          <Glyph kind={kind} color={s.glyph} z={depth / 2 + 0.04} />
        </group>
      ))}
    </group>
  );
}
