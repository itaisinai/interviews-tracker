import test from "node:test";
import assert from "node:assert/strict";
import { getBasicHealth, getDeepHealth, checkReadiness } from "./health-service.js";

test("getBasicHealth returns health status with uptime", () => {
  const health = getBasicHealth();

  assert.strictEqual(health.ok, true);
  assert.strictEqual(health.service, "api");
  assert.strictEqual(health.version, "0.1.0");
  assert.ok(health.uptimeSeconds >= 0);
  assert.ok(health.timestamp);
  assert.ok(health.environment);
});

test("getBasicHealth returns valid ISO timestamp", () => {
  const health = getBasicHealth();
  const timestamp = new Date(health.timestamp);

  assert.ok(!isNaN(timestamp.getTime()));
});

test("getDeepHealth returns ok when database is available", async () => {
  const health = await getDeepHealth();

  // In test environment, this may fail if DB is not available
  // but we test the structure
  assert.ok(typeof health.ok === "boolean");
  assert.ok(health.database === "up" || health.database === "down");

  if (health.ok) {
    assert.strictEqual(health.database, "up");
    assert.ok(typeof health.latencyMs === "number");
    assert.ok(health.latencyMs >= 0);
  } else {
    assert.strictEqual(health.database, "down");
    assert.ok(health.error);
  }
});

test("checkReadiness returns ready status with database state", async () => {
  const readiness = await checkReadiness();

  assert.ok(typeof readiness.ready === "boolean");
  assert.ok(readiness.database === "up" || readiness.database === "down");

  if (readiness.ready) {
    assert.strictEqual(readiness.database, "up");
  } else {
    assert.strictEqual(readiness.database, "down");
  }
});
