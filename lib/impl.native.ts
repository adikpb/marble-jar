import * as SQLite from "expo-sqlite";
import { clampPct, type Marble, type Person, uid } from "./store";

let nativeDb: SQLite.SQLiteDatabase | null = null;
let nativeReady = false;

function db(): SQLite.SQLiteDatabase {
  if (!nativeDb) nativeDb = SQLite.openDatabaseSync("marble-jar.db");
  if (!nativeReady) {
    nativeDb.execSync(
      `CREATE TABLE IF NOT EXISTS people (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, createdAt INTEGER NOT NULL);
       CREATE TABLE IF NOT EXISTS marbles (id TEXT PRIMARY KEY NOT NULL, personId TEXT NOT NULL, delta INTEGER NOT NULL, reason TEXT NOT NULL DEFAULT '', bravingTag TEXT NOT NULL DEFAULT '', ts INTEGER NOT NULL);
       CREATE INDEX IF NOT EXISTS idx_marbles_person ON marbles(personId, ts);`,
    );
    nativeReady = true;
  }
  return nativeDb;
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

export async function listMarbles(personId: string): Promise<Marble[]> {
  const rows = db().getAllSync<Marble>(
    `SELECT id, personId, delta, reason, bravingTag, ts FROM marbles WHERE personId = ? ORDER BY ts DESC`,
    [personId],
  );
  return rows.map((r) => ({ ...r, delta: r.delta > 0 ? 1 : -1 }));
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
  db().runSync(
    `INSERT INTO marbles (id, personId, delta, reason, bravingTag, ts) VALUES (?, ?, ?, ?, ?, ?)`,
    [marble.id, marble.personId, marble.delta, marble.reason, marble.bravingTag, marble.ts],
  );
  return marble;
}

export async function getJarStats(personId: string): Promise<{ count: number; pct: number }> {
  const row = db().getFirstSync<{ total: number | null }>(
    `SELECT SUM(delta) as total FROM marbles WHERE personId = ?`,
    [personId],
  );
  const count = row?.total ?? 0;
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
