import {
  type Chapter,
  clampPct,
  DEFAULT_TREND_WEEKS,
  getWeekStarts,
  JAR_CAPACITY,
  type ListMarblesOpts,
  type Marble,
  type Person,
  type PersonRow,
  type SortKey,
  sortRows,
  startOfWeek,
  type TagBreakdownRow,
  tagLabel,
  uid,
  type WeeklyTrendPoint,
} from "./store-shared";

// Web fallback: localStorage. Static web hosts (e.g. Pages) can't set
// COOP/COEP headers, so WASM SQLite is off the table here. Same async API
// as the native expo-sqlite implementation.
const P_KEY = "mj:people:v1";
const M_KEY = "mj:marbles:v1";
const C_KEY = "mj:chapters:v1";

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

function newChapter(personId: string, index: number, openedAt: number): Chapter {
  return { id: uid(), personId, index, openedAt, closedAt: null, finalCount: 0 };
}

// Backfill: installs from before chapters have no chapters and no
// marble.chapterId. Give every person one open chapter (index 0, opened when
// they were created) and tag their existing marbles with it.
function migrateWeb(): void {
  const people = readWeb<Person[]>(P_KEY, []);
  const chapters = readWeb<Chapter[]>(C_KEY, []);
  const marbles = readWeb<Marble[]>(M_KEY, []);

  const liveByPerson = new Map<string, Chapter>();
  for (const c of chapters) {
    if (c.closedAt === null) liveByPerson.set(c.personId, c);
  }
  let addedChapter = false;
  for (const p of people) {
    if (liveByPerson.has(p.id)) continue;
    const chapter = newChapter(p.id, 0, p.createdAt);
    chapters.push(chapter);
    liveByPerson.set(p.id, chapter);
    addedChapter = true;
  }
  if (addedChapter) writeWeb(C_KEY, chapters);

  if (!marbles.some((m) => !m.chapterId)) return;
  writeWeb(
    M_KEY,
    marbles.map((m) =>
      m.chapterId ? m : { ...m, chapterId: liveByPerson.get(m.personId)?.id ?? "" },
    ),
  );
}

function liveChapterOf(chapters: Chapter[], personId: string): Chapter | undefined {
  return chapters
    .filter((c) => c.personId === personId && c.closedAt === null)
    .sort((a, b) => b.index - a.index)[0];
}

