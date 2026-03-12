import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { ensureTestDatabase } from "./helpers.mjs";

test("imports metadata and derived search data", async () => {
  const dbPath = ensureTestDatabase();
  const db = new DatabaseSync(dbPath);

  try {
    const metadata = db.prepare("SELECT key, value FROM metadata ORDER BY key").all();
    const asMap = new Map(metadata.map((row) => [row.key, row.value]));
    assert.equal(asMap.get("data_current_to"), "November 2025");
    assert.ok(JSON.parse(asMap.get("about_paragraphs")).length > 0);

    const counts = db.prepare("SELECT table_name, row_count FROM dataset_counts ORDER BY table_name").all();
    const countMap = new Map(counts.map((row) => [row.table_name, row.row_count]));
    assert.ok(countMap.get("well_search") > 30000);
    assert.ok(countMap.get("area_codes") > 200);
    assert.ok(countMap.get("casing") > 60000);
    assert.ok(countMap.get("formation_codes") > 300);

    const target = db
      .prepare("SELECT wa_num, operator_id, operator_abbr, gas_prod_3yr, gas_prod_5yr, uwi_list FROM well_search WHERE wa_num = 49886")
      .get();
    assert.equal(target.wa_num, 49886);
    assert.equal(target.operator_id, 831);
    assert.match(target.operator_abbr, /TOURMALINE/);
    assert.ok(target.gas_prod_3yr > 0);
    assert.ok(target.gas_prod_5yr > 0);
    assert.match(target.uwi_list, /207B090A094B1600/);

    const calendar = db
      .prepare("SELECT yprd_01, yprd_02 FROM prd_profile_gas WHERE wa_num = 49886")
      .get();
    assert.ok(calendar.yprd_01 > 0);
    assert.ok(calendar.yprd_02 > 0);

    const areaLookup = db.prepare("SELECT description FROM area_codes WHERE code = 9022").get();
    assert.match(areaLookup.description, /NORTHERN MONTNEY/);
  } finally {
    db.close();
  }
});
