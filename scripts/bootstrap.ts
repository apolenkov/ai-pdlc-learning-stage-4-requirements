import { execFile } from "node:child_process";
import { access, mkdir, realpath, rename, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { readLock, root } from "./config.js";
import { assertPreparedCourseContext } from "./course-context.js";
import { assertPinnedWorkspace } from "./workspace.js";

const run = promisify(execFile);
const storeId = "sdd-credit-calculator-product-meta";

interface StoreList {
  stores?: Array<{ id?: string; root?: string }>;
}

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

export async function bootstrap(
  projectRoot = root,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  await assertCleanMetaCheckout(projectRoot, environment);
  await assertExpectedStoreRegistration(projectRoot, environment);

  const lock = await readLock(projectRoot);
  const destination = resolve(projectRoot, lock.workspace);
  if (await exists(resolve(destination, ".git"))) {
    await assertPinnedWorkspace(lock, destination);
    await assertPreparedCourseContext(projectRoot, lock, destination);
    return `bootstrap: PASS — Store root ${storeId}; already at clean pinned workspace ${lock.commit}`;
  }
  if (await exists(destination)) {
    throw new Error(`workspace path already exists and is not a Git checkout: ${lock.workspace}; move it aside and retry`);
  }

  const servicesRoot = resolve(projectRoot, ".workspace/services");
  const temporaryDestination = resolve(servicesRoot, `.credit-calculator.setup-${process.pid}`);
  await mkdir(servicesRoot, { recursive: true });
  try {
    await command("git", ["clone", "--filter=blob:none", "--no-checkout", lock.repository, temporaryDestination], projectRoot, environment);
    await command("git", ["-C", temporaryDestination, "fetch", "--depth", "1", "origin", lock.commit], projectRoot, environment);
    await command("git", ["-C", temporaryDestination, "cat-file", "-e", `${lock.commit}^{commit}`], projectRoot, environment);
    await command("git", ["-C", temporaryDestination, "checkout", "--detach", lock.commit], projectRoot, environment);
    await assertPinnedWorkspace(lock, temporaryDestination);
  } catch (error) {
    await rm(temporaryDestination, { recursive: true, force: true });
    throw new Error(`locked commit is unavailable: ${lock.commit}; ${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    await assertPreparedCourseContext(projectRoot, lock, temporaryDestination);
    await rename(temporaryDestination, destination);
  } catch (error) {
    await rm(temporaryDestination, { recursive: true, force: true });
    throw error;
  }
  return `bootstrap: PASS — Store root ${storeId}; loaded source-only workspace ${lock.commit}; service dependencies were not installed`;
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
