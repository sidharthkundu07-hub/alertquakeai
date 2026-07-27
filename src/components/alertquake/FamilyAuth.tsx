import { useEffect, useState } from "react";
import { ShieldCheck, Users, LogOut, RefreshCw } from "lucide-react";

export type FamilyIdentity = { name: string; code: string };

const STORAGE_KEY = "alertquake_family_identity";

function readStored(): FamilyIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.name === "string" && typeof parsed.code === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Remembers who signed in (persists across reloads, unlike a plain
 * session) so the family doesn't have to re-enter their code every visit.
 * Call `clear()` to sign out / switch families.
 */
export function useFamilyIdentity() {
  const [identity, setIdentityState] = useState<FamilyIdentity | null>(() => readStored());

  const setIdentity = (next: FamilyIdentity) => {
    setIdentityState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const clear = () => {
    setIdentityState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return { identity, setIdentity, clear };
}

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function FamilySignInGate({ onSignedIn }: { onSignedIn: (identity: FamilyIdentity) => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedName) {
      setError("Enter your name.");
      return;
    }
    if (!trimmedCode) {
      setError("Enter your family code.");
      return;
    }
    setError(null);
    onSignedIn({ name: trimmedName, code: trimmedCode });
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center px-4"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none animate-glow-pulse"
        style={{ background: "radial-gradient(circle at 50% 30%, oklch(0.72 0.20 235 / 0.30), transparent 60%)" }}
      />

      <form onSubmit={submit} className="glass rounded-2xl p-6 md:p-8 w-full max-w-md relative z-10">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-xl bg-primary/15 text-cyan-glow flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-glow">Family Safety</div>
            <div className="text-lg font-semibold">Sign in to your family</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2 mb-6">
          Enter your name and your family's code. Everyone who uses the same code sees and updates the
          same safety check-in list — the rest of the dashboard stays shared for everyone.
        </p>

        <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
          Your name
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Priya"
          className="w-full glass rounded-lg px-3 py-2.5 text-sm mb-4 outline-none focus:glow-border bg-transparent"
        />

        <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
          Family code
        </label>
        <div className="flex gap-2 mb-1">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. GHOSH23"
            className="flex-1 glass rounded-lg px-3 py-2.5 text-sm font-mono tracking-widest uppercase outline-none focus:glow-border bg-transparent"
          />
          <button
            type="button"
            onClick={() => setCode(randomCode())}
            title="Generate a new code to share with your family"
            className="glass rounded-lg px-3 text-xs font-mono uppercase tracking-widest text-cyan-glow hover:glow-border flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> New
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mb-4">
          First one in? Tap "New" to generate a code, then share it with the rest of your family so they can join too.
        </p>

        {error && <p className="text-xs text-danger mb-3">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-lg px-4 py-3 text-sm font-mono uppercase tracking-widest bg-primary text-primary-foreground hover:opacity-90 transition flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-4 h-4" /> Join Family
        </button>
      </form>
    </div>
  );
}

export function FamilyIdentityBadge({
  identity,
  onSwitch,
}: {
  identity: FamilyIdentity;
  onSwitch: () => void;
}) {
  return (
    <button
      onClick={onSwitch}
      title="Switch family / sign out"
      className="hidden sm:flex items-center gap-1.5 glass rounded-lg px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-danger hover:glow-border transition"
    >
      <Users className="w-3 h-3" />
      {identity.name} · {identity.code}
      <LogOut className="w-3 h-3 ml-0.5" />
    </button>
  );
}
