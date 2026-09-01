import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { access } from "node:fs/promises";
import { root, readLock } from "./config.js";
import { assertPinnedWorkspace } from "./workspace.js";

try {
  const lock = await readLock();
  const workspace = resolve(root, lock.workspace);
  if (!(await access(resolve(workspace, ".git")).then(() => true).catch(() => false))) {
    throw new Error("run make bootstrap first");
  }
  await assertPinnedWorkspace(lock, workspace);
  console.log(`start: PASS — clean pinned workspace ${lock.commit}; service boundary: ${lock.workspace}`);
  console.log("start: launching the pinned service at http://127.0.0.1:4173/");
  const child = spawn("npm", ["run", "dev"], {
    cwd: workspace,
    stdio: "inherit",
  });
  child.on("error", (error) => {
    console.error(`start: FAIL — ${error.message}`);
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exitCode = code ?? 1;
  });
} catch (error) {
  console.error(`start: FAIL — ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
