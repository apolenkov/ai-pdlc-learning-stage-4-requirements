import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";

const root = resolve(import.meta.dirname, "..");

test("context-first contract keeps MTP before OpenSpec and Apply separate", async () => {
  const agents = await readFile(resolve(root, "AGENTS.md"), "utf8");
  const sequence = ["CONTEXT.md", "grill-with-docs", "OpenSpec Explore", "OpenSpec Propose", "Apply запускается отдельно"];
  let previous = -1;
  for (const marker of sequence) {
    const position = agents.indexOf(marker);
    assert.ok(position > previous, `${marker} must appear in canonical flow order`);
    previous = position;
  }
  assert.match(agents, /MTP `to-spec` не используется/u);
});

test("small changes skip Explore only after decisions are closed", async () => {
  const agents = await readFile(resolve(root, "AGENTS.md"), "utf8");
  assert.match(agents, /Если после grill остаётся существенная развилка, используйте OpenSpec Explore; иначе переходите к OpenSpec Propose/u);
  assert.match(agents, /продолжайте интервью до\s+явного подтверждения общего понимания/iu);
});

test("unknown facts remain questions and Propose stops at the human gate", async () => {
  const agents = await readFile(resolve(root, "AGENTS.md"), "utf8");
  assert.match(agents, /Не придумывайте отсутствующие факты: оставляйте их открытыми вопросами/u);
  assert.match(agents, /OpenSpec Propose создаёт полный набор планирования/u);
  assert.match(agents, /останавливается на человеческой проверке/u);
  assert.match(agents, /Apply запускается отдельно только после принятия/u);
});

test("repository uses only the retained original MTP skills", async () => {
  await assert.rejects(access(resolve(root, "skills/domain-clarification/SKILL.md")));
  await assert.rejects(access(resolve(root, ".agents/skills/openspec-change-flow/SKILL.md")));
  await assert.rejects(access(resolve(root, "docs/agents/domain.md")));
  await access(resolve(root, ".agents/skills/domain-modeling/SKILL.md"));
  await access(resolve(root, ".agents/skills/grill-with-docs/SKILL.md"));
});
