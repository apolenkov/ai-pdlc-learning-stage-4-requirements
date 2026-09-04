import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { root, readLock } from "./config.js";

const run = promisify(execFile);
async function command(name: string, args: string[]): Promise<string> {
  const result = await run(name, args, { cwd: root });
  return result.stdout.trim();
}

try {
  const git = await command("git", ["--version"]);
  const node = await command("node", ["--version"]);
  const openspec = await command("openspec", ["--version"]);
  const lock = await readLock();
  await readFile(resolve(root, "CONTEXT.md"), "utf8");
  await readFile(resolve(root, "product.yaml"), "utf8");
  console.log(`doctor: PASS (${git}; ${node}; OpenSpec ${openspec}; service lock is valid)`);
} catch (error) {
  console.error(`doctor: FAIL — ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
