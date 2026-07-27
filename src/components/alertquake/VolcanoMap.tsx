export function VolcanoMap() {
  const hospitals = [
    { x: 180, y: 130, name: "AlertQuake General Hospital" },
    { x: 620, y: 200, name: "Blue Cross Med Center" },
  ];
  const fire = [{ x: 260, y: 350, name: "Fire Station #7" }, { x: 540, y: 380, name: "Fire Station #12" }];
  const police = [{ x: 340, y: 100, name: "Precinct 4" }];
  const shelters = [
    { x: 100, y: 240, name: "Shelter α · School" },
    { x: 700, y: 300, name: "Shelter β · Stadium" },
    { x: 400, y: 420, name: "Shelter γ · Hall" },
  ];
  const evac = "M 100 240 Q 260 220 400 240 Q 560 260 700 300";

  return (
    <div className="relative w-full h-[480px] glass rounded-2xl overflow-hidden">
      <div className="absolute top-4 left-4 z-20 glass px-3 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-widest text-cyan-glow">
        ● Emergency Resource Map · AlertQuake Zone 14.075°N 121.045°E
      </div>
      <svg viewBox="0 0 800 480" className="absolute inset-0 w-full h-full">
        <defs>
          <radialGradient id="terrain" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="oklch(0.35 0.08 100)" />
            <stop offset="60%" stopColor="oklch(0.24 0.06 140)" />
            <stop offset="100%" stopColor="oklch(0.16 0.04 220)" />
          </radialGradient>
          <radialGradient id="dangerZone" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.65 0.24 25 / 0.5)" />
            <stop offset="100%" stopColor="oklch(0.65 0.24 25 / 0)" />
          </radialGradient>
          <radialGradient id="warnZone" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.78 0.17 75 / 0.35)" />
            <stop offset="100%" stopColor="oklch(0.78 0.17 75 / 0)" />
          </radialGradient>
        </defs>
        <rect width="800" height="480" fill="url(#terrain)" />

        {/* topography contours */}
        {[80, 120, 160, 200].map((r, i) => (
          <ellipse key={i} cx="400" cy="250" rx={r * 1.4} ry={r} fill="none" stroke="oklch(0.72 0.15 230 / 0.15)" strokeWidth="0.7" strokeDasharray="4 5" />
        ))}

        {/* shockwave zone */}
        <circle cx="400" cy="250" r="260" fill="url(#warnZone)" />
        <circle cx="400" cy="250" r="260" fill="none" stroke="oklch(0.78 0.17 75 / 0.55)" strokeWidth="1" strokeDasharray="6 6" />
        <circle cx="400" cy="250" r="140" fill="url(#dangerZone)" />
        <circle cx="400" cy="250" r="140" fill="none" stroke="oklch(0.65 0.24 25 / 0.8)" strokeWidth="1.2" strokeDasharray="4 5" />

        {/* rivers / roads */}
        <path d="M 400 250 Q 500 320 620 400" stroke="oklch(0.72 0.15 230 / 0.5)" strokeWidth="2" fill="none" />
        <path d="M 400 250 Q 300 340 180 420" stroke="oklch(0.72 0.15 230 / 0.5)" strokeWidth="2" fill="none" />

        {/* evacuation route */}
        <path d={evac} stroke="var(--success)" strokeWidth="3" fill="none" strokeDasharray="8 6" className="animate-data-flow" opacity="0.85" />
        <text x="380" y="215" fontSize="9" fill="var(--success)" fontFamily="var(--font-mono)">EVAC ROUTE →</text>

        {/* epicenter */}
        <g>
          <circle cx="400" cy="250" r="18" fill="oklch(0.35 0.05 260)" stroke="oklch(0.65 0.24 25)" strokeWidth="1.5" />
          <circle cx="400" cy="250" r="8" fill="oklch(0.65 0.24 25)" />
          <text x="400" y="222" textAnchor="middle" fill="var(--foreground)" fontSize="10" fontFamily="var(--font-mono)">EPICENTER</text>
        </g>

        {/* Hospitals */}
        {hospitals.map((h, i) => (
          <g key={`h${i}`}>
            <rect x={h.x - 8} y={h.y - 8} width="16" height="16" rx="2" fill="oklch(0.65 0.24 25)" />
            <text x={h.x} y={h.y + 3.5} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">+</text>
            <text x={h.x + 12} y={h.y + 4} fontSize="9" fill="var(--foreground)" fontFamily="var(--font-mono)">{h.name}</text>
          </g>
        ))}

        {/* Fire stations */}
        {fire.map((f, i) => (
          <g key={`f${i}`}>
            <circle cx={f.x} cy={f.y} r="7" fill="oklch(0.78 0.17 75)" />
            <text x={f.x} y={f.y + 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="#000">F</text>
            <text x={f.x + 12} y={f.y + 4} fontSize="9" fill="var(--foreground)" fontFamily="var(--font-mono)">{f.name}</text>
          </g>
        ))}

        {/* Police */}
        {police.map((p, i) => (
          <g key={`p${i}`}>
            <circle cx={p.x} cy={p.y} r="7" fill="oklch(0.72 0.18 235)" />
            <text x={p.x} y={p.y + 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">P</text>
            <text x={p.x + 12} y={p.y + 4} fontSize="9" fill="var(--foreground)" fontFamily="var(--font-mono)">{p.name}</text>
          </g>
        ))}

        {/* Shelters */}
        {shelters.map((s, i) => (
          <g key={`s${i}`}>
            <polygon points={`${s.x},${s.y - 9} ${s.x + 8},${s.y + 6} ${s.x - 8},${s.y + 6}`} fill="oklch(0.72 0.16 155)" />
            <text x={s.x + 12} y={s.y + 4} fontSize="9" fill="var(--foreground)" fontFamily="var(--font-mono)">{s.name}</text>
          </g>
        ))}
      </svg>

      <div className="absolute bottom-4 left-4 glass rounded-lg px-3 py-2 text-[10px] font-mono flex flex-wrap gap-3 z-10">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-danger"/> Hospital</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning"/> Fire</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary"/> Police</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-success"/> Shelter</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-[2px] bg-success"/> Evac route</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-[2px] bg-danger"/> Shockwave zone</span>
      </div>
    </div>
  );
}