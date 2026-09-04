import { test } from "node:test";
import assert from "node:assert/strict";
import { setupSteps, setupWorkspace } from "../scripts/setup.js";

test("setup runs the repository-owned preflight, setup and verify sequence", async () => {
  const calls: string[] = [];
  const statuses = ["", ""];

  await setupWorkspace(async (script) => { calls.push(script); }, async () => statuses.shift() ?? "");

  assert.deepEqual(calls, setupSteps.map((step) => step.script));
  assert.equal(calls.filter((script) => script === "bootstrap").length, 1);
});

test("setup rejects unexpected repository changes", async () => {
  const statuses = ["", "?? unexpected.txt\n"];

  await assert.rejects(
    setupWorkspace(async () => undefined, async () => statuses.shift() ?? ""),
    /Git status changed during setup/,
  );
});

test("setup stops before commands when the repository is already dirty", async () => {
  const calls: string[] = [];

  await assert.rejects(
    setupWorkspace(async (script) => { calls.push(script); }, async () => " M CONTEXT.md\n"),
    /preflight: repository has local changes/,
  );
  assert.deepEqual(calls, []);
});
