import http from "node:http";
import {
  createHash,
  createHmac,
  timingSafeEqual
} from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicRoot = join(root, "public");
const dataRoot = join(root, "data");
const port = Number(process.env.PORT || 3000);

const adminPassword = process.env.CONSTANT_ADMIN_PASSWORD || "";
const sessionSecret = process.env.CONSTANT_SESSION_SECRET || "";
const authConfigured = adminPassword.length >= 12 && sessionSecret.length >= 32;
const passwordDigest = createHash("sha256").update(adminPassword).digest();
const sessionCookie = "constant_session";
const sessionTtlSeconds = 60 * 60 * 12;
const loginWindowMs = 15 * 60 * 1000;
const maxLoginAttempts = 8;
const loginAttempts = new Map();

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function baseHeaders() {
  const headers = {
    "cache-control": "no-store",
    "content-security-policy":
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    "cross-origin-opener-policy": "same-origin",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY"
  };

  if (process.env.RENDER === "true") {
    headers["strict-transport-security"] = "max-age=31536000; includeSubDomains";
  }

  return headers;
}

function send(res, status, body, type = "text/plain; charset=utf-8", extra = {}) {
  res.writeHead(status, {
    ...baseHeaders(),
    "content-type": type,
    ...extra
  });
  res.end(body);
}

function sendJson(res, status, value, extra = {}) {
  send(res, status, JSON.stringify(value), types[".json"], extra);
}

function redirect(res, location) {
  res.writeHead(302, {
    ...baseHeaders(),
    location,
    "cache-control": "no-store"
  });
  res.end();
}

async function jsonFile(name) {
  const body = await readFile(join(dataRoot, name), "utf8");
  return JSON.parse(body);
}

function cookies(req) {
  const raw = req.headers.cookie || "";
  return Object.fromEntries(
    raw
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const at = part.indexOf("=");
        if (at === -1) return [part, ""];
        return [part.slice(0, at), part.slice(at + 1)];
      })
  );
}

function sign(value) {
  return createHmac("sha256", sessionSecret).update(value).digest("base64url");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

function passwordMatches(candidate) {
  const candidateDigest = createHash("sha256").update(String(candidate || "")).digest();
  return timingSafeEqual(passwordDigest, candidateDigest);
}

function createSessionToken() {
  const expiresAt = Date.now() + sessionTtlSeconds * 1000;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload)}`;
}

function validSession(req) {
  if (!authConfigured) return false;

  const token = cookies(req)[sessionCookie];
  if (!token) return false;

  const [expiresRaw, signature] = token.split(".");
  const expiresAt = Number(expiresRaw);

  if (!expiresRaw || !signature || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  return safeEqual(signature, sign(expiresRaw));
}

function sessionCookieHeader(token) {
  const secure = process.env.RENDER === "true" || process.env.NODE_ENV === "production";
  return [
    `${sessionCookie}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${sessionTtlSeconds}`,
    secure ? "Secure" : ""
  ].filter(Boolean).join("; ");
}

function expiredCookieHeader() {
  const secure = process.env.RENDER === "true" || process.env.NODE_ENV === "production";
  return [
    `${sessionCookie}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
    secure ? "Secure" : ""
  ].filter(Boolean).join("; ");
}

function clientKey(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

function loginAllowed(req) {
  const key = clientKey(req);
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || record.resetAt <= now) {
    loginAttempts.set(key, { count: 0, resetAt: now + loginWindowMs });
    return true;
  }

  return record.count < maxLoginAttempts;
}

function recordLoginFailure(req) {
  const key = clientKey(req);
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || record.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + loginWindowMs });
    return;
  }

  record.count += 1;
}

function clearLoginFailures(req) {
  loginAttempts.delete(clientKey(req));
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16 * 1024) {
      const error = new Error("Request body too large");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Invalid JSON");
    error.status = 400;
    throw error;
  }
}

async function serveFile(res, relativePath) {
  const path = join(publicRoot, relativePath);
  const body = await readFile(path);
  send(res, 200, body, types[extname(path)] || "application/octet-stream");
}

async function serveStatic(pathname, res) {
  const raw = pathname === "/" ? "/index.html" : pathname;
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
      await serveFile(res, "index.html");
    } catch {
      send(res, 404, "Not found");
    }
  }
}

async function api(pathname, res) {
  if (pathname === "/api/status") {
    sendJson(res, 200, {
      ok: true,
      service: "constant",
      version: "0.2.0",
      authenticated: true,
      now: new Date().toISOString()
    });
    return true;
  }

  if (pathname === "/api/company") {
    sendJson(res, 200, await jsonFile("company.json"));
    return true;
  }

  if (pathname === "/api/obligations") {
    sendJson(res, 200, await jsonFile("obligations.json"));
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://constant.local");
    const pathname = url.pathname;

    if (req.method === "GET" && pathname === "/healthz") {
      if (!authConfigured) {
        sendJson(res, 503, {
          ok: false,
          configured: false,
          message: "Authentication secrets are not configured."
        });
        return;
      }

      sendJson(res, 200, { ok: true, configured: true });
      return;
    }

    if (req.method === "GET" && pathname === "/login") {
      if (validSession(req)) {
        redirect(res, "/");
        return;
      }
      await serveFile(res, "login.html");
      return;
    }

    if (
      req.method === "GET" &&
      (pathname === "/login.css" || pathname === "/login.js")
    ) {
      await serveFile(res, pathname.slice(1));
      return;
    }

    if (req.method === "POST" && pathname === "/api/login") {
      if (!authConfigured) {
        sendJson(res, 503, { ok: false, error: "Constant is not configured yet." });
        return;
      }

      if (!loginAllowed(req)) {
        sendJson(res, 429, { ok: false, error: "Too many attempts. Try again later." });
        return;
      }

      const body = await readJsonBody(req);

      if (!passwordMatches(body.password)) {
        recordLoginFailure(req);
        sendJson(res, 401, { ok: false, error: "Access denied." });
        return;
      }

      clearLoginFailures(req);
      sendJson(
        res,
        200,
        { ok: true },
        { "set-cookie": sessionCookieHeader(createSessionToken()) }
      );
      return;
    }

    const authenticated = validSession(req);

    if (!authenticated) {
      if (pathname.startsWith("/api/")) {
        sendJson(res, 401, { ok: false, error: "Authentication required." });
      } else {
        redirect(res, "/login");
      }
      return;
    }

    if (req.method === "POST" && pathname === "/api/logout") {
      sendJson(
        res,
        200,
        { ok: true },
        { "set-cookie": expiredCookieHeader() }
      );
      return;
    }

    if (req.method !== "GET") {
      send(res, 405, "Method not allowed");
      return;
    }

    if (pathname.startsWith("/api/") && (await api(pathname, res))) return;

    await serveStatic(pathname, res);
  } catch (error) {
    console.error(error);
    const status = Number(error?.status) || 500;
    sendJson(
      res,
      status,
      status >= 500
        ? { ok: false, error: "Internal server error." }
        : { ok: false, error: error.message }
    );
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(
    `Constant listening on http://0.0.0.0:${port} · auth ${authConfigured ? "configured" : "NOT configured"}`
  );
});
