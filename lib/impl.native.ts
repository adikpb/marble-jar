import * as SQLite from "expo-sqlite";
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

let nativeDb: SQLite.SQLiteDatabase | null = null;
let nativeReady = false;

function db(): SQLite.SQLiteDatabase {
  if (!nativeDb) nativeDb = SQLite.openDatabaseSync("marble-jar.db");
  if (!nativeReady) {
    nativeDb.execSync(
      `CREATE TABLE IF NOT EXISTS people (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, createdAt INTEGER NOT NULL);
       CREATE TABLE IF NOT EXISTS chapters (id TEXT PRIMARY KEY NOT NULL, personId TEXT NOT NULL, idx INTEGER NOT NULL, openedAt INTEGER NOT NULL, closedAt INTEGER, finalCount INTEGER NOT NULL DEFAULT 0);
       CREATE TABLE IF NOT EXISTS marbles (id TEXT PRIMARY KEY NOT NULL, personId TEXT NOT NULL, chapterId TEXT NOT NULL DEFAULT '', delta INTEGER NOT NULL, reason TEXT NOT NULL DEFAULT '', bravingTag TEXT NOT NULL DEFAULT '', ts INTEGER NOT NULL);
       CREATE INDEX IF NOT EXISTS idx_marbles_person ON marbles(personId, chapterId, ts);
       CREATE INDEX IF NOT EXISTS idx_chapters_person ON chapters(personId, closedAt, idx);`,
    );
    nativeReady = true; // set first: migrate() reads schema through db()
    migrate();
  }
  return nativeDb;
}

function hasColumn(table: string, column: string): boolean {
  const rows = db().getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.some((r) => r.name === column);
}

// Backfill for installs from before chapters: add marble.chapterId if missing,
// give every person one open chapter (index 0, opened when they were created),
// and tag their existing marbles with it.
function migrate(): void {
  if (!hasColumn("marbles", "chapterId")) {
    db().runSync(`ALTER TABLE marbles ADD COLUMN chapterId TEXT NOT NULL DEFAULT ''`);
  }
  const people = db().getAllSync<Person>(`SELECT id, createdAt FROM people`);
  const now = Date.now();
  for (const p of people) {
    const live = liveChapterRow(p.id);
    if (live) continue;
    const chapterId = uid();
    db().runSync(
      `INSERT INTO chapters (id, personId, idx, openedAt, closedAt, finalCount) VALUES (?, ?, 0, ?, NULL, 0)`,
      [chapterId, p.id, p.createdAt ?? now],
    );
    db().runSync(`UPDATE marbles SET chapterId = ? WHERE personId = ? AND chapterId = ''`, [
      chapterId,
      p.id,
    ]);
  }
}

type ChapterRow = {
  id: string;
  personId: string;
  idx: number;
  openedAt: number;
  closedAt: number | null;
  finalCount: number;
};

function toChapter(row: ChapterRow): Chapter {
  return {
    id: row.id,
    personId: row.personId,
    index: row.idx,
    openedAt: row.openedAt,
    closedAt: row.closedAt ?? null,
    finalCount: row.finalCount,
  };
}

function liveChapterRow(personId: string): ChapterRow | undefined {
  return (
    db().getFirstSync<ChapterRow>(
      `SELECT id, personId, idx, openedAt, closedAt, finalCount FROM chapters WHERE personId = ? AND closedAt IS NULL ORDER BY idx DESC LIMIT 1`,
      [personId],
    ) ?? undefined
  );
}

function openChapter(personId: string, index: number, openedAt: number): Chapter {
  const chapterId = uid();
  db().runSync(
    `INSERT INTO chapters (id, personId, idx, openedAt, closedAt, finalCount) VALUES (?, ?, ?, ?, NULL, 0)`,
    [chapterId, personId, index, openedAt],
  );
  return { id: chapterId, personId, index, openedAt, closedAt: null, finalCount: 0 };
}

function chapterCount(personId: string, chapterId: string): number {
  const row = db().getFirstSync<{ total: number | null }>(
    `SELECT SUM(delta) as total FROM marbles WHERE personId = ? AND chapterId = ?`,
    [personId, chapterId],
  );
  return row?.total ?? 0;
}

export async function listPeople(): Promise<Person[]> {
  return db().getAllSync<Person>(`SELECT id, name, createdAt FROM people ORDER BY createdAt DESC`);
}

export async function addPerson(name: string): Promise<Person> {
  const person: Person = { id: uid(), name: name.trim(), createdAt: Date.now() };
  if (!person.name) throw new Error("Name is required");
  db().runSync(`INSERT INTO people (id, name, createdAt) VALUES (?, ?, ?)`, [
    person.id,
    person.name,
    person.createdAt,
  ]);
  return person;
}

export async function getPerson(id: string): Promise<Person | null> {
  return (
    db().getFirstSync<Person>(`SELECT id, name, createdAt FROM people WHERE id = ?`, [id]) ?? null
  );
}

