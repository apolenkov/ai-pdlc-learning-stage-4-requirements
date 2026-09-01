import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { root, readLock } from "./config.js";
import { assertPinnedWorkspace } from "./workspace.js";

const run = promisify(execFile);
const exists = async (path: string) => access(path).then(() => true).catch(() => false);
const npmEnvironment = { ...process.env };
delete npmEnvironment.npm_config_allow_scripts;
delete npmEnvironment.NPM_CONFIG_ALLOW_SCRIPTS;

try {
  const lock = await readLock();
  const destination = resolve(root, lock.workspace);
  if (await exists(resolve(destination, ".git"))) {
    await assertPinnedWorkspace(lock, destination);
    console.log(`bootstrap: PASS — already at clean pinned workspace ${lock.commit}`);
    process.exit(0);
  }
  await mkdir(resolve(root, ".workspace/services"), { recursive: true });
  try {
    await run("git", ["clone", "--filter=blob:none", "--no-checkout", lock.repository, destination], { cwd: root });
    await run("git", ["-C", destination, "fetch", "--depth", "1", "origin", lock.commit]);
    await run("git", ["-C", destination, "cat-file", "-e", `${lock.commit}^{commit}`]);
    await run("git", ["-C", destination, "checkout", "--detach", lock.commit]);
    await run("npm", ["ci"], { cwd: destination, env: npmEnvironment });
    await assertPinnedWorkspace(lock, destination);
  } catch (error) {
    await rm(destination, { recursive: true, force: true });
    throw new Error(`locked commit is unavailable: ${lock.commit}; ${error instanceof Error ? error.message : String(error)}`);
  }
  console.log(`bootstrap: PASS — loaded clean pinned workspace ${lock.commit} and installed locked dependencies`);
} catch (error) {
  console.error(`bootstrap: FAIL — ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
