import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Siren as SirenIcon, X } from "lucide-react";
import "./EarthquakeAlert.css";

/**
 * Session-only dismiss: once the user dismisses, the popup stays hidden
 * for the rest of THIS browser tab session, even if risk stays high.
 * On reload, sessionStorage is gone, so if risk is high again it reappears.
 */
const DISMISS_KEY = "alertquake_alert_dismissed_session";

/**
 * Mobile browsers (Android Chrome especially) keep a freshly-created
 * AudioContext "suspended" until the page has seen a real user gesture —
 * otherwise the siren can render completely silently. This attaches a
 * one-time listener that resumes the context on the very first tap/touch
 * anywhere on the page, so the alert is guaranteed audible even if it
 * fires before the visitor has interacted with anything.
 */
function unlockAudioOnFirstGesture(ctx: AudioContext) {
  if (ctx.state !== "suspended") return () => {};
  const resume = () => {
    ctx.resume().catch(() => {});
  };
  const events: Array<keyof DocumentEventMap> = ["pointerdown", "touchstart", "click", "keydown"];
  events.forEach((e) => document.addEventListener(e, resume, { once: true, passive: true }));
  return () => {
    events.forEach((e) => document.removeEventListener(e, resume));
  };
}

function playSiren(audioCtxRef: React.MutableRefObject<AudioContext | null>, onStopRequested: () => void) {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return () => {};
    const ctx = audioCtxRef.current ?? new AC();
    audioCtxRef.current = ctx;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const unsubscribeUnlock = unlockAudioOnFirstGesture(ctx);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.2);

    // classic two-tone wailing siren sweep
    let rising = true;
    const sweep = () => {
      const now = ctx.currentTime;
      if (rising) {
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.9);
      } else {
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.9);
      }
      rising = !rising;
    };
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    sweep();
    const interval = setInterval(sweep, 900);

    // Tell Android (and other platforms) this is real, ongoing media —
    // this is what makes background/lock-screen playback more reliable,
    // and surfaces a lock-screen "Stop" control tied to the dismiss button.
    const nav = navigator as any;
    if ("mediaSession" in navigator) {
      try {
        nav.mediaSession.metadata = new (window as any).MediaMetadata({
          title: "Seismic Alert Active",
          artist: "AlertQuake Early Warning System",
          album: "Drop · Cover · Hold",
        });
        nav.mediaSession.playbackState = "playing";
        nav.mediaSession.setActionHandler?.("stop", onStopRequested);
        nav.mediaSession.setActionHandler?.("pause", onStopRequested);
      } catch {}
    }

    // Re-resume if the browser suspends the context on backgrounding and
    // then restores tab visibility (some mobile browsers do this even
    // mid-playback rather than only before first interaction).
    const onVisibility = () => {
      if (document.visibilityState === "visible" && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      unsubscribeUnlock();
      document.removeEventListener("visibilitychange", onVisibility);
      if ("mediaSession" in navigator) {
        try {
          nav.mediaSession.playbackState = "none";
          nav.mediaSession.setActionHandler?.("stop", null);
          nav.mediaSession.setActionHandler?.("pause", null);
        } catch {}
      }
      clearInterval(interval);
      try {
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
        setTimeout(() => {
          osc.stop();
          osc.disconnect();
          gain.disconnect();
        }, 200);
      } catch {}
    };
  } catch {
    return () => {};
  }
}

/**
 * Keeps the device from sleeping/locking while a high-risk alert is active,
 * using the Screen Wake Lock API. This is what actually keeps the siren
 * audible over time — if the OS is allowed to sleep, the whole browser
 * process (and every tab's audio) is frozen, and no web page can prevent
 * that on its own. Re-acquires the lock automatically if the browser
 * releases it (e.g. after a tab-visibility change).
 */
function useWakeLock(active: boolean) {
  const [status, setStatus] = useState<"idle" | "active" | "unsupported" | "denied">("idle");
  const lockRef = useRef<any>(null);

  useEffect(() => {
    if (!active) {
      lockRef.current?.release?.().catch(() => {});
      lockRef.current = null;
      setStatus("idle");
      return;
    }

    const nav = navigator as any;
    if (!nav.wakeLock) {
      setStatus("unsupported");
      return;
    }

    let cancelled = false;

    const request = async () => {
      try {
        const lock = await nav.wakeLock.request("screen");
        if (cancelled) {
          lock.release().catch(() => {});
          return;
        }
        lockRef.current = lock;
        setStatus("active");
        lock.addEventListener?.("release", () => {
          if (!cancelled) setStatus("idle");
        });
      } catch {
        if (!cancelled) setStatus("denied");
      }
    };

    request();

    // Browsers auto-release the lock when the tab is hidden; grab it back
    // the moment the tab is visible again (e.g. switching back from
    // another app during the exhibition).
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !lockRef.current) {
        request();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      lockRef.current?.release?.().catch(() => {});
      lockRef.current = null;
    };
  }, [active]);

  return status;
}

