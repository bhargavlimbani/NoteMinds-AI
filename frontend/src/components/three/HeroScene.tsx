import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, MeshTransmissionMaterial, Sparkles, Stars } from '@react-three/drei';
import type { Group, Mesh } from 'three';

/** Slowly rotating group of floating shapes - the "brain" of StudyMCP. */
function Shapes() {
  const group = useRef<Group>(null);
  const ring = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.12;
    if (ring.current) {
      ring.current.rotation.x += delta * 0.25;
      ring.current.rotation.z += delta * 0.1;
    }
    const t = state.clock.elapsedTime;
    if (group.current) group.current.position.y = Math.sin(t * 0.6) * 0.1;
  });

  return (
    <group ref={group}>
      {/* Core orb */}
      <Float speed={1.6} rotationIntensity={0.6} floatIntensity={1.2}>
        <mesh>
          <icosahedronGeometry args={[1.15, 4]} />
          <MeshDistortMaterial color="#8b5cf6" emissive="#4c1d95" emissiveIntensity={0.35} roughness={0.15} metalness={0.6} distort={0.35} speed={2} />
        </mesh>
      </Float>

      {/* Glass ring */}
      <mesh ref={ring} rotation={[Math.PI / 2.6, 0.2, 0]}>
        <torusGeometry args={[2, 0.08, 24, 120]} />
        <MeshTransmissionMaterial color="#22d3ee" thickness={0.4} roughness={0.05} transmission={0.95} ior={1.3} chromaticAberration={0.04} />
      </mesh>

      {/* Orbiting satellites */}
      <Float speed={2.2} rotationIntensity={1.2} floatIntensity={2}>
        <mesh position={[2.4, 0.8, -0.4]}>
          <octahedronGeometry args={[0.32, 0]} />
          <meshStandardMaterial color="#22d3ee" emissive="#0e7490" emissiveIntensity={0.7} metalness={0.7} roughness={0.2} />
        </mesh>
      </Float>
      <Float speed={1.8} rotationIntensity={1} floatIntensity={1.6}>
        <mesh position={[-2.2, -0.6, 0.6]}>
          <dodecahedronGeometry args={[0.36, 0]} />
          <meshStandardMaterial color="#f472b6" emissive="#9d174d" emissiveIntensity={0.5} metalness={0.6} roughness={0.25} />
        </mesh>
      </Float>
      <Float speed={2.6} rotationIntensity={1.4} floatIntensity={1.8}>
        <mesh position={[0.4, 2.1, 0.9]}>
          <tetrahedronGeometry args={[0.3, 0]} />
          <meshStandardMaterial color="#a78bfa" emissive="#5b21b6" emissiveIntensity={0.6} metalness={0.5} roughness={0.3} />
        </mesh>
      </Float>
      <Float speed={1.4} rotationIntensity={0.8} floatIntensity={1.4}>
        <mesh position={[-0.9, -2.0, -0.8]}>
          <torusKnotGeometry args={[0.24, 0.08, 80, 12]} />
          <meshStandardMaterial color="#34d399" emissive="#065f46" emissiveIntensity={0.6} metalness={0.7} roughness={0.2} />
        </mesh>
      </Float>

      <Sparkles count={60} scale={6} size={2.2} speed={0.4} color="#c4b5fd" />
    </group>
  );
}

interface Props {
  className?: string;
  compact?: boolean;
}

/** WebGL scene used on the auth pages (full) and dashboard hero (compact). */
export default function HeroScene({ className, compact = false }: Props) {
  return (
    <div className={className ?? 'h-full w-full'}>
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, compact ? 6.5 : 6], fov: 45 }} gl={{ antialias: true, alpha: true }} style={{ background: 'transparent' }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 6, 4]} intensity={1.4} color="#c4b5fd" />
        <pointLight position={[-5, -3, 2]} intensity={1.2} color="#22d3ee" />
        <pointLight position={[3, -4, -3]} intensity={0.8} color="#f472b6" />
        {!compact && <Stars radius={40} depth={30} count={900} factor={3} saturation={0.4} fade speed={0.6} />}
        <Shapes />
      </Canvas>
    </div>
  );
}
