import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";
import {
  stageCourseImport,
  verifyCourseImport,
} from "../scripts/prepare-course-import.js";
import type { PlanningProvenance } from "../scripts/course-context.js";

const run = promisify(execFile);
const projectRoot = resolve(import.meta.dirname, "..");
const planningUrl = "https://example.invalid/learner-planning.git";
const serviceCommit = "1".repeat(40);

async function commitAll(repository: string, message: string): Promise<string> {
  await run("git", ["-C", repository, "add", "-A"]);
  await run("git", [
    "-C", repository,
    "-c", "user.name=Course Test",
    "-c", "user.email=course@example.invalid",
    "commit", "--quiet", "-m", message,
  ]);
  const { stdout } = await run("git", ["-C", repository, "rev-parse", "HEAD"]);
  return stdout.trim();
}

async function writeChange(repository: string, name: string): Promise<void> {
  const root = resolve(repository, "openspec/changes", name);
  await mkdir(resolve(root, "specs/credit-calculator"), { recursive: true });
  await writeFile(resolve(root, ".openspec.yaml"), "schema: spec-driven\ncreated: 2026-09-07\n");
  await writeFile(resolve(root, "proposal.md"), `## Why\n\nPlanning-only fixture for ${name}.\n`);
  await writeFile(resolve(root, "design.md"), "## Context\n\nNo implementation in this source.\n");
  await writeFile(resolve(root, "specs/credit-calculator/spec.md"), `## ADDED Requirements\n\n### Requirement: ${name}\n\nThe system SHALL preserve this Change.\n\n#### Scenario: Pending\n\n- **WHEN** Apply has not run\n- **THEN** implementation remains pending\n`);
  await writeFile(resolve(root, "tasks.md"), "- [ ] 1.1 Implement and verify the planned behavior later.\n");
}

async function createPlanningSource(parent: string, changes: readonly string[]): Promise<{ source: string; commit: string }> {
  const source = resolve(parent, "learner-source");
  await run("git", ["init", "--quiet", source]);
  await run("git", ["-C", source, "remote", "add", "origin", planningUrl]);
  await mkdir(resolve(source, "openspec/specs"), { recursive: true });
  await mkdir(resolve(source, "openspec/changes/archive"), { recursive: true });
  await writeFile(resolve(source, "openspec/specs/.gitkeep"), "");
  await writeFile(resolve(source, "openspec/changes/archive/.gitkeep"), "");
  for (const change of changes) await writeChange(source, change);
  return { source, commit: await commitAll(source, "planning source") };
}

async function createMetaFromStage(
  parent: string,
  name: string,
  staged: string,
  sourceCommit: string,
  changes: readonly string[],
  serviceSha = serviceCommit,
): Promise<string> {
  const target = resolve(parent, name);
  await mkdir(resolve(target, "docs/course"), { recursive: true });
  await cp(resolve(staged, "openspec"), resolve(target, "openspec"), { recursive: true });
  await cp(
    resolve(staged, "docs/course/planning-provenance.json"),
    resolve(target, "docs/course/planning-provenance.json"),
  );
  await writeFile(resolve(target, "docs/course/stage-3-transfer.md"), [
    `- Planning source repository: \`${planningUrl}\``,
    `- Planning source SHA: \`${sourceCommit}\``,
    `- Service context SHA in \`services.lock.yaml\`: \`${serviceSha}\``,
    "- Main specs source/target: `openspec/specs/`",
    ...changes.map((change) => `- Active Change source/target: \`openspec/changes/${change}/\``),
    "",
  ].join("\n"));
  await writeFile(resolve(target, "docs/course/requirements-traceability.md"), [
    "| Требование / сценарий | Источник: repo + SHA + путь | Владеющий артефакт Store | Состояние до R4 | Незавершённая task | Проверка результата | Решение / review |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...changes.map((change) => {
      const specPath = `openspec/changes/${change}/specs/credit-calculator/spec.md`;
      return `| ${change} | ${planningUrl}@${sourceCommit}:${specPath} | ${specPath} | pending implementation | openspec/changes/${change}/tasks.md: 1.1 | Pending | pending |`;
    }),
    "",
  ].join("\n"));
  await writeFile(resolve(target, "services.lock.yaml"), [
    "version: 1",
    "services:",
    "  credit-calculator:",
    "    repository: https://example.invalid/service.git",
    `    commit: ${serviceSha}`,
    "    workspace: .workspace/services/credit-calculator",
    "",
  ].join("\n"));
  await run("git", ["init", "--quiet", target]);
  await commitAll(target, "prepared meta fixture");
  return target;
}

