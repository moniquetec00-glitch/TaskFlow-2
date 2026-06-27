/**
 * routes/usuarios.js
 * Retorna apenas o próprio usuário autenticado (workspace individual).
 * Para times, expanda com uma tabela de membros.
 */

const { db }         = require("../db/database");
const { autenticar } = require("../middleware/auth");

function registrar(router) {
    router.get("/api/usuarios", autenticar, async (req, res) => {
        res.json(await db.getMembros(req.usuarioId));
    });

    router.get("/api/usuarios/:id", autenticar, async (req, res) => {
        // Só permite ver o próprio perfil
        if (req.params.id !== req.usuarioId) {
            return res.json({ erro: "Não autorizado." }, 403);
        }
        const u = await db.getUsuarioPorId(req.usuarioId);
        if (!u) return res.json({ erro: "Usuário não encontrado." }, 404);
        res.json({ id: u.id, nome: u.nome, email: u.email, cargo: u.cargo });
    });
}

module.exports = { registrar };
