/**
 * routes/tarefas.js
 * CRUD completo de Tarefas — dados isolados por usuário autenticado.
 */

const { db }         = require("../db/database");
const { autenticar } = require("../middleware/auth");

const PRIORIDADES = ["alta", "media", "baixa"];
const STATUS_LIST = ["afazer", "andamento", "concluido"];

function validar(body) {
    const erros = [];
    if (!body.titulo || !body.titulo.trim()) erros.push("titulo é obrigatório");
    if (body.prioridade && !PRIORIDADES.includes(body.prioridade)) erros.push("prioridade inválida");
    if (body.status     && !STATUS_LIST.includes(body.status))     erros.push("status inválido");
    return erros;
}

function registrar(router) {
    router.get("/api/tarefas", autenticar, async (req, res) => {
        res.json(await db.getTarefas(req.usuarioId));
    });

    router.post("/api/tarefas", autenticar, async (req, res) => {
        const body  = req.body || {};
        const erros = validar(body);
        if (erros.length) return res.json({ erro: erros.join("; ") }, 400);
        const nova = await db.criarTarefa(body, req.usuarioId);
        res.json(nova, 201);
    });

    router.get("/api/tarefas/:id", autenticar, async (req, res) => {
        const t = await db.getTarefa(req.params.id, req.usuarioId);
        if (!t) return res.json({ erro: "Tarefa não encontrada" }, 404);
        res.json(t);
    });

    router.put("/api/tarefas/:id", autenticar, async (req, res) => {
        const body  = req.body || {};
        const erros = validar(body);
        if (erros.length) return res.json({ erro: erros.join("; ") }, 400);
        const atualizada = await db.atualizarTarefa(req.params.id, body, req.usuarioId);
        if (!atualizada) return res.json({ erro: "Tarefa não encontrada" }, 404);
        res.json(atualizada);
    });

    router.delete("/api/tarefas/:id", autenticar, async (req, res) => {
        const ok = await db.excluirTarefa(req.params.id, req.usuarioId);
        if (!ok) return res.json({ erro: "Tarefa não encontrada" }, 404);
        res.json({ mensagem: "Tarefa excluída com sucesso" });
    });
}

module.exports = { registrar };
