import { execFile } from "node:child_process";
import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type { ServiceLock } from "./config.js";

const inheritedChange = "add-reset-and-years-term";
const baselinePath = "openspec/specs/credit-calculator/spec.md";
const run = promisify(execFile);

async function requireFile(projectRoot: string, path: string): Promise<string> {
  const absolute = resolve(projectRoot, path);
  await access(absolute).catch(() => {
    throw new Error(`prepared course context is missing ${path}; ask the organizer to complete the personal import base`);
  });
  return readFile(absolute, "utf8");
}

function capturedSha(content: string, label: string): string {
  const expression = new RegExp(`${label}:\\s*\`?([0-9a-f]{40})\`?`, "u");
  const sha = content.match(expression)?.[1];
  if (!sha) {
    throw new Error(`docs/course/stage-3-transfer.md: missing full SHA for ${label}`);
  }
  return sha;
}

async function importedPlanningFiles(projectRoot: string, changeRoot: string): Promise<string[]> {
  const changeFiles: string[] = [];

  async function walk(directory: string, relativeDirectory: string): Promise<void> {
    const entries = await readdir(resolve(projectRoot, directory), { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = `${relativeDirectory}/${entry.name}`;
      if (entry.isDirectory()) {
        await walk(`${directory}/${entry.name}`, relativePath);
      } else if (entry.isFile()) {
        changeFiles.push(relativePath);
      } else {
        throw new Error(`prepared course context contains unsupported entry ${relativePath}`);
      }
    }
  }

  await walk(changeRoot, changeRoot);
  return [baselinePath, ...changeFiles].sort();
}

async function assertImportedPlanningMatchesGitTree(
  projectRoot: string,
  sourceWorkspace: string,
  lock: ServiceLock,
  changeRoot: string,
): Promise<void> {
  const { stdout } = await run(
    "git",
    ["-C", sourceWorkspace, "ls-tree", "-r", "-z", lock.commit, "--", baselinePath, changeRoot],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  const sourceFiles = new Map<string, string>();
  for (const entry of stdout.split("\0").filter(Boolean)) {
    const match = entry.match(/^\d+ blob ([0-9a-f]{40})\t(.+)$/u);
    if (!match?.[1] || !match[2]) {
      throw new Error(`locked service tree contains unsupported planning entry: ${entry}`);
    }
    sourceFiles.set(match[2], match[1]);
  }

  const importedFiles = await importedPlanningFiles(projectRoot, changeRoot);
  const sourceInventory = [...sourceFiles.keys()].sort();
  const missing = sourceInventory.filter((path) => !importedFiles.includes(path));
  const unexpected = importedFiles.filter((path) => !sourceFiles.has(path));
  if (missing.length || unexpected.length) {
    const details = [
      missing.length ? `missing imported files: ${missing.join(", ")}` : "",
      unexpected.length ? `unexpected imported files: ${unexpected.join(", ")}` : "",
    ].filter(Boolean).join("; ");
    throw new Error(`imported planning inventory does not match locked service tree ${lock.commit}: ${details}`);
  }

  for (const path of importedFiles) {
    const { stdout: importedBlob } = await run(
      "git",
      ["-C", projectRoot, "hash-object", `--path=${path}`, "--", path],
    );
    if (importedBlob.trim() !== sourceFiles.get(path)) {
      throw new Error(`imported planning file differs from locked service tree ${lock.commit}: ${path}`);
    }
  }
}

export async function assertPreparedCourseContext(
  projectRoot: string,
  lock: ServiceLock,
  sourceWorkspace: string,
): Promise<void> {
  const transfer = await requireFile(projectRoot, "docs/course/stage-3-transfer.md");
  const traceability = await requireFile(projectRoot, "docs/course/requirements-traceability.md");
  const baseline = await requireFile(projectRoot, baselinePath);
  const changeRoot = `openspec/changes/${inheritedChange}`;
  const [metadata, proposal, design, tasks, delta] = await Promise.all([
    requireFile(projectRoot, `${changeRoot}/.openspec.yaml`),
    requireFile(projectRoot, `${changeRoot}/proposal.md`),
    requireFile(projectRoot, `${changeRoot}/design.md`),
    requireFile(projectRoot, `${changeRoot}/tasks.md`),
    requireFile(projectRoot, `${changeRoot}/specs/credit-calculator/spec.md`),
  ]);

  const sourceSha = capturedSha(transfer, "Полный SHA принятого результата");
  const contextSha = capturedSha(transfer, "Service context SHA in `services.lock.yaml`");
  if (sourceSha !== lock.commit || contextSha !== lock.commit) {
    throw new Error(`prepared course context SHA ${sourceSha}/${contextSha} does not match services.lock.yaml ${lock.commit}`);
  }
  if (/<[A-Z0-9_]+>/u.test(transfer)) {
    throw new Error("docs/course/stage-3-transfer.md still contains template placeholders");
  }
  if (!transfer.includes(changeRoot) || !transfer.includes("openspec/specs/credit-calculator/spec.md")) {
    throw new Error("docs/course/stage-3-transfer.md does not name the imported baseline and active Change paths");
  }
  if (!traceability.includes(inheritedChange) || !traceability.includes("pending implementation")) {
    throw new Error("docs/course/requirements-traceability.md does not map the inherited pending Change");
  }
  if (/<(?:R3_SOURCE|INHERITED_SCENARIO|INHERITED_PENDING_TASK)>/u.test(traceability)) {
    throw new Error("docs/course/requirements-traceability.md still contains inherited-context placeholders");
  }
  if (!traceability.includes("`месяцы / годы`")
    || !traceability.includes("0,5→6")
    || !traceability.includes("20→240")
    || !traceability.includes("reset работает в обоих режимах")) {
    throw new Error("docs/course/requirements-traceability.md does not preserve the inherited month/year and reset contract");
  }
  if (!baseline.includes("Ошибка очищает предыдущий результат")) {
    throw new Error("imported baseline does not preserve the existing error-clearing scenario");
  }
  for (const [name, content] of Object.entries({ metadata, proposal, design, tasks, delta })) {
    if (!content.trim()) throw new Error(`${changeRoot}/${name}.md is empty`);
  }
  const pendingTasks = tasks.match(/^- \[ \]/gmu) ?? [];
  if (pendingTasks.length < 2 || /- \[[xX]\]/u.test(tasks)) {
    throw new Error(`${changeRoot}/tasks.md must keep all implementation tasks pending`);
  }
  await assertImportedPlanningMatchesGitTree(projectRoot, sourceWorkspace, lock, changeRoot);
}