test("stage derives exact inventory for one or several active Changes without importing archive", async () => {
  const fixture = await mkdtemp(resolve(tmpdir(), "course-import-stage-"));
  try {
    const planning = await createPlanningSource(fixture, ["add-reset-and-years-term"]);
    const oneOutput = resolve(fixture, "stage-one");
    const one = await stageCourseImport({ ...planning, output: oneOutput });
    assert.deepEqual(one.activeChanges, ["add-reset-and-years-term"]);
    await assert.rejects(access(resolve(oneOutput, "openspec/changes/archive/.gitkeep")));

    await writeChange(planning.source, "add-payment-summary");
    planning.commit = await commitAll(planning.source, "add optional AI Change");
    const twoOutput = resolve(fixture, "stage-two");
    const two = await stageCourseImport({ ...planning, output: twoOutput });
    assert.deepEqual(two.activeChanges, ["add-payment-summary", "add-reset-and-years-term"]);

    const manifest = JSON.parse(
      await readFile(resolve(twoOutput, "docs/course/planning-provenance.json"), "utf8"),
    ) as PlanningProvenance;
    const { stdout } = await run("git", [
      "-C", planning.source,
      "ls-tree", "-r", "--name-only", planning.commit, "--",
      "openspec/specs",
      ...two.activeChanges.map((change) => `openspec/changes/${change}`),
    ]);
    assert.deepEqual(manifest.files.map(({ path }) => path), stdout.trim().split("\n").sort());
    assert.equal(manifest.source.commit, planning.commit);
    assert.equal(manifest.source.repository, planningUrl);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("stage refuses a dirty source and never overwrites an existing output", async () => {
  const fixture = await mkdtemp(resolve(tmpdir(), "course-import-guard-"));
  try {
    const planning = await createPlanningSource(fixture, ["add-reset-and-years-term"]);
    const output = resolve(fixture, "existing-output");
    await mkdir(output);
    await writeFile(resolve(output, "keep.txt"), "preserve me\n");
    await assert.rejects(stageCourseImport({ ...planning, output }), /stage output already exists/u);
    assert.equal(await readFile(resolve(output, "keep.txt"), "utf8"), "preserve me\n");

    await writeFile(resolve(planning.source, "do-not-import.md"), "uncommitted work\n");
    await assert.rejects(
      stageCourseImport({ ...planning, output: resolve(fixture, "dirty-output") }),
      /planning source checkout has local changes/u,
    );
    await assert.rejects(access(resolve(fixture, "dirty-output")));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("stage resolves a symlinked output parent before enforcing source separation", async () => {
  const fixture = await mkdtemp(resolve(tmpdir(), "course-import-path-"));
  try {
    const planning = await createPlanningSource(fixture, ["add-reset-and-years-term"]);
    const traversedOutput = `${planning.source}/../allowed-output`;
    await stageCourseImport({ ...planning, output: traversedOutput });
    await access(resolve(fixture, "allowed-output/docs/course/planning-provenance.json"));

    const invalidOutputs = [
      resolve(planning.source, "..cache", "output"),
      resolve(planning.source, "new-parent", "output"),
    ];
    for (const output of invalidOutputs) {
      await assert.rejects(
        stageCourseImport({ ...planning, output }),
        /stage output must be outside the planning source checkout/u,
      );
      await assert.rejects(access(output));
    }

    const sourceAlias = resolve(fixture, "source-alias");
    await symlink(planning.source, sourceAlias, "dir");
    await assert.rejects(
      stageCourseImport({ ...planning, output: resolve(sourceAlias, "must-not-exist") }),
      /stage output must be outside the planning source checkout/u,
    );
    await assert.rejects(access(resolve(planning.source, "must-not-exist")));
    const { stdout: sourceStatus } = await run("git", [
      "-C", planning.source, "status", "--porcelain=v1", "--untracked-files=all",
    ]);
    assert.equal(sourceStatus, "", "invalid outputs must not mutate the planning source");

    const brokenOutput = resolve(fixture, "broken-output");
    await symlink(resolve(fixture, "missing-target"), brokenOutput);
    await assert.rejects(
      stageCourseImport({ ...planning, output: brokenOutput }),
      /stage output already exists/u,
    );
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("stage and its CLI reject HTTPS origins with userinfo without exposing it", async () => {
  const fixture = await mkdtemp(resolve(tmpdir(), "course-import-origin-"));
  const credential = "fixture-password-must-not-leak";
  try {
    const planning = await createPlanningSource(fixture, ["add-reset-and-years-term"]);
    await run("git", [
      "-C", planning.source,
      "remote", "set-url", "origin",
      `https://fixture-user:${credential}@example.invalid/learner-planning.git`,
    ]);
    const directOutput = resolve(fixture, "direct-output");
    await assert.rejects(
      stageCourseImport({ ...planning, output: directOutput }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /credential-free HTTPS URL/u);
        assert.doesNotMatch(error.message, /fixture-user|fixture-password/u);
        return true;
      },
    );
    await assert.rejects(access(directOutput));

    const cliOutput = resolve(fixture, "cli-output");
    const cliFailure = await run(
      resolve(projectRoot, "node_modules/.bin/tsx"),
      [
        resolve(projectRoot, "scripts/prepare-course-import.ts"),
        "stage",
        "--source", planning.source,
        "--commit", planning.commit,
        "--output", cliOutput,
      ],
      { cwd: projectRoot },
    ).then(
      () => undefined,
      (error: unknown) => error as Error & { stdout?: string; stderr?: string },
    );
    assert.ok(cliFailure, "CLI must reject an origin containing userinfo");
    const cliOutputText = `${cliFailure.stdout ?? ""}${cliFailure.stderr ?? ""}`;
    assert.match(cliOutputText, /credential-free HTTPS URL/u);
    assert.doesNotMatch(cliOutputText, /fixture-user|fixture-password/u);
    assert.doesNotMatch(cliOutputText, new RegExp(credential, "u"));
    await assert.rejects(access(cliOutput));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("stage rejects an active Change with completed implementation tasks", async () => {
  const fixture = await mkdtemp(resolve(tmpdir(), "course-import-tasks-"));
  try {
    const planning = await createPlanningSource(fixture, ["add-reset-and-years-term"]);
    await writeFile(
      resolve(planning.source, "openspec/changes/add-reset-and-years-term/tasks.md"),
      "- [x] 1.1 Implemented too early.\n",
    );
    planning.commit = await commitAll(planning.source, "complete task too early");
    await assert.rejects(
      stageCourseImport({ ...planning, output: resolve(fixture, "rejected") }),
      /must keep all implementation tasks pending/u,
    );
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("verify reuses the bootstrap contract and rejects loss, extra files and changed content", async () => {
  const fixture = await mkdtemp(resolve(tmpdir(), "course-import-verify-"));
  try {
    const changes = ["add-payment-summary", "add-reset-and-years-term"];
    const planning = await createPlanningSource(fixture, changes);
    const staged = resolve(fixture, "staged");
    await stageCourseImport({ ...planning, output: staged });
    const seed = await createMetaFromStage(fixture, "meta-seed", staged, planning.commit, changes);
    await verifyCourseImport(planning.source, seed);

    const extended = resolve(fixture, "meta-new-r4-row");
    await run("git", ["clone", "--quiet", seed, extended]);
    const extendedTraceabilityPath = resolve(extended, "docs/course/requirements-traceability.md");
    const extendedTraceability = await readFile(extendedTraceabilityPath, "utf8");
    await writeFile(extendedTraceabilityPath, `${extendedTraceability.trimEnd()}\n| Inclusive amount limits | condition R4 | openspec/changes/limit-credit-amount/specs/credit-calculator/spec.md | pending implementation | openspec/changes/limit-credit-amount/tasks.md: 1.1 | Boundary checks | pending |\n`);
    await commitAll(extended, "add a new R4 traceability row");
    await verifyCourseImport(planning.source, extended);

    const cases = [
      {
        name: "missing",
        mutate: async (target: string) => rm(resolve(target, "openspec/changes/add-payment-summary"), { recursive: true }),
        expected: /missing openspec\/changes\/add-payment-summary/u,
      },
      {
        name: "extra",
        mutate: async (target: string) => writeFile(resolve(target, "openspec/changes/add-reset-and-years-term/extra.md"), "extra\n"),
        expected: /unexpected imported files: .*extra\.md/u,
      },
      {
        name: "mismatch",
        mutate: async (target: string) => writeFile(resolve(target, "openspec/changes/add-reset-and-years-term/proposal.md"), "changed\n"),
        expected: /planning file differs.*proposal\.md/u,
      },
      {
        name: "lost-inherited-row",
        mutate: async (target: string) => {
          const path = resolve(target, "docs/course/requirements-traceability.md");
          const content = await readFile(path, "utf8");
          await writeFile(path, content.split("\n").filter((line) => !line.startsWith("| add-payment-summary |")).join("\n"));
        },
        expected: /missing inherited requirement row for add-payment-summary/u,
      },
      {
        name: "changed-inherited-status",
        mutate: async (target: string) => {
          const path = resolve(target, "docs/course/requirements-traceability.md");
          const content = await readFile(path, "utf8");
          await writeFile(path, content.replace("| pending implementation |", "| baseline |"));
        },
        expected: /inherited row status changed for add-payment-summary/u,
      },
    ] as const;
    for (const candidate of cases) {
      const target = resolve(fixture, `meta-${candidate.name}`);
      await run("git", ["clone", "--quiet", seed, target]);
      await candidate.mutate(target);
      await commitAll(target, candidate.name);
      await assert.rejects(verifyCourseImport(planning.source, target), candidate.expected);
    }
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("verify allows independently selected planning and service roles to use the same SHA", async () => {
  const fixture = await mkdtemp(resolve(tmpdir(), "course-import-same-sha-"));
  try {
    const changes = ["add-reset-and-years-term"];
    const planning = await createPlanningSource(fixture, changes);
    const mainSpecPath = "openspec/specs/credit-calculator/spec.md";
    await mkdir(resolve(planning.source, mainSpecPath, ".."), { recursive: true });
    await writeFile(resolve(planning.source, mainSpecPath), [
      "## Requirements",
      "",
      "### Requirement: Imported source behavior",
      "",
      "The source records behavior without proving its runtime status.",
      "",
    ].join("\n"));
    planning.commit = await commitAll(planning.source, "add a source main spec");
    const staged = resolve(fixture, "staged");
    await stageCourseImport({ ...planning, output: staged });
    const target = await createMetaFromStage(
      fixture,
      "meta-same-sha",
      staged,
      planning.commit,
      changes,
      planning.commit,
    );
    const traceabilityPath = resolve(target, "docs/course/requirements-traceability.md");
    const traceability = await readFile(traceabilityPath, "utf8");
    await writeFile(traceabilityPath, `${traceability.trimEnd()}\n| Imported source behavior | ${planningUrl}@${planning.commit}:${mainSpecPath} | ${mainSpecPath} | runtime status not proven | not applicable | Read the imported source | pending review |\n`);
    await commitAll(target, "map the imported main requirement without inventing baseline status");
    await verifyCourseImport(planning.source, target);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
