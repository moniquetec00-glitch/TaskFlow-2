/**
 * database.js
 * Camada de persistência usando MySQL via mysql2.
 * Cada operação filtra por usuario_id para garantir isolamento de dados.
 *
 * Variáveis de ambiente necessárias:
 *   DB_HOST     (padrão: localhost)
 *   DB_PORT     (padrão: 3306)
 *   DB_USER     (padrão: root)
 *   DB_PASSWORD (obrigatório)
 *   DB_NAME     (padrão: taskflow)
 */

const mysql = require("mysql2/promise");

// ===== POOL DE CONEXÕES =====
const pool = mysql.createPool({
    host:               process.env.DB_HOST     || "localhost",
    port:               parseInt(process.env.DB_PORT || "3306"),
    user:               process.env.DB_USER     || "root",
    password:           process.env.DB_PASSWORD || "",
    database:           process.env.DB_NAME     || "taskflow",
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
    timezone:           "Z"
});

// ===== INICIALIZAÇÃO DO SCHEMA =====
async function inicializar() {
    const conn = await pool.getConnection();
    try {
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id         CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
                nome       VARCHAR(120) NOT NULL,
                email      VARCHAR(200) NOT NULL UNIQUE,
                senha_hash VARCHAR(100) NOT NULL,
                cargo      VARCHAR(80)  NOT NULL DEFAULT 'Membro',
                criado_em  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS projetos (
                id          CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
                usuario_id  CHAR(36)     NOT NULL,
                nome        VARCHAR(120) NOT NULL,
                descricao   TEXT,
                cor         CHAR(7)      NOT NULL DEFAULT '#84CC16',
                prazo       DATE,
                criado_em   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            )
        `);

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS tarefas (
                id           CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
                usuario_id   CHAR(36)     NOT NULL,
                projeto_id   CHAR(36),
                titulo       VARCHAR(200) NOT NULL,
                descricao    TEXT,
                prioridade   ENUM('alta','media','baixa') NOT NULL DEFAULT 'media',
                status       ENUM('afazer','andamento','concluido') NOT NULL DEFAULT 'afazer',
                prazo        DATE,
                criado_em    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                atualizado_em DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE SET NULL
            )
        `);

        console.log("  ✅  Schema MySQL verificado/criado.");
    } finally {
        conn.release();
    }
}

// ===== HELPERS =====
function mapTarefa(row) {
    return {
        id:         row.id,
        titulo:     row.titulo,
        desc:       row.descricao || "",
        projeto:    row.projeto_id || "",
        prioridade: row.prioridade,
        status:     row.status,
        prazo:      row.prazo ? row.prazo.toISOString().slice(0, 10) : "",
        criadoEm:   row.criado_em,
        atualizadoEm: row.atualizado_em
    };
}

function mapProjeto(row) {
    return {
        id:       row.id,
        nome:     row.nome,
        desc:     row.descricao || "Sem descrição",
        cor:      row.cor,
        prazo:    row.prazo ? row.prazo.toISOString().slice(0, 10) : "",
        criadoEm: row.criado_em
    };
}

function mapUsuario(row) {
    return {
        id:    row.id,
        nome:  row.nome,
        email: row.email,
        cargo: row.cargo,
        criadoEm: row.criado_em
    };
}

