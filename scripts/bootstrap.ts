import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { root, readLock } from "./config.js";

const run = promisify(execFile);
const exists = async (path: string) => access(path).then(() => true).catch(() => false);

try {
  const lock = await readLock();
  const destination = resolve(root, lock.workspace);
  if (await exists(resolve(destination, ".git"))) {
    const { stdout } = await run("git", ["-C", destination, "rev-parse", "HEAD"]);
    if (stdout.trim() !== lock.commit) throw new Error(`workspace is not locked to ${lock.commit}`);
    console.log(`bootstrap: already at ${lock.commit}`);
    process.exit(0);
  }
  await mkdir(resolve(root, ".workspace/services"), { recursive: true });
  const { stdout } = await run("git", ["ls-remote", lock.repository, lock.commit]);
  if (!stdout.split("\n").some((line) => line.startsWith(`${lock.commit}\t`))) {
    throw new Error(`locked commit is unavailable: ${lock.commit}`);
  }
  await run("git", ["clone", "--no-checkout", lock.repository, destination], { cwd: root });
  await run("git", ["-C", destination, "checkout", "--detach", lock.commit]);
  console.log(`bootstrap: loaded ${lock.commit}`);
} catch (error) {
  console.error(`bootstrap: FAIL — ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
