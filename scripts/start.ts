import { resolve } from "node:path";
import { access } from "node:fs/promises";
import { root, readLock } from "./config.js";

const lock = await readLock();
const workspace = resolve(root, lock.workspace);
if (!(await access(workspace).then(() => true).catch(() => false))) {
  console.error("start: FAIL — run make bootstrap first");
  process.exit(1);
}
console.log(`start: PASS — product context ready; service boundary: ${lock.workspace}`);
console.log("start: the service remains owned by its separate repository; no service code is copied here");
