import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const root = resolve(import.meta.dirname, "..");
export const lockPath = resolve(root, "services.lock.yaml");

export interface ServiceLock {
  repository: string;
  commit: string;
  workspace: string;
}

export async function readLock(): Promise<ServiceLock> {
  const text = await readFile(lockPath, "utf8");
  const repository = text.match(/repository:\s*(\S+)/)?.[1];
  const commit = text.match(/commit:\s*([0-9a-f]{40})\b/)?.[1];
  const workspace = text.match(/workspace:\s*(\S+)/)?.[1];
  if (!repository || !commit || !workspace) throw new Error("services.lock.yaml: expected repository, full 40-character commit and workspace");
  if (!/^https:\/\/\S+$/.test(repository)) throw new Error("services.lock.yaml: service repository must use HTTPS");
  if (workspace !== ".workspace/services/credit-calculator") {
    throw new Error("services.lock.yaml: unexpected service workspace");
  }
  return { repository, commit, workspace };
}
