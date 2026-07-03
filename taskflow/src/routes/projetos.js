/**
 * routes/projetos.js
 * CRUD completo de Projetos — dados isolados por usuário autenticado.
 */

const { db }         = require("../db/database");
const { autenticar } = require("../middleware/auth");

function validar(body) {
    const erros = [];
    if (!body.nome || !body.nome.trim()) erros.push("nome é obrigatório");
    if (body.cor && !/^#[0-9A-Fa-f]{6}$/.test(body.cor)) erros.push("cor deve ser hexadecimal (#RRGGBB)");
    return erros;
}

function registrar(router) {
    router.get("/api/projetos", autenticar, async (req, res) => {
        res.json(await db.getProjetos(req.usuarioId));
    });

    router.post("/api/projetos", autenticar, async (req, res) => {
        const body  = req.body || {};
        const erros = validar(body);
        if (erros.length) return res.json({ erro: erros.join("; ") }, 400);
        const novo = await db.criarProjeto(body, req.usuarioId);
        res.json(novo, 201);
    });

    router.get("/api/projetos/:id", autenticar, async (req, res) => {
        const p = await db.getProjeto(req.params.id, req.usuarioId);
        if (!p) return res.json({ erro: "Projeto não encontrado" }, 404);
        res.json(p);
    });

    router.put("/api/projetos/:id", autenticar, async (req, res) => {
        const body  = req.body || {};
        const erros = validar(body);
        if (erros.length) return res.json({ erro: erros.join("; ") }, 400);
        const atualizado = await db.atualizarProjeto(req.params.id, body, req.usuarioId);
        if (!atualizado) return res.json({ erro: "Projeto não encontrado" }, 404);
        res.json(atualizado);
    });

    router.delete("/api/projetos/:id", autenticar, async (req, res) => {
        const ok = await db.excluirProjeto(req.params.id, req.usuarioId);
        if (!ok) return res.json({ erro: "Projeto não encontrado" }, 404);
        res.json({ mensagem: "Projeto excluído com sucesso" });
    });
}

module.exports = { registrar };
