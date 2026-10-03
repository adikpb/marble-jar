export type Person = { id: string; name: string; createdAt: number };
export type Marble = {
  id: string;
  personId: string;
  delta: 1 | -1;
  reason: string;
  bravingTag: string;
  ts: number;
};

export const BRAVING_TAGS = [
  "Boundaries",
  "Reliability",
  "Accountability",
  "Vault",
  "Integrity",
  "Non-judgment",
  "Generosity",
] as const;

export const JAR_CAPACITY = 20;

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function clampPct(count: number): number {
  return Math.max(0, Math.min(1, count / JAR_CAPACITY));
}

// Platform implementations live in impl.native.ts (expo-sqlite) and
// impl.web.ts (localStorage). Metro resolves the right one per platform,
// so the web bundle never touches wa-sqlite (no COOP/COEP on Pages).
export * from "./impl";
