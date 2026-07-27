import { useMemo, useState } from "react";

function seeded(i: number) {
  const x = Math.sin(i * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export function LidarMap() {
  const [rot, setRot] = useState(20);
  const points = useMemo(() => {
    const pts: { x: number; y: number; z: number; heat: number; crack?: boolean }[] = [];
    for (let i = 0; i < 900; i++) {
      const r = seeded(i) * 260;
      const theta = seeded(i + 1000) * Math.PI * 2;
      const dx = Math.cos(theta) * r;
      const dy = Math.sin(theta) * r * 0.55;
      const elev = Math.max(0, 1 - r / 260) + (seeded(i + 500) - 0.5) * 0.15;
      const heat = Math.max(0, elev - 0.6) + seeded(i + 800) * 0.1;
      const crack = seeded(i + 2000) > 0.985;
      pts.push({ x: 400 + dx, y: 260 + dy - elev * 120, z: elev, heat, crack });
    }
    return pts;
  }, []);

  const obstacles = [
    { x: 470, y: 200, r: 8 },
    { x: 340, y: 280, r: 10 },
    { x: 500, y: 300, r: 6 },
  ];

  const pointColor = (p: { z: number; heat: number; crack?: boolean }) => {
    if (p.crack) return "#FF3B3B";
    if (p.heat > 0.28) return "oklch(0.75 0.22 40)";
    if (p.z > 0.6) return "oklch(0.9 0.15 200)";
    if (p.z > 0.35) return "oklch(0.72 0.18 235)";
    return "oklch(0.5 0.14 250)";
  };

  return (
    <div className="relative w-full h-[520px] glass rounded-2xl overflow-hidden">
      <div className="absolute top-4 left-4 z-20 glass px-3 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-widest text-cyan-glow">
        ● LiDAR Scan · 128-Channel · 2.4M pts/s
      </div>
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button onClick={() => setRot((r) => r - 10)} className="glass px-3 py-1 rounded-md text-xs font-mono">◀</button>
        <button onClick={() => setRot(20)} className="glass px-3 py-1 rounded-md text-xs font-mono">Reset</button>
        <button onClick={() => setRot((r) => r + 10)} className="glass px-3 py-1 rounded-md text-xs font-mono">▶</button>
      </div>

      {/* scan line */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute left-0 right-0 h-24 animate-scan-y"
          style={{
            background:
              "linear-gradient(to bottom, transparent, oklch(0.85 0.15 200 / 0.35), transparent)",
          }}
        />
      </div>

      <svg
        viewBox="0 0 800 520"
        className="absolute inset-0 w-full h-full"
        style={{ transform: `perspective(1200px) rotateX(${rot}deg)`, transformOrigin: "center" }}
      >
        <defs>
          <radialGradient id="lidarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.72 0.18 235 / 0.15)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width="800" height="520" fill="url(#lidarGlow)" />

        {/* grid */}
        {Array.from({ length: 20 }).map((_, i) => (
          <line
            key={`gx-${i}`}
            x1={i * 40}
            y1={0}
            x2={i * 40}
            y2={520}
            stroke="oklch(0.72 0.15 230 / 0.08)"
            strokeWidth="0.5"
          />
        ))}
        {Array.from({ length: 14 }).map((_, i) => (
          <line
            key={`gy-${i}`}
            x1={0}
            y1={i * 40}
            x2={800}
            y2={i * 40}
            stroke="oklch(0.72 0.15 230 / 0.08)"
            strokeWidth="0.5"
          />
        ))}

        {/* elevation contours */}
        {[0.2, 0.4, 0.6, 0.8].map((e) => (
          <ellipse
            key={e}
            cx="400"
            cy={260 - e * 80}
            rx={260 * (1 - e * 0.85)}
            ry={140 * (1 - e * 0.85)}
            fill="none"
            stroke="oklch(0.85 0.15 200 / 0.28)"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
        ))}

        {/* point cloud */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={0.9 + p.z * 1.4} fill={pointColor(p)} opacity={0.55 + p.z * 0.4} />
        ))}

        {/* obstacles / cracks */}
        {obstacles.map((o, i) => (
          <g key={i}>
            <circle cx={o.x} cy={o.y} r={o.r} fill="none" stroke="#FF3B3B" strokeWidth="1.2" />
            <circle cx={o.x} cy={o.y} r={o.r + 6} fill="none" stroke="#FF3B3B" strokeWidth="0.6" opacity="0.5" className="animate-pulse-ring" style={{ transformOrigin: `${o.x}px ${o.y}px` }} />
            <text x={o.x + o.r + 4} y={o.y + 3} fontSize="9" fill="#FF6B6B" fontFamily="var(--font-mono)">OBS-{i + 1}</text>
          </g>
        ))}

        {/* sensor markers */}
        {[{x:280,y:260},{x:400,y:180},{x:520,y:270},{x:400,y:340}].map((s, i) => (
          <g key={i}>
            <circle cx={s.x} cy={s.y} r="4" fill="var(--cyan)" />
            <circle cx={s.x} cy={s.y} r="10" fill="none" stroke="var(--cyan)" strokeWidth="0.8" className="animate-pulse-ring" style={{ transformOrigin: `${s.x}px ${s.y}px` }} />
          </g>
        ))}
      </svg>

      <div className="absolute bottom-4 left-4 glass rounded-lg px-3 py-2 text-[10px] font-mono flex flex-wrap gap-3 z-10 max-w-[95%]">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{background:"oklch(0.9 0.15 200)"}}/> High Elev</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{background:"oklch(0.72 0.18 235)"}}/> Mid</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{background:"oklch(0.5 0.14 250)"}}/> Low</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{background:"oklch(0.75 0.22 40)"}}/> Heat Zone</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger"/> Crack / Obstacle</span>
      </div>
      <div className="absolute bottom-4 right-4 glass rounded-lg px-3 py-2 text-[10px] font-mono z-10">
        <div>RANGE <span className="text-cyan-glow">248m</span></div>
        <div>FOV <span className="text-cyan-glow">360°</span></div>
        <div>PRECISION <span className="text-cyan-glow">±2cm</span></div>
      </div>
    </div>
  );
}