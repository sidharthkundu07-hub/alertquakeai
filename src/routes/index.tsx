import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  Battery,
  Bell,
  Camera,
  Cpu,
  Droplets,
  Flame,
  Gauge,
  MapPin,
  Mountain,
  Radar,
  Radio,
  Ruler,
  Satellite,
  ShieldAlert,
  Signal,
  Siren,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Wind,
  Zap,
  Waves,
  Move3d,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Volcano3D } from "@/components/alertquake/Volcano3D";
import { LidarMap } from "@/components/alertquake/LidarMap";
import { VolcanoMap } from "@/components/alertquake/VolcanoMap";
import { Splash } from "@/components/alertquake/Splash";
import { ThemeToggle } from "@/components/alertquake/ThemeToggle";
import { SettingsButton, useThresholds, type Thresholds } from "@/components/alertquake/SettingsPanel";
import {
  ESP32Network,
  SeismicWavePanel,
  BuildingSafety,
  FamilySafety,
  PreparednessChecklist,
  MobileEmergencyMode,
  VoiceAlertButton,
  AIChatbot,
  NotificationCenter,
} from "@/components/alertquake/EarthquakeExtras";
import { EarthquakeAlertPopup } from "@/components/alertquake/EarthquakeAlertPopup";
import { useFamilySession } from "@/lib/family-session";

export const Route = createFileRoute("/")({
  component: Index,
});

/* ---------- Live clock ---------- */
function useClock() {
  const [t, setT] = useState(() => new Date());
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const i = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return { t, mounted };
}

/* ---------- Simulated sensor stream ---------- */
type SensorReading = {
  key: string;
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  warn: number;
  crit: number;
  icon: React.ComponentType<{ className?: string }>;
};
function buildBaseline(th: Thresholds): SensorReading[] {
  return [
  { key: "vib",  label: "Ground Vibration", unit: "mm/s", value: 4.2,  min: 0,   max: 30,   warn: 12,           crit: 22,           icon: Activity },
  { key: "tilt", label: "Ground Tilt",      unit: "°",    value: 0.18, min: 0,   max: 5,    warn: 1.2,          crit: 2.5,          icon: Move3d },
  { key: "seis", label: "Seismic Activity", unit: "ML",   value: 2.1,  min: 0,   max: 8,    warn: 3.5,          crit: 5.5,          icon: Radar },
  { key: "temp", label: "Temperature",      unit: "°C",   value: 27,   min: -10, max: 60,   warn: th.tempWarn,  crit: th.tempCrit,  icon: Thermometer },
  { key: "hum",  label: "Humidity",         unit: "%",    value: 68,   min: 20,  max: 100,  warn: th.humWarn,   crit: th.humCrit,   icon: Droplets },
  { key: "pres", label: "Air Pressure",     unit: "hPa",  value: 1008, min: 950, max: 1050, warn: 995,          crit: 985,          icon: Gauge },
  { key: "gas",  label: "Gas (MQ-135)",     unit: "ppm",  value: 320,  min: 0,   max: 1000, warn: th.gasWarn,   crit: th.gasCrit,   icon: Wind },
  { key: "soil", label: "Soil Strain",      unit: "µε",   value: 58,   min: 0,   max: 400,  warn: 200,          crit: 320,          icon: Flame },
  { key: "dist", label: "Displacement",     unit: "mm",   value: 12.4, min: 0,   max: 100,  warn: 40,           crit: 70,           icon: Ruler },
  ];
}

function statusOf(r: SensorReading): "ok" | "warn" | "crit" {
  const inverted = r.key === "pres";
  if (inverted) {
    if (r.value <= r.crit) return "crit";
    if (r.value <= r.warn) return "warn";
    return "ok";
  }
  if (r.value >= r.crit) return "crit";
  if (r.value >= r.warn) return "warn";
  return "ok";
}

