import { useEffect, useMemo, useState } from "react";
import {
  Building2, Users, HeartPulse, ShieldCheck, MessageCircle, X, Send, Volume2,
  Radio, Wifi, Battery, Signal, Phone, Flashlight, MapPin, Bot,
} from "lucide-react";

/** India's unified emergency number. Dials via the device's phone app. */
const EMERGENCY_NUMBER = "112";
function callEmergency() {
  try {
    window.location.href = `tel:${EMERGENCY_NUMBER}`;
  } catch {}
}

/* ---------------- ESP32 Sensor Network ---------------- */
type Node = { id: string; name: string; online: boolean; signal: number; battery: number; status: "ok" | "warn" | "crit" };
const NODES: Node[] = [
  { id: "S1", name: "Northgate", online: true, signal: 92, battery: 87, status: "ok" },
  { id: "S2", name: "West Grid", online: true, signal: 71, battery: 64, status: "warn" },
  { id: "S3", name: "East Ridge", online: true, signal: 88, battery: 92, status: "ok" },
  { id: "S4", name: "Harbor", online: true, signal: 80, battery: 45, status: "ok" },
  { id: "S5", name: "South Fault", online: true, signal: 62, battery: 38, status: "crit" },
  { id: "S6", name: "Delta", online: false, signal: 0, battery: 12, status: "warn" },
  { id: "S7", name: "Hilltop", online: true, signal: 95, battery: 78, status: "ok" },
  { id: "S8", name: "Central", online: true, signal: 84, battery: 90, status: "ok" },
];

