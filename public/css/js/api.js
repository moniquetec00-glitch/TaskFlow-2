/**
 * api.js — Cliente HTTP do Frontend v2
 * Inclui token JWT em todas as requisições protegidas.
 * Redireciona para login automaticamente em caso de 401.
 */

const API_BASE = "/api";

// ===== TOKEN =====
const auth = {
    salvar(token, usuario) {
        localStorage.setItem("tf_token",   token);
        localStorage.setItem("tf_usuario", JSON.stringify(usuario));
    },
    token()   { return localStorage.getItem("tf_token"); },
    usuario() {
        try { return JSON.parse(localStorage.getItem("tf_usuario")); }
        catch { return null; }
    },
    limpar() {
        localStorage.removeItem("tf_token");
        localStorage.removeItem("tf_usuario");
    },
    logado() { return !!this.token(); }
};

// ===== HELPER FETCH =====
async function req(method, url, body, publico = false) {
    const headers = { "Content-Type": "application/json" };
    if (!publico && auth.token()) headers["Authorization"] = "Bearer " + auth.token();

    const opts = { method, headers };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res  = await fetch(API_BASE + url, opts);
    const data = await res.json().catch(() => ({}));

    if (res.status === 401 && !publico) {
        auth.limpar();
        window.location.reload();
        return;
    }

    if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
    return data;
}

// ===== API =====
const api = {
    // Auth (público)
    registrar: (dados)  => req("POST", "/auth/registrar", dados, true),
    login:     (dados)  => req("POST", "/auth/login",     dados, true),
    me:        ()       => req("GET",  "/auth/me"),

    // Stats
    getStats: () => req("GET", "/stats"),

    // Tarefas
    getTarefas:      ()           => req("GET",    "/tarefas"),
    criarTarefa:     (dados)      => req("POST",   "/tarefas", dados),
    atualizarTarefa: (id, dados)  => req("PUT",    `/tarefas/${id}`, dados),
    excluirTarefa:   (id)         => req("DELETE", `/tarefas/${id}`),

    // Projetos
    getProjetos:      ()          => req("GET",    "/projetos"),
    criarProjeto:     (dados)     => req("POST",   "/projetos", dados),
    atualizarProjeto: (id, dados) => req("PUT",    `/projetos/${id}`, dados),
    excluirProjeto:   (id)        => req("DELETE", `/projetos/${id}`),

    // Usuários
    getUsuarios: () => req("GET", "/usuarios"),
};
