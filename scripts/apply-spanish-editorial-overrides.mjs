#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const bankPath = resolve(process.argv[2] || "countries/global/questions.es.json");
const overrides = JSON.parse(readFileSync(resolve(scriptDir, "spanish-editorial-overrides.json"), "utf8"));
const rows = JSON.parse(readFileSync(bankPath, "utf8"));
let changed = 0;

for (const row of rows) {
  const override = overrides[row.source?.id];
  if (!override) continue;
  if (override.q) row.q = override.q;
  if (override.options) row.options = override.options;
  changed += 1;
}

if (changed !== Object.keys(overrides).length) {
  throw new Error(`Applied ${changed} of ${Object.keys(overrides).length} Spanish editorial overrides`);
}
writeFileSync(bankPath, `${JSON.stringify(rows)}\n`);
console.log(`Applied ${changed} Spanish editorial overrides`);