function useLiveSensors(thresholds: Thresholds) {
  const [readings, setReadings] = useState<SensorReading[]>(() => buildBaseline(thresholds));
  const [wsStatus, setWsStatus] = useState<"connecting" | "live" | "simulated">("connecting");
  const [history, setHistory] = useState<Array<Record<string, number>>>(() =>
    Array.from({ length: 24 }, (_, i) => ({
      t: i,
      temp: 40 + Math.sin(i / 3) * 6,
      gas: 300 + Math.sin(i / 4) * 60,
      vib: 3 + Math.sin(i / 2) * 1.5,
      pres: 1010 + Math.sin(i / 5) * 4,
      hum: 65 + Math.cos(i / 3) * 8,
      tilt: 0.2 + Math.abs(Math.sin(i / 4)) * 0.4,
      risk: 34 + Math.sin(i / 3) * 18 + (i % 5),
    })),
  );

  // Re-apply thresholds when they change
  useEffect(() => {
    setReadings((prev) => prev.map((r) => {
      if (r.key === "temp") return { ...r, warn: thresholds.tempWarn, crit: thresholds.tempCrit };
      if (r.key === "hum")  return { ...r, warn: thresholds.humWarn,  crit: thresholds.humCrit };
      if (r.key === "gas")  return { ...r, warn: thresholds.gasWarn,  crit: thresholds.gasCrit };
      return r;
    }));
  }, [thresholds]);

  // WebSocket connection to Flask backend
  useEffect(() => {
    const url = (import.meta.env.VITE_ALERTQUAKE_WS_URL as string | undefined) ?? "";
    if (!url) { setWsStatus("simulated"); return; }
    let ws: WebSocket | null = null;
    let cancelled = false;
    try {
      ws = new WebSocket(url);
      ws.onopen = () => !cancelled && setWsStatus("live");
      ws.onclose = () => !cancelled && setWsStatus("simulated");
      ws.onerror = () => !cancelled && setWsStatus("simulated");
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const readingsMsg: Record<string, number> = msg.readings ?? msg;
          setReadings((prev) => prev.map((r) => (
            readingsMsg[r.key] != null ? { ...r, value: Number(readingsMsg[r.key]) } : r
          )));
          if (typeof msg.risk === "number" || readingsMsg.risk != null) {
            setHistory((h) => [...h.slice(-23), { ...h[h.length - 1], t: (h[h.length - 1].t as number) + 1, ...readingsMsg }]);
          }
        } catch {}
      };
    } catch { setWsStatus("simulated"); }
    return () => { cancelled = true; ws?.close(); };
  }, []);

  useEffect(() => {
    if (wsStatus === "live") return; // real data flowing
    const i = setInterval(() => {
      setReadings((prev) =>
        prev.map((r) => {
          const drift = (Math.random() - 0.48) * (r.max - r.min) * 0.02;
          const next = Math.max(r.min, Math.min(r.max, r.value + drift));
          return { ...r, value: Number(next.toFixed(r.key === "vib" || r.key === "seis" || r.key === "dist" ? 2 : 1)) };
        }),
      );
      setHistory((h) => {
        const last = h[h.length - 1];
        const next = {
          t: (last.t as number) + 1,
          temp: Math.max(30, Math.min(90, (last.temp as number) + (Math.random() - 0.5) * 3)),
          gas: Math.max(200, Math.min(700, (last.gas as number) + (Math.random() - 0.5) * 30)),
          vib: Math.max(1, Math.min(15, (last.vib as number) + (Math.random() - 0.5) * 1)),
          pres: Math.max(990, Math.min(1020, (last.pres as number) + (Math.random() - 0.5) * 2)),
          hum: Math.max(40, Math.min(95, (last.hum as number) + (Math.random() - 0.5) * 3)),
          risk: Math.max(10, Math.min(95, (last.risk as number) + (Math.random() - 0.5) * 6)),
        };
        return [...h.slice(-23), next];
      });
    }, 2000);
    return () => clearInterval(i);
  }, [wsStatus]);
useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/api/sensor");
      const data = await response.json();

      // Update sensor cards
      setReadings((prev) =>
        prev.map((sensor) => ({
          ...sensor,
          value:
            data[sensor.key] !== undefined
              ? Number(data[sensor.key])
              : sensor.value,
        }))
      );

      // Update graphs
      setHistory((prev) => [
        ...prev.slice(-23),
        {
          t: (prev[prev.length - 1]?.t ?? 0) + 1,
          temp: Number(data.temp),
          gas: Number(data.gas),
          vib: Number(data.vib),
          pres: Number(data.pres),
          hum: Number(data.hum),
          tilt: Number(data.tilt),
          risk: Math.min(
            100,
            Math.round(
              Number(data.vib) * 4 +
              Number(data.seis) * 8 +
              Number(data.tilt) * 20
            )
          ),
        },
      ]);
    } catch (err) {
      console.log("Flask not connected yet.");
    }
  };

  fetchData();

  const interval = setInterval(fetchData, 1000);

  return () => clearInterval(interval);
}, []);
  return { readings, history, wsStatus };
}

