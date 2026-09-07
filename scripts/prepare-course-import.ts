import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { readLock } from "./config.js";
import {
  assertPreparedCourseContext,
  readPlanningProvenance,
  type PlanningProvenance,
} from "./course-context.js";

const run = promisify(execFile);
const mainSpecsRoot = "openspec/specs" as const;
const planningWorkspace = ".workspace/planning/stage-3" as const;

type TreeFile = Readonly<{ path: string; blob: string }>;

function compareTreeFiles(left: TreeFile, right: TreeFile): number {
  return left.path < right.path ? -1 : left.path > right.path ? 1 : 0;
}

export type StageCourseImportOptions = Readonly<{
  source: string;
  commit: string;
  output: string;
}>;

export type StageCourseImportResult = Readonly<{
  repository: string;
  commit: string;
  output: string;
  activeChanges: readonly string[];
  files: number;
}>;

const exists = async (path: string): Promise<boolean> => lstat(path).then(() => true).catch(() => false);
const sha256 = (content: Buffer): string => createHash("sha256").update(content).digest("hex");

async function gitText(repository: string, args: string[]): Promise<string> {
  const { stdout } = await run("git", ["-C", repository, ...args], { maxBuffer: 10 * 1024 * 1024 });
  return stdout.trim();
}

async function gitBlob(repository: string, blob: string): Promise<Buffer> {
  const result = await run("git", ["-C", repository, "cat-file", "blob", blob], {
    encoding: "buffer",
    maxBuffer: 10 * 1024 * 1024,
  });
  return Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout);
}

function assertSeparatePaths(source: string, output: string): void {
  const outputFromSource = relative(source, output);
  const sourceFromOutput = relative(output, source);
  if (!outputFromSource || !sourceFromOutput
    || (!isOutside(outputFromSource))
    || (!isOutside(sourceFromOutput))) {
    throw new Error("stage output must be outside the planning source checkout");
  }
}

function isOutside(relativePath: string): boolean {
  return isAbsolute(relativePath) || relativePath === ".." || relativePath.startsWith(`..${sep}`);
}

async function resolveBeforeCreating(path: string): Promise<string> {
  const missing: string[] = [];
  let ancestor = path;
  while (!await exists(ancestor)) {
    const parent = dirname(ancestor);
    if (parent === ancestor) throw new Error("stage output has no existing parent");
    missing.unshift(basename(ancestor));
    ancestor = parent;
  }
  return resolve(await realpath(ancestor), ...missing);
}

function assertSafeHttpsRepository(repository: string): void {
  let parsed: URL;
  try {
    parsed = new URL(repository);
  } catch {
    throw new Error("planning source origin must be a credential-free HTTPS URL");
  }
  if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password
    || parsed.search || parsed.hash || /\s/u.test(repository)) {
    throw new Error("planning source origin must be a credential-free HTTPS URL");
  }
}

