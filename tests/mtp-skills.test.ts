import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { assertFullSha, LOCK_PATH, MTP_SOURCE, type MtpLock } from "../scripts/sync-mtp-skills.js";

test("MTP provenance declares the retained dependency set", async () => {
  const lock = JSON.parse(await readFile(LOCK_PATH, "utf8")) as MtpLock;
  assert.equal(lock.source, MTP_SOURCE);
  assert.match(lock.commit, /^[0-9a-f]{40}$/u);
  assert.equal(lock.license.type, "MIT");
  assert.deepEqual(lock.rootSkills, ["grill-with-docs"]);
  assert.deepEqual(lock.excludedSkills, ["to-spec"]);
  assert.deepEqual(lock.managedSkills, ["grill-with-docs", "grilling", "domain-modeling"]);
  assert.ok(!lock.managedSkills.includes("setup-matt-pocock-skills"));
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
  assert.match(skill, /npm ci/u);
  assert.match(skill, /status до и после пуст/u);
  assert.doesNotMatch(skill, /openspec -- store (?:register|unregister)/u);
  assert.doesNotMatch(skill, /git clone|npm run doctor/u);
  assert.match(skill, /не запускайте bootstrap/u);
  assert.match(skill, /не создавайте ветку или Change/u);
  assert.match(skill, /Сообщите фактический результат и остановитесь/u);
});

test("temporary Store acceptance is isolated from the user registry", async () => {
  const organizer = await readFile(new URL("../docs/organizer-stage-4.md", import.meta.url), "utf8");
  assert.match(organizer, /изолированном Store registry/u);
  assert.match(organizer, /course_xdg="\$\(mktemp -d\)"/u);
  assert.match(organizer, /XDG_DATA_HOME="\$course_xdg" npm exec openspec -- store register/u);
  assert.match(organizer, /Не используйте пользовательский реестр организатора/u);
});
