/**
 * routes/auth.js
 * POST /api/auth/registrar  → cria conta
 * POST /api/auth/login      → autentica, retorna JWT
 * GET  /api/auth/me         → retorna dados do usuário logado
 */

const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const { db } = require("../db/database");
const { autenticar, SECRET } = require("../middleware/auth");

function gerarToken(usuario) {
    return jwt.sign(
        { id: usuario.id, nome: usuario.nome, email: usuario.email },
        SECRET,
        { expiresIn: "7d" }
    );
}

function registrar(router) {
    // POST /api/auth/registrar
    router.post("/api/auth/registrar", async (req, res) => {
        const body = req.body || {};
        const erros = [];

        if (!body.nome  || !body.nome.trim())  erros.push("nome é obrigatório");
        if (!body.email || !body.email.trim()) erros.push("email é obrigatório");
        if (!body.senha || body.senha.length < 6) erros.push("senha deve ter ao menos 6 caracteres");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email || "")) erros.push("email inválido");

        if (erros.length) return res.json({ erro: erros.join("; ") }, 400);

        // Verifica se e-mail já existe
        const existe = await db.getUsuarioPorEmail(body.email.toLowerCase().trim());
        if (existe) return res.json({ erro: "E-mail já cadastrado." }, 409);

        const senhaHash = await bcrypt.hash(body.senha, 10);

        const novo = await db.criarConta({
            nome:     body.nome.trim(),
            email:    body.email.toLowerCase().trim(),
            senhaHash,
            cargo:    (body.cargo || "").trim() || "Membro"
        });

        const token = gerarToken(novo);
        res.json({ token, usuario: { id: novo.id, nome: novo.nome, email: novo.email, cargo: novo.cargo } }, 201);
    });

    // POST /api/auth/login
    router.post("/api/auth/login", async (req, res) => {
        const body = req.body || {};
        if (!body.email || !body.senha) {
            return res.json({ erro: "E-mail e senha são obrigatórios." }, 400);
        }

        const usuario = await db.getUsuarioPorEmail(body.email.toLowerCase().trim());
        if (!usuario) return res.json({ erro: "Credenciais inválidas." }, 401);

        const senhaOk = await bcrypt.compare(body.senha, usuario.senha_hash);
        if (!senhaOk)  return res.json({ erro: "Credenciais inválidas." }, 401);

        const token = gerarToken(usuario);
        res.json({
            token,
            usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, cargo: usuario.cargo }
        });
    });

    // GET /api/auth/me
    router.get("/api/auth/me", autenticar, async (req, res) => {
        const u = await db.getUsuarioPorId(req.usuarioId);
        if (!u) return res.json({ erro: "Usuário não encontrado." }, 404);
        res.json({ id: u.id, nome: u.nome, email: u.email, cargo: u.cargo });
    });
}

module.exports = { registrar };
