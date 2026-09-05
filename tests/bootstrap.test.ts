import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";
import { bootstrap } from "../scripts/bootstrap.js";

const run = promisify(execFile);
const serviceUrl = "https://example.invalid/course-service.git";
const storeId = "sdd-credit-calculator-product-meta";
const baselineContent = [
  "## Purpose",
  "Synthetic fixture.",
  "",
  "## Requirements",
  "",
  "### Requirement: Fixture",
  "The fixture SHALL exist.",
  "",
  "#### Scenario: Present",
  "- **WHEN** the fixture is read",
  "- **THEN** it exists",
  "",
  "### Requirement: Existing error clearing",
  "The fixture SHALL preserve current behavior.",
  "",
  "#### Scenario: Ошибка очищает предыдущий результат",
  "- **WHEN** an error follows a result",
  "- **THEN** the result is cleared",
  "",
].join("\n");
const changeFiles = {
  ".openspec.yaml": "schema: spec-driven\ncreated: 2026-09-05\n",
  "proposal.md": "## Why\n\nPending cumulative contract.\n",
  "design.md": "## Context\n\nPending cumulative design.\n",
  "review-notes.md": "# Accepted review notes\n\nPart of the complete inherited Change inventory.\n",
  "tasks.md": "- [ ] 1.1 Preserve integer-month input and implement a month/year switch with 0.5→6 and 20→240 conversion.\n- [ ] 1.2 Implement reset in both modes without auto-recalculation.\n",
  "specs/credit-calculator/spec.md": "## ADDED Requirements\n\n### Requirement: Pending cumulative input\nThe fixture SHALL preserve integer-month input and later support a month/year switch plus reset in both modes.\n\n#### Scenario: Pending\n- **WHEN** 20 years is selected\n- **THEN** it maps to 240 whole months without automatic calculation\n",
} as const;

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

async function writePlanningContract(repository: string): Promise<void> {
  await mkdir(resolve(repository, "openspec/specs/credit-calculator"), { recursive: true });
  await writeFile(resolve(repository, "openspec/specs/credit-calculator/spec.md"), baselineContent);
  const changeRoot = resolve(repository, "openspec/changes/add-reset-and-years-term");
  for (const [path, content] of Object.entries(changeFiles)) {
    await mkdir(resolve(changeRoot, path, ".."), { recursive: true });
    await writeFile(resolve(changeRoot, path), content);
  }
}

async function createServiceFixture(parent: string): Promise<{ bare: string; commit: string }> {
  const work = resolve(parent, "service-work");
  const bare = resolve(parent, "service.git");
  await run("git", ["init", "--quiet", work]);
  await writeFile(resolve(work, "README.md"), "synthetic service fixture\n");
  await writePlanningContract(work);
  const commit = await commitAll(work, "service fixture");
  await run("git", ["clone", "--quiet", "--bare", work, bare]);
  return { bare, commit };
}