export type EarthquakeAlertPopupProps = {
  risk: number;
  /** risk score (0-100) at/above which the popup should show */
  threshold?: number;
};

export function EarthquakeAlertPopup({ risk, threshold = 78 }: EarthquakeAlertPopupProps) {
  const isHighRisk = risk >= threshold;

  const [dismissedThisSession, setDismissedThisSession] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  // If risk drops back down and later rises again, we want the alert to be
  // able to show again even within the same session — dismissal only
  // applies to the *current* high-risk episode, not forever in the tab.
  const wasHighRiskRef = useRef(isHighRisk);
  useEffect(() => {
    if (!isHighRisk && wasHighRiskRef.current) {
      // risk fell back below threshold -> reset dismissal for next spike
      setDismissedThisSession(false);
      try {
        sessionStorage.removeItem(DISMISS_KEY);
      } catch {}
    }
    wasHighRiskRef.current = isHighRisk;
  }, [isHighRisk]);

  const visible = isHighRisk && !dismissedThisSession;

  const handleDismiss = () => {
    setDismissedThisSession(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  const audioCtxRef = useRef<AudioContext | null>(null);
  const handleDismissRef = useRef(handleDismiss);
  handleDismissRef.current = handleDismiss;
  useEffect(() => {
    if (!visible) return;
    const stop = playSiren(audioCtxRef, () => handleDismissRef.current());
    return stop;
  }, [visible]);

  // Keep the machine awake for exactly as long as the siren is actually
  // playing (same condition as `visible`) — if the OS is allowed to sleep,
  // the whole browser process freezes and the siren goes silent with it.
  const wakeLockStatus = useWakeLock(visible);

  if (!visible) return null;

  return (
    <div className="emergency-overlay screen-shake" role="alertdialog" aria-live="assertive">
      <div className="emergency-card">
        <div className="emergency-header flex items-center gap-4">
          <SirenIcon className="w-10 h-10 text-white shrink-0 animate-pulse" />
          <div>
            <div className="warning-title">SEISMIC ALERT</div>
            <div className="warning-sub">
              High-risk ground-motion pattern detected · AlertQuake Zone
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="metric-card">
              <div className="text-[11px] font-mono uppercase tracking-widest text-white/60">
                Composite Risk Score
              </div>
              <div className="metric-value">{risk.toFixed(0)}</div>
              <div className="text-[11px] font-mono text-white/50">/ 100</div>
            </div>
            <div className="metric-card">
              <div className="text-[11px] font-mono uppercase tracking-widest text-white/60 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Status
              </div>
              <div className="text-2xl font-mono font-bold text-white mt-2">HIGH RISK</div>
              <div className="text-[11px] font-mono text-white/50">Threshold: {threshold}+</div>
            </div>
          </div>

          <div className="take-cover text-center mb-6" style={{ fontSize: "clamp(28px, 6vw, 56px)" }}>
            DROP · COVER · HOLD
          </div>

          <p className="text-sm text-white/70 text-center mb-6">
            Strong precursor pattern detected: rising vibration, tilt drift and strain. Move away from
            windows and heavy furniture. This is an automated risk assessment, not a guaranteed earthquake
            prediction.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button className="dismiss-btn flex items-center gap-2 justify-center" onClick={handleDismiss}>
              <X className="w-4 h-4" /> Dismiss Alert
            </button>
          </div>

          <div className="text-center text-[10px] font-mono text-white/40 mt-4">
            {wakeLockStatus === "active" && "Screen wake-lock engaged · device will not sleep while siren is active"}
            {wakeLockStatus === "denied" && "Wake-lock request was denied by the browser · keep this device plugged in and awake manually"}
            {wakeLockStatus === "unsupported" && "Wake-lock not supported in this browser · keep this device plugged in and awake manually"}
          </div>
        </div>
      </div>
    </div>
  );
}
