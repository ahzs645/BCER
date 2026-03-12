import { execFileSync } from "node:child_process";
import { existsSync, rmSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const repoRoot = "/Users/ahmadjalil/Downloads/BCER";
const testDbPath = resolve(repoRoot, "data/test-bcer.sqlite");
const sourceFiles = [
  resolve(repoRoot, "scripts/import_bcer.py"),
  resolve(repoRoot, "View_BCER_Data_Most_Recent.xlsm"),
  resolve(repoRoot, "DBS_BCER_Data_2024_09_SEP_10.accdb"),
];

export function ensureTestDatabase() {
  const isValid =
    existsSync(testDbPath) &&
    (() => {
      try {
        const db = new DatabaseSync(testDbPath);
        const row = db
          .prepare("SELECT COUNT(*) AS total FROM sqlite_master WHERE type = 'table' AND name = 'well_search'")
          .get();
        db.close();
        return row?.total === 1;
      } catch {
        return false;
      }
    })();

  const shouldRefresh =
    !isValid ||
    sourceFiles.some((filePath) => statSync(filePath).mtimeMs > statSync(testDbPath).mtimeMs);

  if (shouldRefresh) {
    [testDbPath, `${testDbPath}-shm`, `${testDbPath}-wal`].forEach((filePath) => {
      if (existsSync(filePath)) {
        rmSync(filePath, { force: true });
      }
    });

    execFileSync(
      "python3",
      [
        resolve(repoRoot, "scripts/import_bcer.py"),
        "--xlsx",
        resolve(repoRoot, "View_BCER_Data_Most_Recent.xlsm"),
        "--accdb",
        resolve(repoRoot, "DBS_BCER_Data_2024_09_SEP_10.accdb"),
        "--db",
        testDbPath,
      ],
      {
        cwd: repoRoot,
        stdio: "inherit",
      },
    );
  }

  return testDbPath;
}
