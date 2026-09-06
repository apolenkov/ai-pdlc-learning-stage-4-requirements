import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";
import { bootstrap } from "../scripts/bootstrap.js";

const run = promisify(execFile);
const planningUrl = "https://example.invalid/course-planning.git";
const serviceUrl = "https://example.invalid/course-service.git";
const planningWorkspace = ".workspace/planning/stage-3";
const serviceWorkspace = ".workspace/services/credit-calculator";
const storeId = "sdd-credit-calculator-product-meta";
const importedChanges = ["add-payment-summary", "add-reset-and-years-term"] as const;

async function commitAll(repository: string, message: string): Promise<string> {
  await run("git", ["-C", repository, "add", "."]);
  await run("git", [
    "-C", repository,
    "-c", "user.name=Course Test",
    "-c", "user.email=course@example.invalid",
    "commit", "--quiet", "-m", message,
  ]);
  const { stdout } = await run("git", ["-C", repository, "rev-parse", "HEAD"]);
  return stdout.trim();
}

async function writeChange(repository: string, name: string, checked = false): Promise<void> {
  const root = resolve(repository, "openspec/changes", name);
  await mkdir(resolve(root, "specs/credit-calculator"), { recursive: true });
  await writeFile(resolve(root, ".openspec.yaml"), "schema: spec-driven\ncreated: 2026-09-06\n");
  await writeFile(resolve(root, "proposal.md"), `## Why\n\nPlanning-only fixture for ${name}.\n`);
  await writeFile(resolve(root, "design.md"), "## Context\n\nNo application exists in this planning source.\n");
  await writeFile(resolve(root, "specs/credit-calculator/spec.md"), `## ADDED Requirements\n\n### Requirement: ${name}\n\nThe planning fixture SHALL preserve this Change.\n\n#### Scenario: Pending behavior\n\n- **WHEN** Apply has not run\n- **THEN** implementation remains pending\n`);
  await writeFile(resolve(root, "tasks.md"), [
    `- [${checked ? "x" : " "}] 1.1 Keep the first implementation task pending.`,
    "- [ ] 1.2 Keep the second implementation task pending.",
    "",
  ].join("\n"));
  if (name === "add-reset-and-years-term") {
    await writeFile(resolve(root, "traceability.md"), "# Traceability\n\nThe inherited reset and years contract remains planning-only.\n");
  }
}

async function createPlanningFixture(parent: string): Promise<{ bare: string; commit: string; work: string }> {
  const work = resolve(parent, "planning-work");
  const bare = resolve(parent, "planning.git");
  await run("git", ["init", "--quiet", work]);
  await mkdir(resolve(work, "openspec/specs"), { recursive: true });
  await mkdir(resolve(work, "openspec/changes/archive"), { recursive: true });
  await writeFile(resolve(work, "openspec/specs/.gitkeep"), "");
  await writeFile(resolve(work, "openspec/changes/archive/.gitkeep"), "");
  await writeFile(resolve(work, "openspec/config.yaml"), "schema: spec-driven\n");
  for (const change of importedChanges) await writeChange(work, change);
  const commit = await commitAll(work, "planning fixture without an application or main spec");
  await run("git", ["clone", "--quiet", "--bare", work, bare]);
  return { bare, commit, work };
}

async function createServiceFixture(parent: string): Promise<{ bare: string; commit: string }> {
  const work = resolve(parent, "service-work");
  const bare = resolve(parent, "service.git");
  await run("git", ["init", "--quiet", work]);
  await writeFile(resolve(work, "README.md"), "synthetic service source\n");
  const commit = await commitAll(work, "service fixture independent from planning");
  await run("git", ["clone", "--quiet", "--bare", work, bare]);
  return { bare, commit };
}

