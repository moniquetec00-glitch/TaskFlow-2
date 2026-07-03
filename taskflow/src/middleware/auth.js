/**
 * middleware/auth.js
 * Valida o JWT enviado no header Authorization: Bearer <token>
 * e injeta req.usuarioId + req.usuario na requisição.
 */

const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "taskflow_secret_mude_em_producao";

function autenticar(req, res, next) {
    const header = req.headers["authorization"] || "";
    const token  = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return res.json({ erro: "Não autorizado — token ausente." }, 401);
    }

    try {
        const payload = jwt.verify(token, SECRET);
        req.usuarioId = payload.id;
        req.usuario   = payload;
        next();
    } catch (err) {
        return res.json({ erro: "Token inválido ou expirado." }, 401);
    }
}

module.exports = { autenticar, SECRET };
