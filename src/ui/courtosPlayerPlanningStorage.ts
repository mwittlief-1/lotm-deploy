import type { CourtOsStewardshipPlanStorage } from "./courtosStewardshipPlan";

type CourtOsPlayerPlanningBridgeV1 = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

declare global {
  interface Window {
    /** Narrow desktop bridge to the mutable player SQLite database. */
    courtOsPlayerPlans?: CourtOsPlayerPlanningBridgeV1;
  }
}

/**
 * Desktop uses durable SQLite. Browser preview retains localStorage as a
 * development fallback. A missing desktop row is migrated from legacy browser
 * storage on first read, then the legacy value is removed after the next write.
 */
export function courtOsPlayerPlanningStorage(): CourtOsStewardshipPlanStorage | null {
  if (typeof window === "undefined") return null;
  const bridge = window.courtOsPlayerPlans;
  if (!bridge) return window.localStorage;
  return {
    getItem(key) {
      const native = bridge.getItem(key);
      if (native !== null) return native;
      const legacy = window.localStorage.getItem(key);
      if (legacy !== null) {
        bridge.setItem(key, legacy);
        window.localStorage.removeItem(key);
      }
      return legacy;
    },
    setItem(key, value) {
      bridge.setItem(key, value);
      window.localStorage.removeItem(key);
    },
  };
}
