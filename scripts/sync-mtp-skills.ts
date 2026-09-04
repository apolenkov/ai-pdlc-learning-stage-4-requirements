import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

export const MTP_SOURCE = "https://github.com/mattpocock/skills.git";
export const LOCK_PATH = resolve(root, ".agents/mtp-skills.lock.json");
export const SKILLS_ROOT = resolve(root, ".agents/skills");

export const managedSkills = [
  { name: "grill-me", upstreamPath: "skills/productivity/grill-me" },
  { name: "grill-with-docs", upstreamPath: "skills/engineering/grill-with-docs" },
  { name: "grilling", upstreamPath: "skills/productivity/grilling" },
  { name: "domain-modeling", upstreamPath: "skills/engineering/domain-modeling" },
  { name: "research", upstreamPath: "skills/engineering/research" },
  { name: "prototype", upstreamPath: "skills/engineering/prototype" },
] as const;

export type ProvenanceFile = Readonly<{ upstreamPath: string; localPath: string; sha256: string }>;
export type MtpLock = Readonly<{
  schemaVersion: 1;
  source: string;
  commit: string;
  license: Readonly<{ type: "MIT"; upstreamPath: "LICENSE"; localPath: ".agents/skills/MTP-LICENSE"; sha256: string }>;
  rootSkills: readonly ["grill-me", "grill-with-docs"];
  managedSkills: readonly string[];
  dependencyClosure: Readonly<Record<string, readonly string[]>>;
  excludedSkills: readonly ["to-spec"];
  files: readonly ProvenanceFile[];
}>;

export const assertFullSha = (value: string): void => {
  if (!/^[0-9a-f]{40}$/u.test(value)) throw new Error("MTP_SHA must be a full 40-character lowercase Git SHA");
};

const sha256 = (content: Buffer): string => createHash("sha256").update(content).digest("hex");

const listFiles = async (directory: string): Promise<string[]> => {
  const result: string[] = [];
  const visit = async (current: string): Promise<void> => {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) result.push(path);
    }
  };
  await visit(directory);
  return result;
};

const cloneAtCommit = async (commit: string, destination: string): Promise<void> => {
  await run("git", ["init", "--quiet", destination]);
  await run("git", ["-C", destination, "remote", "add", "origin", MTP_SOURCE]);
  await run("git", ["-C", destination, "fetch", "--quiet", "--depth", "1", "origin", commit]);
  await run("git", ["-C", destination, "checkout", "--quiet", "--detach", "FETCH_HEAD"]);
  const { stdout } = await run("git", ["-C", destination, "rev-parse", "HEAD"]);
  if (stdout.trim() !== commit) throw new Error(`upstream resolved to ${stdout.trim()}, expected ${commit}`);
};

export const buildLock = async (checkout: string, commit: string): Promise<MtpLock> => {
  assertFullSha(commit);
  const files: ProvenanceFile[] = [];
  for (const skill of managedSkills) {
    const sourceDirectory = resolve(checkout, skill.upstreamPath);
    for (const sourcePath of await listFiles(sourceDirectory)) {
      const suffix = relative(sourceDirectory, sourcePath);
      files.push({
        upstreamPath: `${skill.upstreamPath}/${suffix}`,
        localPath: `.agents/skills/${skill.name}/${suffix}`,
        sha256: sha256(await readFile(sourcePath)),
      });
    }
  }
  const license = await readFile(resolve(checkout, "LICENSE"));
  return {
    schemaVersion: 1,
    source: MTP_SOURCE,
    commit,
    license: { type: "MIT", upstreamPath: "LICENSE", localPath: ".agents/skills/MTP-LICENSE", sha256: sha256(license) },
    rootSkills: ["grill-me", "grill-with-docs"],
    managedSkills: managedSkills.map(({ name }) => name),
    dependencyClosure: {
      "grill-me": ["grilling"],
      "grill-with-docs": ["grilling", "domain-modeling"],
    },
    excludedSkills: ["to-spec"],
    files: files.sort((left, right) => left.localPath.localeCompare(right.localPath)),
  };
};

const serializeLock = (lock: MtpLock): string => `${JSON.stringify(lock, null, 2)}\n`;

