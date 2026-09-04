import { test } from "node:test";
import assert from "node:assert/strict";
import { npmExecutable } from "../scripts/npm.js";

test("uses npm.cmd for Windows child processes", () => {
  assert.equal(npmExecutable("win32"), "npm.cmd");
});

test("uses npm on Unix-like child processes", () => {
  assert.equal(npmExecutable("darwin"), "npm");
  assert.equal(npmExecutable("linux"), "npm");
});