// ===== API DA CAMADA DE DADOS =====
const db = {
    // --- AUTH ---
    async getUsuarioPorEmail(email) {
        const [rows] = await pool.execute(
            "SELECT * FROM usuarios WHERE email = ?", [email]
        );
        return rows[0] || null;
    },

    async getUsuarioPorId(id) {
        const [rows] = await pool.execute(
            "SELECT * FROM usuarios WHERE id = ?", [id]
        );
        return rows[0] || null;
    },

    async criarConta(dados) {
        const [result] = await pool.execute(
            `INSERT INTO usuarios (nome, email, senha_hash, cargo)
             VALUES (?, ?, ?, ?)`,
            [dados.nome, dados.email, dados.senhaHash, dados.cargo || "Membro"]
        );
        // Busca o registro inserido para retornar com UUID gerado pelo MySQL
        const [rows] = await pool.execute(
            "SELECT * FROM usuarios WHERE email = ?", [dados.email]
        );
        return mapUsuario(rows[0]);
    },

    // --- TAREFAS ---
    async getTarefas(usuarioId) {
        const [rows] = await pool.execute(
            "SELECT * FROM tarefas WHERE usuario_id = ? ORDER BY criado_em DESC",
            [usuarioId]
        );
        return rows.map(mapTarefa);
    },

    async getTarefa(id, usuarioId) {
        const [rows] = await pool.execute(
            "SELECT * FROM tarefas WHERE id = ? AND usuario_id = ?",
            [id, usuarioId]
        );
        return rows[0] ? mapTarefa(rows[0]) : null;
    },

    async criarTarefa(dados, usuarioId) {
        await pool.execute(
            `INSERT INTO tarefas (id, usuario_id, projeto_id, titulo, descricao, prioridade, status, prazo)
             VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
            [
                usuarioId,
                dados.projeto || null,
                dados.titulo,
                dados.desc    || null,
                dados.prioridade || "media",
                dados.status     || "afazer",
                dados.prazo      || null
            ]
        );
        const [rows] = await pool.execute(
            "SELECT * FROM tarefas WHERE usuario_id = ? ORDER BY criado_em DESC LIMIT 1",
            [usuarioId]
        );
        return mapTarefa(rows[0]);
    },

    async atualizarTarefa(id, dados, usuarioId) {
        const [result] = await pool.execute(
            `UPDATE tarefas
             SET titulo = ?, descricao = ?, projeto_id = ?, prioridade = ?, status = ?, prazo = ?
             WHERE id = ? AND usuario_id = ?`,
            [
                dados.titulo,
                dados.desc    || null,
                dados.projeto || null,
                dados.prioridade || "media",
                dados.status     || "afazer",
                dados.prazo      || null,
                id,
                usuarioId
            ]
        );
        if (result.affectedRows === 0) return null;
        return this.getTarefa(id, usuarioId);
    },

    async excluirTarefa(id, usuarioId) {
        const [result] = await pool.execute(
            "DELETE FROM tarefas WHERE id = ? AND usuario_id = ?",
            [id, usuarioId]
        );
        return result.affectedRows > 0;
    },

    // --- PROJETOS ---
    async getProjetos(usuarioId) {
        const [rows] = await pool.execute(
            "SELECT * FROM projetos WHERE usuario_id = ? ORDER BY criado_em DESC",
            [usuarioId]
        );
        return rows.map(mapProjeto);
    },

    async getProjeto(id, usuarioId) {
        const [rows] = await pool.execute(
            "SELECT * FROM projetos WHERE id = ? AND usuario_id = ?",
            [id, usuarioId]
        );
        return rows[0] ? mapProjeto(rows[0]) : null;
    },

    async criarProjeto(dados, usuarioId) {
        await pool.execute(
            `INSERT INTO projetos (id, usuario_id, nome, descricao, cor, prazo)
             VALUES (UUID(), ?, ?, ?, ?, ?)`,
            [usuarioId, dados.nome, dados.desc || null, dados.cor || "#84CC16", dados.prazo || null]
        );
        const [rows] = await pool.execute(
            "SELECT * FROM projetos WHERE usuario_id = ? ORDER BY criado_em DESC LIMIT 1",
            [usuarioId]
        );
        return mapProjeto(rows[0]);
    },

    async atualizarProjeto(id, dados, usuarioId) {
        const [result] = await pool.execute(
            `UPDATE projetos
             SET nome = ?, descricao = ?, cor = ?, prazo = ?
             WHERE id = ? AND usuario_id = ?`,
            [dados.nome, dados.desc || null, dados.cor || "#84CC16", dados.prazo || null, id, usuarioId]
        );
        if (result.affectedRows === 0) return null;
        return this.getProjeto(id, usuarioId);
    },

    async excluirProjeto(id, usuarioId) {
        // Desvincula tarefas antes de excluir (projeto_id → NULL via FK ON DELETE SET NULL)
        const [result] = await pool.execute(
            "DELETE FROM projetos WHERE id = ? AND usuario_id = ?",
            [id, usuarioId]
        );
        return result.affectedRows > 0;
    },

    // --- MEMBROS DO WORKSPACE (usuários visíveis na aba Usuários) ---
    // Por simplicidade, o dono vê apenas a si mesmo + quem ele cadastrou manualmente.
    // Se você quiser times reais, esta é a camada para expandir.
    async getMembros(usuarioId) {
        const [rows] = await pool.execute(
            "SELECT * FROM usuarios WHERE id = ?",
            [usuarioId]
        );
        return rows.map(mapUsuario);
    },

    // --- STATS ---
    async getStats(usuarioId) {
        const [[{ projetos }]]  = await pool.execute("SELECT COUNT(*) AS projetos  FROM projetos WHERE usuario_id = ?", [usuarioId]);
        const [[{ tarefas }]]   = await pool.execute("SELECT COUNT(*) AS tarefas   FROM tarefas  WHERE usuario_id = ?", [usuarioId]);
        const [[{ concluidas }]] = await pool.execute("SELECT COUNT(*) AS concluidas FROM tarefas WHERE usuario_id = ? AND status = 'concluido'", [usuarioId]);

        return {
            projetos:   Number(projetos),
            tarefas:    Number(tarefas),
            concluidas: Number(concluidas),
            usuarios:   1   // workspace individual; expanda se implementar times
        };
    }
};

module.exports = { db, inicializar };
