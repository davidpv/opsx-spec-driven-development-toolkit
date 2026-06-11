import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/** Recursively list files under dir, relative to base. Skips junk files. */
export function walk(dir: string, base = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === ".DS_Store") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, base));
    else out.push(path.relative(base, p));
  }
  return out.sort();
}

export function readText(file: string): string {
  return fs.readFileSync(file, "utf8");
}

export function readTextIfExists(file: string): string | null {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

export function writeText(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
