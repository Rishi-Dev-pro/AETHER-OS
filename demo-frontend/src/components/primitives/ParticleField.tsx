import { useMemo } from "react";

interface ParticleFieldProps {
  count?: number;
  className?: string;
  color?: string;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
}

export default function ParticleField({
  count = 60,
  className = "",
  color = "rgba(0,229,255,0.4)",
}: ParticleFieldProps) {
  const particles: Particle[] = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        duration: Math.random() * 20 + 15,
        delay: Math.random() * 10,
      })),
    [count]
  );

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: color,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            filter: `blur(${p.size > 1.5 ? 1 : 0}px)`,
          }}
        />
      ))}
    </div>
  );
}