/* ---------- Components ---------- */
function Nav({ wsStatus, thresholds, onThresholds }: { wsStatus: "connecting" | "live" | "simulated"; thresholds: Thresholds; onThresholds: (t: Thresholds) => void }) {
  const { t, mounted } = useClock();
  const wsLabel = wsStatus === "live" ? "WS · LIVE" : wsStatus === "connecting" ? "WS · CONNECTING" : "WS · SIMULATED";
  const wsColor = wsStatus === "live" ? "text-success" : wsStatus === "connecting" ? "text-warning" : "text-muted-foreground";
  return (
    <header className="sticky top-0 z-50 glass border-b border-primary/20">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between px-4 md:px-8 h-16">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-cyan-glow flex items-center justify-center">
              <Mountain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success animate-blink" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide">AlertQuake</div>
            <div className="text-[10px] font-mono text-muted-foreground">Blue AlertQuake House · Ops Center</div>
          </div>
        </div>
        <nav className="hidden md:flex gap-6 text-xs font-mono uppercase tracking-widest text-muted-foreground">
          <a href="#twin" className="hover:text-cyan-glow transition">Digital Twin</a>
          <a href="#sensors" className="hover:text-cyan-glow transition">Sensors</a>
          <a href="#mesh" className="hover:text-cyan-glow transition">Mesh</a>
          <a href="#map" className="hover:text-cyan-glow transition">Map</a>
          <a href="#safety" className="hover:text-cyan-glow transition">Safety</a>
          <a href="#alerts" className="hover:text-cyan-glow transition">Alerts</a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3 font-mono text-[11px]">
          <span className={`hidden sm:flex items-center gap-1.5 ${wsColor}`}><span className={`w-1.5 h-1.5 rounded-full animate-blink ${wsStatus === "live" ? "bg-success" : wsStatus === "connecting" ? "bg-warning" : "bg-muted-foreground"}`}/>{wsLabel}</span>
          <span className="hidden md:inline text-muted-foreground" suppressHydrationWarning>
            UTC {mounted ? t.toISOString().slice(11, 19) : "--:--:--"}
          </span>
          <NotificationCenter />
          <ThemeToggle />
          <SettingsButton thresholds={thresholds} onChange={onThresholds} />
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* animated backdrop */}
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 w-[600px] h-[600px] rounded-full animate-glow-pulse" style={{ background: "radial-gradient(circle, oklch(0.72 0.20 235 / 0.35), transparent 60%)" }} />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full" style={{ background: "radial-gradient(circle, oklch(0.85 0.20 40 / 0.25), transparent 70%)" }} />
      </div>

      {/* satellite orbits */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative animate-rotate-slow" style={{ width: 900, height: 900 }}>
          <div className="absolute inset-0 rounded-full border border-primary/15" />
          <Satellite className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 text-cyan-glow" />
        </div>
      </div>

      <div className="relative max-w-[1400px] mx-auto px-4 md:px-8 py-16 md:py-24 text-center">
        <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-widest text-cyan-glow mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-blink" />
          Blue AlertQuake House · Science Exhibition
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-glow leading-[1.05]">
          AI-Powered Smart Earthquake <br className="hidden md:block" />
          <span className="bg-gradient-to-r from-primary via-cyan-glow to-primary bg-clip-text text-transparent">Monitoring & Early Warning</span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground font-light italic">"Sensing the Ground. Protecting Lives."</p>

        <div className="mt-10 flex flex-wrap justify-center gap-3 text-xs font-mono">
          {[
            { icon: Cpu,   label: "AI RISK ENGINE" },
            { icon: Waves, label: "SEISMIC WAVES" },
            { icon: Radio, label: "ESP32 MESH" },
            { icon: Siren, label: "EARLY WARNING" },
          ].map((f) => (
            <div key={f.label} className="glass rounded-full px-4 py-2 flex items-center gap-2 hover:glow-border transition">
              <f.icon className="w-3.5 h-3.5 text-cyan-glow" /> {f.label}
            </div>
          ))}
        </div>

        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
          {[
            { k: "SENSORS ONLINE", v: "24 / 24" },
            { k: "UPTIME", v: "99.98%" },
            { k: "DATA/SEC", v: "2.4 MB" },
            { k: "ALERT LEVEL", v: "YELLOW" },
          ].map((s) => (
            <div key={s.k} className="glass rounded-lg py-3 px-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{s.k}</div>
              <div className="text-lg font-semibold text-cyan-glow">{s.v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SensorCard({ r }: { r: SensorReading }) {
  const s = statusOf(r);
  const Icon = r.icon;
  const color = s === "ok" ? "text-success" : s === "warn" ? "text-warning" : "text-danger";
  const bg = s === "ok" ? "bg-success" : s === "warn" ? "bg-warning" : "bg-danger";
  const trendUp = (r.value % 2) > 1;
  const pct = Math.max(0, Math.min(100, ((r.value - r.min) / (r.max - r.min)) * 100));

  return (
    <div className="glass rounded-xl p-4 relative overflow-hidden group hover:glow-border transition">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-md flex items-center justify-center bg-primary/10 ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{r.label}</div>
            <div className="text-xs font-mono text-muted-foreground/70" suppressHydrationWarning>last · 2s ago</div>
          </div>
        </div>
        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${bg}/20 ${color} uppercase tracking-widest`}>{s}</span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-semibold font-mono tabular-nums ${color}`}>{r.value}</span>
        <span className="text-xs text-muted-foreground font-mono">{r.unit}</span>
        {trendUp ? <TrendingUp className={`w-4 h-4 ${color}`} /> : <TrendingDown className={`w-4 h-4 ${color}`} />}
      </div>

      <div className="mt-3 h-1.5 rounded-full bg-primary/10 overflow-hidden">
        <div className={`h-full ${bg} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[9px] font-mono text-muted-foreground">
        <span>{r.min}</span>
        <span>Threshold {r.warn}</span>
        <span>{r.max}</span>
      </div>
    </div>
  );
}

function ExtrasCards() {
  return (
    <>
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-success"><MapPin className="w-4 h-4" /></div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">GPS Location</div>
            <div className="text-xs font-mono text-muted-foreground/70">fix · 12 sats</div>
          </div>
        </div>
        <div className="font-mono text-sm text-cyan-glow">14.0754° N</div>
        <div className="font-mono text-sm text-cyan-glow">121.0451° E</div>
        <div className="font-mono text-xs text-muted-foreground mt-1">alt 2,462 m</div>
      </div>
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-success"><Battery className="w-4 h-4" /></div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Battery</div>
            <div className="text-xs font-mono text-muted-foreground/70">solar · charging</div>
          </div>
        </div>
        <div className="text-3xl font-semibold font-mono text-success">87<span className="text-xs text-muted-foreground">%</span></div>
        <div className="mt-2 h-1.5 rounded-full bg-primary/10 overflow-hidden"><div className="h-full bg-success" style={{ width: "87%" }} /></div>
      </div>
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-cyan-glow"><Signal className="w-4 h-4" /></div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Network</div>
            <div className="text-xs font-mono text-muted-foreground/70">LoRa · 868 MHz</div>
          </div>
        </div>
        <div className="flex items-end gap-1 h-8">
          {[3, 6, 9, 12, 15].map((h, i) => (
            <div key={i} className={`w-2 rounded-sm ${i < 4 ? "bg-cyan-glow" : "bg-primary/20"}`} style={{ height: h * 1.6 }} />
          ))}
          <span className="ml-2 font-mono text-sm text-cyan-glow">−72 dBm</span>
        </div>
        <div className="font-mono text-[10px] text-muted-foreground mt-1">latency 42ms · loss 0.2%</div>
      </div>
    </>
  );
}

function AIRiskPanel({ risk }: { risk: number }) {
  const level =
    risk < 25 ? { key: "SAFE",       color: "success", desc: "All ground-motion signals nominal. No precursor patterns detected by the neural model." } :
    risk < 50 ? { key: "LOW RISK",   color: "success", desc: "Minor micro-tremors within baseline. Continue routine monitoring; no action needed." } :
    risk < 75 ? { key: "MODERATE",   color: "warning", desc: "Elevated ground vibration and tilt anomalies. Review evacuation plans and stay alert." } :
                { key: "HIGH RISK",  color: "danger",  desc: "Strong precursor pattern: rising vibration, tilt drift and strain. Prepare to Drop-Cover-Hold and expect strong shaking." };

  const confidence = Math.round(70 + (risk / 100) * 25);
  const anomalies = risk < 25 ? 0 : risk < 50 ? 1 : risk < 75 ? 3 : 6;
  const trend = risk > 55 ? "rising" : risk < 30 ? "stable" : "watch";

  return (
    <div className="glass rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full animate-glow-pulse" style={{ background: `radial-gradient(circle, var(--${level.color}) , transparent 70%)`, opacity: 0.25 }} />
      <div className="flex items-center justify-between mb-4 relative">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">AI Risk Analysis</div>
          <div className="text-lg font-semibold flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-glow" /> AlertQuake Seismic Model v3.2
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-mono uppercase tracking-widest bg-${level.color}/20 text-${level.color}`}>{level.key}</span>
      </div>

      {/* gauge */}
      <div className="relative w-full h-40 flex items-end justify-center">
        <svg viewBox="0 0 200 110" className="w-full max-w-[320px]">
          <defs>
            <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="oklch(0.72 0.16 155)" />
              <stop offset="45%" stopColor="oklch(0.78 0.17 75)" />
              <stop offset="100%" stopColor="oklch(0.65 0.24 25)" />
            </linearGradient>
          </defs>
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="oklch(0.30 0.05 260)" strokeWidth="14" strokeLinecap="round" />
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gauge)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(risk / 100) * 251} 251`} />
          <g transform={`translate(100 100) rotate(${-90 + (risk / 100) * 180})`}>
            <line x1="0" y1="0" x2="0" y2="-70" stroke="var(--foreground)" strokeWidth="2" />
            <circle r="6" fill="var(--foreground)" />
          </g>
        </svg>
      </div>

      <div className="text-center -mt-4">
        <div className="text-4xl font-mono font-bold text-glow">{risk.toFixed(0)}<span className="text-lg text-muted-foreground">/100</span></div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">Composite Risk Score</div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{level.desc}</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="glass rounded-lg p-3">
          <div className="text-[10px] font-mono uppercase text-muted-foreground">Model Confidence</div>
          <div className="text-xl font-mono text-cyan-glow">{confidence}%</div>
        </div>
        <div className="glass rounded-lg p-3">
          <div className="text-[10px] font-mono uppercase text-muted-foreground">Sensor Anomalies</div>
          <div className="text-xl font-mono text-cyan-glow">{anomalies}<span className="text-[10px] text-muted-foreground ml-1">flagged</span></div>
        </div>
      </div>
      <div className="mt-3 glass rounded-lg p-3">
        <div className="text-[10px] font-mono uppercase text-muted-foreground">Recommended Action · Trend: <span className="text-cyan-glow">{trend}</span></div>
        <div className="text-sm mt-1">
          {level.key === "SAFE"      && "No action required. Keep sensors powered."}
          {level.key === "LOW RISK"  && "Verify emergency-kit checklist. Practice Drop-Cover-Hold."}
          {level.key === "MODERATE"  && "Alert building manager; identify safe zones; secure loose objects."}
          {level.key === "HIGH RISK" && "Evacuate to open ground / shelter. Follow marked route. Await official siren."}
        </div>
        <div className="text-[10px] font-mono text-muted-foreground mt-2 italic">Risk assessment · not a guaranteed earthquake prediction.</div>
      </div>
    </div>
  );
}

function AnalyticsCharts({ history }: { history: Array<Record<string, number>> }) {
  const charts = [
    { key: "vib",  label: "Ground Vibration", color: "oklch(0.72 0.18 235)", unit: " mm/s" },
    { key: "tilt", label: "Ground Tilt",      color: "oklch(0.85 0.15 200)", unit: "°" },
    { key: "temp", label: "Temperature",      color: "oklch(0.75 0.22 40)",  unit: "°C" },
    { key: "hum",  label: "Humidity",         color: "oklch(0.78 0.17 75)",  unit: "%" },
    { key: "pres", label: "Air Pressure",     color: "oklch(0.72 0.16 155)", unit: " hPa" },
    { key: "risk", label: "AI Risk Score",    color: "oklch(0.65 0.24 25)",  unit: "/100" },
  ];
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {charts.map((c) => (
        <div key={c.key} className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{c.label}</div>
              <div className="font-mono text-sm" style={{ color: c.color }}>{((history[history.length - 1][c.key] as number) ?? 0).toFixed(2)}{c.unit}</div>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id={`g-${c.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c.color} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={c.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0.72 0.15 230 / 0.08)" />
                <XAxis dataKey="t" hide />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.14 0.05 260 / 0.95)",
                    border: "1px solid oklch(0.72 0.18 235 / 0.4)",
                    borderRadius: 8,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                  }}
                  labelStyle={{ color: "var(--muted-foreground)" }}
                />
                <Area
  type="monotone"
  dataKey={c.key}
  stroke={c.color}
  strokeWidth={2}
  fill={`url(#g-${c.key})`}
  isAnimationActive={true}
  animationDuration={300}
  animationEasing="linear"
/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertCenter({ risk }: { risk: number }) {
  const level =
    risk < 30 ? "GREEN" :
    risk < 55 ? "YELLOW" :
    risk < 78 ? "ORANGE" : "RED";

  const colors: Record<string, string> = {
    GREEN: "success",
    YELLOW: "warning",
    ORANGE: "warning",
    RED: "danger",
  };
  const c = colors[level];

  const [countdown, setCountdown] = useState(180);
  useEffect(() => {
    const i = setInterval(() => setCountdown((v) => (v <= 0 ? 180 : v - 1)), 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="glass rounded-2xl p-6 relative overflow-hidden">
      <div className={`absolute inset-0 pointer-events-none opacity-30`} style={{ background: `radial-gradient(circle at top right, var(--${c}), transparent 60%)` }} />
      <div className="flex items-center justify-between mb-6 relative">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl bg-${c}/20 text-${c} flex items-center justify-center animate-blink`}>
            <Siren className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Emergency Alert Center</div>
            <div className="text-lg font-semibold">Alert Level · <span className={`text-${c}`}>{level}</span></div>
          </div>
        </div>
        <button className={`glass rounded-lg px-4 py-2 text-xs font-mono uppercase tracking-widest hover:glow-border text-${c}`}>
          <Bell className="w-3.5 h-3.5 inline mr-1" /> Broadcast
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-3 relative">
        <div className="glass rounded-lg p-3">
          <div className="text-[10px] font-mono uppercase text-muted-foreground">Aftershock Probability</div>
          <div className={`text-2xl font-mono text-${c}`}>{Math.round(risk * 0.6)}%</div>
          <div className="text-[10px] font-mono text-muted-foreground">next 24h window</div>
        </div>
        <div className="glass rounded-lg p-3">
          <div className="text-[10px] font-mono uppercase text-muted-foreground">Next System Scan</div>
          <div className="text-2xl font-mono text-cyan-glow">{String(Math.floor(countdown / 60)).padStart(2, "0")}:{String(countdown % 60).padStart(2, "0")}</div>
          <div className="text-[10px] font-mono text-muted-foreground">countdown</div>
        </div>
        <div className="glass rounded-lg p-3">
          <div className="text-[10px] font-mono uppercase text-muted-foreground">SMS / Email Alerts</div>
          <div className="text-2xl font-mono text-success">ACTIVE</div>
          <div className="text-[10px] font-mono text-muted-foreground">1,284 subscribers</div>
        </div>
        <div className="glass rounded-lg p-3">
          <div className="text-[10px] font-mono uppercase text-muted-foreground">Siren Network</div>
          <div className={`text-2xl font-mono text-${c}`}>{level === "GREEN" ? "STANDBY" : "ARMED"}</div>
          <div className="text-[10px] font-mono text-muted-foreground">12 towers online</div>
        </div>
      </div>

      <div className={`mt-4 glass rounded-lg p-4 border border-${c}/40 flex items-start gap-3 relative`}>
        <ShieldAlert className={`w-5 h-5 text-${c} shrink-0 mt-0.5`} />
        <div>
          <div className="text-sm font-semibold">Safety Recommendation</div>
          <div className="text-sm text-muted-foreground mt-1">
            {level === "GREEN" && "No action required. All sensors nominal."}
            {level === "YELLOW" && "Advisory: review your emergency kit. Drop-Cover-Hold drill recommended. Residents within 5 km stay alert."}
            {level === "ORANGE" && "Voluntary evacuation from unreinforced structures. Head to open ground or shelters α / β / γ."}
            {level === "RED"    && "MANDATORY EVACUATION within 5 km. Drop-Cover-Hold during shaking. Sirens engaged, SMS & email dispatched."}
          </div>
          <div className="mt-2 flex gap-2 flex-wrap">
            <VoiceAlertButton level={level} />
            <span className="text-[10px] font-mono text-muted-foreground self-center">Risk assessment · not a guaranteed earthquake prediction.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CameraPanel() {
  const [fps, setFps] = useState(29.8);
  useEffect(() => {
    const i = setInterval(() => setFps(Number((28 + Math.random() * 3).toFixed(1))), 1500);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="glass rounded-2xl p-4 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-cyan-glow" />
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">CAM-01 · AlertQuake Tower A</div>
        </div>
        <span className="text-[10px] font-mono text-danger flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-danger animate-blink"/>REC</span>
      </div>

      <div className="relative aspect-video rounded-xl overflow-hidden border border-primary/30">
        {/* fake video: gradient + building silhouette + crack detection */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, oklch(0.25 0.05 260) 0%, oklch(0.14 0.04 260) 100%)" }} />
        <svg viewBox="0 0 400 220" className="absolute inset-0 w-full h-full">
          <rect x="80"  y="70"  width="60" height="140" fill="oklch(0.22 0.05 260)" stroke="oklch(0.72 0.15 230 / 0.35)" />
          <rect x="160" y="40"  width="80" height="170" fill="oklch(0.24 0.05 260)" stroke="oklch(0.72 0.15 230 / 0.35)" />
          <rect x="260" y="90"  width="60" height="120" fill="oklch(0.22 0.05 260)" stroke="oklch(0.72 0.15 230 / 0.35)" />
          {/* windows */}
          {Array.from({ length: 6 }).map((_, r) =>
            Array.from({ length: 3 }).map((_, c) => (
              <rect key={`w${r}${c}`} x={168 + c * 22} y={50 + r * 26} width="10" height="12" fill="oklch(0.85 0.15 200 / 0.55)" />
            ))
          )}
          {/* crack */}
          <path d="M 205 60 L 200 100 L 208 130 L 198 170" stroke="var(--danger)" strokeWidth="1.6" fill="none" />
        </svg>
        {/* detection box */}
        <div className="absolute left-[46%] top-[25%] w-16 h-40 border-2 border-danger rounded-sm">
          <span className="absolute -top-5 left-0 text-[10px] font-mono bg-danger text-background px-1 rounded-sm">CRACK 0.91</span>
        </div>
        <div className="absolute left-[18%] top-[58%] w-12 h-12 border-2 border-cyan-glow rounded-sm">
          <span className="absolute -top-5 left-0 text-[10px] font-mono bg-cyan-glow text-background px-1 rounded-sm">MOTION 0.78</span>
        </div>
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        {/* scanline */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-0 right-0 h-8 animate-scan-y" style={{ background: "linear-gradient(to bottom, transparent, oklch(0.85 0.15 200 / 0.3), transparent)" }} />
        </div>
        <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[10px] font-mono text-cyan-glow">
          <span>1920×1080 · {fps} FPS</span>
          <span>AI DETECTION · ONLINE</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 text-[10px] font-mono">
        <div className="glass rounded p-2"><div className="text-muted-foreground">Cracks</div><div className="text-danger">1 detected</div></div>
        <div className="glass rounded p-2"><div className="text-muted-foreground">Motion</div><div className="text-cyan-glow">Active</div></div>
        <div className="glass rounded p-2"><div className="text-muted-foreground">Uptime</div><div className="text-cyan-glow">14d 6h</div></div>
      </div>
    </div>
  );
}

function IntegrationsFooter() {
  const items = [
    { icon: Cpu, label: "Flask Backend", detail: "REST · /api/v1" },
    { icon: Radio, label: "ESP32 Mesh", detail: "24 nodes · LoRa" },
    { icon: Zap, label: "WebSocket", detail: "wss://alertquake.live" },
    { icon: Satellite, label: "Historical DB", detail: "PostgreSQL · 3.2M pts" },
  ];
  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-8 py-12">
      <div className="glass rounded-2xl p-6">
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-4">System Integrations</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((i) => (
            <div key={i.label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-cyan-glow">
                <i.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">{i.label}</div>
                <div className="text-[11px] font-mono text-muted-foreground">{i.detail}</div>
              </div>
              <span className="ml-auto flex items-center gap-1 text-[10px] font-mono text-success"><span className="w-1.5 h-1.5 rounded-full bg-success animate-blink"/>OK</span>
            </div>
          ))}
        </div>
      </div>
      <div className="text-center text-[11px] font-mono text-muted-foreground mt-8">
        © Blue AlertQuake House · Science Exhibition · AlertQuake Earthquake Monitoring & Early Warning System v3.2
      </div>
    </section>
  );
}

/* ---------- Page ---------- */
function Index() {
  const [splash, setSplash] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);
  const [thresholds, setThresholds] = useThresholds();
  const { readings, history, wsStatus } = useLiveSensors(thresholds);
  const risk = history[history.length - 1].risk as number;
  const vibration = Number(readings.find((r) => r.key === "vib")?.value ?? 0);
  const temperature = Number(readings.find((r) => r.key === "temp")?.value ?? 0);

  const navigate = useNavigate();
  const familySession = useFamilySession();
  useEffect(() => {
    // undefined = not hydrated yet, null = signed out -> send to signup
    if (familySession === null) navigate({ to: "/signup" });
  }, [familySession, navigate]);


    



  return (
    <div className="min-h-screen text-foreground">
      
      {hydrated && splash && <Splash onDone={() => setSplash(false)} />}
      {hydrated && <EarthquakeAlertPopup risk={risk} threshold={78} />}
      <Nav wsStatus={wsStatus} thresholds={thresholds} onThresholds={setThresholds} />
      <Hero />

      {/* 3D Digital Twin + AI risk */}
      <section id="twin" className="max-w-[1400px] mx-auto px-4 md:px-8 py-12">
        <SectionHeader
          eyebrow="01 · Interactive 3D Earthquake Map"
          title="AlertQuake Zone — 3D Digital Twin"
          desc="Live seismic terrain with epicenter, fault line, intensity heatmap, and ESP32 sensor stations. Rotate, zoom, and inspect each node."
        />
        <div className="grid lg:grid-cols-3 gap-4 mt-6">
          <div className="lg:col-span-2">
            <Volcano3D />
          </div>
          <AIRiskPanel risk={risk} />
        </div>
      </section>

      {/* Live sensor cards */}
      <section id="sensors" className="max-w-[1400px] mx-auto px-4 md:px-8 py-6">
        <SectionHeader
          eyebrow="02 · Live Sensor Dashboard"
          title="Real-time Seismic Telemetry"
          desc="Vibration, tilt, strain and environment signals streaming from the mesh network every 2 seconds."
        />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-6">
          {readings.map((r) => <SensorCard key={r.key} r={r} />)}
          <ExtrasCards />
        </div>
      </section>

      {/* ESP32 mesh + Seismic waves */}
      <section id="mesh" className="max-w-[1400px] mx-auto px-4 md:px-8 py-12">
        <SectionHeader
          eyebrow="03 · ESP32 Sensor Mesh & Seismic Waves"
          title="Wireless Node Network"
          desc="Star-topology mesh — each ESP32 station streams ground-motion telemetry to the gateway. Live P-wave and S-wave propagation is visualized alongside."
        />
        <div className="grid lg:grid-cols-2 gap-4 mt-6">
          <ESP32Network />
          <SeismicWavePanel />
        </div>
      </section>

      {/* LiDAR Terrain */}
      <section id="lidar" className="max-w-[1400px] mx-auto px-4 md:px-8 py-12">
        <SectionHeader
          eyebrow="04 · Live LiDAR Terrain"
          title="128-Channel Point-Cloud Scan"
          desc="Autonomous laser survey reveals ground deformation, surface cracks, and obstacle zones in real time."
        />
        <div className="mt-6">
          <LidarMap />
        </div>
      </section>

      {/* Emergency Resource Map */}
      <section id="map" className="max-w-[1400px] mx-auto px-4 md:px-8 py-12">
        <SectionHeader
          eyebrow="05 · Emergency Resource Map"
          title="Hospitals, Shelters & Evacuation Routes"
          desc="Nearest hospitals, fire stations, police precincts, relief shelters and marked evacuation corridors from the AlertQuake zone."
        />
        <div className="mt-6">
          <VolcanoMap />
        </div>
      </section>

      {/* Building safety + family safety + camera */}
      <section id="safety" className="max-w-[1400px] mx-auto px-4 md:px-8 py-12">
        <SectionHeader
          eyebrow="06 · People & Structures"
          title="Safety Overview"
          desc="Family check-in, building structural status, live surveillance and field-mode tools for on-the-ground responders."
        />
        <div className="grid lg:grid-cols-3 gap-4 mt-6">
          {familySession ? (
            <FamilySafety code={familySession.code} myName={familySession.name} />
          ) : (
            <div className="glass rounded-2xl p-5 flex items-center justify-center text-sm text-muted-foreground">
              Loading family session…
            </div>
          )}
          <BuildingSafety />
          <CameraPanel />
        </div>
      </section>

      {/* Alerts */}
      <section id="alerts" className="max-w-[1400px] mx-auto px-4 md:px-8 py-12">
        <SectionHeader
          eyebrow="07 · Emergency Response"
          title="Alert Center"
          desc="Coordinated response with siren network, SMS/Email dispatch and voice alerts. Green → Yellow → Orange → Red escalation."
        />
        <div className="grid lg:grid-cols-3 gap-4 mt-6">
          <div className="lg:col-span-2">
            <AlertCenter risk={risk} />
          </div>
          <MobileEmergencyMode />
        </div>
      </section>

      {/* Preparedness */}
      <section id="prep" className="max-w-[1400px] mx-auto px-4 md:px-8 py-12">
        <SectionHeader
          eyebrow="08 · Preparedness"
          title="Emergency Kit Progress"
          desc="Track your household earthquake-preparedness checklist — water, food, first-aid, radio, and important documents."
        />
        <div className="mt-6">
          <PreparednessChecklist />
        </div>
      </section>

      {/* Analytics */}
      <section id="analytics" className="max-w-[1400px] mx-auto px-4 md:px-8 py-12">
        <SectionHeader
          eyebrow="09 · Historical Analytics"
          title="Trend Analysis · Last 24 Cycles"
          desc="Continuous time-series pulled from the historical database and analyzed by the AI risk model."
        />
        <div className="mt-6">
          <AnalyticsCharts history={history} />
        </div>
      </section>

      <IntegrationsFooter />
      <AIChatbot />
    </div>
  );
}

function SectionHeader({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return (
    <div className="max-w-3xl">
      <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-glow">{eyebrow}</div>
      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mt-2">{title}</h2>
      <p className="text-sm text-muted-foreground mt-2">{desc}</p>
    </div>
  );
}
function setRisk(newRisk: any) {
  throw new Error("Function not implemented.");
}

