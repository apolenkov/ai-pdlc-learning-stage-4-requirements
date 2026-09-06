import { execFile } from "node:child_process";
import { access, mkdir, realpath, rename, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { basename, dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { readLock, root } from "./config.js";
import {
  assertPreparedCourseContext,
  readPlanningProvenance,
} from "./course-context.js";
import { assertPinnedWorkspace } from "./workspace.js";

const run = promisify(execFile);
const storeId = "sdd-credit-calculator-product-meta";

interface StoreList {
  stores?: Array<{ id?: string; root?: string }>;
}

type PinnedSource = Readonly<{ repository: string; commit: string; workspace: string }>;
type PreparedWorkspace = Readonly<{ destination: string; temporary?: string }>;

const exists = async (path: string) => access(path).then(() => true).catch(() => false);

async function command(
  name: string,
  args: string[],
  cwd: string,
  environment: NodeJS.ProcessEnv,
): Promise<string> {
  const { stdout } = await run(name, args, { cwd, env: environment });
  return stdout.trim();
}

export async function assertCleanMetaCheckout(
  projectRoot: string,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const status = await command(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    projectRoot,
    environment,
  );
  if (status) {
    throw new Error(`meta checkout has local changes; preserve them and ask the organizer to provide a clean prepared directory:\n${status}`);
  }
}

export async function assertExpectedStoreRegistration(
  projectRoot: string,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const output = await command("openspec", ["store", "list", "--json"], projectRoot, environment);
  let parsed: StoreList;
  try {
    parsed = JSON.parse(output) as StoreList;
  } catch {
    throw new Error("OpenSpec Store registry returned invalid JSON; ask the organizer to repair the prepared environment");
  }

  const registered = parsed.stores?.find((store) => store.id === storeId);
  if (!registered?.root) {
    throw new Error(`Store ${storeId} is not registered; ask the organizer to prepare it instead of registering it from the analyst workflow`);
  }

  const [expectedRoot, registeredRoot] = await Promise.all([
    realpath(projectRoot),
    realpath(registered.root).catch(() => resolve(registered.root!)),
  ]);
  if (registeredRoot !== expectedRoot) {
    throw new Error(`Store ${storeId} points to ${registeredRoot}, expected ${expectedRoot}; do not replace the other registration automatically`);
  }
}

async function preparePinnedWorkspace(
  projectRoot: string,
  source: PinnedSource,
  environment: NodeJS.ProcessEnv,
): Promise<PreparedWorkspace> {
  const destination = resolve(projectRoot, source.workspace);
  if (await exists(resolve(destination, ".git"))) {
    await assertPinnedWorkspace(source, destination);
    return { destination };
  }
  if (await exists(destination)) {
    throw new Error(`workspace path already exists and is not a Git checkout: ${source.workspace}; move it aside and retry`);
  }

  await mkdir(dirname(destination), { recursive: true });
  const temporary = resolve(dirname(destination), `.${basename(destination)}.setup-${process.pid}`);
  try {
    await command("git", ["clone", "--filter=blob:none", "--no-checkout", source.repository, temporary], projectRoot, environment);
    await command("git", ["-C", temporary, "fetch", "--depth", "1", "origin", source.commit], projectRoot, environment);
    await command("git", ["-C", temporary, "cat-file", "-e", `${source.commit}^{commit}`], projectRoot, environment);
    await command("git", ["-C", temporary, "checkout", "--detach", source.commit], projectRoot, environment);
    await assertPinnedWorkspace(source, temporary);
    return { destination, temporary };
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw new Error(`pinned source commit is unavailable: ${source.commit}; ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function removeTemporary(workspace: PreparedWorkspace | undefined): Promise<void> {
  if (workspace?.temporary) await rm(workspace.temporary, { recursive: true, force: true });
}

async function publishPreparedWorkspace(workspace: PreparedWorkspace): Promise<void> {
  if (workspace.temporary) await rename(workspace.temporary, workspace.destination);
}

export async function bootstrap(
  projectRoot = root,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  await assertCleanMetaCheckout(projectRoot, environment);
  await assertExpectedStoreRegistration(projectRoot, environment);

  const lock = await readLock(projectRoot);
  const provenance = await readPlanningProvenance(projectRoot);
  let serviceWorkspace: PreparedWorkspace | undefined;
  let planningWorkspace: PreparedWorkspace | undefined;
  try {
    planningWorkspace = await preparePinnedWorkspace(projectRoot, provenance.source, environment);
    serviceWorkspace = await preparePinnedWorkspace(projectRoot, lock, environment);
    await assertPreparedCourseContext(projectRoot, lock, planningWorkspace.temporary ?? planningWorkspace.destination, provenance);
    await publishPreparedWorkspace(planningWorkspace);
    await publishPreparedWorkspace(serviceWorkspace);
  } catch (error) {
    await Promise.all([removeTemporary(planningWorkspace), removeTemporary(serviceWorkspace)]);
    throw error;
  }
  if (!planningWorkspace.temporary && !serviceWorkspace.temporary) {
    return `bootstrap: PASS — Store root ${storeId}; already at clean pinned planning ${provenance.source.commit} and service ${lock.commit} workspaces`;
  }
  return `bootstrap: PASS — Store root ${storeId}; loaded read-only planning ${provenance.source.commit} and source-only service ${lock.commit} workspaces; dependencies were not installed`;
}

async function main(): Promise<void> {
  try {
    console.log(await bootstrap());
  } catch (error) {
    console.error(`bootstrap: FAIL — ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main();
}
