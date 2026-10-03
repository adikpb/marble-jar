import { clampPct, type Marble, type Person, uid } from "./store";

// Web fallback: localStorage. Static web hosts (e.g. Pages) can't set
// COOP/COEP headers, so WASM SQLite is off the table here. Same async API
// as the native expo-sqlite implementation.
const P_KEY = "mj:people:v1";
const M_KEY = "mj:marbles:v1";

function readWeb<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeWeb(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / private mode — app still works in-memory
  }
}

export async function listPeople(): Promise<Person[]> {
  const people = readWeb<Person[]>(P_KEY, []);
  return [...people].sort((a, b) => b.createdAt - a.createdAt);
}

export async function addPerson(name: string): Promise<Person> {
  const person: Person = { id: uid(), name: name.trim(), createdAt: Date.now() };
  if (!person.name) throw new Error("Name is required");
  const people = readWeb<Person[]>(P_KEY, []);
  writeWeb(P_KEY, [person, ...people]);
  return person;
}

export async function getPerson(id: string): Promise<Person | null> {
  return readWeb<Person[]>(P_KEY, []).find((p) => p.id === id) ?? null;
}

export async function listMarbles(personId: string): Promise<Marble[]> {
  return readWeb<Marble[]>(M_KEY, [])
    .filter((m) => m.personId === personId)
    .sort((a, b) => b.ts - a.ts);
}

export async function addMarble(
  personId: string,
  delta: 1 | -1,
  reason = "",
  bravingTag = "",
): Promise<Marble> {
  const marble: Marble = {
    id: uid(),
    personId,
    delta,
    reason: reason.trim(),
    bravingTag,
    ts: Date.now(),
  };
  const all = readWeb<Marble[]>(M_KEY, []);
  writeWeb(M_KEY, [marble, ...all]);
  return marble;
}

export async function getJarStats(personId: string): Promise<{ count: number; pct: number }> {
  const count = readWeb<Marble[]>(M_KEY, [])
    .filter((m) => m.personId === personId)
    .reduce((sum, m) => sum + m.delta, 0);
  return { count, pct: clampPct(count) };
}

export async function getPeopleWithCounts(): Promise<(Person & { count: number; pct: number })[]> {
  const people = await listPeople();
  return Promise.all(
    people.map(async (p) => {
      const stats = await getJarStats(p.id);
      return { ...p, count: stats.count, pct: stats.pct };
    }),
  );
}
