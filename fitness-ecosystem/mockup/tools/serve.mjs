#!/usr/bin/env node
/**
 * Serves the mockup folder over HTTP (the pages fetch catalog.json and the
 * media manifest, which `file://` forbids).
 *
 *   node mockup/tools/serve.mjs [--port 8123]
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const portArg = process.argv.indexOf("--port");
const port = Number(portArg > -1 ? process.argv[portArg + 1] : 8123);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    let file = path.join(rootDir, url === "/" ? "index.html" : url);
    if (!file.startsWith(rootDir)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    let info = await stat(file).catch(() => null);
    if (info?.isDirectory()) {
      file = path.join(file, "index.html");
      info = await stat(file).catch(() => null);
    }
    if (!info) {
      res.writeHead(404, { "content-type": "text/plain" }).end("not found");
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, {
      "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { "content-type": "text/plain" }).end(String(err));
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`mockups on http://127.0.0.1:${port}/  (root: ${rootDir})`);
});
