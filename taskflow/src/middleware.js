/**
 * middleware.js
 * Coleção de middlewares HTTP: body-parser JSON, helpers de resposta,
 * CORS e servidor de arquivos estáticos — tudo sem dependências externas.
 */

const fs   = require("fs");
const path = require("path");
const crypto = require("crypto");

// ===== MIME TYPES =====
const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".js":   "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".svg":  "image/svg+xml",
    ".ico":  "image/x-icon",
    ".woff2":"font/woff2",
    ".woff": "font/woff",
    ".ttf":  "font/ttf",
};

// ===== CORS =====
function cors(req, res, next) {
    res.setHeader("Access-Control-Allow-Origin",  "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
    next();
}

// ===== BODY PARSER JSON =====
function bodyParser(req, res, next) {
    if (!["POST", "PUT", "PATCH"].includes(req.method)) { next(); return; }
    const ct = req.headers["content-type"] || "";
    if (!ct.includes("application/json"))     { next(); return; }

    let body = "";
    req.on("data", chunk => { body += chunk.toString(); });
    req.on("end",  () => {
        try { req.body = JSON.parse(body); }
        catch { req.body = {}; }
        next();
    });
}

// ===== HELPERS DE RESPOSTA =====
function addHelpers(req, res, next) {
    res.json = (data, status = 200) => {
        const payload = JSON.stringify(data);
        res.writeHead(status, {
            "Content-Type":   "application/json; charset=utf-8",
            "Content-Length": Buffer.byteLength(payload)
        });
        res.end(payload);
    };
    res.status = (code) => { res._statusCode = code; return res; };
    next();
}

// ===== SERVIDOR DE ARQUIVOS ESTÁTICOS =====
function staticFiles(publicDir) {
    return function(req, res) {
        let filePath = path.normalize(path.join(publicDir, req.url.split("?")[0]));
        if (!filePath.startsWith(publicDir)) {
            res.writeHead(403); res.end("Forbidden"); return;
        }

        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
            filePath = path.join(filePath, "index.html");
        }

        if (!fs.existsSync(filePath)) {
            const fallback = path.join(publicDir, "index.html");
            if (fs.existsSync(fallback)) {
                filePath = fallback;
            } else {
                res.writeHead(404); res.end("Not found"); return;
            }
        }

        const ext  = path.extname(filePath).toLowerCase();
        const mime = MIME[ext] || "application/octet-stream";

        const stat  = fs.statSync(filePath);
        const etag  = crypto.createHash("md5").update(stat.mtime.toISOString() + stat.size).digest("hex");
        if (req.headers["if-none-match"] === etag) {
            res.writeHead(304); res.end(); return;
        }

        res.writeHead(200, {
            "Content-Type":  mime,
            "ETag":          etag,
            "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600"
        });
        fs.createReadStream(filePath).pipe(res);
    };
}

// ===== LOGGER =====
function logger(req, res, next) {
    const start = Date.now();
    res.on("finish", () => {
        const ms    = Date.now() - start;
        const color = res.statusCode < 400 ? "\x1b[32m" : "\x1b[31m";
        console.log(`${color}${req.method}\x1b[0m ${req.url} → ${res.statusCode} (${ms}ms)`);
    });
    next();
}

module.exports = { cors, bodyParser, addHelpers, staticFiles, logger };
