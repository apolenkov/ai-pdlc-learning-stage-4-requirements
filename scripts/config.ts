import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const root = resolve(import.meta.dirname, "..");
export const lockPath = resolve(root, "services.lock.yaml");

export async function readLock(): Promise<{ repository: string; commit: string; workspace: string }> {
  const text = await readFile(lockPath, "utf8");
  const repository = text.match(/repository:\s*(\S+)/)?.[1];
  const commit = text.match(/commit:\s*([0-9a-f]{40})\b/)?.[1];
  const workspace = text.match(/workspace:\s*(\S+)/)?.[1];
  if (!repository || !commit || !workspace) throw new Error("services.lock.yaml: expected repository, full 40-character commit and workspace");
  return { repository, commit, workspace };
}
