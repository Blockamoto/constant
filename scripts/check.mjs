import { access, readFile } from "node:fs/promises";

const required = [
  "README.md",
  "server.mjs",
  "public/index.html",
  "public/styles.css",
  "public/app.js",
  "data/company.json",
  "data/obligations.json",
  "docs/ARCHITECTURE.md",
  "docs/GITHUB-SCHEDULE-SMOKE-TEST.md"
];

for (const path of required) {
  await access(path);
}

for (const path of ["data/company.json", "data/obligations.json"]) {
  JSON.parse(await readFile(path, "utf8"));
}

console.log("Constant integrity check passed.");