async function planningFiles(repository: string, commit: string): Promise<Array<{ path: string; blob: string; sha256: string }>> {
  const { stdout } = await run("git", [
    "-C", repository, "ls-tree", "-r", "-z", commit, "--", "openspec/specs", ...importedChanges.map((name) => `openspec/changes/${name}`),
  ]);
  const files = [];
  for (const entry of stdout.split("\0").filter(Boolean)) {
    const match = entry.match(/^\d+ blob ([0-9a-f]{40})\t(.+)$/u);
    assert.ok(match?.[1] && match[2]);
    const result = await run("git", ["-C", repository, "cat-file", "blob", match[1]], { encoding: "buffer" });
    const content = Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout);
    files.push({
      path: match[2],
      blob: match[1],
      sha256: createHash("sha256").update(content).digest("hex"),
    });
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

async function createMetaFixture(
  parent: string,
  name: string,
  planning: { commit: string; work: string },
  serviceCommit: string,
): Promise<string> {
  const meta = resolve(parent, name);
  await mkdir(resolve(meta, ".openspec-store"), { recursive: true });
  await mkdir(resolve(meta, "openspec/changes/archive"), { recursive: true });
  await mkdir(resolve(meta, "openspec/specs"), { recursive: true });
  await mkdir(resolve(meta, "docs/course"), { recursive: true });
  await writeFile(resolve(meta, ".gitignore"), ".workspace/\n");
  await writeFile(resolve(meta, ".openspec-store/store.yaml"), [
    "version: 1",
    `id: ${storeId}`,
    "remote: https://example.invalid/product-meta.git",
    "",
  ].join("\n"));
  await writeFile(resolve(meta, "openspec/config.yaml"), "schema: spec-driven\n");
  await cp(resolve(planning.work, "openspec/specs/.gitkeep"), resolve(meta, "openspec/specs/.gitkeep"));
  for (const change of importedChanges) {
    await cp(resolve(planning.work, "openspec/changes", change), resolve(meta, "openspec/changes", change), { recursive: true });
  }
  await writeChange(meta, "enforce-spec-centric-meta-contract", true);
  await writeFile(resolve(meta, "docs/course/planning-provenance.json"), `${JSON.stringify({
    schemaVersion: 1,
    source: {
      repository: planningUrl,
      commit: planning.commit,
      workspace: planningWorkspace,
    },
    imports: {
      mainSpecsRoot: "openspec/specs",
      activeChanges: [...importedChanges],
    },
    files: await planningFiles(planning.work, planning.commit),
  }, null, 2)}\n`);
  await writeFile(resolve(meta, "docs/course/stage-3-transfer.md"), [
    `- Planning source repository: \`${planningUrl}\``,
    `- Planning source SHA: \`${planning.commit}\``,
    `- Service context SHA in \`services.lock.yaml\`: \`${serviceCommit}\``,
    "- Imported main specs root: `openspec/specs`",
    ...importedChanges.map((name) => `- Active Change source: \`openspec/changes/${name}/\``),
    "",
  ].join("\n"));
  await writeFile(resolve(meta, "docs/course/requirements-traceability.md"), [
    ...importedChanges.map((name) => `${name} — inherited source fixture — pending implementation`),
    "",
  ].join("\n"));
  await writeFile(resolve(meta, "services.lock.yaml"), [
    "version: 1",
    "services:",
    "  credit-calculator:",
    `    repository: ${serviceUrl}`,
    `    commit: ${serviceCommit}`,
    `    workspace: ${serviceWorkspace}`,
    "",
  ].join("\n"));
  await run("git", ["init", "--quiet", meta]);
  await commitAll(meta, "meta fixture");
  return meta;
}

function fixtureEnvironment(
  fixture: string,
  planningBare: string,
  serviceBare: string,
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    XDG_DATA_HOME: resolve(fixture, "xdg-data"),
    GIT_CONFIG_COUNT: "2",
    GIT_CONFIG_KEY_0: `url.${pathToFileURL(planningBare).href}.insteadOf`,
    GIT_CONFIG_VALUE_0: planningUrl,
    GIT_CONFIG_KEY_1: `url.${pathToFileURL(serviceBare).href}.insteadOf`,
    GIT_CONFIG_VALUE_1: serviceUrl,
  };
}

