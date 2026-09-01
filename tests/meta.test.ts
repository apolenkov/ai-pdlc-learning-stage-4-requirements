import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
test("lock pins a full SHA and ignored workspace", async () => {
  const lock = await readFile(resolve(root, "services.lock.yaml"), "utf8");
  assert.match(lock, /repository:\s*https:\/\/\S+/);
  assert.match(lock, /commit:\s*[0-9a-f]{40}/);
  assert.match(lock, /workspace:\s*\.workspace\/services\/credit-calculator/);
});

test("context remains a domain glossary", async () => {
  const context = await readFile(resolve(root, "CONTEXT.md"), "utf8");
  assert.match(context, /Кредитный калькулятор/);
  assert.match(context, /## Язык/);
  assert.match(context, /_Избегать_:/);
  assert.doesNotMatch(context, /TypeScript|npm install|Makefile|git clone/);
});

test("generated and local artifacts stay outside Git", async () => {
  const gitignore = await readFile(resolve(root, ".gitignore"), "utf8");
  for (const entry of ["node_modules/", "dist/", "coverage/", "test-results/", "playwright-report/", ".workspace/", ".env", ".DS_Store", ".idea/", ".vscode/", "*.log"]) {
    assert.match(gitignore, new RegExp(`^${entry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
  }
});
