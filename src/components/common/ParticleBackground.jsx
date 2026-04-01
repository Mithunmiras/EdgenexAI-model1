import { useMemo } from 'react';

export default function ParticleBackground() {
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 1,
      left: Math.random() * 100,
      delay: Math.random() * 15,
      duration: Math.random() * 20 + 15,
      color: ['rgba(16,185,129,0.2)', 'rgba(6,182,212,0.15)', 'rgba(139,92,246,0.15)'][i % 3],
    })), []
  );

  return (
    <>
      <div className="animated-bg" />
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {particles.map(p => (
          <div
            key={p.id}
            className="particle"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.left}%`,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}
