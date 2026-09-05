import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";

const run = promisify(execFile);
const storeId = "sdd-credit-calculator-product-meta";
const repositoryRoot = resolve(import.meta.dirname, "..");

const baseline = `## Purpose
This synthetic transfer fixture verifies cumulative planning without implementing application behavior.

## Requirements

### Requirement: Existing calculation
The system SHALL keep the existing monthly calculation.

#### Scenario: Existing behavior
- **WHEN** a valid monthly term is supplied
- **THEN** the existing result remains available

### Requirement: Existing error clearing
The system SHALL clear a previous result after invalid input.

#### Scenario: Error after success
- **WHEN** invalid input follows a successful result
- **THEN** the previous result is cleared
`;

async function writeChange(
  openspecRoot: string,
  id: string,
  requirement: string,
  scenario: string,
  tasks: string[],
  dependency?: string,
): Promise<void> {
  const change = resolve(openspecRoot, "changes", id);
  await mkdir(resolve(change, "specs/credit-calculator"), { recursive: true });
  await writeFile(resolve(change, ".openspec.yaml"), "schema: spec-driven\ncreated: 2026-09-05\n");
  await writeFile(resolve(change, "proposal.md"), `## Why\n\nSynthetic course transfer.\n\n## What Changes\n\n- ${requirement}\n${dependency ? `- Depends on active Change ${dependency}.\n` : ""}\n## Capabilities\n\n### Modified Capabilities\n\n- \`credit-calculator\`: cumulative training contract.\n\n## Impact\n\nPlanning only; no application implementation.\n`);
  await writeFile(resolve(change, "design.md"), `## Context\n\nSynthetic fixture.\n\n## Decisions\n\n${dependency ? `Read ${dependency} before this Change.\n` : "Keep existing behavior.\n"}\n\n## Risks\n\nDocuments do not prove implementation.\n`);
  await writeFile(resolve(change, "specs/credit-calculator/spec.md"), `## ADDED Requirements\n\n### Requirement: ${requirement}\n\nThe system SHALL support this synthetic requirement.\n\n#### Scenario: ${scenario}\n\n- **WHEN** the course input is used\n- **THEN** the specified observable result occurs\n`);
  await writeFile(resolve(change, "tasks.md"), tasks.map((task, index) => `- [ ] ${index + 1}.1 ${task}`).join("\n") + "\n");
}

