import { test } from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readLock } from "../scripts/config.js";
import { readPlanningProvenance } from "../scripts/course-context.js";

const root = resolve(import.meta.dirname, "..");
const planningManifest = resolve(root, "docs/course/planning-provenance.json");
const hasPlanningManifest = async (): Promise<boolean> => access(planningManifest).then(() => true).catch(() => false);

test("Store checks do not require or execute the service", async () => {
  const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  assert.equal(pkg.scripts.setup, "npm run doctor && npm run check");
  assert.equal(pkg.scripts.check, "npm run typecheck && npm test && npm run skills:check && npm run openspec:validate && npm run privacy:scan");
  for (const script of ["start", "acceptance:http", "validate:structure", "contract:check"]) {
    assert.equal(pkg.scripts[script], undefined);
  }
  await readLock();
  const files = ["AGENTS.md", "CONTEXT.md", "README.md", "product.yaml", ".agents/skills/grill-with-docs/SKILL.md", ".agents/skills/domain-modeling/SKILL.md"];
  files.push(await hasPlanningManifest() ? "openspec/specs/.gitkeep" : "openspec/specs/credit-calculator/spec.md");
  for (const file of files) {
    await access(resolve(root, file));
  }
  const { stdout } = await promisify(execFile)("git", ["ls-files", ".workspace"], { cwd: root });
  assert.equal(stdout.trim(), "", "service snapshot must not be tracked");
});

test("lock pins a full SHA and ignored workspace", async () => {
  const lock = await readFile(resolve(root, "services.lock.yaml"), "utf8");
  assert.match(lock, /repository:\s*https:\/\/\S+/);
  assert.match(lock, /commit:\s*[0-9a-f]{40}/);
  assert.match(lock, /workspace:\s*\.workspace\/services\/credit-calculator/);
});

test("prepared personal context separates planning provenance from the service pin", async (context) => {
  if (!await hasPlanningManifest()) {
    context.skip("the pristine template has no personal planning import");
    return;
  }
  const [provenance, lock] = await Promise.all([readPlanningProvenance(root), readLock()]);
  assert.notEqual(provenance.source.commit, lock.commit);
  assert.equal(provenance.source.workspace, ".workspace/planning/stage-3");
  assert.deepEqual(provenance.imports.activeChanges, ["add-payment-summary", "add-reset-and-years-term"]);
  await access(resolve(root, provenance.imports.mainSpecsRoot, ".gitkeep"));
  await assert.rejects(access(resolve(root, provenance.imports.mainSpecsRoot, "credit-calculator/spec.md")));
  for (const file of provenance.files) await access(resolve(root, file.path));
  assert.equal(provenance.files.length, 12);
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
  assert.match(skill, /npm ci/u);
  assert.match(skill, /npm run setup/u);
  assert.doesNotMatch(skill, /openspec -- store (?:register|unregister)/u);
});