async function registerStore(meta: string, environment: NodeJS.ProcessEnv): Promise<void> {
  await run("openspec", ["store", "register", meta, "--id", storeId, "--yes", "--json"], {
    cwd: meta,
    env: environment,
  });
}

async function createPreparedBootstrapFixture(prefix: string): Promise<{
  fixture: string;
  meta: string;
  environment: NodeJS.ProcessEnv;
  planning: { bare: string; commit: string; work: string };
  service: { bare: string; commit: string };
}> {
  const fixture = await mkdtemp(resolve(tmpdir(), prefix));
  const planning = await createPlanningFixture(fixture);
  const service = await createServiceFixture(fixture);
  assert.notEqual(planning.commit, service.commit);
  const meta = await createMetaFixture(fixture, "meta", planning, service.commit);
  const environment = fixtureEnvironment(fixture, planning.bare, service.bare);
  await registerStore(meta, environment);
  return { fixture, meta, environment, planning, service };
}

test("bootstrap is idempotent with separate pinned planning and service commits", async () => {
  const prepared = await createPreparedBootstrapFixture("course-bootstrap-");
  try {
    const first = await bootstrap(prepared.meta, prepared.environment);
    const second = await bootstrap(prepared.meta, prepared.environment);
    assert.match(first, /loaded read-only planning/u);
    assert.match(second, /already at clean pinned planning/u);

    const { stdout: planningHead } = await run("git", ["-C", resolve(prepared.meta, planningWorkspace), "rev-parse", "HEAD"]);
    const { stdout: serviceHead } = await run("git", ["-C", resolve(prepared.meta, serviceWorkspace), "rev-parse", "HEAD"]);
    assert.equal(planningHead.trim(), prepared.planning.commit);
    assert.equal(serviceHead.trim(), prepared.service.commit);
    const { stdout: registry } = await run("openspec", ["store", "list", "--json"], {
      cwd: prepared.meta,
      env: prepared.environment,
    });
    assert.equal((JSON.parse(registry) as { stores: Array<{ root: string }> }).stores[0]?.root, await realpath(prepared.meta));
  } finally {
    await rm(prepared.fixture, { recursive: true, force: true });
  }
});

test("bootstrap accepts a fresh meta checkout normalized by core.autocrlf=true", async () => {
  const prepared = await createPreparedBootstrapFixture("course-bootstrap-crlf-");
  try {
    const meta = resolve(prepared.fixture, "meta-crlf");
    await run("git", ["-c", "core.autocrlf=true", "clone", "--quiet", prepared.meta, meta]);
    await run("git", ["-C", meta, "config", "core.autocrlf", "true"]);
    assert.match(
      await readFile(resolve(meta, "openspec/changes/add-payment-summary/proposal.md"), "utf8"),
      /\r\n/u,
      "fixture must exercise CRLF working-tree bytes",
    );
    const environment = {
      ...prepared.environment,
      XDG_DATA_HOME: resolve(prepared.fixture, "xdg-data-crlf"),
    };
    await run("openspec", ["store", "register", meta, "--id", storeId, "--yes", "--json"], {
      cwd: meta,
      env: environment,
    });
    assert.match(await bootstrap(meta, environment), /loaded read-only planning/u);
    assert.match(await bootstrap(meta, environment), /already at clean pinned planning/u);
  } finally {
    await rm(prepared.fixture, { recursive: true, force: true });
  }
});

