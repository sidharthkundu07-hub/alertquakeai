import { useState } from "react";

type Sensor = { id: string; x: number; y: number; label: string; status: "ok" | "warn" | "crit" };

const SENSORS: Sensor[] = [
  { id: "S1", x: 140, y: 140, label: "ESP32-S1 · Northgate", status: "ok" },
  { id: "S2", x: 260, y: 300, label: "ESP32-S2 · West Grid", status: "warn" },
  { id: "S3", x: 640, y: 150, label: "ESP32-S3 · East Ridge", status: "ok" },
  { id: "S4", x: 660, y: 340, label: "ESP32-S4 · Harbor", status: "ok" },
  { id: "S5", x: 210, y: 430, label: "ESP32-S5 · South Fault", status: "crit" },
  { id: "S6", x: 560, y: 440, label: "ESP32-S6 · Delta", status: "ok" },
];

export function Volcano3D() {
  const [rot, setRot] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [hovered, setHovered] = useState<string | null>(null);

  // Epicenter position — center of the fault
  const epi = { x: 400, y: 260 };

  const statusColor = (s: Sensor["status"]) =>
    s === "ok" ? "var(--success)" : s === "warn" ? "var(--warning)" : "var(--danger)";

  return (
    <div className="relative w-full h-[520px] glass rounded-2xl overflow-hidden grid-bg">
      {/* controls */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button
          onClick={() => setRot((r) => r - 15)}
          className="glass px-3 py-1 rounded-md text-xs font-mono hover:glow-border transition"
        >
          ◀ Rotate
        </button>
        <button
          onClick={() => setRot((r) => r + 15)}
          className="glass px-3 py-1 rounded-md text-xs font-mono hover:glow-border transition"
        >
          Rotate ▶
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
          className="glass px-3 py-1 rounded-md text-xs font-mono hover:glow-border transition"
        >
          +
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
          className="glass px-3 py-1 rounded-md text-xs font-mono hover:glow-border transition"
        >
          −
        </button>
      </div>

      <div className="absolute top-4 left-4 z-20 glass px-3 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-widest text-cyan-glow">
        ● Live · 3D Digital Twin · Seismic Zone
      </div>

      <svg
        viewBox="0 0 800 520"
        className="absolute inset-0 w-full h-full"
        style={{ transform: `perspective(1200px) rotateX(35deg) scale(${zoom}) rotateZ(${rot}deg)`, transformStyle: "preserve-3d", transition: "transform 0.6s" }}
      >
        <defs>
          <radialGradient id="epi" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="oklch(0.85 0.24 25)" />
            <stop offset="60%" stopColor="oklch(0.65 0.24 25 / 0.5)" />
            <stop offset="100%" stopColor="oklch(0.65 0.24 25 / 0)" />
          </radialGradient>
          <radialGradient id="heatmap" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="oklch(0.65 0.24 25 / 0.55)" />
            <stop offset="45%" stopColor="oklch(0.78 0.17 75 / 0.35)" />
            <stop offset="80%" stopColor="oklch(0.72 0.16 155 / 0.15)" />
            <stop offset="100%" stopColor="oklch(0.72 0.16 155 / 0)" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* terrain grid */}
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`gx${i}`} x1={i * 80} y1="0" x2={i * 80} y2="520"
            stroke="oklch(0.72 0.15 230 / 0.12)" strokeWidth="0.6" />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`gy${i}`} x1="0" y1={i * 65} x2="800" y2={i * 65}
            stroke="oklch(0.72 0.15 230 / 0.12)" strokeWidth="0.6" />
        ))}

        {/* seismic intensity heatmap */}
        <circle cx={epi.x} cy={epi.y} r="320" fill="url(#heatmap)" />

        {/* fault line */}
        <path
          d="M 40 420 Q 200 380 320 310 Q 400 265 500 220 Q 620 170 760 130"
          stroke="oklch(0.65 0.24 25 / 0.55)"
          strokeWidth="2.5"
          fill="none"
          strokeDasharray="10 6"
        />
        <text x="60" y="440" fontSize="9" fill="oklch(0.65 0.24 25)" fontFamily="var(--font-mono)">
          FAULT LINE · ALERTQUAKE ESCARPMENT
        </text>

        {/* P-wave & S-wave concentric expansion */}
        {[0, 1, 2].map((i) => (
          <circle key={`p${i}`} cx={epi.x} cy={epi.y} r="0" fill="none"
            stroke="oklch(0.85 0.15 200 / 0.7)" strokeWidth="1.5"
            className="animate-p-wave"
            style={{ animationDelay: `${i * 0.7}s` }} />
        ))}
        {[0, 1].map((i) => (
          <circle key={`s${i}`} cx={epi.x} cy={epi.y} r="0" fill="none"
            stroke="oklch(0.65 0.24 25 / 0.7)" strokeWidth="1.8"
            className="animate-s-wave"
            style={{ animationDelay: `${i * 1.2}s` }} />
        ))}

        {/* epicenter marker */}
        <g transform={`translate(${epi.x} ${epi.y})`}>
          <circle r="46" fill="url(#epi)" filter="url(#glow)" />
          <circle r="12" fill="oklch(0.65 0.24 25)" filter="url(#glow)" />
          <circle r="4" fill="#fff" />
          <path d="M -20 0 L 20 0 M 0 -20 L 0 20" stroke="#fff" strokeWidth="1" />
          <text y="-56" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--foreground)" fontFamily="var(--font-mono)">
            EPICENTER · M 4.2
          </text>
          <text y="60" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)" fontFamily="var(--font-mono)">
            depth 12 km
          </text>
        </g>

        {/* data flow lines from each sensor to epicenter */}
        {SENSORS.map((s) => (
          <line key={`l-${s.id}`} x1={s.x} y1={s.y} x2={epi.x} y2={epi.y}
            stroke="var(--cyan)" strokeWidth="1" className="animate-data-flow" opacity="0.45" />
        ))}

        {/* sensors */}
        {SENSORS.map((s) => (
          <g
            key={s.id}
            transform={`translate(${s.x} ${s.y})`}
            onMouseEnter={() => setHovered(s.id)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: "pointer" }}
          >
            <circle r="14" fill={statusColor(s.status)} opacity="0.15" className="animate-pulse-ring" style={{ transformOrigin: "center" }} />
            <circle r="6" fill={statusColor(s.status)} filter="url(#glow)" />
            <circle r="3" fill="#fff" />
            <text y="-12" textAnchor="middle" fontSize="9" fill="var(--foreground)" fontFamily="var(--font-mono)">
              {s.id}
            </text>
            {hovered === s.id && (
              <g>
                <rect x="10" y="-8" width="140" height="22" rx="4" fill="oklch(0.14 0.05 260 / 0.95)" stroke="var(--primary)" />
                <text x="18" y="6" fontSize="9" fill="var(--foreground)" fontFamily="var(--font-mono)">
                  {s.label}
                </text>
              </g>
            )}
          </g>
        ))}
      </svg>

      {/* legend */}
      <div className="absolute bottom-4 left-4 glass rounded-lg px-3 py-2 text-[10px] font-mono flex gap-4 z-10">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" /> Nominal</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning" /> Warning</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger" /> Critical</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger" /> Epicenter</span>
      </div>
    </div>
  );
}