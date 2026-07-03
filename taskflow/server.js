/**
 * server.js — TaskFlow Backend v2
 * Servidor HTTP puro em Node.js com autenticação JWT e banco MySQL.
 *
 * Variáveis de ambiente (crie um arquivo .env ou exporte antes de iniciar):
 *   DB_HOST      → host do MySQL     (padrão: localhost)
 *   DB_PORT      → porta do MySQL    (padrão: 3306)
 *   DB_USER      → usuário MySQL     (padrão: root)
 *   DB_PASSWORD  → senha MySQL       (obrigatório)
 *   DB_NAME      → nome do banco     (padrão: taskflow)
 *   JWT_SECRET   → segredo do JWT    (padrão: mude em produção!)
 *   PORT         → porta HTTP        (padrão: 3000)
 *
 * Inicie com:  node server.js
 */

// Carrega variáveis de .env se existir (sem dependência externa)
const fs   = require("fs");
const path = require("path");
if (fs.existsSync(path.join(__dirname, ".env"))) {
    fs.readFileSync(path.join(__dirname, ".env"), "utf8")
        .split("\n")
        .forEach(line => {
            const [k, ...v] = line.split("=");
            if (k && v.length) process.env[k.trim()] = v.join("=").trim();
        });
}

const http = require("http");
const Router      = require("./src/router");
const { cors, bodyParser, addHelpers, staticFiles, logger } = require("./src/middleware");
const { inicializar } = require("./src/db/database");

const rotasAuth     = require("./src/routes/auth");
const rotasTarefas  = require("./src/routes/tarefas");
const rotasProjetos = require("./src/routes/projetos");
const rotasUsuarios = require("./src/routes/usuarios");
const rotasStats    = require("./src/routes/stats");

const PORT       = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

async function main() {
    // Inicializa schema do banco antes de aceitar conexões
    await inicializar();

    const router = new Router();

    rotasAuth.registrar(router);
    rotasTarefas.registrar(router);
    rotasProjetos.registrar(router);
    rotasUsuarios.registrar(router);
    rotasStats.registrar(router);

    function pipeline(req, res) {
        const middlewares = [
            logger,
            cors,
            bodyParser,
            addHelpers,
            (req, res, next) => {
                const encontrou = router.handle(req, res);
                if (!encontrou) next();
            },
            staticFiles(PUBLIC_DIR)
        ];

        let i = 0;
        const next = () => { const fn = middlewares[i++]; if (fn) fn(req, res, next); };
        next();
    }

    const server = http.createServer(pipeline);

    server.listen(PORT, () => {
        console.log("\x1b[36m╔══════════════════════════════════════════╗\x1b[0m");
        console.log("\x1b[36m║     TaskFlow v2 — Auth + MySQL           ║\x1b[0m");
        console.log("\x1b[36m╚══════════════════════════════════════════╝\x1b[0m");
        console.log(`\n  🚀  Servidor rodando em \x1b[4mhttp://localhost:${PORT}\x1b[0m\n`);
        console.log("  Rotas públicas:");
        console.log("    POST /api/auth/registrar");
        console.log("    POST /api/auth/login");
        console.log("  Rotas protegidas (JWT obrigatório):");
        console.log("    GET  /api/auth/me");
        console.log("    GET | POST              /api/tarefas");
        console.log("    GET | PUT | DELETE      /api/tarefas/:id");
        console.log("    GET | POST              /api/projetos");
        console.log("    GET | PUT | DELETE      /api/projetos/:id");
        console.log("    GET                     /api/usuarios");
        console.log("    GET  /api/stats\n");
    });

    process.on("SIGINT",  () => { server.close(() => process.exit(0)); });
    process.on("SIGTERM", () => { server.close(() => process.exit(0)); });
}

main().catch(err => {
    console.error("\x1b[31m[FATAL]\x1b[0m Falha ao iniciar:", err.message);
    process.exit(1);
});
