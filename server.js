const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const root = __dirname;
const port = Number(process.env.PORT || 4174);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function cleanBaseUrl(value) {
  const raw = String(value || process.env.EVOLUTION_URL || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return raw.replace(/\/+$/, "");
  }
}

function getEvolutionConfig(body) {
  const baseUrl = cleanBaseUrl(body.baseUrl);
  const apiKey = String(body.apiKey || process.env.EVOLUTION_API_KEY || "").trim();
  const instance = String(body.instance || process.env.EVOLUTION_INSTANCE || "").trim();

  if (!baseUrl || !apiKey || !instance) {
    const missing = [];
    if (!baseUrl) missing.push("baseUrl");
    if (!apiKey) missing.push("apiKey");
    if (!instance) missing.push("instance");
    const error = new Error(`Faltan credenciales: ${missing.join(", ")}`);
    error.status = 400;
    throw error;
  }

  return { baseUrl, apiKey, instance };
}

async function callEvolution({ baseUrl, apiKey, endpoint, method = "GET", body }) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      apikey: apiKey,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const error = new Error(`Evolution API respondio ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function handleApi(req, res, pathname) {
  try {
    const body = await readJson(req);
    const config = getEvolutionConfig(body);

    if (pathname === "/api/evolution/connect") {
      const query = body.number ? `?number=${encodeURIComponent(body.number)}` : "";
      const data = await callEvolution({
        ...config,
        endpoint: `/instance/connect/${encodeURIComponent(config.instance)}${query}`
      });
      return sendJson(res, 200, { ok: true, data });
    }

    if (pathname === "/api/evolution/state") {
      const data = await callEvolution({
        ...config,
        endpoint: `/instance/connectionState/${encodeURIComponent(config.instance)}`
      });
      return sendJson(res, 200, { ok: true, data });
    }

    if (pathname === "/api/evolution/find-chats") {
      const data = await callEvolution({
        ...config,
        endpoint: `/chat/findChats/${encodeURIComponent(config.instance)}`,
        method: "POST",
        body: body.where ? { where: body.where } : undefined
      });
      return sendJson(res, 200, { ok: true, data });
    }

    if (pathname === "/api/evolution/find-messages") {
      const data = await callEvolution({
        ...config,
        endpoint: `/chat/findMessages/${encodeURIComponent(config.instance)}`,
        method: "POST",
        body: body.where ? { where: body.where } : {}
      });
      return sendJson(res, 200, { ok: true, data });
    }

    if (pathname === "/api/evolution/send-text") {
      if (!body.number || !body.text) {
        return sendJson(res, 400, { ok: false, error: "number y text son requeridos" });
      }
      const data = await callEvolution({
        ...config,
        endpoint: `/message/sendText/${encodeURIComponent(config.instance)}`,
        method: "POST",
        body: {
          number: String(body.number).replace(/[^\d]/g, ""),
          text: body.text,
          delay: Number(body.delay || 1200),
          linkPreview: Boolean(body.linkPreview)
        }
      });
      return sendJson(res, 200, { ok: true, data });
    }

    return sendJson(res, 404, { ok: false, error: "Endpoint no encontrado" });
  } catch (error) {
    return sendJson(res, error.status || 500, {
      ok: false,
      error: error.message,
      data: error.data || null
    });
  }
}

function serveStatic(req, res, pathname) {
  let filePath = decodeURIComponent(pathname);
  if (filePath === "/") filePath = "/index.html";
  if (filePath.endsWith("/")) filePath += "index.html";

  const absolute = path.resolve(root, `.${filePath}`);
  if (!absolute.startsWith(root)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(absolute, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("No encontrado");
    }
    res.writeHead(200, {
      "Content-Type": mime[path.extname(absolute)] || "application/octet-stream"
    });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith("/api/evolution/")) {
    if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "Usa POST" });
    return handleApi(req, res, url.pathname);
  }
  return serveStatic(req, res, url.pathname);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`ARV Intelligence CRM: http://127.0.0.1:${port}/dashboard/`);
});
