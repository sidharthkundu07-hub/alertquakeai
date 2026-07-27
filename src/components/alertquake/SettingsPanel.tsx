import { useEffect, useState } from "react";
import { Settings, X, Save, RotateCcw } from "lucide-react";

export type Thresholds = {
  tempWarn: number;
  tempCrit: number;
  humWarn: number;
  humCrit: number;
  gasWarn: number;
  gasCrit: number;
};

export const DEFAULT_THRESHOLDS: Thresholds = {
  tempWarn: 70,
  tempCrit: 95,
  humWarn: 90,
  humCrit: 96,
  gasWarn: 500,
  gasCrit: 750,
};

const KEY = "alertquake-thresholds";

export function useThresholds(): [Thresholds, (t: Thresholds) => void] {
  const [t, setT] = useState<Thresholds>(DEFAULT_THRESHOLDS);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setT({ ...DEFAULT_THRESHOLDS, ...JSON.parse(raw) });
    } catch {}
  }, []);
  const update = (next: Thresholds) => {
    setT(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  };
  return [t, update];
}

type Row = { key: keyof Thresholds; label: string; unit: string; min: number; max: number; step: number };
const ROWS: Row[] = [
  { key: "tempWarn", label: "Temperature · Warn", unit: "°C", min: 30, max: 120, step: 1 },
  { key: "tempCrit", label: "Temperature · Critical", unit: "°C", min: 30, max: 150, step: 1 },
  { key: "humWarn", label: "Humidity · Warn", unit: "%", min: 40, max: 100, step: 1 },
  { key: "humCrit", label: "Humidity · Critical", unit: "%", min: 40, max: 100, step: 1 },
  { key: "gasWarn", label: "Gas (MQ-135) · Warn", unit: "ppm", min: 100, max: 900, step: 10 },
  { key: "gasCrit", label: "Gas (MQ-135) · Critical", unit: "ppm", min: 100, max: 1000, step: 10 },
];

export function SettingsButton({ thresholds, onChange }: { thresholds: Thresholds; onChange: (t: Thresholds) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Thresholds>(thresholds);

  useEffect(() => { if (open) setDraft(thresholds); }, [open, thresholds]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open settings"
        className="glass rounded-full w-9 h-9 flex items-center justify-center hover:glow-border transition text-cyan-glow"
      >
        <Settings className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-stretch justify-end">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md h-full glass border-l border-primary/30 overflow-y-auto p-6 animate-slide-in-right">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-glow">Configuration</div>
                <div className="text-lg font-semibold flex items-center gap-2"><Settings className="w-4 h-4" /> Alert Thresholds</div>
              </div>
              <button onClick={() => setOpen(false)} className="glass w-9 h-9 rounded-md flex items-center justify-center hover:glow-border">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground mb-6">
              These values drive the AI risk score, alert level (Green/Yellow/Orange/Red) and evacuation recommendations. Changes save locally and apply instantly.
            </p>

            <div className="space-y-5">
              {ROWS.map((r) => (
                <div key={r.key} className="glass rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{r.label}</label>
                    <span className="font-mono text-sm text-cyan-glow">{draft[r.key]}<span className="text-muted-foreground text-[10px] ml-1">{r.unit}</span></span>
                  </div>
                  <input
                    type="range"
                    min={r.min}
                    max={r.max}
                    step={r.step}
                    value={draft[r.key]}
                    onChange={(e) => setDraft({ ...draft, [r.key]: Number(e.target.value) })}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-muted-foreground mt-1">
                    <span>{r.min}</span><span>{r.max}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-8 sticky bottom-0 pt-4 bg-background/60 backdrop-blur">
              <button
                onClick={() => { onChange(draft); setOpen(false); }}
                className="flex-1 glass rounded-lg py-2.5 text-xs font-mono uppercase tracking-widest text-cyan-glow hover:glow-border transition flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Apply
              </button>
              <button
                onClick={() => setDraft(DEFAULT_THRESHOLDS)}
                className="glass rounded-lg px-4 py-2.5 text-xs font-mono uppercase tracking-widest hover:glow-border transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}