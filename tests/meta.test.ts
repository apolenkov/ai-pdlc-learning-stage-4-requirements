import { test } from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readLock } from "../scripts/config.js";
import { assertInheritedTraceability, readPlanningProvenance } from "../scripts/course-context.js";

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
  files.push("openspec/specs/credit-calculator/spec.md");
  if (await hasPlanningManifest()) files.pop();
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
  assert.match(provenance.source.commit, /^[0-9a-f]{40}$/u);
  assert.match(lock.commit, /^[0-9a-f]{40}$/u);
  assert.equal(provenance.source.workspace, ".workspace/planning/stage-3");
  assert.ok(provenance.imports.activeChanges.length >= 1);
  assert.deepEqual(provenance.imports.activeChanges, [...provenance.imports.activeChanges].sort());
  for (const file of provenance.files) await access(resolve(root, file.path));
  for (const change of provenance.imports.activeChanges) {
    assert.ok(
      provenance.files.some(({ path }) => path === `openspec/changes/${change}/tasks.md`),
      `missing tasks.md for ${change}`,
    );
  }
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

test("analyst clones the organizer-published personal base before setup", async () => {
  const readme = await readFile(resolve(root, "README.md"), "utf8");
  const contributing = await readFile(resolve(root, "CONTRIBUTING.md"), "utf8");
  const organizer = await readFile(resolve(root, "docs/organizer-stage-4.md"), "utf8");
  assert.match(readme, /Организатор готовит и публикует персональную ветку/u);
  assert.match(readme, /git clone --branch course\/<LOGIN>\/stage-4-import-base --single-branch/u);
  assert.match(readme, /opencode[\s\S]*?setup-analysis-workspace[\s\S]*?npm ci[\s\S]*?npm run setup/u);
  assert.match(readme, /npm run bootstrap\n+npm run bootstrap/u);
  const permissionGate = readme.indexOf("Только после такого разрешения выполните:");
  const learnerRegistration = readme.indexOf("npm exec openspec -- store register .", permissionGate);
  assert.ok(permissionGate >= 0 && learnerRegistration > permissionGate);
  assert.match(readme, /store register \.[\s\S]*?--id sdd-credit-calculator-product-meta --yes --json[\s\S]*?store doctor sdd-credit-calculator-product-meta --json/u);
  assert.match(readme, /course\/<LOGIN>\/stage-4-import-base/u);
  assert.match(readme, /course\/<LOGIN>\/stage-4-amount-limits/u);
  assert.match(readme, /Другой аналитик проверяет требования, затем разработчик или архитектор — реализуемость/u);
  assert.match(readme, /учебный PR закрывается без слияния|закройте учебный PR без слияния/u);
  assert.match(readme, /задачи реализации остаются `- \[ \]`/u);
  assert.match(contributing, /Ученик сам клонирует опубликованную ветку/u);
  assert.match(organizer, /XDG_DATA_HOME="\$course_xdg" npm run bootstrap\nXDG_DATA_HOME="\$course_xdg" npm run bootstrap/u);
  assert.match(organizer, /не выполняйте unregister\/remove/iu);
  assert.match(organizer, /Публикация import-base не является человеческим review/u);
  assert.match(organizer, /if \[ -e "openspec\/changes\/\$inherited_change" \]; then[\s\S]*?STOP: target Change already exists[\s\S]*?exit 1[\s\S]*?cp -R/u);
});

