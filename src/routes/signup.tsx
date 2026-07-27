import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Users, ArrowRight } from "lucide-react";
import { setFamilySession, normalizeFamilyCode } from "@/lib/family-session";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const normalizedCode = normalizeFamilyCode(code);

    if (!trimmedName) {
      setError("Enter your name.");
      return;
    }
    if (!normalizedCode) {
      setError("Enter your family code.");
      return;
    }

    setFamilySession({ name: trimmedName, code: normalizedCode });
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 grid-bg">
      <div className="glass rounded-2xl p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-cyan-glow flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-glow">
              AlertQuake Early Warning
            </div>
            <div className="text-lg font-semibold">Family Sign-In</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your name and your family code. Everyone who uses the same family code sees the
          same family safety check-in — separate families never see each other's data.
        </p>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-glow block mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya"
              className="w-full glass rounded-lg px-3.5 py-2.5 text-sm bg-transparent outline-none focus:glow-border"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-glow block mb-1.5">
              Family Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. SEN-HOME"
              className="w-full glass rounded-lg px-3.5 py-2.5 text-sm bg-transparent outline-none focus:glow-border font-mono uppercase tracking-widest"
            />
            <div className="text-[11px] text-muted-foreground mt-1.5">
              Don't have one yet? Make one up and share it with your family — the first person to
              use a code creates it, everyone after that joins the same family.
            </div>
          </div>

          {error && <div className="text-xs text-danger font-mono">{error}</div>}

          <button
            type="submit"
            className="mt-2 glass rounded-lg px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:glow-border transition text-cyan-glow"
          >
            <ShieldCheck className="w-4 h-4" /> Continue to Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
