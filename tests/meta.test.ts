import { test } from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
test("lock pins a full SHA and ignored workspace", async () => {
  const lock = await readFile(resolve(root, "services.lock.yaml"), "utf8");
  assert.match(lock, /repository:\s*https:\/\/\S+/);
  assert.match(lock, /commit:\s*[0-9a-f]{40}/);
  assert.match(lock, /workspace:\s*\.workspace\/services\/credit-calculator/);
});

test("OpenSpec Store identity is committed and points to this meta repository", async () => {
  const store = await readFile(resolve(root, ".openspec-store/store.yaml"), "utf8");
  assert.match(store, /^version:\s*1$/m);
  assert.match(store, /^id:\s*sdd-credit-calculator-product-meta$/m);
  assert.match(store, /remote:\s*https:\/\/github\.example\.invalid\/apolenkov\/sdd-credit-calculator-product-meta-example\.git/);
});

test("Store setup uses the official CLI without a custom wrapper", async () => {
  const packageJson = await readFile(resolve(root, "package.json"), "utf8");
  const skill = await readFile(resolve(root, ".agents/skills/setup-analysis-workspace/SKILL.md"), "utf8");
  await assert.rejects(access(resolve(root, "scripts/store.ts")));
  assert.doesNotMatch(packageJson, /store:ensure/u);
  assert.match(skill, /npm exec openspec -- store register \. --yes --json/u);
  assert.match(skill, /npm exec openspec -- store doctor <Store ID> --json/u);
});

test("OpenCode receives the Store-aware OpenSpec workflows from the repository", async () => {
  for (const skill of ["openspec-propose", "openspec-apply-change", "openspec-archive-change"]) {
    const content = await readFile(resolve(root, ".opencode", "skills", skill, "SKILL.md"), "utf8");
    assert.match(content, /Store selection:/);
    assert.match(content, /generatedBy:\s*"1\.12\.0"/);
  }
});

test("Store and Workset architecture keeps pinned workspace read-only", async () => {
  const architecture = await readFile(resolve(root, "docs/architecture/openspec-store-workset.md"), "utf8");
  assert.match(architecture, /канонический OpenSpec Store/);
  assert.match(architecture, /не рабочая директория/);
  assert.match(architecture, /```mermaid[\s\S]*flowchart TB/u);
  assert.match(architecture, /Поток изменения[\s\S]*Локальная среда/u);
  assert.match(architecture, /рабочий клон сервиса/);
  assert.match(architecture, /Что это[\s\S]*Зачем нужен/u);
  assert.match(architecture, /services\.lock\.yaml/);
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