test("analyst entry starts in an organizer-prepared local meta directory", async () => {
  const readme = await readFile(resolve(root, "README.md"), "utf8");
  const contributing = await readFile(resolve(root, "CONTRIBUTING.md"), "utf8");
  const organizer = await readFile(resolve(root, "docs/organizer-stage-4.md"), "utf8");
  assert.match(readme, /подготовленную организатором личную/u);
  assert.match(readme, /npm run bootstrap[\s\S]*?opencode/u);
  assert.match(readme, /Аналитик не выполняет clone, `npm ci`, `npm run setup`, регистрацию Store или импорт контракта/u);
  assert.match(readme, /course\/your_login\/stage-4-import-base/u);
  assert.match(readme, /course\/your_login\/stage-4-amount-limits/u);
  assert.match(readme, /два человеческих review/u);
  assert.match(readme, /закройте PR без слияния/u);
  assert.match(readme, /все задачи реализации остаются `- \[ \]`/u);
  assert.match(contributing, /Node\.js 22\+, npm и OpenCode с корпоративной аутентификацией/u);
  assert.match(organizer, /npm run bootstrap\n+npm run bootstrap/u);
  assert.match(organizer, /Не выполняйте unregister\/remove/u);
  assert.match(organizer, /не должен исправлять неполный или изменённый импорт, чужой baseline, грязный либо закреплённый на другом SHA snapshot/u);
  if (await hasPlanningManifest()) {
    assert.match(organizer, /Planning source.*307bfe46006a9f289b56d1ae2c156af92d9529d4/u);
    assert.match(organizer, /Service source.*97d07d1c0723c1d9ac79a444bd120195877a01a8/u);
    assert.match(organizer, /оба Change — 11 файлов/u);
    assert.match(organizer, /Всего 33 и 21/u);
  }
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
  assert.match(architecture, /единственным активным владельцем/u);
  assert.match(architecture, /\.workspace\/services\/credit-calculator.*read-only/u);
  assert.match(architecture, /```mermaid[\s\S]*flowchart LR/u);
  assert.match(architecture, /Подготовленный путь аналитика[\s\S]*Store-only только в персональной ветке сервиса/u);
  assert.match(architecture, /Общая `main` R3 остаётся repo-local/u);
  assert.match(architecture, /add-reset-and-years-term[\s\S]*limit-credit-amount/u);
});

test("stage 4 preserves the inherited planning contract before the dependent Change", async () => {
  const prepared = await hasPlanningManifest();
  const [readme, transfer, traceability, config] = await Promise.all([
    readFile(resolve(root, "README.md"), "utf8"),
    readFile(resolve(root, prepared ? "docs/course/stage-3-transfer.md" : "docs/templates/stage-3-transfer.md"), "utf8"),
    readFile(resolve(root, prepared ? "docs/course/requirements-traceability.md" : "docs/templates/requirements-traceability.md"), "utf8"),
    readFile(resolve(root, "openspec/config.yaml"), "utf8"),
  ]);
  assert.match(readme, /весь.*add-reset-and-years-term/u);
  assert.match(readme, /10 000 ₽.*100 000 000 ₽.*включительно/u);
  assert.match(readme, /9 999 ₽.*100 000 001 ₽.*отклоняются/u);
  assert.match(readme, /original MTP grill/u);
  assert.match(readme, /Explore[\s\S]*Propose/u);
  assert.match(readme, /не запускай Apply/u);
  assert.match(transfer, prepared ? /Planning source SHA/u : /Полный SHA принятого результата/u);
  if (!prepared) assert.match(transfer, /задачи переключателя «месяцы \/ годы».*reset в обоих режимах остались `- \[ \]`/u);
  assert.match(traceability, /переключатель `месяцы \/ годы` не запускает расчёт/iu);
  assert.match(traceability, /reset работает в обоих режимах/u);
  assert.match(readme, /точный inventory и байты.*Git tree/u);
  if (prepared) {
    for (const change of ["add-payment-summary", "add-reset-and-years-term"]) {
      assert.match(transfer, new RegExp(change, "u"));
      assert.match(traceability, new RegExp(change, "u"));
    }
    assert.equal(traceability.match(/pending implementation/g)?.length, 8);
    assert.match(config, /Для limit-credit-amount явно указывать зависимость/u);
    assert.match(config, /add-reset-and-years-term/u);
    assert.match(config, /add-payment-summary/u);
  } else {
    assert.match(traceability, /add-reset-and-years-term[\s\S]*limit-credit-amount/u);
    assert.match(traceability, /pending implementation/g);
    assert.match(config, /limit-credit-amount.*add-reset-and-years-term/u);
  }
});

test("all Store reads use explicit root checks and the service workspace stays read-only", async () => {
  const [readme, organizer, architecture] = await Promise.all([
    readFile(resolve(root, "README.md"), "utf8"),
    readFile(resolve(root, "docs/organizer-stage-4.md"), "utf8"),
    readFile(resolve(root, "docs/architecture/openspec-store-workset.md"), "utf8"),
  ]);
  for (const content of [readme, organizer, architecture]) {
    assert.match(content, /--store sdd-credit-calculator-product-meta/u);
  }
  assert.match(readme, /store doctor sdd-credit-calculator-product-meta --json/u);
  assert.match(readme, /\.workspace\/services\/credit-calculator.*только для чтения/u);
  if (await hasPlanningManifest()) {
    assert.match(organizer, /planning-provenance\.json/u);
    assert.match(organizer, /все активные Changes, кроме archive/u);
    assert.match(organizer, /\.workspace\/planning\/stage-3 rev-parse HEAD/u);
    assert.match(organizer, /\.workspace\/services\/credit-calculator rev-parse HEAD/u);
  } else {
    assert.match(organizer, /git -C \.\.\/sdd-credit-calculator-example archive <FULL_R3_SHA>/u);
    assert.match(organizer, /test ! -e openspec\/changes\/add-reset-and-years-term/u);
  }
});

test("context remains a domain glossary", async () => {
  const context = await readFile(resolve(root, "CONTEXT.md"), "utf8");
  assert.match(context, /Кредитный калькулятор/);
  assert.match(context, /## Язык/);
  assert.match(context, /_Избегать_:/);
  assert.doesNotMatch(context, /TypeScript|npm install|Makefile|git clone/);
  assert.match(context, /openspec\/(?:specs\/credit-calculator|changes\/add-reset-and-years-term\/specs\/credit-calculator)\/spec\.md/);
  assert.doesNotMatch(context, /не могут быть отрицательными|должен быть положительным|округлённый до целого|сумма делится на срок/);
  const product = await readFile(resolve(root, "product.yaml"), "utf8");
  assert.doesNotMatch(product, /^workspace:/m);
  assert.match(product, /^service_lock: services\.lock\.yaml$/m);
});

test("generated and local artifacts stay outside Git", async () => {
  const gitignore = await readFile(resolve(root, ".gitignore"), "utf8");
  for (const entry of ["node_modules/", "dist/", "coverage/", "test-results/", "playwright-report/", ".workspace/", ".env", ".DS_Store", ".idea/", ".vscode/", "*.log"]) {
    assert.match(gitignore, new RegExp(`^${entry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
  }
});
