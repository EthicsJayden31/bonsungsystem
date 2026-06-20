import { cpSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const source = resolve(root, "pages-preview");
const target = resolve(root, "out", "legacy-preview");

rmSync(target, { force: true, recursive: true });
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });

console.log("Preserved legacy preview at out/legacy-preview");
