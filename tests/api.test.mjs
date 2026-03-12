import test from "node:test";
import assert from "node:assert/strict";
import { ensureTestDatabase } from "./helpers.mjs";

const { createApp } = await import("../apps/api/dist/apps/api/src/server.js");

test("search endpoint supports operator number lookup and pagination", async () => {
  const dbPath = ensureTestDatabase();
  const app = await createApp({ dbPath });

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/wells?operator=831&sort=high3YrProd&pageSize=5",
    });

    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.equal(payload.pageSize, 5);
    assert.ok(payload.total > 0);
    assert.ok(payload.items.some((item) => item.operatorId === 831));
  } finally {
    await app.close();
  }
});

test("specific WA lookup overrides other filters", async () => {
  const dbPath = ensureTestDatabase();
  const app = await createApp({ dbPath });

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/wells?waNum=49886&operator=no-match&area=no-match&orientation=vertical",
    });

    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.equal(payload.total, 1);
    assert.equal(payload.items[0].waNum, 49886);
  } finally {
    await app.close();
  }
});

test("detail endpoint returns the workbook-selected well payload", async () => {
  const dbPath = ensureTestDatabase();
  const app = await createApp({ dbPath });

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/wells/49886",
    });

    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.equal(payload.overview.waNum, 49886);
    assert.equal(payload.overview.wellClassification, "DV");
    assert.ok(payload.activityLocations.length > 0);
    assert.ok(payload.productionSeries.length >= 60);
    assert.ok(payload.calendarYearSeries.length > 0);
    assert.ok(payload.gasAnalysis.length > 0);
    assert.ok(payload.recentGasAnalysis.length > 0);
    assert.ok(payload.overview.totalMDepth > 0);
    assert.ok(payload.casings.length > 0);
  } finally {
    await app.close();
  }
});
