import { cpSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const source = resolve(root, "pages-preview");
const target = resolve(root, "out", "legacy-preview");

rmSync(target, { force: true, recursive: true });

if (process.env.NEXT_PUBLIC_ENABLE_LEGACY_PREVIEW !== "true") {
  console.log("Skipped legacy preview artifact. Set NEXT_PUBLIC_ENABLE_LEGACY_PREVIEW=true to include it.");
  process.exit(0);
}

mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });

console.log("Preserved legacy preview at out/legacy-preview");