test("bootstrap rejects dirty meta state before creating workspaces", async () => {
  const prepared = await createPreparedBootstrapFixture("course-bootstrap-dirty-");
  try {
    await writeFile(resolve(prepared.meta, "do-not-overwrite.md"), "keep this work\n");
    await assert.rejects(bootstrap(prepared.meta, prepared.environment), /meta checkout has local changes/u);
    await assert.rejects(readFile(resolve(prepared.meta, serviceWorkspace, "README.md"), "utf8"));
    await assert.rejects(readFile(resolve(prepared.meta, planningWorkspace, "openspec/config.yaml"), "utf8"));
    assert.equal(await readFile(resolve(prepared.meta, "do-not-overwrite.md"), "utf8"), "keep this work\n");
  } finally {
    await rm(prepared.fixture, { recursive: true, force: true });
  }
});

test("bootstrap rejects a planning SHA in place of the independent service pin", async () => {
  const prepared = await createPreparedBootstrapFixture("course-bootstrap-provenance-");
  try {
    const transferPath = resolve(prepared.meta, "docs/course/stage-3-transfer.md");
    const transfer = await readFile(transferPath, "utf8");
    await writeFile(transferPath, transfer.replace(prepared.service.commit, prepared.planning.commit));
    await commitAll(prepared.meta, "mismatched service provenance fixture");
    await assert.rejects(bootstrap(prepared.meta, prepared.environment), /service SHA .* does not match services\.lock\.yaml/u);
    await assert.rejects(readFile(resolve(prepared.meta, serviceWorkspace, "README.md"), "utf8"));
  } finally {
    await rm(prepared.fixture, { recursive: true, force: true });
  }
});

for (const mismatch of [
  {
    name: "a lost imported Change",
    path: "openspec/changes/add-payment-summary",
    mutate: async (path: string) => rm(path, { recursive: true }),
    expected: /prepared course context is missing openspec\/changes\/add-payment-summary/u,
  },
  {
    name: "a missing file from the second imported Change",
    path: "openspec/changes/add-payment-summary/design.md",
    mutate: async (path: string) => rm(path),
    expected: /planning inventory.*missing imported files: .*add-payment-summary\/design\.md/u,
  },
  {
    name: "an extra file in an imported Change",
    path: "openspec/changes/add-reset-and-years-term/extra.md",
    mutate: async (path: string) => writeFile(path, "not present in the planning source tree\n"),
    expected: /planning inventory.*unexpected imported files: .*extra\.md/u,
  },
  {
    name: "changed bytes in an imported Change",
    path: "openspec/changes/add-reset-and-years-term/proposal.md",
    mutate: async (path: string) => writeFile(path, "## Why\n\nChanged after the accepted planning SHA.\n"),
    expected: /planning file differs.*add-reset-and-years-term\/proposal\.md/u,
  },
  {
    name: "a fabricated substantive main spec",
    path: "openspec/specs/credit-calculator/spec.md",
    mutate: async (path: string) => {
      await mkdir(resolve(path, ".."), { recursive: true });
      await writeFile(path, "# Fake implemented baseline\n");
    },
    expected: /planning inventory.*unexpected imported files: .*openspec\/specs\/credit-calculator\/spec\.md/u,
  },
] as const) {
  test(`bootstrap rejects ${mismatch.name}`, async () => {
    const prepared = await createPreparedBootstrapFixture("course-bootstrap-tree-");
    try {
      await mismatch.mutate(resolve(prepared.meta, mismatch.path));
      await commitAll(prepared.meta, `fixture with ${mismatch.name}`);
      await assert.rejects(bootstrap(prepared.meta, prepared.environment), mismatch.expected);
      await assert.rejects(readFile(resolve(prepared.meta, serviceWorkspace, "README.md"), "utf8"));
    } finally {
      await rm(prepared.fixture, { recursive: true, force: true });
    }
  });
}

