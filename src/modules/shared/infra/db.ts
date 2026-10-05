import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

// 로컬 SQLite 연결. 각 BC의 infra만 사용한다.
export function createDb(path = process.env.DATABASE_PATH ?? "./data/builder-toy.db") {
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  return drizzle(sqlite);
}

export type Db = ReturnType<typeof createDb>;