const assertLockShape = (lock: MtpLock): void => {
  if (lock.schemaVersion !== 1 || lock.source !== MTP_SOURCE) throw new Error("unsupported MTP provenance lock");
  assertFullSha(lock.commit);
  const expected = managedSkills.map(({ name }) => name);
  if (JSON.stringify(lock.managedSkills) !== JSON.stringify(expected)) throw new Error("MTP managed skill closure differs from the repository contract");
};

export const verifyInstalledSkills = async (lock: MtpLock): Promise<void> => {
  assertLockShape(lock);
  for (const file of [...lock.files, { upstreamPath: lock.license.upstreamPath, localPath: lock.license.localPath, sha256: lock.license.sha256 }]) {
    const localPath = resolve(root, file.localPath);
    const actual = sha256(await readFile(localPath));
    if (actual !== file.sha256) throw new Error(`${file.localPath} does not match MTP provenance lock`);
  }
  for (const skill of managedSkills) {
    const expectedFiles = lock.files.filter((file) => file.localPath.startsWith(`.agents/skills/${skill.name}/`)).map((file) => file.localPath).sort();
    const actualFiles = (await listFiles(resolve(SKILLS_ROOT, skill.name))).map((file) => relative(root, file)).sort();
    if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) throw new Error(`${skill.name} contains files outside the MTP provenance lock`);
  }
};

const installFromCheckout = async (checkout: string, lock: MtpLock): Promise<void> => {
  for (const skill of managedSkills) {
    const destination = resolve(SKILLS_ROOT, skill.name);
    await rm(destination, { recursive: true, force: true });
    for (const file of lock.files.filter((entry) => entry.localPath.startsWith(`.agents/skills/${skill.name}/`))) {
      const target = resolve(root, file.localPath);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(resolve(checkout, file.upstreamPath), target);
    }
  }
  await mkdir(SKILLS_ROOT, { recursive: true });
  await copyFile(resolve(checkout, "LICENSE"), resolve(root, lock.license.localPath));
};

const sync = async (mode: "install" | "update" | "check", updateSha?: string): Promise<void> => {
  if (mode === "check") {
    const lock = JSON.parse(await readFile(LOCK_PATH, "utf8")) as MtpLock;
    await verifyInstalledSkills(lock);
    process.stdout.write(`MTP skills: PASS (${lock.commit}; ${lock.files.length} files)\n`);
    return;
  }
  let existing: MtpLock | undefined;
  try { existing = JSON.parse(await readFile(LOCK_PATH, "utf8")) as MtpLock; }
  catch (error) {
    if (mode === "install") throw error;
  }
  const commit = mode === "update" ? updateSha ?? "" : existing?.commit ?? "";
  assertFullSha(commit);
  if (mode === "install" && existing) assertLockShape(existing);
  const temporary = await mkdtemp(resolve(tmpdir(), "mtp-skills-sync-"));
  try {
    await cloneAtCommit(commit, temporary);
    const candidate = await buildLock(temporary, commit);
    if (mode === "install" && existing && serializeLock(candidate) !== serializeLock(existing)) throw new Error("upstream snapshot differs from the committed MTP provenance lock; run npm run skills:update -- <full-sha>");
    if (mode === "update" && existing) {
      for (const name of existing.managedSkills.filter((name) => !candidate.managedSkills.includes(name))) {
        if (!/^[a-z0-9-]+$/u.test(name)) throw new Error(`unsafe obsolete managed skill name: ${name}`);
        await rm(resolve(SKILLS_ROOT, name), { recursive: true, force: true });
      }
    }
    await installFromCheckout(temporary, candidate);
    if (mode === "update") {
      await mkdir(dirname(LOCK_PATH), { recursive: true });
      await writeFile(LOCK_PATH, serializeLock(candidate), "utf8");
    }
    await verifyInstalledSkills(candidate);
    process.stdout.write(`MTP skills ${mode === "update" ? "updated" : "installed"}: ${commit}; ${candidate.files.length} files\n`);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const command = process.argv[2] ?? "install";
    if (command !== "install" && command !== "update" && command !== "check") throw new Error(`unknown command: ${command}`);
    await sync(command, process.argv[3]);
  } catch (error) {
    process.stderr.write(`MTP skills: FAIL — ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
