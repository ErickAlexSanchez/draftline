import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { findRepoRoot } from "../packages/adapters/src/load-env";

const root = findRepoRoot();
const file = path.join(root, "apps", "web", ".next", "types", "routes.d.ts");

if (!existsSync(file)) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, "export {};\n");
}
