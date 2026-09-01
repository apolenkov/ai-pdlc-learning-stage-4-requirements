import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { root, readLock } from "./config.js";

try {
  const lock = await readLock();
  if (!/^https:\/\//.test(lock.repository)) throw new Error("service URL must use HTTPS");
  if (!/^\.workspace\/services\/credit-calculator$/.test(lock.workspace)) throw new Error("service workspace must be ignored .workspace/services/credit-calculator");
  for (const file of ["AGENTS.md", "CONTEXT.md", "README.md", "product.yaml", "services.lock.yaml", "openspec/specs/credit-calculator/spec.md", "skills/domain-clarification/SKILL.md"]) {
    await access(resolve(root, file));
  }
  const context = await readFile(resolve(root, "CONTEXT.md"), "utf8");
  for (const term of ["Кредитный калькулятор", "Входные данные", "Ежемесячный платёж", "Условие готовности", "Сервис"]) {
    if (!context.includes(term)) throw new Error(`CONTEXT.md is missing term: ${term}`);
  }
  console.log(`validate: PASS (lock ${lock.commit}; service code remains outside meta-repository)`);
} catch (error) {
  console.error(`validate: FAIL — ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
