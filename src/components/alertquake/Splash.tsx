console.log("Splash component rendered");
import { useEffect, useRef, useState } from "react";
import newtownLogo from "@/assets/newtown-school.png.jpeg";

/**
 * Timeline:
 *  0.00s → 1.50s : logos spin-in on Y axis (rotateY 0 → 720°, scale 0.4 → 1)
 *  1.50s → 3.50s : logos pulse (enlarge/shrink), pledge text fades in and holds
 *  3.50s → 4.20s : fade out
 *  4.20s         : unmount
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"spin" | "hold" | "leave">("spin");
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const toHold = setTimeout(() => setPhase("hold"), 1500);
    const toLeave = setTimeout(() => setPhase("leave"), 3500);
    const end = setTimeout(() => doneRef.current(), 4200);
    return () => {
      clearTimeout(toHold);
      clearTimeout(toLeave);
      clearTimeout(end);
    };
    // Timers must persist across parent re-renders; onDone is read from ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoAnim = phase === "spin" ? "animate-splash-spin-in" : "animate-splash-pulse";

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center px-6 pt-[8vh] md:pt-[6vh] transition-opacity duration-700 ${
        phase === "leave" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ background: "var(--gradient-hero)" }}
    >
      {/* radial glow */}
      <div
        className="absolute inset-0 pointer-events-none animate-glow-pulse"
        style={{ background: "radial-gradient(circle at 50% 35%, oklch(0.72 0.20 235 / 0.35), transparent 60%)" }}
      />
      {/* stars */}
      <div className="absolute inset-0 pointer-events-none opacity-50">
        {Array.from({ length: 60 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white animate-blink"
            style={{
              width: 2,
              height: 2,
              left: `${(i * 47) % 100}%`,
              top: `${(i * 71) % 100}%`,
              animationDelay: `${(i % 6) * 0.25}s`,
            }}
          />
        ))}
      </div>

      {/* Logo 1 — Newtown (top) */}
      <div className="relative z-10 mt-2">
        <div className="absolute -inset-4 rounded-[2rem] bg-primary/25 blur-3xl animate-glow-pulse" />
        <div className={`relative w-56 h-56 md:w-64 md:h-64 rounded-[2rem] bg-white shadow-2xl flex items-center justify-center overflow-hidden ${logoAnim}`}>
          <img
            src={newtownLogo}
            alt="The Newtown School Kolkata"
            className="w-[85%] h-[85%] object-contain"
          />
        </div>
      </div>

      {/* Tagline — appears after spin */}
      {phase !== "spin" && (
        <div
          className="relative z-10 text-[10px] font-mono uppercase tracking-[0.4em] text-cyan-glow/80 mt-10 animate-splash-text-in"
          style={{ animationDelay: "0.5s" }}
        >
          The Future Begins Here
        </div>
      )}
    </div>
  );
}