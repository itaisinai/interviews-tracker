import assert from "node:assert/strict";
import test from "node:test";
import { timingSafeEqualString } from "./webhook-auth.js";

test("timingSafeEqualString requires both values", () => {
  assert.equal(timingSafeEqualString(undefined, "secret"), false);
  assert.equal(timingSafeEqualString("secret", undefined), false);
});

test("timingSafeEqualString rejects different values and lengths", () => {
  assert.equal(timingSafeEqualString("secret", "different"), false);
  assert.equal(timingSafeEqualString("secret", "secrets"), false);
});

test("timingSafeEqualString accepts matching values", () => {
  assert.equal(timingSafeEqualString("secret", "secret"), true);
});
