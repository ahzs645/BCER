import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "./database.js";
import {
  getSourceMeta,
  getDashboardData,
  getAggregateProduction,
  getProductionExplorer,
  getOperatorAnalytics,
  getOperatorDetail,
  getWellDetail,
} from "./queries.js";
import type { WellSearchResult } from "../../../packages/shared/src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const outDir = resolve(repoRoot, "apps/web/public/data");

function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
}

function writeJson(relativePath: string, data: unknown) {
  const fullPath = resolve(outDir, relativePath);
  ensureDir(dirname(fullPath));
  const json = JSON.stringify(data);
  writeFileSync(fullPath, json);
  const kb = (Buffer.byteLength(json) / 1024).toFixed(1);
  console.log(`  ${relativePath} (${kb} KB)`);
}

function mapSearchRow(r: Record<string, unknown>): WellSearchResult {
  const orient = r.orientation != null ? String(r.orientation).toUpperCase() : null;
  return {
    waNum: Number(r.wa_num) || 0,
    wellName: r.well_name != null ? String(r.well_name) : null,
    operator: r.operator != null ? String(r.operator) : null,
    operatorId: r.operator_id != null ? Number(r.operator_id) : null,
    operatorAbbr: r.operator_abbr != null ? String(r.operator_abbr) : null,
    uwiList: r.uwi_list
      ? String(r.uwi_list).split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    areaCode: r.area_code != null ? Number(r.area_code) : null,
    areaDesc: r.area_desc != null ? String(r.area_desc) : null,
    formCode: r.form_code != null ? Number(r.form_code) : null,
    formDesc: r.form_desc != null ? String(r.form_desc) : null,
    spudMon: r.spud_mon != null ? Number(r.spud_mon) : null,
    rigRelMon: r.rig_rel_mon != null ? Number(r.rig_rel_mon) : null,
    firstProdMon: r.first_prod_mon != null ? Number(r.first_prod_mon) : null,
    orientation: orient && orient !== "-" ? orient : null,
    surfLat: r.surf_lat != null ? Number(r.surf_lat) : null,
    surfLon: r.surf_lon != null ? Number(r.surf_lon) : null,
    gasProd3Yr: Number(r.gas_prod_3yr) || 0,
    gasProd5Yr: Number(r.gas_prod_5yr) || 0,
  };
}

function main() {
  const db = openDatabase();

  if (existsSync(outDir)) rmSync(outDir, { recursive: true });
  ensureDir(outDir);

  console.log("Exporting static JSON data...\n");

  // --- Meta ---
  console.log("Meta:");
  writeJson("meta.json", getSourceMeta(db));

  // --- Dashboard ---
  console.log("\nDashboard:");
  writeJson("dashboard.json", getDashboardData(db));

  // --- Aggregate Production ---
  console.log("\nAggregate Production:");
  writeJson("aggregate-production.json", getAggregateProduction(db));

  // --- Production Explorer ---
  console.log("\nProduction Explorer:");
  writeJson("production-explorer.json", getProductionExplorer(db));

  // --- Operators ---
  console.log("\nOperators:");
  const operators = getOperatorAnalytics(db);
  writeJson("operators/index.json", operators);

  const opRows = db
    .prepare("SELECT DISTINCT operator_id FROM well_search WHERE operator_id IS NOT NULL ORDER BY operator_id")
    .all() as Array<{ operator_id: number }>;

  let opCount = 0;
  for (const row of opRows) {
    const detail = getOperatorDetail(db, row.operator_id);
    if (detail) {
      writeJson(`operators/${row.operator_id}.json`, detail);
      opCount++;
    }
  }
  console.log(`  ${opCount} operator detail files written`);

  // --- Search index ---
  console.log("\nSearch index:");
  const allRows = db
    .prepare("SELECT * FROM well_search ORDER BY wa_num ASC")
    .all() as Array<Record<string, unknown>>;

  const searchIndex = allRows.map(mapSearchRow);
  writeJson("wells/search.json", searchIndex);
  console.log(`  ${searchIndex.length} wells total`);

  // --- Well details (batched) ---
  console.log("\nWell details:");
  const BATCH_SIZE = 200;
  const batches: Array<{ index: number; minWa: number; maxWa: number }> = [];
  let totalExported = 0;

  for (let i = 0; i < searchIndex.length; i += BATCH_SIZE) {
    const batchWells = searchIndex.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE);
    const batchData: Record<number, unknown> = {};

    for (const well of batchWells) {
      const detail = getWellDetail(db, well.waNum);
      if (detail) {
        batchData[well.waNum] = detail;
        totalExported++;
      }
    }

    const batchFile = `wells/detail/batch-${batchIndex}.json`;
    const fullPath = resolve(outDir, batchFile);
    ensureDir(dirname(fullPath));
    writeFileSync(fullPath, JSON.stringify(batchData));

    batches.push({
      index: batchIndex,
      minWa: batchWells[0].waNum,
      maxWa: batchWells[batchWells.length - 1].waNum,
    });

    const pct = Math.round(((i + batchWells.length) / searchIndex.length) * 100);
    process.stdout.write(
      `\r  ${totalExported}/${searchIndex.length} wells exported (${pct}%)   `,
    );
  }

  writeJson("wells/detail/manifest.json", { batches });
  console.log(`\n  ${batches.length} batch files, ${totalExported} wells total`);

  db.close();
  console.log("\nExport complete!");
}

main();
