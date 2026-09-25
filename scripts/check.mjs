import { access, readFile } from "node:fs/promises";

const required = [
  "README.md",
  "server.mjs",
  "render.yaml",
  ".env.example",
  "public/index.html",
  "public/styles.css",
  "public/app.js",
  "public/login.html",
  "public/login.css",
  "public/login.js",
  "data/company.json",
  "data/obligations.json",
  "docs/ARCHITECTURE.md",
  "docs/GITHUB-SCHEDULE-SMOKE-TEST.md",
  "docs/RENDER.md"
];

for (const path of required) {
  await access(path);
}

for (const path of ["data/company.json", "data/obligations.json"]) {
  JSON.parse(await readFile(path, "utf8"));
}

const blueprint = await readFile("render.yaml", "utf8");
for (const requiredKey of ["CONSTANT_ADMIN_PASSWORD", "CONSTANT_SESSION_SECRET", "/healthz"]) {
  if (!blueprint.includes(requiredKey)) {
    throw new Error(`render.yaml is missing ${requiredKey}`);
  }
}

console.log("Constant integrity check passed.");