test("organizer copy guard stops before overwriting an inherited Change", async () => {
  const organizer = await readFile(resolve(root, "docs/organizer-stage-4.md"), "utf8");
  const copyBlock = organizer.match(/```bash\n(mkdir -p openspec\/specs docs\/course[\s\S]*?cp docs\/templates\/requirements-traceability\.md docs\/course\/requirements-traceability\.md)\n```/u)?.[1];
  assert.ok(copyBlock, "organizer copy block must remain executable");

  const fixture = await mkdtemp(resolve(tmpdir(), "course-organizer-copy-"));
  const target = resolve(fixture, "target");
  const staged = resolve(fixture, "staged");
  const change = "existing-change";
  try {
    await mkdir(resolve(target, "openspec/changes", change), { recursive: true });
    await mkdir(resolve(staged, "openspec/specs"), { recursive: true });
    await mkdir(resolve(staged, "openspec/changes", change), { recursive: true });
    await mkdir(resolve(staged, "docs/course"), { recursive: true });
    await writeFile(resolve(target, "openspec/changes", change, "preserved.txt"), "original\n");
    await writeFile(resolve(staged, "openspec/changes", change, "must-not-copy.txt"), "replacement\n");
    await writeFile(resolve(staged, "docs/course/planning-provenance.json"), JSON.stringify({
      imports: { activeChanges: [change] },
    }));

    const failure = await promisify(execFile)("/bin/bash", ["-c", copyBlock], {
      cwd: target,
      env: { ...process.env, staged_import: staged },
    }).then(
      () => undefined,
      (error: unknown) => error as Error & { stderr?: string },
    );
    assert.ok(failure, "copy block must stop when an inherited Change already exists");
    assert.match(failure.stderr ?? "", /STOP: target Change already exists: existing-change/u);
    await access(resolve(target, "openspec/changes", change, "preserved.txt"));
    await assert.rejects(access(resolve(target, "openspec/changes", change, "must-not-copy.txt")));
  } finally {
    await rm(fixture, { recursive: true, force: true });
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
  assert.match(architecture, /Каждый Change из planning manifest[\s\S]*limit-credit-amount/u);
});

test("stage 4 preserves the inherited planning contract before the dependent Change", async () => {
  const prepared = await hasPlanningManifest();
  const [readme, transfer, traceability, config] = await Promise.all([
    readFile(resolve(root, "README.md"), "utf8"),
    readFile(resolve(root, prepared ? "docs/course/stage-3-transfer.md" : "docs/templates/stage-3-transfer.md"), "utf8"),
    readFile(resolve(root, prepared ? "docs/course/requirements-traceability.md" : "docs/templates/requirements-traceability.md"), "utf8"),
    readFile(resolve(root, "openspec/config.yaml"), "utf8"),
  ]);
  assert.match(readme, /все фактически активные Changes/u);
  assert.match(readme, /10 000 ₽[\s\S]*?100 000 000 ₽ включительно/u);
  assert.match(readme, /9 999 ₽[\s\S]*?100 000 001 ₽[\s\S]*?ошиб/u);
  assert.match(readme, /original MTP grill/u);
  assert.match(readme, /Explore[\s\S]*Propose/u);
  assert.match(readme, /не запускай Apply/u);
  assert.match(transfer, /Planning source SHA/u);
  assert.match(transfer, /каждого имени из `planning-provenance\.json#imports\.activeChanges`/u);
  assert.match(traceability, /Каждый Change из `imports\.activeChanges` представлен/u);
  assert.match(traceability, /Если main specs пусты, не создавайте фиктивный baseline/u);
  assert.match(readme, /точный Git-tree inventory, blob OID, SHA-256/u);
  if (prepared) {
    const provenance = await readPlanningProvenance(root);
    await assertInheritedTraceability(root, traceability, provenance);
    for (const change of provenance.imports.activeChanges) {
      assert.match(transfer, new RegExp(change, "u"));
    }
    assert.doesNotMatch(config, /add-reset-and-years-term|add-payment-summary/u);
  } else {
    assert.match(traceability, /<INHERITED_REQUIREMENT_OR_SCENARIO>/u);
    assert.match(traceability, /limit-credit-amount/u);
  }
  assert.match(config, /каждого применимого импортированного активного Change/u);
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
  assert.match(organizer, /prepare-course-import\.ts stage/u);
  assert.match(organizer, /prepare-course-import\.ts verify/u);
  assert.match(organizer, /все активные каталоги `openspec\/changes\/\*`, кроме `archive`/u);
  assert.match(organizer, /git -C \.workspace\/planning\/stage-3 status --short/u);
  assert.match(organizer, /git -C \.workspace\/services\/credit-calculator status --short/u);
});

test("context remains a domain glossary", async () => {
  const context = await readFile(resolve(root, "CONTEXT.md"), "utf8");
  assert.match(context, /Кредитный калькулятор/);
  assert.match(context, /## Язык/);
  assert.match(context, /_Избегать_:/);
  assert.doesNotMatch(context, /TypeScript|npm install|Makefile|git clone/);
  assert.match(context, /planning inventory в `openspec\/specs\/` и активных Changes/u);
  assert.match(context, /docs\/course\/planning-provenance\.json/u);
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
