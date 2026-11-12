"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Lightformer, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Coin } from "./coin";
import type { SceneProps } from "./scene-types";

/** The phone's screen, drawn once into a canvas texture: "₱10 sent." */
function useScreenTexture(amount: string) {
  return useMemo(() => {
    const w = 640;
    const h = 1340;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    const family = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#fafaf8");
    bg.addColorStop(0.55, "#f6efe6");
    bg.addColorStop(1, "#ffe7cf");
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    // dynamic island
    g.fillStyle = "#0b0b0b";
    g.beginPath();
    g.roundRect(w / 2 - 95, 34, 190, 54, 27);
    g.fill();
    g.fillStyle = "#5f5f5c";
    g.font = `700 26px ${family}`;
    g.fillText("SCREENED IN 4 S", 56, 190);
    g.fillStyle = "#121212";
    g.font = `800 112px ${family}`;
    g.fillText(amount, 50, 320);
    g.fillText("sent.", 50, 430);
    g.fillStyle = "#5f5f5c";
    g.font = `400 30px ${family}`;
    g.fillText("“Madalas may thesis meeting kami", 56, 520);
    g.fillText("online pagkatapos ng dinner…”", 56, 562);
    // card
    g.save();
    g.shadowColor = "rgba(168,83,0,0.35)";
    g.shadowBlur = 40;
    g.shadowOffsetY = 18;
    const card = g.createLinearGradient(0, 640, 0, 960);
    card.addColorStop(0, "#ffffff");
    card.addColorStop(1, "#fff3e6");
    g.fillStyle = card;
    g.beginPath();
    g.roundRect(44, 630, w - 88, 320, 44);
    g.fill();
    g.restore();
    g.fillStyle = "#a85300";
    g.font = `700 24px ${family}`;
    g.fillText("RULE ENGINE · PAY", 86, 700);
    g.fillStyle = "#121212";
    g.font = `700 48px ${family}`;
    g.fillText("Honest answer,", 86, 770);
    g.fillText("paid instantly", 86, 828);
    g.fillStyle = "#dcf1e2";
    g.beginPath();
    g.roundRect(86, 860, 200, 52, 26);
    g.fill();
    g.fillStyle = "#1f7a3d";
    g.font = `600 24px ${family}`;
    g.fillText("✓ valid · valid", 104, 894);
    // button
    g.fillStyle = "#121212";
    g.beginPath();
    g.roundRect(44, h - 170, w - 88, 104, 52);
    g.fill();
    g.fillStyle = "#f2f1ee";
    g.font = `600 32px ${family}`;
    const label = "View on BscScan →";
    g.fillText(label, w / 2 - g.measureText(label).width / 2, h - 106);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, [amount]);
}

function Phone({ amount }: { amount: string }) {
  const tex = useScreenTexture(amount);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <group>
      <RoundedBox args={[2.3, 4.7, 0.26]} radius={0.32} smoothness={6}>
        <meshPhysicalMaterial color="#141414" roughness={0.35} metalness={0.5} clearcoat={1} clearcoatRoughness={0.2} />
      </RoundedBox>
      <mesh position={[0, 0, 0.135]}>
        <planeGeometry args={[2.08, 4.48]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Gentle parallax toward the pointer (fine pointers only), damped. */
function Rig({ children, parallax }: { children: React.ReactNode; parallax: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  useFrame((_, dt) => {
    if (!ref.current || !parallax) return;
    const k = 1 - Math.exp(-dt * 3);
    ref.current.rotation.y += (pointer.x * 0.18 - ref.current.rotation.y) * k;
    ref.current.rotation.x += (-pointer.y * 0.1 - ref.current.rotation.x) * k;
  });
  return <group ref={ref}>{children}</group>;
}

export default function HeroCanvas({ frameloop, dpr, reduced, coarse, onReady, amount = "₱10" }: SceneProps & { amount?: string }) {
  const segs = coarse ? 40 : 64;
  // Float: slower than one cycle per 10 s, small amplitude; off under reduced motion
  const f = reduced ? { speed: 0, rotationIntensity: 0, floatIntensity: 0 } : { speed: 0.55, rotationIntensity: 0.25, floatIntensity: 0.35 };
  return (
    <Canvas
      frameloop={frameloop}
      dpr={dpr}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 10.5], fov: 34 }}
      onCreated={() => onReady?.()}
      aria-hidden
    >
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 5, 6]} intensity={1.6} />
      <pointLight position={[-4, 2, -3]} intensity={30} color="#ff8a1c" />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2.2} position={[0, 4, 3]} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#ffd29c" position={[-5, 0, 2]} scale={[3, 6, 1]} rotation-y={Math.PI / 2.5} />
        <Lightformer form="ring" intensity={1.5} color="#ffffff" position={[4, -1, 3]} scale={2} />
      </Environment>
      <Rig parallax={!coarse && !reduced}>
        <Float {...f}>
          <group position={[-0.2, -0.05, 0]} rotation={[0.22, -0.5, 0.16]}>
            <Phone amount={amount} />
          </group>
        </Float>
        <Float {...f} speed={f.speed * 0.8}>
          <group position={[1.45, 1.75, 0.6]} rotation={[0.35, -0.55, -0.2]}>
            <Coin kind="diamond" radius={0.62} segments={segs} />
          </group>
        </Float>
        <Float {...f} speed={f.speed * 1.1}>
          <group position={[1.5, -1.35, 0.9]} rotation={[0.2, -0.8, 0.25]}>
            <Coin kind="check" radius={0.5} segments={segs} />
          </group>
        </Float>
        <Float {...f} speed={f.speed * 0.7}>
          <mesh position={[-1.75, 2.05, -0.3]} rotation={[1.05, 0.2, 0.3]}>
            <torusGeometry args={[0.36, 0.13, 20, segs]} />
            <meshPhysicalMaterial color="#121212" roughness={0.25} clearcoat={1} />
          </mesh>
        </Float>
        <mesh position={[-1.9, -2.1, 0.4]}>
          <sphereGeometry args={[0.12, 24, 24]} />
          <meshStandardMaterial color="#121212" roughness={0.4} />
        </mesh>
        <mesh position={[0.9, 2.6, -0.6]}>
          <sphereGeometry args={[0.07, 24, 24]} />
          <meshStandardMaterial color="#121212" roughness={0.4} />
        </mesh>
      </Rig>
      <ContactShadows position={[0, -2.75, 0]} opacity={0.38} scale={9} blur={2.6} far={4} color="#5a2400" frames={reduced ? 1 : Infinity} />
    </Canvas>
  );
}
