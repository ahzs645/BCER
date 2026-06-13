import { createGzip } from "node:zlib";
import { createReadStream, createWriteStream, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const dataDir = resolve(repoRoot, "apps/web/dist/data");

function* jsonFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* jsonFiles(fullPath);
    } else if (entry.isFile() && fullPath.endsWith(".json")) {
      yield fullPath;
    }
  }
}

async function main() {
  if (!existsSync(dataDir)) {
    throw new Error(`Static data directory not found at ${dataDir}. Run the web build first.`);
  }

  let fileCount = 0;
  let rawBytes = 0;
  let gzipBytes = 0;

  for (const filePath of jsonFiles(dataDir)) {
    const gzipPath = `${filePath}.gz`;
    const rawSize = statSync(filePath).size;
    await pipeline(createReadStream(filePath), createGzip({ level: 9 }), createWriteStream(gzipPath));
    const compressedSize = statSync(gzipPath).size;
    rmSync(filePath);

    fileCount++;
    rawBytes += rawSize;
    gzipBytes += compressedSize;
  }

  const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  console.log(`Compressed ${fileCount} JSON files in dist/data: ${mb(rawBytes)} -> ${mb(gzipBytes)}`);
}

main();
