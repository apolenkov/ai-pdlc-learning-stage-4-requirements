import { execFile, spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { npmExecutable } from "./npm.js";
import { root } from "./config.js";

const exec = promisify(execFile);

export const setupSteps = [
  { phase: "preflight", script: "doctor" },
  { phase: "preflight", script: "skills:check" },
  { phase: "setup", script: "bootstrap" },
  { phase: "verify", script: "bootstrap" },
  { phase: "verify", script: "check" },
] as const;

export type SetupRunner = (script: string) => Promise<void>;
export type StatusReader = () => Promise<string>;

const runNpmScript: SetupRunner = async (script) => new Promise((resolvePromise, reject) => {
  const child = spawn(npmExecutable(), ["run", script], { cwd: root, stdio: "inherit" });
  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (code === 0) resolvePromise();
    else reject(new Error(`npm run ${script} exited with ${signal ? `signal ${signal}` : `code ${code ?? "unknown"}`}`));
  });
});

const readStatus: StatusReader = async () => {
  const { stdout } = await exec("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: root });
  return stdout;
};

export async function setupWorkspace(run: SetupRunner = runNpmScript, status: StatusReader = readStatus): Promise<void> {
  const before = await status();
  if (before) {
    throw new Error("preflight: repository has local changes; use a clean clone or ask the template owner to preserve them first");
  }
  let currentPhase = "preflight";

  for (const step of setupSteps) {
    if (step.phase !== currentPhase) currentPhase = step.phase;
    console.log(`${currentPhase}: RUN npm run ${step.script}`);
    try {
      await run(step.script);
    } catch (error) {
      throw new Error(`${currentPhase}/${step.script}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const after = await status();
  if (after !== before) {
    throw new Error("verify: Git status changed during setup; inspect the new files before continuing");
  }

  console.log("setup: PASS — preflight, setup and verify completed; repository is clean");
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entry) {
  setupWorkspace().catch((error: unknown) => {
    console.error(`setup: FAIL — ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