export function ESP32Network() {
  const hub = { x: 300, y: 180 };
  const pts = NODES.map((n, i) => {
    const angle = (i / NODES.length) * Math.PI * 2;
    return { ...n, x: hub.x + Math.cos(angle) * 130, y: hub.y + Math.sin(angle) * 110 };
  });
  const color = (n: Node) => (!n.online ? "var(--muted-foreground)" : n.status === "crit" ? "var(--danger)" : n.status === "warn" ? "var(--warning)" : "var(--success)");

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-glow">Sensor Mesh</div>
          <div className="text-lg font-semibold flex items-center gap-2"><Radio className="w-4 h-4" /> ESP32 Network · 8 nodes</div>
        </div>
        <span className="text-[10px] font-mono text-success">● 7/8 ONLINE</span>
      </div>
      <div className="relative h-[300px] rounded-xl overflow-hidden grid-bg">
        <svg viewBox="0 0 600 360" className="absolute inset-0 w-full h-full">
          {pts.map((n) => (
            <line key={`l-${n.id}`} x1={hub.x} y1={hub.y} x2={n.x} y2={n.y}
              stroke={n.online ? "var(--cyan)" : "var(--muted-foreground)"} strokeWidth="1"
              className={n.online ? "animate-data-flow" : ""} opacity={n.online ? 0.6 : 0.2} />
          ))}
          <g transform={`translate(${hub.x} ${hub.y})`}>
            <circle r="26" fill="oklch(0.20 0.05 260)" stroke="var(--primary)" strokeWidth="1.5" />
            <circle r="12" fill="var(--primary)" />
            <circle r="36" fill="none" stroke="var(--primary)" strokeWidth="1" opacity="0.5" className="animate-pulse-ring" style={{ transformOrigin: "center" }} />
            <text y="50" textAnchor="middle" fontSize="10" fill="var(--cyan)" fontFamily="var(--font-mono)">GATEWAY</text>
          </g>
          {pts.map((n) => (
            <g key={n.id} transform={`translate(${n.x} ${n.y})`}>
              <circle r="14" fill={color(n)} opacity="0.15" className="animate-pulse-ring" style={{ transformOrigin: "center" }} />
              <circle r="7" fill={color(n)} />
              <text y="-14" textAnchor="middle" fontSize="9" fill="var(--foreground)" fontFamily="var(--font-mono)">{n.id}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
        {NODES.map((n) => (
          <div key={n.id} className="glass rounded-lg p-2 text-[10px] font-mono">
            <div className="flex justify-between items-center">
              <span className="text-foreground/90">{n.id} · {n.name}</span>
              <span className={n.online ? "text-success" : "text-muted-foreground"}>●</span>
            </div>
            <div className="flex justify-between mt-1 text-muted-foreground">
              <span className="flex items-center gap-1"><Signal className="w-3 h-3" /> {n.signal}%</span>
              <span className="flex items-center gap-1"><Battery className="w-3 h-3" /> {n.battery}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Seismic Wave Panel ---------------- */
export function SeismicWavePanel() {
  const stations = [
    { x: 80, y: 100 }, { x: 180, y: 60 }, { x: 300, y: 90 },
    { x: 420, y: 70 }, { x: 540, y: 110 },
  ];
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-glow">Seismic Waves</div>
          <div className="text-lg font-semibold">P-wave & S-wave Propagation</div>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground">P: 6.1 km/s · S: 3.5 km/s</div>
      </div>
      <div className="relative h-[180px] rounded-xl overflow-hidden grid-bg">
        <svg viewBox="0 0 600 180" className="absolute inset-0 w-full h-full">
          {/* ground line */}
          <line x1="0" y1="140" x2="600" y2="140" stroke="oklch(0.72 0.15 230 / 0.3)" />
          {/* epicenter left */}
          <g transform="translate(30 140)">
            <circle r="10" fill="var(--danger)" />
            <text y="28" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)" fontFamily="var(--font-mono)">EPI</text>
          </g>
          {/* waves */}
          {[0, 1, 2].map((i) => (
            <circle key={`pw${i}`} cx="30" cy="140" r="0" fill="none"
              stroke="oklch(0.85 0.15 200)" strokeWidth="1.5"
              className="animate-p-wave" style={{ animationDelay: `${i * 0.7}s` }} />
          ))}
          {[0, 1].map((i) => (
            <circle key={`sw${i}`} cx="30" cy="140" r="0" fill="none"
              stroke="var(--danger)" strokeWidth="1.5"
              className="animate-s-wave" style={{ animationDelay: `${i * 1.2}s` }} />
          ))}
          {/* stations */}
          {stations.map((s, i) => (
            <g key={i} transform={`translate(${s.x} 140)`}>
              <rect x="-6" y="-14" width="12" height="14" fill="var(--primary)" />
              <circle r="4" cx="0" cy="-18" fill="var(--cyan)" className="animate-pulse-ring" style={{ transformOrigin: "0 -18px", animationDelay: `${i * 0.3}s` }} />
              <text y="18" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)" fontFamily="var(--font-mono)">ST-{i + 1}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-3 flex gap-4 text-[10px] font-mono">
        <span className="flex items-center gap-1.5"><span className="w-3 h-[2px] bg-cyan-glow"/> P-wave (primary)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-[2px] bg-danger"/> S-wave (secondary)</span>
      </div>
    </div>
  );
}

/* ---------------- Building Safety ---------------- */
type BStatus = "safe" | "minor" | "moderate" | "severe";
const BUILDINGS: { id: string; name: string; status: BStatus }[] = [
  { id: "B01", name: "AlertQuake Tower A", status: "safe" },
  { id: "B02", name: "Riverside Housing", status: "minor" },
  { id: "B03", name: "Central Hospital", status: "safe" },
  { id: "B04", name: "Old Market Block", status: "moderate" },
  { id: "B05", name: "Harbor Warehouse", status: "severe" },
  { id: "B06", name: "North Bridge", status: "minor" },
];
const bColor: Record<BStatus, string> = { safe: "success", minor: "warning", moderate: "warning", severe: "danger" };
const bLabel: Record<BStatus, string> = { safe: "Safe", minor: "Minor Damage", moderate: "Moderate", severe: "Severe" };

export function BuildingSafety() {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-4 h-4 text-cyan-glow" />
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-glow">Structural</div>
          <div className="text-lg font-semibold">Building Safety Monitor</div>
        </div>
      </div>
      <div className="grid gap-2">
        {BUILDINGS.map((b) => {
          const c = bColor[b.status];
          return (
            <div key={b.id} className="glass rounded-lg p-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-muted-foreground">{b.id}</div>
                <div className="text-sm font-semibold">{b.name}</div>
              </div>
              <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded bg-${c}/20 text-${c}`}>
                {bLabel[b.status]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Family Safety ---------------- */
type FStatus = "safe" | "help" | "unknown";
type FamilyMember = { name: string; status: FStatus };

const FAMILY_API_BASE = "http://127.0.0.1:5000";
const LOCAL_FALLBACK_PREFIX = "alertquake_family_local_";

function loadLocalFallback(code: string): FamilyMember[] {
  try {
    const raw = localStorage.getItem(LOCAL_FALLBACK_PREFIX + code);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveLocalFallback(code: string, members: FamilyMember[]) {
  try {
    localStorage.setItem(LOCAL_FALLBACK_PREFIX + code, JSON.stringify(members));
  } catch {}
}

export function FamilySafety({ code, myName }: { code: string; myName: string }) {
  const [members, setMembers] = useState<FamilyMember[]>(() => loadLocalFallback(code));
  const [synced, setSynced] = useState(false);

  // Join on mount (registers `myName` under this family code) and poll for
  // updates from other members so everyone using the same code sees the
  // same live list, regardless of device.
  useEffect(() => {
    let cancelled = false;

    const upsertLocalSelf = () => {
      setMembers((prev) => {
        if (prev.some((m) => m.name === myName)) return prev;
        const next = [...prev, { name: myName, status: "unknown" as FStatus }];
        saveLocalFallback(code, next);
        return next;
      });
    };

    const join = async () => {
      try {
        const res = await fetch(`${FAMILY_API_BASE}/api/family/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, name: myName }),
        });
        if (!res.ok) throw new Error("join failed");
        const data = await res.json();
        if (!cancelled) {
          setMembers(data.members ?? []);
          setSynced(true);
        }
      } catch {
        if (!cancelled) {
          upsertLocalSelf();
          setSynced(false);
        }
      }
    };

    join();
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${FAMILY_API_BASE}/api/family/${encodeURIComponent(code)}/members`);
        if (!res.ok) throw new Error("poll failed");
        const data = await res.json();
        if (!cancelled) {
          setMembers(data.members ?? []);
          setSynced(true);
        }
      } catch {
        if (!cancelled) setSynced(false);
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [code, myName]);

  const updateStatus = async (name: string, status: FStatus) => {
    // optimistic local update
    setMembers((prev) => {
      const next = prev.map((m) => (m.name === name ? { ...m, status } : m));
      saveLocalFallback(code, next);
      return next;
    });
    try {
      const res = await fetch(`${FAMILY_API_BASE}/api/family/${encodeURIComponent(code)}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, status }),
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members ?? []);
        setSynced(true);
      }
    } catch {
      setSynced(false);
    }
  };

  const cycle = (name: string, current: FStatus) => {
    if (name !== myName) return; // you can only update your own status
    const order: FStatus[] = ["safe", "help", "unknown"];
    const next = order[(order.indexOf(current) + 1) % 3];
    updateStatus(myName, next);
  };

  const cMap: Record<FStatus, string> = { safe: "success", help: "danger", unknown: "warning" };
  const lMap: Record<FStatus, string> = { safe: "Safe", help: "Needs Help", unknown: "Unknown" };

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-glow" />
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-glow">
              Family · {code}
            </div>
            <div className="text-lg font-semibold">Safety Check-in</div>
          </div>
        </div>
        <button
          onClick={() => {
            updateStatus(myName, "help");
            callEmergency();
          }}
          className="glass rounded-lg px-3 py-1.5 text-xs font-mono uppercase tracking-widest text-danger hover:glow-border"
        >
          <HeartPulse className="w-3.5 h-3.5 inline mr-1" /> SOS
        </button>
      </div>

      {members.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6">
          Waiting for family members to check in…
        </div>
      ) : (
        <div className="grid gap-2">
          {members.map((m) => {
            const c = cMap[m.status];
            const isMe = m.name === myName;
            return (
              <button
                key={m.name}
                onClick={() => cycle(m.name, m.status)}
                disabled={!isMe}
                className={`glass rounded-lg p-3 flex items-center justify-between text-left ${
                  isMe ? "hover:glow-border" : "opacity-90 cursor-default"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full bg-${c}/20 text-${c} flex items-center justify-center font-mono text-xs`}>
                    {m.name[0]?.toUpperCase()}
                  </div>
                  <div className="text-sm font-semibold">
                    {m.name}
                    {isMe && <span className="text-[10px] text-cyan-glow font-mono ml-1.5">(you)</span>}
                  </div>
                </div>
                <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded bg-${c}/20 text-${c}`}>
                  {lMap[m.status]}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-3 text-[10px] font-mono text-muted-foreground flex items-center justify-between">
        <span>Tap your own tile to update status</span>
        <span className={synced ? "text-success" : "text-warning"}>
          {synced ? "● SYNCED" : "● LOCAL ONLY (backend offline)"}
        </span>
      </div>
    </div>
  );
}

/* ---------------- Preparedness Checklist ---------------- */
const ITEMS = ["Water (3 days)", "Non-perishable food", "First aid kit", "Flashlight", "Medicines", "Battery radio", "Power bank", "Important documents"];
export function PreparednessChecklist() {
  const [done, setDone] = useState<boolean[]>(() => [true, true, true, false, true, false, false, false]);
  const pct = Math.round((done.filter(Boolean).length / done.length) * 100);
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-cyan-glow" />
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-glow">Preparedness</div>
          <div className="text-lg font-semibold">Emergency Kit Checklist</div>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-2 rounded-full bg-primary/10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-cyan-glow transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="font-mono text-sm text-cyan-glow">{pct}%</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ITEMS.map((it, i) => (
          <label key={it} className="glass rounded-lg p-2.5 flex items-center gap-2 cursor-pointer hover:glow-border transition">
            <input type="checkbox" checked={done[i]} onChange={() => setDone((d) => d.map((v, idx) => idx === i ? !v : v))}
              className="accent-primary" />
            <span className={`text-xs ${done[i] ? "line-through text-muted-foreground" : ""}`}>{it}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Mobile Emergency Mode ---------------- */
export function MobileEmergencyMode() {
  const [torch, setTorch] = useState(false);
  const [sharing, setSharing] = useState(false);
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Phone className="w-4 h-4 text-cyan-glow" />
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-glow">Field Mode</div>
          <div className="text-lg font-semibold">Mobile Emergency Panel</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={callEmergency} className="glass rounded-xl p-4 text-center hover:glow-border transition group">
          <HeartPulse className="w-6 h-6 mx-auto text-danger mb-2 group-hover:animate-blink" />
          <div className="text-xs font-mono uppercase tracking-widest">One-Tap SOS</div>
          <div className="text-[10px] text-muted-foreground mt-1">alerts contacts + 112</div>
        </button>
        <button onClick={() => setSharing(!sharing)}
          className={`glass rounded-xl p-4 text-center hover:glow-border transition ${sharing ? "glow-border" : ""}`}>
          <MapPin className={`w-6 h-6 mx-auto mb-2 ${sharing ? "text-success" : "text-cyan-glow"}`} />
          <div className="text-xs font-mono uppercase tracking-widest">Live Location</div>
          <div className="text-[10px] text-muted-foreground mt-1">{sharing ? "sharing · 12 sats" : "off"}</div>
        </button>
        <button onClick={() => setTorch(!torch)}
          className={`glass rounded-xl p-4 text-center hover:glow-border transition ${torch ? "glow-border" : ""}`}>
          <Flashlight className={`w-6 h-6 mx-auto mb-2 ${torch ? "text-warning" : "text-cyan-glow"}`} />
          <div className="text-xs font-mono uppercase tracking-widest">Flashlight</div>
          <div className="text-[10px] text-muted-foreground mt-1">{torch ? "ON" : "OFF"}</div>
        </button>
        <button className="glass rounded-xl p-4 text-center hover:glow-border transition">
          <Wifi className="w-6 h-6 mx-auto text-cyan-glow mb-2" />
          <div className="text-xs font-mono uppercase tracking-widest">Contacts</div>
          <div className="text-[10px] text-muted-foreground mt-1">4 saved</div>
        </button>
      </div>
    </div>
  );
}

/* ---------------- Voice Alert (Web Speech) ---------------- */
export function VoiceAlertButton({ level }: { level: string }) {
  const say = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const text =
      level === "RED" ? "Red alert. Mandatory evacuation within five kilometer radius. Move to nearest shelter immediately." :
      level === "ORANGE" ? "Orange alert. Voluntary evacuation. Prepare emergency kits and stay near a safe zone." :
      level === "YELLOW" ? "Yellow alert. Elevated seismic activity detected. Stay alert and review your emergency plan." :
      "Green alert. All systems nominal. No action required.";
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };
  return (
    <button onClick={say} className="glass rounded-lg px-3 py-2 text-xs font-mono uppercase tracking-widest text-cyan-glow hover:glow-border flex items-center gap-1.5">
      <Volume2 className="w-3.5 h-3.5" /> Speak Alert
    </button>
  );
}

/* ---------------- AI Emergency Assistant (floating chatbot) ---------------- */
type Msg = { role: "user" | "bot"; text: string };
const CANNED: { q: RegExp; a: string }[] = [
  { q: /shelter|nearest|evacuate/i, a: "Nearest shelters: (α) AlertQuake School — 800m north, (β) Central Stadium — 1.4km east. Follow the marked evacuation route on the resource map." },
  { q: /alert|level|green|yellow|orange|red/i, a: "Green = nominal, Yellow = elevated activity (prepare kit), Orange = voluntary evacuation, Red = mandatory evacuation within 5km." },
  { q: /drop|cover|hold|shake/i, a: "During shaking: DROP to the ground, take COVER under sturdy furniture, HOLD ON until shaking stops. Stay away from windows." },
  { q: /after|aftershock/i, a: "After the quake: check for injuries, expect aftershocks, avoid damaged buildings, don't use elevators, keep radio on for updates." },
  { q: /kit|prepare|supplies/i, a: "Essential kit: 3 days of water, non-perishable food, first-aid, flashlight, medicines, battery radio, power bank, and copies of ID documents." },
  { q: /gas|leak/i, a: "Suspected gas leak? Do not use flames or switches. Open windows, evacuate, then report from a safe distance." },
];
function reply(q: string): string {
  for (const c of CANNED) if (c.q.test(q)) return c.a;
  return "I'm here to help with earthquake safety. Try asking about shelters, alert levels, Drop-Cover-Hold, or preparing an emergency kit.";
}

export function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "bot", text: "Hi, I'm AlertQuake — your AI Emergency Assistant. Ask me about safety actions, shelters, or alert levels." },
  ]);
  const [input, setInput] = useState("");
  const send = () => {
    const t = input.trim();
    if (!t) return;
    setMsgs((m) => [...m, { role: "user", text: t }, { role: "bot", text: reply(t) }]);
    setInput("");
  };
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open AI Emergency Assistant"
        className="fixed bottom-6 right-6 z-[70] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl glow-border"
        style={{ background: "linear-gradient(135deg, var(--primary), var(--cyan))" }}
      >
        <Bot className="w-6 h-6 text-primary-foreground" />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success animate-blink" />
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-[70] w-[92vw] max-w-sm glass rounded-2xl overflow-hidden shadow-2xl border border-primary/30 animate-slide-in-right">
          <div className="flex items-center justify-between p-3 border-b border-primary/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--primary), var(--cyan))" }}>
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <div className="text-sm font-semibold">AlertQuake AI</div>
                <div className="text-[10px] font-mono text-success flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success animate-blink"/>online</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-md glass flex items-center justify-center hover:glow-border">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 h-72 overflow-y-auto flex flex-col gap-2">
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                m.role === "user" ? "self-end bg-primary text-primary-foreground" : "self-start glass"
              }`}>{m.text}</div>
            ))}
          </div>
          <div className="p-3 border-t border-primary/20 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about safety, shelters…"
              className="flex-1 bg-transparent glass rounded-lg px-3 py-2 text-sm outline-none focus:glow-border"
            />
            <button onClick={send} className="glass rounded-lg w-10 flex items-center justify-center hover:glow-border text-cyan-glow">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- Notification Center (compact top-nav bell) ---------------- */
export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const notes = useMemo(() => ([
    { t: "2m", title: "Sensor S5 · anomaly", desc: "Ground tilt exceeded warn threshold" },
    { t: "18m", title: "Battery low · S6", desc: "Falls below 15% · schedule swap" },
    { t: "1h", title: "Model retrained", desc: "Neural v3.2 · confidence +2.1%" },
  ]), []);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)}
        className="glass rounded-full w-9 h-9 flex items-center justify-center hover:glow-border transition text-cyan-glow relative"
        aria-label="Notifications">
        <MessageCircle className="w-4 h-4" />
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-danger" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 glass rounded-xl overflow-hidden shadow-2xl border border-primary/30 z-[70]">
          <div className="p-3 border-b border-primary/20 text-[10px] font-mono uppercase tracking-widest text-cyan-glow">Notifications</div>
          <div className="max-h-80 overflow-y-auto">
            {notes.map((n, i) => (
              <div key={i} className="p-3 border-b border-primary/10 last:border-0">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-semibold">{n.title}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">{n.t}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{n.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}