import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const apiDirectory = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(apiDirectory, "../../..");

export function defaultDbPath() {
  return resolve(repoRoot, "data/bcer.sqlite");
}

export function openDatabase(dbPath = process.env.BCER_DB_PATH ?? defaultDbPath()) {
  if (dbPath !== ":memory:" && !existsSync(dbPath)) {
    throw new Error(`BCER SQLite database not found at ${dbPath}. Run npm run import:data first.`);
  }

  return new DatabaseSync(dbPath);
}
