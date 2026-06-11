import path from "node:path";
import fs from "node:fs";
import type { InitConfig, Strategy } from "../adapters/types.js";
import { writeText } from "./fsutil.js";

export const MANIFEST_PATH = ".opsx/manifest.json";

export interface ManifestEntry {
  hash: string;
  strategy: Strategy;
}

export interface Manifest {
  manifestVersion: 1;
  packageVersion: string;
  config: InitConfig;
  /** Hash of the content opsx wrote (for managed-block: the block content only). */
  files: Record<string, ManifestEntry>;
}

export function readManifest(cwd: string): Manifest | null {
  const file = path.join(cwd, MANIFEST_PATH);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as Manifest;
}

export function writeManifest(cwd: string, manifest: Manifest): void {
  writeText(path.join(cwd, MANIFEST_PATH), JSON.stringify(manifest, null, 2) + "\n");
}
