import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type { ServiceLock } from "./config.js";
import { assertPinnedWorkspace } from "./workspace.js";

const provenancePath = "docs/course/planning-provenance.json";
const expectedMainSpecsRoot = "openspec/specs";
const expectedPlanningWorkspace = ".workspace/planning/stage-3";
const run = promisify(execFile);

export type PlanningProvenance = Readonly<{
  schemaVersion: 1;
  source: Readonly<{
    repository: string;
    commit: string;
    workspace: typeof expectedPlanningWorkspace;
  }>;
  imports: Readonly<{
    mainSpecsRoot: typeof expectedMainSpecsRoot;
    activeChanges: readonly string[];
  }>;
  files: readonly Readonly<{
    path: string;
    blob: string;
    sha256: string;
  }>[];
}>;

type SourceTreeFile = Readonly<{ path: string; blob: string }>;

function compareSourceTreeFiles(left: SourceTreeFile, right: SourceTreeFile): number {
  return left.path < right.path ? -1 : left.path > right.path ? 1 : 0;
}

const sha256 = (content: Buffer): string => createHash("sha256").update(content).digest("hex");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertSortedUnique(values: readonly string[], label: string): void {
  const expected = [...new Set(values)].sort();
  if (JSON.stringify(values) !== JSON.stringify(expected)) {
    throw new Error(`${provenancePath}: ${label} must be sorted and unique`);
  }
}

function assertSafePath(path: string, label: string): void {
  if (!path || path.startsWith("/") || path.includes("\\")
    || path.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error(`${provenancePath}: unsafe ${label}: ${path}`);
  }
}

export async function readPlanningProvenance(projectRoot: string): Promise<PlanningProvenance> {
  const text = await readFile(resolve(projectRoot, provenancePath), "utf8").catch(() => {
    throw new Error(`prepared course context is missing ${provenancePath}; ask the organizer to complete the personal import base`);
  });
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(`${provenancePath}: invalid JSON`);
  }
  if (!isRecord(value) || value.schemaVersion !== 1 || !isRecord(value.source)
    || !isRecord(value.imports) || !Array.isArray(value.files)) {
    throw new Error(`${provenancePath}: unsupported planning provenance contract`);
  }

  const { source, imports } = value;
  if (typeof source.repository !== "string" || !/^https:\/\/\S+$/u.test(source.repository)) {
    throw new Error(`${provenancePath}: planning source repository must use HTTPS`);
  }
  if (typeof source.commit !== "string" || !/^[0-9a-f]{40}$/u.test(source.commit)) {
    throw new Error(`${provenancePath}: planning source commit must be a full lowercase Git SHA`);
  }
  if (source.workspace !== expectedPlanningWorkspace) {
    throw new Error(`${provenancePath}: planning source workspace must be ${expectedPlanningWorkspace}`);
  }
  if (imports.mainSpecsRoot !== expectedMainSpecsRoot || !Array.isArray(imports.activeChanges)
    || !imports.activeChanges.every((name) => typeof name === "string" && /^[a-z0-9][a-z0-9-]*$/u.test(name) && name !== "archive")) {
    throw new Error(`${provenancePath}: invalid planning import roots`);
  }
  assertSortedUnique(imports.activeChanges, "imports.activeChanges");
  if (imports.activeChanges.length === 0) {
    throw new Error(`${provenancePath}: at least one active Change is required`);
  }

  const files = value.files.map((entry, index) => {
    if (!isRecord(entry) || typeof entry.path !== "string" || typeof entry.blob !== "string"
      || typeof entry.sha256 !== "string") {
      throw new Error(`${provenancePath}: invalid files[${index}]`);
    }
    assertSafePath(entry.path, `files[${index}].path`);
    if (!/^[0-9a-f]{40}$/u.test(entry.blob) || !/^[0-9a-f]{64}$/u.test(entry.sha256)) {
      throw new Error(`${provenancePath}: invalid hashes for ${entry.path}`);
    }
    return { path: entry.path, blob: entry.blob, sha256: entry.sha256 };
  });
  assertSortedUnique(files.map(({ path }) => path), "files paths");

  return {
    schemaVersion: 1,
    source: {
      repository: source.repository,
      commit: source.commit,
      workspace: expectedPlanningWorkspace,
    },
    imports: {
      mainSpecsRoot: expectedMainSpecsRoot,
      activeChanges: imports.activeChanges as string[],
    },
    files,
  };
}

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
  if (!sha) throw new Error(`docs/course/stage-3-transfer.md: missing full SHA for ${label}`);
  return sha;
}

