"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Environment } from "@react-three/drei";
import { useRef } from "react";
import type { Mesh } from "three";

function FloatingShape({
  position,
  color,
  scale = 1,
  speed = 1,
}: {
  position: [number, number, number];
  color: string;
  scale?: number;
  speed?: number;
}) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x = state.clock.elapsedTime * 0.15 * speed;
    ref.current.rotation.y = state.clock.elapsedTime * 0.2 * speed;
  });
  return (
    <Float speed={2 * speed} rotationIntensity={0.6} floatIntensity={1.2}>
      <mesh ref={ref} position={position} scale={scale}>
        <icosahedronGeometry args={[1, 1]} />
        <MeshDistortMaterial
          color={color}
          distort={0.35}
          speed={2}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
    </Float>
  );
}

function TorusShape({
  position,
  color,
  scale = 1,
}: {
  position: [number, number, number];
  color: string;
  scale?: number;
}) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x = state.clock.elapsedTime * 0.3;
    ref.current.rotation.z = state.clock.elapsedTime * 0.2;
  });
  return (
    <Float speed={1.5} rotationIntensity={0.8} floatIntensity={1.5}>
      <mesh ref={ref} position={position} scale={scale}>
        <torusGeometry args={[0.7, 0.25, 16, 64]} />
        <meshStandardMaterial
          color={color}
          roughness={0.15}
          metalness={0.9}
          emissive={color}
          emissiveIntensity={0.15}
        />
      </mesh>
    </Float>
  );
}

export function Hero3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <pointLight position={[-5, -5, -5]} intensity={0.8} color="#a855f7" />

      <FloatingShape position={[-2.2, 0.8, 0]} color="#8b5cf6" scale={1.1} speed={1} />
      <FloatingShape position={[2, -0.5, -1]} color="#d946ef" scale={0.85} speed={1.3} />
      <FloatingShape position={[0, 1.5, -2]} color="#7c3aed" scale={0.6} speed={0.8} />
      <TorusShape position={[1.8, 1.2, 0]} color="#c084fc" scale={0.7} />
      <TorusShape position={[-1.5, -1.3, 0]} color="#e879f9" scale={0.5} />

      <Environment preset="city" />
    </Canvas>
  );
}
