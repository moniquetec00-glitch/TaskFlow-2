/**
 * routes/stats.js
 * GET /api/stats → contagens do dashboard do usuário autenticado.
 */

const { db }         = require("../db/database");
const { autenticar } = require("../middleware/auth");

function registrar(router) {
    router.get("/api/stats", autenticar, async (req, res) => {
        res.json(await db.getStats(req.usuarioId));
    });
}

module.exports = { registrar };
