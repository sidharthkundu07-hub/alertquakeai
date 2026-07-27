/**
 * Family sign-up/session helper.
 *
 * A "family session" is just { name, code } saved in localStorage so it
 * survives reloads. The `code` is what scopes a family's safety data —
 * FamilySafety already keys its local fallback storage and backend calls
 * by this same code, so two different family codes never see each
 * other's check-in data.
 */
import { useEffect, useState } from "react";

export type FamilySession = { name: string; code: string };

const SESSION_KEY = "alertquake_family_session";

export function getFamilySession(): FamilySession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.name === "string" && typeof parsed?.code === "string" && parsed.name && parsed.code) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function setFamilySession(session: FamilySession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {}
}

export function clearFamilySession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

/** Normalizes a family code so "alertquake 24", "AlertQuake24", " alertquake24 " all match. */
export function normalizeFamilyCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Client-only reactive read of the current family session. Returns
 * `undefined` before hydration (so callers can avoid redirect flicker /
 * SSR mismatches), then `null` if signed out, or the session if present.
 */
export function useFamilySession() {
  const [session, setSession] = useState<FamilySession | null | undefined>(undefined);

  useEffect(() => {
    setSession(getFamilySession());
  }, []);

  return session;
}
