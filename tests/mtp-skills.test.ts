import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { assertFullSha, LOCK_PATH, MTP_SOURCE, verifyInstalledSkills, type MtpLock } from "../scripts/sync-mtp-skills.js";

test("MTP skills are pinned, complete, attributed and byte-exact", async () => {
  const lock = JSON.parse(await readFile(LOCK_PATH, "utf8")) as MtpLock;
  assert.equal(lock.source, MTP_SOURCE);
  assert.match(lock.commit, /^[0-9a-f]{40}$/u);
  assert.equal(lock.license.type, "MIT");
  assert.deepEqual(lock.rootSkills, ["grill-me", "grill-with-docs"]);
  assert.deepEqual(lock.excludedSkills, ["to-spec"]);
  assert.ok(lock.managedSkills.includes("domain-modeling"));
  assert.ok(lock.managedSkills.includes("prototype"));
  assert.ok(!lock.managedSkills.includes("setup-matt-pocock-skills"));
  await verifyInstalledSkills(lock);
});

test("MTP update accepts only an explicit full SHA", () => {
  for (const value of ["", "main", "6654f6b", "6654F6B60CD9D5BE8B54C6FAFE44346DABEB3B76"]) {
    assert.throws(() => assertFullSha(value), /full 40-character lowercase Git SHA/u);
  }
  assert.doesNotThrow(() => assertFullSha("6654f6b60cd9d5be8b54c6fafe44346dabeb3b76"));
});

test("repository keeps its canonical setup skill outside the MTP-managed set", async () => {
  const skill = await readFile(new URL("../.agents/skills/setup-analysis-workspace/SKILL.md", import.meta.url), "utf8");
  const lock = JSON.parse(await readFile(LOCK_PATH, "utf8")) as MtpLock;
  assert.ok(!lock.managedSkills.includes("setup-analysis-workspace"));
  assert.match(skill, /npm run setup/u);
  assert.doesNotMatch(skill, /git clone|npm run bootstrap|npm run doctor/u);
});