function chapterCount(personId: string, chapterId: string): number {
  return readWeb<Marble[]>(M_KEY, [])
    .filter((m) => m.personId === personId && m.chapterId === chapterId)
    .reduce((sum, m) => sum + m.delta, 0);
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

export async function renamePerson(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required");
  const people = readWeb<Person[]>(P_KEY, []);
  if (!people.some((p) => p.id === id)) return;
  writeWeb(
    P_KEY,
    people.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
  );
}

export async function removePerson(id: string): Promise<void> {
  writeWeb(
    P_KEY,
    readWeb<Person[]>(P_KEY, []).filter((p) => p.id !== id),
  );
  writeWeb(
    M_KEY,
    readWeb<Marble[]>(M_KEY, []).filter((m) => m.personId !== id),
  );
  writeWeb(
    C_KEY,
    readWeb<Chapter[]>(C_KEY, []).filter((c) => c.personId !== id),
  );
}

export async function getChapters(personId: string): Promise<Chapter[]> {
  migrateWeb();
  return readWeb<Chapter[]>(C_KEY, [])
    .filter((c) => c.personId === personId)
    .sort((a, b) => a.index - b.index);
}

export async function getLiveChapter(personId: string): Promise<Chapter> {
  migrateWeb();
  const chapters = readWeb<Chapter[]>(C_KEY, []);
  const live = liveChapterOf(chapters, personId);
  if (live) return live;
  const created = newChapter(personId, 0, Date.now());
  writeWeb(C_KEY, [...chapters, created]);
  return created;
}

export async function listMarbles(personId: string, opts?: ListMarblesOpts): Promise<Marble[]> {
  migrateWeb();
  const chapterId = opts?.chapterId ?? (await getLiveChapter(personId)).id;
  const rows = readWeb<Marble[]>(M_KEY, [])
    .filter((m) => m.personId === personId && m.chapterId === chapterId)
    .sort((a, b) => b.ts - a.ts);
  const offset = opts?.offset ?? 0;
  return opts?.limit === undefined ? rows.slice(offset) : rows.slice(offset, offset + opts.limit);
}

export async function addMarble(
  personId: string,
  delta: 1 | -1,
  reason = "",
  bravingTag = "",
): Promise<Marble> {
  migrateWeb();
  const live = await getLiveChapter(personId);
  const ts = Date.now();
  const marble: Marble = {
    id: uid(),
    personId,
    chapterId: live.id,
    delta,
    reason: reason.trim(),
    bravingTag,
    ts,
  };
  writeWeb(M_KEY, [marble, ...readWeb<Marble[]>(M_KEY, [])]);

  // Jar is full: close this chapter and open the next one.
  const count = chapterCount(personId, live.id);
  if (delta === 1 && count >= JAR_CAPACITY) {
    const chapters = readWeb<Chapter[]>(C_KEY, []);
    writeWeb(
      C_KEY,
      chapters.map((c) => (c.id === live.id ? { ...c, closedAt: ts, finalCount: count } : c)),
    );
    writeWeb(C_KEY, [...readWeb<Chapter[]>(C_KEY, []), newChapter(personId, live.index + 1, ts)]);
  }
  return marble;
}

export async function completeMarble(id: string, reason: string, tag: string): Promise<void> {
  migrateWeb();
  const marbles = readWeb<Marble[]>(M_KEY, []);
  if (!marbles.some((m) => m.id === id)) return;
  writeWeb(
    M_KEY,
    marbles.map((m) =>
      m.id === id
        ? {
            ...m,
            reason: m.reason.trim() ? m.reason : reason.trim(),
            bravingTag: m.bravingTag.trim() ? m.bravingTag : tag.trim(),
          }
        : m,
    ),
  );
}

// Full per-marble correction: words, tag, and kept/broke can all be fixed
// after the fact, so a misfiled moment never needs an offsetting marble.
export async function updateMarble(
  id: string,
  patch: { reason?: string; bravingTag?: string; delta?: 1 | -1 },
): Promise<void> {
  migrateWeb();
  const marbles = readWeb<Marble[]>(M_KEY, []);
  if (!marbles.some((m) => m.id === id)) return;
  writeWeb(
    M_KEY,
    marbles.map((m) =>
      m.id === id
        ? {
            ...m,
            reason: patch.reason !== undefined ? patch.reason.trim() : m.reason,
            bravingTag: patch.bravingTag !== undefined ? patch.bravingTag.trim() : m.bravingTag,
            delta: patch.delta ?? m.delta,
          }
        : m,
    ),
  );
}

export async function removeMarble(id: string): Promise<void> {
  migrateWeb();
  writeWeb(
    M_KEY,
    readWeb<Marble[]>(M_KEY, []).filter((m) => m.id !== id),
  );
}

export async function getJarStats(
  personId: string,
  chapterId?: string,
): Promise<{ count: number; pct: number }> {
  migrateWeb();
  const target = chapterId ?? (await getLiveChapter(personId)).id;
  const count = chapterCount(personId, target);
  return { count, pct: clampPct(count) };
}

export async function getPeopleWithCounts(sort: SortKey = "recent"): Promise<PersonRow[]> {
  migrateWeb();
  const people = await listPeople();
  const marbles = readWeb<Marble[]>(M_KEY, []);
  const activity = new Map<string, number>();
  for (const m of marbles) {
    activity.set(m.personId, Math.max(activity.get(m.personId) ?? 0, m.ts));
  }
  const rows: PersonRow[] = [];
  for (const p of people) {
    const stats = await getJarStats(p.id);
    rows.push({ ...p, count: stats.count, pct: stats.pct });
  }
  return sortRows(rows, sort, activity);
}

export async function searchPeople(query: string): Promise<PersonRow[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const rows = await getPeopleWithCounts("name");
  return rows.filter((r) => r.name.toLowerCase().includes(q));
}

export async function getWeeklyTrend(
  personId: string,
  weeks: number = DEFAULT_TREND_WEEKS,
): Promise<WeeklyTrendPoint[]> {
  migrateWeb();
  const buckets: WeeklyTrendPoint[] = getWeekStarts(weeks).map((weekStart) => ({
    weekStart,
    count: 0,
  }));
  const slotByWeek = new Map<number, number>();
  for (let i = 0; i < buckets.length; i += 1) slotByWeek.set(buckets[i].weekStart, i);
  for (const m of readWeb<Marble[]>(M_KEY, [])) {
    if (m.personId !== personId) continue;
    const slot = slotByWeek.get(startOfWeek(m.ts));
    if (slot === undefined) continue;
    buckets[slot].count += m.delta;
  }
  return buckets;
}

export async function getTagBreakdown(
  personId: string,
  chapterId?: string,
): Promise<TagBreakdownRow[]> {
  migrateWeb();
  const target = chapterId ?? (await getLiveChapter(personId)).id;
  const rows = new Map<string, TagBreakdownRow>();
  for (const m of readWeb<Marble[]>(M_KEY, [])) {
    if (m.personId !== personId || m.chapterId !== target) continue;
    const label = tagLabel(m.bravingTag);
    const row = rows.get(label) ?? { tag: label, added: 0, removed: 0 };
    if (m.delta > 0) row.added += 1;
    else row.removed += 1;
    rows.set(label, row);
  }
  return [...rows.values()].sort(
    (a, b) => b.added - a.added || b.removed - a.removed || a.tag.localeCompare(b.tag),
  );
}
