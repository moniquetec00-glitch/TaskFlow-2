const { db }         = require("../db/database");
const { autenticar } = require("../middleware/auth");

function apenasAdmin(req, res, next) {
    if (req.usuario.role !== "admin") {
        return res.json({ erro: "Acesso negado — apenas administradores." }, 403);
    }
    next();
}

function registrar(router) {
    router.get("/api/admin/usuarios", autenticar, apenasAdmin, async (req, res) => {
        const usuarios = await db.getUsuariosTodos();
        res.json(usuarios);
    });

    router.put("/api/admin/usuarios/:id/role", autenticar, apenasAdmin, async (req, res) => {
        const { role } = req.body || {};
        if (!["admin", "membro"].includes(role)) {
            return res.json({ erro: "Role inválida." }, 400);
        }
        await db.setRole(req.params.id, role);
        res.json({ mensagem: "Role atualizada com sucesso." });
    });
}

module.exports = { registrar };