test("a personal R3 baseline and complete active Change transfer into an isolated Store with pending dependent work", async () => {
  const fixture = await mkdtemp(resolve(tmpdir(), "course-transfer-"));
  try {
    const source = resolve(fixture, "r3-source");
    const target = resolve(fixture, "r4-store");
    const staged = resolve(fixture, "staged");
    const archive = resolve(fixture, "stage-3.tar");
    const xdgData = resolve(fixture, "xdg-data");
    await mkdir(resolve(source, "openspec/specs/credit-calculator"), { recursive: true });
    await mkdir(resolve(target, "openspec/changes/archive"), { recursive: true });
    await writeFile(resolve(source, "openspec/config.yaml"), "schema: spec-driven\n");
    await writeFile(resolve(source, "openspec/specs/credit-calculator/spec.md"), baseline);
    await writeChange(
      resolve(source, "openspec"),
      "add-reset-and-years-term",
      "Reset and year-based term",
      "Reset and half-year conversion",
      [
        "Preserve integer-month input and implement a month/year switch that does not calculate automatically; verify both modes.",
        "Implement a 0.5 year step, default 20 years and whole-month conversion; verify 0.5 to 6 and 20 to 240.",
        "Implement reset in both modes, preserving the selected mode and restoring 240 months or 20 years without recalculation.",
      ],
    );
    await run("git", ["init", "--quiet", source]);
    await run("git", ["-C", source, "add", "."]);
    await run("git", ["-C", source, "-c", "user.name=Course Test", "-c", "user.email=course@example.invalid", "commit", "--quiet", "-m", "R3 planning fixture"]);
    const { stdout: sourceSha } = await run("git", ["-C", source, "rev-parse", "HEAD"]);

    await run("openspec", ["validate", "--all", "--strict", "--no-interactive"], { cwd: source });
    const { stdout: localStatus } = await run("openspec", ["status", "--change", "add-reset-and-years-term", "--json"], { cwd: source });
    const { stdout: localInstructions } = await run("openspec", ["instructions", "apply", "--change", "add-reset-and-years-term", "--json"], { cwd: source });
    assert.equal((JSON.parse(localStatus) as { isComplete: boolean }).isComplete, true);
    assert.equal((JSON.parse(localInstructions) as { state: string }).state, "ready");

    await run("git", [
      "-C", source,
      "archive", "--format=tar", "-o", archive, sourceSha.trim(),
      "openspec/specs/credit-calculator/spec.md",
      "openspec/changes/add-reset-and-years-term",
    ]);
    await mkdir(staged, { recursive: true });
    await run("tar", ["-x", "-f", archive, "-C", staged]);
    await assert.rejects(readFile(resolve(target, "openspec/changes/add-reset-and-years-term/tasks.md"), "utf8"));
    await cp(resolve(staged, "openspec/specs"), resolve(target, "openspec/specs"), { recursive: true });
    await cp(resolve(staged, "openspec/changes/add-reset-and-years-term"), resolve(target, "openspec/changes/add-reset-and-years-term"), { recursive: true });
    await writeFile(resolve(target, "openspec/config.yaml"), "schema: spec-driven\n");

    await writeChange(
      resolve(target, "openspec"),
      "limit-credit-amount",
      "Inclusive credit amount limits",
      "Inclusive boundaries and adjacent invalid integers",
      ["Implement 10 000 and 100 000 000 as valid, reject 9 999 and 100 000 001, clear the prior result, and verify all four values."],
      "add-reset-and-years-term",
    );

    const environment = { ...process.env, XDG_DATA_HOME: xdgData };
    await run("openspec", ["store", "register", target, "--id", storeId, "--yes", "--json"], { cwd: target, env: environment });
    await run("openspec", ["validate", "--all", "--strict", "--no-interactive", "--store", storeId], { cwd: target, env: environment });

    for (const change of ["add-reset-and-years-term", "limit-credit-amount"]) {
      const { stdout: status } = await run("openspec", ["status", "--change", change, "--json", "--store", storeId], { cwd: target, env: environment });
      const { stdout: instructions } = await run("openspec", ["instructions", "apply", "--change", change, "--json", "--store", storeId], { cwd: target, env: environment });
      assert.equal((JSON.parse(status) as { isComplete: boolean }).isComplete, true, "planning artifacts must be complete");
      assert.equal((JSON.parse(instructions) as { state: string }).state, "ready", "implementation tasks must remain ready and pending");
      assert.doesNotMatch(await readFile(resolve(target, "openspec/changes", change, "tasks.md"), "utf8"), /- \[x\]/u);
    }

    assert.equal(await readFile(resolve(target, "openspec/specs/credit-calculator/spec.md"), "utf8"), baseline);
    const inheritedTasks = await readFile(resolve(target, "openspec/changes/add-reset-and-years-term/tasks.md"), "utf8");
    assert.match(inheritedTasks, /Preserve integer-month input.*month\/year switch/u);
    assert.match(inheritedTasks, /reset in both modes.*240 months or 20 years without recalculation/u);
    assert.match(await readFile(resolve(target, "openspec/changes/limit-credit-amount/proposal.md"), "utf8"), /Depends on active Change add-reset-and-years-term/u);
    await assert.rejects(readFile(resolve(target, "src/app.ts"), "utf8"));

    const serviceContinuation = resolve(fixture, "service-continuation");
    await mkdir(resolve(serviceContinuation, "openspec"), { recursive: true });
    await cp(
      resolve(repositoryRoot, "docs/templates/store-only-config.yaml"),
      resolve(serviceContinuation, "openspec/config.yaml"),
    );
    const { stdout: resolved } = await run("openspec", ["list", "--json"], {
      cwd: serviceContinuation,
      env: environment,
    });
    assert.equal((JSON.parse(resolved) as { root: { path: string } }).root.path, await realpath(target));
    await assert.rejects(readFile(resolve(serviceContinuation, "openspec/specs/credit-calculator/spec.md"), "utf8"));
    await assert.rejects(readFile(resolve(serviceContinuation, "openspec/changes/add-reset-and-years-term/tasks.md"), "utf8"));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