type TraceabilityRow = Readonly<{
  requirement: string;
  source: string;
  owner: string;
  state: string;
  task: string;
}>;

function plainCell(value: string): string {
  return value.trim().replace(/^`|`$/gu, "");
}

function traceabilityRows(content: string): TraceabilityRow[] {
  return content.split("\n").flatMap((rawLine) => {
    const line = rawLine.replace(/\r$/u, "");
    if (!line.startsWith("|") || !line.endsWith("|")) return [];
    const cells = line.slice(1, -1).split("|").map(plainCell);
    if (cells.length < 7 || cells[0] === "Требование / сценарий" || /^-+$/u.test(cells[0] ?? "")) return [];
    return [{
      requirement: cells[0]!,
      source: cells[1]!,
      owner: cells[2]!,
      state: cells[3]!,
      task: cells[4]!,
    }];
  });
}

function requirementNames(spec: string, path: string): string[] {
  const names = [...spec.matchAll(/^### Requirement:\s+(.+?)\s*$/gmu)].map((match) => match[1]!.trim());
  if (new Set(names).size !== names.length) {
    throw new Error(`${path}: duplicate Requirement heading`);
  }
  return names;
}

export async function assertInheritedTraceability(
  projectRoot: string,
  traceability: string,
  provenance: PlanningProvenance,
): Promise<void> {
  const rows = traceabilityRows(traceability);
  const specPaths = provenance.files.map(({ path }) => path).filter((path) => path.endsWith("/spec.md")
    && (path.startsWith(`${provenance.imports.mainSpecsRoot}/`)
      || provenance.imports.activeChanges.some((change) => path.startsWith(`openspec/changes/${change}/specs/`))));
  for (const specPath of specPaths) {
    const activeChange = provenance.imports.activeChanges.find((change) => (
      specPath.startsWith(`openspec/changes/${change}/specs/`)
    ));
    const owner = activeChange ?? "main specs";
    const spec = await requireFile(projectRoot, specPath);
    for (const requirement of requirementNames(spec, specPath)) {
      const row = rows.find((candidate) => candidate.requirement === requirement
        && candidate.owner === specPath);
      if (!row) {
        throw new Error(`docs/course/requirements-traceability.md: missing inherited requirement row for ${owner}: ${requirement}`);
      }
      if (!row.source.includes(provenance.source.repository)
        || !row.source.includes(provenance.source.commit)
        || !row.source.includes(specPath)) {
        throw new Error(`docs/course/requirements-traceability.md: inherited row has wrong source for ${owner}: ${requirement}`);
      }
      if (activeChange && row.state !== "pending implementation") {
        throw new Error(`docs/course/requirements-traceability.md: inherited row status changed for ${activeChange}: ${requirement}`);
      }
      if (activeChange && !row.task.includes(`${activeChange}/tasks.md`)) {
        throw new Error(`docs/course/requirements-traceability.md: inherited row has no pending task mapping for ${activeChange}: ${requirement}`);
      }
    }
  }
}

async function walkFiles(projectRoot: string, rootPath: string): Promise<string[]> {
  const files: string[] = [];
  const visit = async (relativeDirectory: string): Promise<void> => {
    const entries = await readdir(resolve(projectRoot, relativeDirectory), { withFileTypes: true }).catch(() => {
      throw new Error(`prepared course context is missing ${relativeDirectory}; ask the organizer to complete the personal import base`);
    });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const relativePath = `${relativeDirectory}/${entry.name}`;
      if (entry.isDirectory()) await visit(relativePath);
      else if (entry.isFile()) files.push(relativePath);
      else throw new Error(`prepared course context contains unsupported entry ${relativePath}`);
    }
  };
  await visit(rootPath);
  return files;
}

async function sourceTreeFiles(sourceWorkspace: string, commit: string): Promise<SourceTreeFile[]> {
  const { stdout } = await run(
    "git",
    ["-C", sourceWorkspace, "ls-tree", "-r", "-z", commit, "--", "openspec/specs", "openspec/changes"],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  return stdout.split("\0").filter(Boolean).map((entry) => {
    const match = entry.match(/^\d+ blob ([0-9a-f]{40})\t(.+)$/u);
    if (!match?.[1] || !match[2]) {
      throw new Error(`planning source tree contains unsupported entry: ${entry}`);
    }
    return { blob: match[1], path: match[2] };
  }).sort(compareSourceTreeFiles);
}

async function gitBlob(repository: string, blob: string): Promise<Buffer> {
  const result = await run("git", ["-C", repository, "cat-file", "blob", blob], {
    encoding: "buffer",
    maxBuffer: 10 * 1024 * 1024,
  });
  return Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout);
}

function equalList(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

async function assertImportedPlanningMatchesSource(
  projectRoot: string,
  sourceWorkspace: string,
  provenance: PlanningProvenance,
): Promise<void> {
  await assertPinnedWorkspace(provenance.source, sourceWorkspace);
  const treeFiles = await sourceTreeFiles(sourceWorkspace, provenance.source.commit);
  const sourceChanges = [...new Set(treeFiles.flatMap(({ path }) => {
    const match = path.match(/^openspec\/changes\/([^/]+)\//u);
    return match?.[1] && match[1] !== "archive" ? [match[1]] : [];
  }))].sort();
  if (!equalList(provenance.imports.activeChanges, sourceChanges)) {
    throw new Error(`${provenancePath}: active Changes do not match planning source tree ${provenance.source.commit}; expected ${sourceChanges.join(", ") || "none"}`);
  }

  const importedPrefixes = [
    `${provenance.imports.mainSpecsRoot}/`,
    ...provenance.imports.activeChanges.map((name) => `openspec/changes/${name}/`),
  ];
  const sourceFiles = treeFiles.filter(({ path }) => importedPrefixes.some((prefix) => path.startsWith(prefix)));
  const manifestPaths = provenance.files.map(({ path }) => path);
  const sourcePaths = sourceFiles.map(({ path }) => path);
  if (!equalList(manifestPaths, sourcePaths)) {
    const manifestSet = new Set(manifestPaths);
    const sourceSet = new Set(sourcePaths);
    const missing = sourcePaths.filter((path) => !manifestSet.has(path));
    const unexpected = manifestPaths.filter((path) => !sourceSet.has(path));
    const details = [
      missing.length ? `missing manifest files: ${missing.join(", ")}` : "",
      unexpected.length ? `unexpected manifest files: ${unexpected.join(", ")}` : "",
    ].filter(Boolean).join("; ");
    throw new Error(`${provenancePath}: file inventory does not match planning source tree ${provenance.source.commit}: ${details}`);
  }

  const importedFiles = (
    await Promise.all([
      walkFiles(projectRoot, provenance.imports.mainSpecsRoot),
      ...provenance.imports.activeChanges.map((name) => walkFiles(projectRoot, `openspec/changes/${name}`)),
    ])
  ).flat().sort();
  const importedSet = new Set(importedFiles);
  const missing = sourcePaths.filter((path) => !importedSet.has(path));
  const unexpected = importedFiles.filter((path) => !sourcePaths.includes(path));
  if (missing.length || unexpected.length) {
    const details = [
      missing.length ? `missing imported files: ${missing.join(", ")}` : "",
      unexpected.length ? `unexpected imported files: ${unexpected.join(", ")}` : "",
    ].filter(Boolean).join("; ");
    throw new Error(`imported planning inventory does not match planning source tree ${provenance.source.commit}: ${details}`);
  }

  const sourceByPath = new Map(sourceFiles.map((file) => [file.path, file]));
  for (const manifestFile of provenance.files) {
    const sourceFile = sourceByPath.get(manifestFile.path)!;
    if (manifestFile.blob !== sourceFile.blob) {
      throw new Error(`${provenancePath}: Git blob does not match planning source tree ${provenance.source.commit}: ${manifestFile.path}`);
    }
    const sourceBytes = await gitBlob(sourceWorkspace, sourceFile.blob);
    if (sha256(sourceBytes) !== manifestFile.sha256) {
      throw new Error(`${provenancePath}: SHA-256 does not match planning source blob ${sourceFile.blob}: ${manifestFile.path}`);
    }
    const { stdout: importedBlob } = await run(
      "git",
      ["-C", projectRoot, "hash-object", `--path=${manifestFile.path}`, "--", manifestFile.path],
    );
    if (importedBlob.trim() !== sourceFile.blob) {
      throw new Error(`imported planning file differs from planning source tree ${provenance.source.commit}: ${manifestFile.path}`);
    }
  }
}

export async function assertPreparedCourseContext(
  projectRoot: string,
  lock: ServiceLock,
  sourceWorkspace: string,
  providedProvenance?: PlanningProvenance,
): Promise<void> {
  const provenance = providedProvenance ?? await readPlanningProvenance(projectRoot);
  const transfer = await requireFile(projectRoot, "docs/course/stage-3-transfer.md");
  const traceability = await requireFile(projectRoot, "docs/course/requirements-traceability.md");
  const sourceSha = capturedSha(transfer, "Planning source SHA");
  const contextSha = capturedSha(transfer, "Service context SHA in `services.lock.yaml`");
  if (sourceSha !== provenance.source.commit) {
    throw new Error(`prepared course context planning SHA ${sourceSha} does not match ${provenancePath} ${provenance.source.commit}`);
  }
  if (contextSha !== lock.commit) {
    throw new Error(`prepared course context service SHA ${contextSha} does not match services.lock.yaml ${lock.commit}`);
  }
  if (!transfer.includes(provenance.source.repository)) {
    throw new Error(`docs/course/stage-3-transfer.md does not name planning source repository ${provenance.source.repository}`);
  }
  if (/<[A-Z0-9_]+>/u.test(transfer)) {
    throw new Error("docs/course/stage-3-transfer.md still contains template placeholders");
  }
  for (const change of provenance.imports.activeChanges) {
    const changeRoot = `openspec/changes/${change}`;
    if (!transfer.includes(changeRoot)) {
      throw new Error(`docs/course/stage-3-transfer.md does not name imported active Change path ${changeRoot}`);
    }
    const tasks = await requireFile(projectRoot, `${changeRoot}/tasks.md`);
    const pendingTasks = tasks.match(/^- \[ \]/gmu) ?? [];
    if (pendingTasks.length === 0 || /- \[[xX]\]/u.test(tasks)) {
      throw new Error(`${changeRoot}/tasks.md must keep all implementation tasks pending`);
    }
  }
  if (!transfer.includes(provenance.imports.mainSpecsRoot)) {
    throw new Error(`docs/course/stage-3-transfer.md does not name imported main specs root ${provenance.imports.mainSpecsRoot}`);
  }
  if (/<[A-Z0-9_]+>/u.test(traceability)) {
    throw new Error("docs/course/requirements-traceability.md still contains inherited-context placeholders");
  }
  await assertInheritedTraceability(projectRoot, traceability, provenance);
  await assertImportedPlanningMatchesSource(projectRoot, sourceWorkspace, provenance);
}
