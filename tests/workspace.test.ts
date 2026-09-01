import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";
import assert from "node:assert/strict";
import type { ServiceLock } from "../scripts/config.js";
import { assertPinnedWorkspace } from "../scripts/workspace.js";

const run = promisify(execFile);

test("workspace verification rejects a wrong full SHA without network access", async () => {
  const fixture = await mkdtemp(resolve(tmpdir(), "meta-workspace-"));
  try {
    await run("git", ["init", "--quiet", fixture]);
    await writeFile(resolve(fixture, "README.md"), "local fixture\n");
    await run("git", ["-C", fixture, "add", "README.md"]);
    await run("git", ["-C", fixture, "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "--quiet", "-m", "fixture"]);
    await run("git", ["-C", fixture, "remote", "add", "origin", "https://example.invalid/service.git"]);
    const { stdout } = await run("git", ["-C", fixture, "rev-parse", "HEAD"]);
    const lock: ServiceLock = {
      repository: "https://example.invalid/service.git",
      commit: stdout.trim().replace(/^./, (character) => character === "0" ? "1" : "0"),
      workspace: ".workspace/services/credit-calculator",
    };

    await assert.rejects(assertPinnedWorkspace(lock, fixture), /does not match locked commit/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
