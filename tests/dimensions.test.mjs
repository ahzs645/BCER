import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { ensureTestDatabase } from "./helpers.mjs";

const { getAreaIndex, getFormationIndex, getAreaDetail, getFormationDetail } = await import(
  "../apps/api/dist/apps/api/src/queries.js"
);

test("area index and detail agree and resolve cross-links", () => {
  const dbPath = ensureTestDatabase();
  const db = new DatabaseSync(dbPath);

  try {
    const index = getAreaIndex(db);
    assert.equal(index.kind, "area");
    assert.ok(index.items.length > 0);

    const top = index.items[0];
    assert.ok(Number.isInteger(top.code));
    assert.ok(top.wellCount > 0);

    const detail = getAreaDetail(db, top.code);
    assert.ok(detail);
    assert.equal(detail.kind, "area");
    assert.equal(detail.summary.code, top.code);
    // The detail's well list length must match the index well count.
    assert.equal(detail.wells.length, top.wellCount);
    assert.equal(detail.summary.wellCount, top.wellCount);
    assert.ok(detail.summary.operatorCount >= 1);
    // Cross breakdown for an area is its formations.
    assert.ok(Array.isArray(detail.crossBreakdown));
    assert.ok(Array.isArray(detail.fiscalYearProduction));

    assert.equal(getAreaDetail(db, -1), null);
  } finally {
    db.close();
  }
});

test("formation index and detail agree", () => {
  const dbPath = ensureTestDatabase();
  const db = new DatabaseSync(dbPath);

  try {
    const index = getFormationIndex(db);
    assert.equal(index.kind, "formation");
    assert.ok(index.items.length > 0);

    const top = index.items[0];
    const detail = getFormationDetail(db, top.code);
    assert.ok(detail);
    assert.equal(detail.kind, "formation");
    assert.equal(detail.summary.code, top.code);
    assert.equal(detail.wells.length, top.wellCount);
    assert.ok(detail.summary.operatorCount >= 1);

    assert.equal(getFormationDetail(db, -1), null);
  } finally {
    db.close();
  }
});