async function inspectSource(sourceInput: string, commit: string): Promise<{
  source: string;
  repository: string;
  activeChanges: string[];
  files: TreeFile[];
}> {
  if (!/^[0-9a-f]{40}$/u.test(commit)) {
    throw new Error("planning commit must be a full 40-character lowercase Git SHA");
  }
  const source = await realpath(sourceInput).catch(() => {
    throw new Error(`planning source checkout does not exist: ${sourceInput}`);
  });
  const root = await realpath(await gitText(source, ["rev-parse", "--show-toplevel"]));
  if (root !== source) throw new Error(`planning source must name its Git root: ${root}`);
  const status = await gitText(source, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (status) throw new Error(`planning source checkout has local changes:\n${status}`);
  const head = await gitText(source, ["rev-parse", "--verify", "HEAD^{commit}"]);
  if (head !== commit) throw new Error(`planning source HEAD ${head} does not match requested commit ${commit}`);
  const repository = await gitText(source, ["remote", "get-url", "origin"]);
  assertSafeHttpsRepository(repository);

  const tree = await gitText(source, ["ls-tree", "-r", "-z", commit, "--", "openspec/specs", "openspec/changes"]);
  const treeFiles = tree.split("\0").filter(Boolean).map((entry) => {
    const match = entry.match(/^100644 blob ([0-9a-f]{40})\t(.+)$/u);
    if (!match?.[1] || !match[2]) throw new Error(`planning source contains unsupported entry: ${entry}`);
    return { blob: match[1], path: match[2] };
  }).sort(compareTreeFiles);
  const activeChanges = [...new Set(treeFiles.flatMap(({ path }) => {
    const match = path.match(/^openspec\/changes\/([^/]+)\//u);
    return match?.[1] && match[1] !== "archive" ? [match[1]] : [];
  }))].sort();
  if (activeChanges.length === 0) throw new Error("planning source has no active Changes to import");
  const invalidChange = activeChanges.find((name) => !/^[a-z0-9][a-z0-9-]*$/u.test(name));
  if (invalidChange) throw new Error(`planning source has invalid active Change name: ${invalidChange}`);

  const prefixes = [
    `${mainSpecsRoot}/`,
    ...activeChanges.map((name) => `openspec/changes/${name}/`),
  ];
  const files = treeFiles.filter(({ path }) => prefixes.some((prefix) => path.startsWith(prefix)));
  for (const change of activeChanges) {
    const tasksPath = `openspec/changes/${change}/tasks.md`;
    const tasksFile = files.find(({ path }) => path === tasksPath);
    if (!tasksFile) throw new Error(`active Change ${change} is missing tasks.md`);
    const tasks = (await gitBlob(source, tasksFile.blob)).toString("utf8");
    if (!/^- \[ \]/mu.test(tasks) || /- \[[xX]\]/u.test(tasks)) {
      throw new Error(`${tasksPath} must keep all implementation tasks pending`);
    }
  }
  return { source, repository, activeChanges, files };
}

export async function stageCourseImport(options: StageCourseImportOptions): Promise<StageCourseImportResult> {
  const inspected = await inspectSource(options.source, options.commit);
  const requestedOutput = resolve(options.output);
  if (await exists(requestedOutput)) {
    throw new Error(`stage output already exists; preserve it and choose a new path: ${requestedOutput}`);
  }
  const output = await resolveBeforeCreating(requestedOutput);
  assertSeparatePaths(inspected.source, output);
  if (await exists(output)) throw new Error(`stage output already exists; preserve it and choose a new path: ${output}`);
  await mkdir(dirname(output), { recursive: true });
  const temporary = await mkdtemp(resolve(dirname(output), ".course-import-"));
  try {
    await mkdir(resolve(temporary, mainSpecsRoot), { recursive: true });
    const manifestFiles: PlanningProvenance["files"][number][] = [];
    for (const file of inspected.files) {
      const content = await gitBlob(inspected.source, file.blob);
      const destination = resolve(temporary, file.path);
      await mkdir(resolve(destination, ".."), { recursive: true });
      await writeFile(destination, content);
      manifestFiles.push({ path: file.path, blob: file.blob, sha256: sha256(content) });
    }
    const manifest: PlanningProvenance = {
      schemaVersion: 1,
      source: {
        repository: inspected.repository,
        commit: options.commit,
        workspace: planningWorkspace,
      },
      imports: {
        mainSpecsRoot,
        activeChanges: inspected.activeChanges,
      },
      files: manifestFiles,
    };
    const manifestPath = resolve(temporary, "docs/course/planning-provenance.json");
    await mkdir(resolve(manifestPath, ".."), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    await rename(temporary, output);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
  return {
    repository: inspected.repository,
    commit: options.commit,
    output,
    activeChanges: inspected.activeChanges,
    files: inspected.files.length,
  };
}

export async function verifyCourseImport(source: string, target: string): Promise<void> {
  const targetRoot = await realpath(target).catch(() => {
    throw new Error(`target meta checkout does not exist: ${target}`);
  });
  const provenance = await readPlanningProvenance(targetRoot);
  const sourceRoot = await realpath(source).catch(() => {
    throw new Error(`planning source checkout does not exist: ${source}`);
  });
  await assertPreparedCourseContext(targetRoot, await readLock(targetRoot), sourceRoot, provenance);
}

function parseOptions(args: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--")) {
      throw new Error(`invalid arguments near ${flag ?? "end of command"}`);
    }
    const name = flag.slice(2);
    if (parsed[name]) throw new Error(`duplicate option: ${flag}`);
    parsed[name] = value;
  }
  return parsed;
}

function hasExactOptions(options: Record<string, string>, expected: readonly string[]): boolean {
  const actual = Object.keys(options).sort();
  const wanted = [...expected].sort();
  return actual.length === expected.length
    && wanted.every((name, index) => actual[index] === name);
}

async function main(): Promise<void> {
  const mode = process.argv[2];
  const options = parseOptions(process.argv.slice(3));
  if (mode === "stage" && hasExactOptions(options, ["commit", "output", "source"])) {
    const result = await stageCourseImport({
      source: options.source,
      commit: options.commit,
      output: options.output,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  if (mode === "verify" && hasExactOptions(options, ["source", "target"])) {
    await verifyCourseImport(options.source, options.target);
    process.stdout.write("course import: PASS\n");
    return;
  }
  throw new Error([
    "usage:",
    "  prepare-course-import.ts stage --source <checkout> --commit <full-sha> --output <new-directory>",
    "  prepare-course-import.ts verify --source <checkout> --target <meta-checkout>",
  ].join("\n"));
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(`course import: FAIL — ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