async function createMetaFixture(parent: string, name: string, commit: string): Promise<string> {
  const meta = resolve(parent, name);
  await mkdir(resolve(meta, ".openspec-store"), { recursive: true });
  await mkdir(resolve(meta, "openspec/changes/archive"), { recursive: true });
  await mkdir(resolve(meta, "docs/course"), { recursive: true });
  await writeFile(resolve(meta, ".gitignore"), ".workspace/\n");
  await writeFile(resolve(meta, ".openspec-store/store.yaml"), [
    "version: 1",
    `id: ${storeId}`,
    "remote: https://example.invalid/product-meta.git",
    "",
  ].join("\n"));
  await writeFile(resolve(meta, "openspec/config.yaml"), "schema: spec-driven\n");
  await writePlanningContract(meta);
  await writeFile(resolve(meta, "docs/course/stage-3-transfer.md"), [
    `- Полный SHA принятого результата: \`${commit}\``,
    `- Service context SHA in \`services.lock.yaml\`: \`${commit}\``,
    "- Baseline source: `openspec/specs/credit-calculator/spec.md`",
    "- Active Change source: `openspec/changes/add-reset-and-years-term/`",
    "",
  ].join("\n"));
  await writeFile(resolve(meta, "docs/course/requirements-traceability.md"), [
    "mode — source fixture — add-reset-and-years-term — `месяцы / годы` — 0,5→6 — 20→240 — task 1.1 — pending implementation",
    "reset — source fixture — add-reset-and-years-term — reset работает в обоих режимах — task 1.2 — pending implementation",
    "",
  ].join("\n"));
  await writeFile(resolve(meta, "services.lock.yaml"), [
    "version: 1",
    "services:",
    "  credit-calculator:",
    `    repository: ${serviceUrl}`,
    `    commit: ${commit}`,
    "    workspace: .workspace/services/credit-calculator",
    "",
  ].join("\n"));
  await run("git", ["init", "--quiet", meta]);
  await commitAll(meta, "meta fixture");
  return meta;
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
}> {
  const fixture = await mkdtemp(resolve(tmpdir(), prefix));
  const { bare, commit } = await createServiceFixture(fixture);
  const meta = await createMetaFixture(fixture, "meta", commit);
  const environment = {
    ...process.env,
    XDG_DATA_HOME: resolve(fixture, "xdg-data"),
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: `url.${pathToFileURL(bare).href}.insteadOf`,
    GIT_CONFIG_VALUE_0: serviceUrl,
  };
  await registerStore(meta, environment);
  return { fixture, meta, environment };
}

