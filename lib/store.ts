export type Person = { id: string; name: string; createdAt: number };
export type Marble = {
  id: string;
  personId: string;
  chapterId: string;
  delta: 1 | -1;
  reason: string;
  bravingTag: string;
  ts: number;
};

// A jar "chapter" is one fill cycle: marbles accrue until the jar is full,
// then the chapter closes and the next one opens. Every person has exactly one
// live (open) chapter.
export type Chapter = {
  id: string;
  personId: string;
  index: number;
  openedAt: number;
  closedAt: number | null;
  finalCount: number;
};

export type SortKey = "recent" | "fullest" | "name";
export type PersonRow = Person & { count: number; pct: number };
export type ListMarblesOpts = { chapterId?: string; limit?: number; offset?: number };
export type WeeklyTrendPoint = { weekStart: number; count: number };
export type TagBreakdownRow = { tag: string; added: number; removed: number };

export const UNTAGGED_LABEL = "Untagged";

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

export const DEFAULT_TREND_WEEKS = 12;

// One hue per BRAVING tag, shared everywhere a tag is referenced —
// present and future. Seven muted hues of equal visual weight, keyed by
// tag name in BRAVING order; anything unrecognized falls back to the
// neutral faded marble so "no tag" never reads as a tag.
export const TAG_HUES: Record<string, string> = {
  Boundaries: "#BE9A4E",
  Reliability: "#7C9DB4",
  Accountability: "#9A7FA8",
  Vault: "#BB7E5C",
  Integrity: "#5F9E97",
  "Non-judgment": "#BE8B93",
  Generosity: "#9AA064",
};

export const UNTAGGED_HUE = "#B9B2A1";

export function tagHue(tag: string): string {
  return TAG_HUES[tag.trim()] ?? UNTAGGED_HUE;
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function clampPct(count: number): number {
  return Math.max(0, Math.min(1, count / JAR_CAPACITY));
}

// Monday 00:00 local time of the week containing `ts`. Local (not UTC) so the
// weekly buckets line up with the user's own week boundaries.
export function startOfWeek(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

// The last `weeks` Monday-aligned week starts, oldest first, ending with the
// week containing "now". Stepping by calendar days keeps bucket starts at
// local midnight across DST shifts.
export function getWeekStarts(weeks: number, now: number = Date.now()): number[] {
  const total = Math.max(1, Math.floor(weeks));
  const thisWeek = startOfWeek(now);
  const starts: number[] = [];
  for (let i = total - 1; i >= 0; i -= 1) {
    const d = new Date(thisWeek);
    d.setDate(d.getDate() - i * 7);
    starts.push(d.getTime());
  }
  return starts;
}

export function tagLabel(tag: string): string {
  return tag.trim() || UNTAGGED_LABEL;
}

// Sorting is shared by both backends so web and native order identically.
export function sortRows(
  rows: PersonRow[],
  sort: SortKey,
  activity: Map<string, number>,
): PersonRow[] {
  const sorted = [...rows];
  if (sort === "fullest") {
    sorted.sort((a, b) => b.pct - a.pct || b.count - a.count || a.name.localeCompare(b.name));
  } else if (sort === "name") {
    sorted.sort((a, b) => a.name.localeCompare(b.name) || b.count - a.count);
  } else {
    sorted.sort((a, b) => {
      const at = activity.get(a.id) ?? a.createdAt;
      const bt = activity.get(b.id) ?? b.createdAt;
      return bt - at || a.name.localeCompare(b.name);
    });
  }
  return sorted;
}

// Platform implementations live in impl.native.ts (expo-sqlite) and
// impl.web.ts (localStorage). Metro resolves the right one per platform,
// so the web bundle never touches wa-sqlite (no COOP/COEP on Pages).
export * from "./impl";
