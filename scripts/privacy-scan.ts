import { readdir, readFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { root } from "./config.js";

const ignoredDirectories = new Set([".git", ".workspace", "dist", "node_modules"]);
const textExtensions = new Set([".json", ".md", ".ts", ".yaml", ".yml"]);
const errors: string[] = [];

const forbiddenFiles = [/(^|\/)\.env($|\.)/, /(^|\/)id_rsa$/, /\.(?:key|pem)$/];
const sensitivePatterns = [
  { label: "private key", pattern: new RegExp(["BEGIN", "PRIVATE", "KEY"].join("[ -]"), "i") },
  { label: "OpenAI-style API key", pattern: new RegExp("\\b" + "sk" + "-[A-Za-z0-9_-]{20,}\\b") },
  { label: "GitHub token", pattern: new RegExp("\\b" + "gh" + "[pousr]_[A-Za-z0-9_]{20,}\\b") },
  { label: "AWS access key", pattern: new RegExp("\\b" + "AK" + "IA[0-9A-Z]{16}\\b") },
  { label: "Bearer credential", pattern: new RegExp("\\bBearer\\s+[A-Za-z0-9._~+/=-]{20,}", "i") },
  { label: "corporate address", pattern: new RegExp("\\b[a-z0-9.-]+\\." + "corp-example" + "\\.com\\b", "i") },
];

async function collect(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) return [];
    const absolute = resolve(directory, entry.name);
    return entry.isDirectory() ? collect(absolute) : [absolute];
  }));
  return files.flat();
}

for (const file of await collect(root)) {
  const name = relative(root, file).replaceAll("\\", "/");
  if (forbiddenFiles.some((pattern) => pattern.test(name))) errors.push(`forbidden file: ${name}`);
  if (!textExtensions.has(extname(file))) continue;
  const content = await readFile(file, "utf8");
  for (const { label, pattern } of sensitivePatterns) {
    if (pattern.test(content)) errors.push(`${name}: ${label}`);
  }
}

if (errors.length > 0) throw new Error(`privacy scan failed:\n- ${errors.join("\n- ")}`);
console.log("privacy:scan: PASS — no credential patterns, private keys, corporate addresses or forbidden local files found");