test("bootstrap is idempotent with a pinned commit and an isolated Store registry", async () => {
  const fixture = await mkdtemp(resolve(tmpdir(), "course-bootstrap-"));
  try {
    const { bare, commit } = await createServiceFixture(fixture);
    const meta = await createMetaFixture(fixture, "meta", commit);
    const xdgData = resolve(fixture, "xdg-data");
    const environment = {
      ...process.env,
      XDG_DATA_HOME: xdgData,
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: `url.${pathToFileURL(bare).href}.insteadOf`,
      GIT_CONFIG_VALUE_0: serviceUrl,
    };
    await registerStore(meta, environment);

    const first = await bootstrap(meta, environment);
    const second = await bootstrap(meta, environment);
    assert.match(first, /loaded source-only workspace/u);
    assert.match(second, /already at clean pinned workspace/u);

    const { stdout: head } = await run("git", ["-C", resolve(meta, ".workspace/services/credit-calculator"), "rev-parse", "HEAD"]);
    assert.equal(head.trim(), commit);
    const { stdout: registry } = await run("openspec", ["store", "list", "--json"], {
      cwd: meta,
      env: environment,
    });
    assert.equal((JSON.parse(registry) as { stores: Array<{ root: string }> }).stores[0]?.root, await realpath(meta));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("bootstrap accepts a fresh meta checkout normalized by core.autocrlf=true", async () => {
  const fixture = await mkdtemp(resolve(tmpdir(), "course-bootstrap-crlf-"));
  try {
    const { bare, commit } = await createServiceFixture(fixture);
    const seedMeta = await createMetaFixture(fixture, "meta-seed", commit);
    const meta = resolve(fixture, "meta-crlf");
    await run("git", ["-c", "core.autocrlf=true", "clone", "--quiet", seedMeta, meta]);
    await run("git", ["-C", meta, "config", "core.autocrlf", "true"]);
    assert.match(
      await readFile(resolve(meta, "openspec/specs/credit-calculator/spec.md"), "utf8"),
      /\r\n/u,
      "fixture must exercise CRLF working-tree bytes",
    );

    const environment = {
      ...process.env,
      XDG_DATA_HOME: resolve(fixture, "xdg-data"),
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: `url.${pathToFileURL(bare).href}.insteadOf`,
      GIT_CONFIG_VALUE_0: serviceUrl,
    };
    await registerStore(meta, environment);

    assert.match(await bootstrap(meta, environment), /loaded source-only workspace/u);
    assert.match(await bootstrap(meta, environment), /already at clean pinned workspace/u);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("bootstrap rejects dirty meta state before creating a workspace", async () => {
  const fixture = await mkdtemp(resolve(tmpdir(), "course-bootstrap-dirty-"));
  try {
    const { bare, commit } = await createServiceFixture(fixture);
    const meta = await createMetaFixture(fixture, "meta", commit);
    const environment = {
      ...process.env,
      XDG_DATA_HOME: resolve(fixture, "xdg-data"),
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: `url.${pathToFileURL(bare).href}.insteadOf`,
      GIT_CONFIG_VALUE_0: serviceUrl,
    };
    await registerStore(meta, environment);
    await writeFile(resolve(meta, "do-not-overwrite.md"), "keep this work\n");

    await assert.rejects(bootstrap(meta, environment), /meta checkout has local changes/u);
    await assert.rejects(readFile(resolve(meta, ".workspace/services/credit-calculator/README.md"), "utf8"));
    assert.equal(await readFile(resolve(meta, "do-not-overwrite.md"), "utf8"), "keep this work\n");
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("bootstrap rejects mismatched imported provenance before creating a workspace", async () => {
  const fixture = await mkdtemp(resolve(tmpdir(), "course-bootstrap-provenance-"));
  try {
    const { bare, commit } = await createServiceFixture(fixture);
    const meta = await createMetaFixture(fixture, "meta", commit);
    const environment = {
      ...process.env,
      XDG_DATA_HOME: resolve(fixture, "xdg-data"),
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: `url.${pathToFileURL(bare).href}.insteadOf`,
      GIT_CONFIG_VALUE_0: serviceUrl,
    };
    await registerStore(meta, environment);
    const transferPath = resolve(meta, "docs/course/stage-3-transfer.md");
    const transfer = await readFile(transferPath, "utf8");
    await writeFile(transferPath, transfer.replace(commit, "0".repeat(40)));
    await commitAll(meta, "mismatched provenance fixture");

    await assert.rejects(bootstrap(meta, environment), /does not match services\.lock\.yaml/u);
    await assert.rejects(readFile(resolve(meta, ".workspace/services/credit-calculator/README.md"), "utf8"));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

for (const mismatch of [
  {
    name: "a missing inherited Change file",
    path: "openspec/changes/add-reset-and-years-term/review-notes.md",
    mutate: async (path: string) => rm(path),
    expected: /planning inventory.*missing imported files: .*review-notes\.md/u,
  },
  {
    name: "changed bytes in an inherited Change file",
    path: "openspec/changes/add-reset-and-years-term/proposal.md",
    mutate: async (path: string) => writeFile(path, "## Why\n\nChanged after the accepted source SHA.\n"),
    expected: /planning file differs.*proposal\.md/u,
  },
  {
    name: "a baseline copied from the wrong source",
    path: "openspec/specs/credit-calculator/spec.md",
    mutate: async (path: string) => writeFile(path, `${baselineContent}\nWrong baseline bytes.\n`),
    expected: /planning file differs.*openspec\/specs\/credit-calculator\/spec\.md/u,
  },
] as const) {
  test(`bootstrap rejects ${mismatch.name}`, async () => {
    const { fixture, meta, environment } = await createPreparedBootstrapFixture("course-bootstrap-tree-");
    try {
      await mismatch.mutate(resolve(meta, mismatch.path));
      await commitAll(meta, `fixture with ${mismatch.name}`);

      await assert.rejects(bootstrap(meta, environment), mismatch.expected);
      await assert.rejects(readFile(resolve(meta, ".workspace/services/credit-calculator/README.md"), "utf8"));
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  });
}

test("bootstrap reports a conflicting Store root without replacing the registration", async () => {
  const fixture = await mkdtemp(resolve(tmpdir(), "course-bootstrap-store-"));
  try {
    const { commit } = await createServiceFixture(fixture);
    const expectedMeta = await createMetaFixture(fixture, "expected-meta", commit);
    const otherMeta = await createMetaFixture(fixture, "other-meta", commit);
    const environment = { ...process.env, XDG_DATA_HOME: resolve(fixture, "xdg-data") };
    await registerStore(otherMeta, environment);

    await assert.rejects(bootstrap(expectedMeta, environment), /points to .*other-meta, expected .*expected-meta/u);
    const { stdout } = await run("openspec", ["store", "list", "--json"], { cwd: expectedMeta, env: environment });
    assert.equal((JSON.parse(stdout) as { stores: Array<{ root: string }> }).stores[0]?.root, await realpath(otherMeta));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