test("bootstrap rejects checked implementation tasks in any imported Change", async () => {
  const prepared = await createPreparedBootstrapFixture("course-bootstrap-checked-");
  try {
    const tasksPath = resolve(prepared.meta, "openspec/changes/add-payment-summary/tasks.md");
    await writeFile(tasksPath, (await readFile(tasksPath, "utf8")).replace("- [ ]", "- [x]"));
    await commitAll(prepared.meta, "checked imported task fixture");
    await assert.rejects(bootstrap(prepared.meta, prepared.environment), /add-payment-summary\/tasks\.md must keep all implementation tasks pending/u);
  } finally {
    await rm(prepared.fixture, { recursive: true, force: true });
  }
});

test("bootstrap rejects a wrong planning repository without falling back to the service", async () => {
  const prepared = await createPreparedBootstrapFixture("course-bootstrap-source-");
  try {
    const manifestPath = resolve(prepared.meta, "docs/course/planning-provenance.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { source: { repository: string } };
    manifest.source.repository = serviceUrl;
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const transferPath = resolve(prepared.meta, "docs/course/stage-3-transfer.md");
    await writeFile(transferPath, (await readFile(transferPath, "utf8")).replace(planningUrl, serviceUrl));
    await commitAll(prepared.meta, "wrong planning source fixture");
    await assert.rejects(bootstrap(prepared.meta, prepared.environment), /pinned source commit is unavailable/u);
    await assert.rejects(readFile(resolve(prepared.meta, planningWorkspace, "openspec/config.yaml"), "utf8"));
  } finally {
    await rm(prepared.fixture, { recursive: true, force: true });
  }
});

test("bootstrap rejects a source SHA whose tree is not available from the declared planning repository", async () => {
  const prepared = await createPreparedBootstrapFixture("course-bootstrap-sha-");
  try {
    const manifestPath = resolve(prepared.meta, "docs/course/planning-provenance.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { source: { commit: string } };
    manifest.source.commit = prepared.service.commit;
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const transferPath = resolve(prepared.meta, "docs/course/stage-3-transfer.md");
    await writeFile(transferPath, (await readFile(transferPath, "utf8")).replace(prepared.planning.commit, prepared.service.commit));
    await commitAll(prepared.meta, "wrong planning SHA fixture");
    await assert.rejects(bootstrap(prepared.meta, prepared.environment), /pinned source commit is unavailable/u);
  } finally {
    await rm(prepared.fixture, { recursive: true, force: true });
  }
});

test("bootstrap rejects a dirty existing planning snapshot without replacing it", async () => {
  const prepared = await createPreparedBootstrapFixture("course-bootstrap-planning-dirty-");
  try {
    await bootstrap(prepared.meta, prepared.environment);
    const sourceReadme = resolve(prepared.meta, planningWorkspace, "README-local.md");
    await writeFile(sourceReadme, "preserve this local snapshot change\n");
    await assert.rejects(bootstrap(prepared.meta, prepared.environment), /workspace has local changes/u);
    assert.equal(await readFile(sourceReadme, "utf8"), "preserve this local snapshot change\n");
  } finally {
    await rm(prepared.fixture, { recursive: true, force: true });
  }
});

test("bootstrap reports a conflicting Store root without replacing the registration", async () => {
  const fixture = await mkdtemp(resolve(tmpdir(), "course-bootstrap-store-"));
  try {
    const planning = await createPlanningFixture(fixture);
    const service = await createServiceFixture(fixture);
    const expectedMeta = await createMetaFixture(fixture, "expected-meta", planning, service.commit);
    const otherMeta = await createMetaFixture(fixture, "other-meta", planning, service.commit);
    const environment = fixtureEnvironment(fixture, planning.bare, service.bare);
    await registerStore(otherMeta, environment);
    await assert.rejects(bootstrap(expectedMeta, environment), /points to .*other-meta, expected .*expected-meta/u);
    const { stdout } = await run("openspec", ["store", "list", "--json"], { cwd: expectedMeta, env: environment });
    assert.equal((JSON.parse(stdout) as { stores: Array<{ root: string }> }).stores[0]?.root, await realpath(otherMeta));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
