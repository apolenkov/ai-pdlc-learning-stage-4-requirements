import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { root, readLock } from "./config.js";
import { assertPinnedWorkspace } from "./workspace.js";
import { LOCK_PATH as MTP_LOCK_PATH, verifyInstalledSkills, type MtpLock } from "./sync-mtp-skills.js";

const run = promisify(execFile);
const exists = async (path: string) => access(path).then(() => true).catch(() => false);

try {
  const lock = await readLock();
  for (const file of ["AGENTS.md", "CONTEXT.md", "README.md", "product.yaml", "services.lock.yaml", "openspec/specs/credit-calculator/spec.md", ".agents/mtp-skills.lock.json", ".agents/skills/grill-with-docs/SKILL.md", ".agents/skills/domain-modeling/SKILL.md", ".agents/skills/setup-analysis-workspace/SKILL.md", "docs/agents/domain.md"]) {
    await access(resolve(root, file));
  }
  if (await exists(resolve(root, "skills/domain-clarification/SKILL.md"))) throw new Error("custom domain-clarification skill must be removed in favor of MTP skills");
  const context = await readFile(resolve(root, "CONTEXT.md"), "utf8");
  const gitignore = await readFile(resolve(root, ".gitignore"), "utf8");
  const agents = await readFile(resolve(root, "AGENTS.md"), "utf8");
  const mtpLock = JSON.parse(await readFile(MTP_LOCK_PATH, "utf8")) as MtpLock;
  await verifyInstalledSkills(mtpLock);
  for (const term of ["Кредитный калькулятор", "Входные данные", "Ежемесячный платёж", "Условие готовности", "Сервис"]) {
    if (!context.includes(term)) throw new Error(`CONTEXT.md is missing term: ${term}`);
  }
  if (!gitignore.split(/\r?\n/).includes(".workspace/")) throw new Error(".gitignore must exclude .workspace/");
  for (const marker of ["grill-with-docs", "OpenSpec Explore", "OpenSpec Propose", "Apply запускается отдельно", "MTP `to-spec` не используется"]) {
    if (!agents.includes(marker)) throw new Error(`AGENTS.md is missing context-first marker: ${marker}`);
  }
  const { stdout: trackedWorkspace } = await run("git", ["ls-files", ".workspace"], { cwd: root });
  if (trackedWorkspace.trim()) throw new Error("service workspace must not be tracked by Git");
  const workspace = resolve(root, lock.workspace);
  if (!(await exists(resolve(workspace, ".git")))) throw new Error("service workspace is missing; run npm run bootstrap first");
  await assertPinnedWorkspace(lock, workspace);
  console.log(`validate:structure: PASS (clean workspace ${lock.commit}; exact origin ${lock.repository})`);
} catch (error) {
  console.error(`validate:structure: FAIL — ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
