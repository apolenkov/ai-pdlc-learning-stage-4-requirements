import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ServiceLock } from "./config.js";

const run = promisify(execFile);

async function git(workspace: string, args: string[]): Promise<string> {
  const { stdout } = await run("git", ["-C", workspace, ...args]);
  return stdout.trim();
}

export async function assertPinnedWorkspace(lock: ServiceLock, workspace: string): Promise<void> {
  if (!/^[0-9a-f]{40}$/.test(lock.commit)) {
    throw new Error(`lock commit is not a full SHA: ${lock.commit}`);
  }

  const head = await git(workspace, ["rev-parse", "--verify", "HEAD^{commit}"]);
  if (head !== lock.commit) {
    throw new Error(`workspace HEAD ${head} does not match locked commit ${lock.commit}`);
  }

  const status = await git(workspace, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (status) {
    throw new Error("workspace has local changes; restore a clean pinned checkout before continuing");
  }

  const origin = await git(workspace, ["remote", "get-url", "origin"]);
  if (origin !== lock.repository) {
    throw new Error(`workspace origin ${origin} does not match locked repository ${lock.repository}`);
  }
}
