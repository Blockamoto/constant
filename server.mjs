import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicRoot = join(root, "public");
const dataRoot = join(root, "data");
const port = Number(process.env.PORT || 3000);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  res.end(body);
}

async function jsonFile(name) {
  const body = await readFile(join(dataRoot, name), "utf8");
  return JSON.parse(body);
}

async function api(req, res) {
  if (req.url === "/api/status") {
    send(
      res,
      200,
      JSON.stringify({
        ok: true,
        service: "constant",
        version: "0.1.0",
        now: new Date().toISOString()
      }),
      types[".json"]
    );
    return true;
  }

  if (req.url === "/api/company") {
    send(res, 200, JSON.stringify(await jsonFile("company.json")), types[".json"]);
    return true;
  }

  if (req.url === "/api/obligations") {
    send(res, 200, JSON.stringify(await jsonFile("obligations.json")), types[".json"]);
    return true;
  }

  return false;
}

async function serveStatic(req, res) {
  const raw = req.url === "/" ? "/index.html" : (req.url || "/index.html").split("?")[0];
  const safe = normalize(raw).replace(/^([.][.][/\\])+/, "").replace(/^[/\\]+/, "");
  const path = join(publicRoot, safe);

  if (!path.startsWith(publicRoot)) {
    send(res, 403, "Forbidden");
    return;
  }

  try {
    const body = await readFile(path);
    send(res, 200, body, types[extname(path)] || "application/octet-stream");
  } catch {
    try {
      const body = await readFile(join(publicRoot, "index.html"));
      send(res, 200, body, types[".html"]);
    } catch {
      send(res, 404, "Not found");
    }
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== "GET") {
      send(res, 405, "Method not allowed");
      return;
    }

    if (req.url?.startsWith("/api/") && (await api(req, res))) return;
    await serveStatic(req, res);
  } catch (error) {
    console.error(error);
    send(res, 500, "Internal server error");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Constant listening on http://0.0.0.0:${port}`);
});
