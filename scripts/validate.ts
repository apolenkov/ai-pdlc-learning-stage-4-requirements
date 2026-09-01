import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { root, readLock } from "./config.js";
import { assertPinnedWorkspace } from "./workspace.js";

const run = promisify(execFile);
const exists = async (path: string) => access(path).then(() => true).catch(() => false);

try {
  const lock = await readLock();
  for (const file of ["AGENTS.md", "CONTEXT.md", "README.md", "product.yaml", "services.lock.yaml", "openspec/specs/credit-calculator/spec.md", "skills/domain-clarification/SKILL.md"]) {
    await access(resolve(root, file));
  }
  const context = await readFile(resolve(root, "CONTEXT.md"), "utf8");
  const gitignore = await readFile(resolve(root, ".gitignore"), "utf8");
  for (const term of ["Кредитный калькулятор", "Входные данные", "Ежемесячный платёж", "Условие готовности", "Сервис"]) {
    if (!context.includes(term)) throw new Error(`CONTEXT.md is missing term: ${term}`);
  }
  if (!gitignore.split(/\r?\n/).includes(".workspace/")) throw new Error(".gitignore must exclude .workspace/");
  const { stdout: trackedWorkspace } = await run("git", ["ls-files", ".workspace"], { cwd: root });
  if (trackedWorkspace.trim()) throw new Error("service workspace must not be tracked by Git");
  const workspace = resolve(root, lock.workspace);
  if (!(await exists(resolve(workspace, ".git")))) throw new Error("service workspace is missing; run make bootstrap first");
  await assertPinnedWorkspace(lock, workspace);
  console.log(`validate:structure: PASS (clean workspace ${lock.commit}; exact origin ${lock.repository})`);
} catch (error) {
  console.error(`validate:structure: FAIL — ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