export async function renamePerson(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required");
  db().runSync(`UPDATE people SET name = ? WHERE id = ?`, [trimmed, id]);
}

export async function removePerson(id: string): Promise<void> {
  db().runSync(`DELETE FROM marbles WHERE personId = ?`, [id]);
  db().runSync(`DELETE FROM chapters WHERE personId = ?`, [id]);
  db().runSync(`DELETE FROM people WHERE id = ?`, [id]);
}

export async function getChapters(personId: string): Promise<Chapter[]> {
  return db()
    .getAllSync<ChapterRow>(
      `SELECT id, personId, idx, openedAt, closedAt, finalCount FROM chapters WHERE personId = ? ORDER BY idx ASC`,
      [personId],
    )
    .map(toChapter);
}

export async function getLiveChapter(personId: string): Promise<Chapter> {
  const live = liveChapterRow(personId);
  if (live) return toChapter(live);
  return openChapter(personId, 0, Date.now());
}

export async function listMarbles(personId: string, opts?: ListMarblesOpts): Promise<Marble[]> {
  const chapterId = opts?.chapterId ?? (await getLiveChapter(personId)).id;
  const rows = db().getAllSync<Marble>(
    `SELECT id, personId, chapterId, delta, reason, bravingTag, ts FROM marbles WHERE personId = ? AND chapterId = ? ORDER BY ts DESC LIMIT ? OFFSET ?`,
    [personId, chapterId, opts?.limit ?? -1, opts?.offset ?? 0],
  );
  return rows.map((r) => ({ ...r, delta: r.delta > 0 ? 1 : -1 }));
}

export async function addMarble(
  personId: string,
  delta: 1 | -1,
  reason = "",
  bravingTag = "",
): Promise<Marble> {
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
  db().runSync(
    `INSERT INTO marbles (id, personId, chapterId, delta, reason, bravingTag, ts) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      marble.id,
      marble.personId,
      marble.chapterId,
      marble.delta,
      marble.reason,
      marble.bravingTag,
      marble.ts,
    ],
  );

  // Jar is full: close this chapter and open the next one.
  const count = chapterCount(personId, live.id);
  if (delta === 1 && count >= JAR_CAPACITY) {
    db().runSync(`UPDATE chapters SET closedAt = ?, finalCount = ? WHERE id = ?`, [
      ts,
      count,
      live.id,
    ]);
    openChapter(personId, live.index + 1, ts);
  }
  return marble;
}

export async function completeMarble(id: string, reason: string, tag: string): Promise<void> {
  db().runSync(`UPDATE marbles SET reason = ? WHERE id = ? AND reason = ''`, [reason.trim(), id]);
  db().runSync(`UPDATE marbles SET bravingTag = ? WHERE id = ? AND bravingTag = ''`, [
    tag.trim(),
    id,
  ]);
}

export async function getJarStats(
  personId: string,
  chapterId?: string,
): Promise<{ count: number; pct: number }> {
  const target = chapterId ?? (await getLiveChapter(personId)).id;
  const count = chapterCount(personId, target);
  return { count, pct: clampPct(count) };
}

export async function getPeopleWithCounts(sort: SortKey = "recent"): Promise<PersonRow[]> {
  const people = await listPeople();
  const activityRows = db().getAllSync<{ personId: string; lastTs: number | null }>(
    `SELECT personId, MAX(ts) as lastTs FROM marbles GROUP BY personId`,
  );
  const activity = new Map<string, number>();
  for (const r of activityRows) {
    if (r.lastTs !== null) activity.set(r.personId, r.lastTs);
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
  const buckets: WeeklyTrendPoint[] = getWeekStarts(weeks).map((weekStart) => ({
    weekStart,
    count: 0,
  }));
  const marbles = db().getAllSync<{ ts: number; delta: number }>(
    `SELECT ts, delta FROM marbles WHERE personId = ?`,
    [personId],
  );
  const slotByWeek = new Map<number, number>();
  for (let i = 0; i < buckets.length; i += 1) slotByWeek.set(buckets[i].weekStart, i);
  for (const m of marbles) {
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
  const target = chapterId ?? (await getLiveChapter(personId)).id;
  const rows = db().getAllSync<{ bravingTag: string; delta: number }>(
    `SELECT bravingTag, delta FROM marbles WHERE personId = ? AND chapterId = ?`,
    [personId, target],
  );
  const grouped = new Map<string, TagBreakdownRow>();
  for (const r of rows) {
    const label = tagLabel(r.bravingTag ?? "");
    const row = grouped.get(label) ?? { tag: label, added: 0, removed: 0 };
    if (r.delta > 0) row.added += 1;
    else row.removed += 1;
    grouped.set(label, row);
  }
  return [...grouped.values()].sort(
    (a, b) => b.added - a.added || b.removed - a.removed || a.tag.localeCompare(b.tag),
  );
}
