/**
 * app.js — TaskFlow Frontend v2
 * Inclui guarda de autenticação: se não há token, renderiza a tela de login.
 */

// ===== CONSTANTES =====
const COR_PRI   = { alta: "#EF4444", media: "#F59E0B", baixa: "#22C55E" };
const LABEL_PRI = { alta: "Alta",    media: "Média",   baixa: "Baixa"   };
const LABEL_ST  = { afazer: "A Fazer", andamento: "Em Andamento", concluido: "Concluído" };
const TITULOS   = { dashboard: "Dashboard", projetos: "Projetos", tarefas: "Tarefas", kanban: "Kanban", usuarios: "Usuários", configuracoes: "Configurações" };

// ===== ESTADO LOCAL =====
let STATE = { projetos: [], tarefas: [], usuarios: [] };
let _confirmFn   = null;
let _paginaAtual = "dashboard";

// ===== UTILS =====
const $          = id => document.getElementById(id);
const el         = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };
const formatarData = s => s ? s.split("-").reverse().join("/") : "";

// ===== TOAST =====
function toast(msg, tipo = "sucesso") {
    const t = document.createElement("div");
    t.className = "toast toast-" + tipo;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("visivel"));
    setTimeout(() => { t.classList.remove("visivel"); setTimeout(() => t.remove(), 300); }, 3000);
}

// ===== LOADING =====
function setLoading(show) {
    let overlay = document.getElementById("loading-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "loading-overlay";
        overlay.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(overlay);
    }
    overlay.style.display = show ? "flex" : "none";
}

// ===== PERFIL =====
async function preencherPerfil() {
    const u = auth.usuario();
    if (!u) return;
    const nome  = $("perfil-nome");
    const cargo = $("perfil-cargo");
    const cfgNome  = $("cfg-nome");
    const cfgEmail = $("cfg-email");
    if (nome)  nome.textContent  = u.nome;
    if (cargo) cargo.textContent = u.cargo || "Membro";
    if (cfgNome)  cfgNome.value     = u.nome;
    if (cfgEmail) cfgEmail.value    = u.email;

    // Busca avatar do servidor
    try {
        const me = await req("GET", "/auth/me");
        if (me.avatar) {
            const foto = document.getElementById("perfil-foto");
            if (foto) foto.src = me.avatar;
        }
    } catch(e) {}
}
// ===== LOGOUT =====
function logout() {
    auth.limpar();
    window.location.reload();
}

// ===== CARREGAR DADOS =====
async function carregarEstado() {
    try {
        const [tarefas, projetos, usuarios] = await Promise.all([
            api.getTarefas(),
            api.getProjetos(),
            api.getUsuarios()
        ]);
        STATE.tarefas  = tarefas;
        STATE.projetos = projetos;
        STATE.usuarios = usuarios;
    } catch (e) {
        toast("Erro ao carregar dados: " + e.message, "erro");
    }
}

async function atualizarStats() {
    try {
        const stats = await api.getStats();
        $("stat-projetos").textContent   = stats.projetos;
        $("stat-tarefas").textContent    = stats.tarefas;
        $("stat-concluidas").textContent = stats.concluidas;
        $("stat-usuarios").textContent   = stats.usuarios;

        const pct = stats.tarefas ? Math.round(stats.concluidas / stats.tarefas * 100) : 0;
        const donut = $("stat-donut");
        if (donut) { donut.style.setProperty("--pct", pct); $("stat-donut-pct").textContent = pct + "%"; }

        const histProjetos = registrarHistorico("projetos", stats.projetos);
        const histTarefas  = registrarHistorico("tarefas", stats.tarefas);
        desenharSparkline("spark-projetos", histProjetos, "#2563EB");
        desenharSparkline("spark-tarefas",  histTarefas,  "#65A30D");
    } catch { /* silencioso */ }
}

// ===== NAVEGAÇÃO =====
async function ir(pg) {
    _paginaAtual = pg;

    $("pg-dashboard").style.display = pg === "dashboard" ? "block" : "none";
    document.querySelectorAll(".pagina").forEach(s => s.style.display = "none");
    if (pg !== "dashboard") $("pg-" + pg).style.display = "block";

    document.querySelectorAll(".menu a").forEach(a => {
        a.classList.toggle("ativo", a.dataset.page === pg);
    });

    $("titulo-pagina").textContent = TITULOS[pg] || pg;

    setLoading(true);
    await carregarEstado();
    setLoading(false);

    atualizarStats();

    if (pg === "dashboard")  renderKanban("kanban-dashboard");
    if (pg === "projetos")   renderProjetos();
    if (pg === "tarefas")    renderTarefas();
    if (pg === "kanban")     renderKanban("kanban-pagina");
    if (pg === "usuarios")   renderUsuarios();
    if (pg === "admin")      renderAdmin();
    if (pg === "configuracoes") {
    req("GET", "/auth/me").then(me => atualizarAvatarUI(me.avatar, me.nome)).catch(() => {});
}
}

// ===== MODAIS =====
function abrirModal(id) {
    if (id === "tarefa") preencherSelectProjetos();
    $("modal-" + id).classList.add("aberto");
    const first = $("modal-" + id).querySelector("input,select,textarea");
    if (first) setTimeout(() => first.focus(), 50);
}

function fecharModal(id) {
    $("modal-" + id).classList.remove("aberto");
    if (id === "tarefa") {
        $("t-edit-id").value = "";
        $("modal-tarefa-titulo").textContent = "Nova Tarefa";
        ["t-titulo","t-desc","t-prazo"].forEach(f => { if ($(f)) $(f).value = ""; });
        $("t-prioridade").value = "media";
        $("t-status").value     = "afazer";
        $("t-projeto").value    = "";
    }
    if (id === "projeto") {
        ["p-nome","p-desc","p-prazo"].forEach(f => { if ($(f)) $(f).value = ""; });
        $("p-cor").value = "#84CC16";
    }
    if (id === "usuario") {
        ["u-nome","u-email","u-cargo"].forEach(f => { if ($(f)) $(f).value = ""; });
    }
}

function confirmar(msg, fn) {
    _confirmFn = fn;
    $("confirm-msg").textContent = msg;
    abrirModal("confirm");
}

function preencherSelectProjetos() {
    const sel = $("t-projeto");
    sel.innerHTML = '<option value="">Sem projeto</option>';
    STATE.projetos.forEach(p => {
        const o = document.createElement("option");
        o.value = p.id; o.textContent = p.nome;
        sel.appendChild(o);
    });
}

// ===== TAREFAS =====
async function salvarTarefa() {
    const titulo = $("t-titulo").value.trim();
    if (!titulo) { $("t-titulo").style.border = "1px solid #EF4444"; $("t-titulo").focus(); return; }
    $("t-titulo").style.border = "";

    const editId = $("t-edit-id").value;
    const dados  = {
        titulo,
        desc:       $("t-desc").value.trim(),
        projeto:    $("t-projeto").value,
        prioridade: $("t-prioridade").value,
        status:     $("t-status").value,
        prazo:      $("t-prazo").value
    };

    try {
        setLoading(true);
        if (editId) { await api.atualizarTarefa(editId, dados); toast("Tarefa atualizada!"); }
        else        { await api.criarTarefa(dados);             toast("Tarefa criada!"); }
        fecharModal("tarefa");
        await carregarEstado();
        atualizarStats();
        renderKanban("kanban-dashboard");
        renderKanban("kanban-pagina");
        renderTarefas();
    } catch (e) { toast(e.message, "erro"); }
    finally     { setLoading(false); }
}

function editarTarefa(id) {
    const t = STATE.tarefas.find(t => t.id === id);
    if (!t) return;
    preencherSelectProjetos();
    $("t-titulo").value     = t.titulo;
    $("t-desc").value       = t.desc || "";
    $("t-prioridade").value = t.prioridade;
    $("t-status").value     = t.status;
    $("t-prazo").value      = t.prazo || "";
    $("t-projeto").value    = t.projeto || "";
    $("t-edit-id").value    = t.id;
    $("modal-tarefa-titulo").textContent = "Editar Tarefa";
    abrirModal("tarefa");
}

async function excluirTarefa(id) {
    confirmar("Excluir esta tarefa?", async () => {
        try {
            setLoading(true);
            await api.excluirTarefa(id);
            toast("Tarefa excluída.");
            await carregarEstado();
            atualizarStats();
            renderKanban("kanban-dashboard");
            renderKanban("kanban-pagina");
            renderTarefas();
        } catch (e) { toast(e.message, "erro"); }
        finally     { setLoading(false); }
    });
}

async function concluirTarefa(id) {
    const t = STATE.tarefas.find(t => t.id === id);
    if (!t) return;
    try {
        setLoading(true);
        await api.atualizarTarefa(id, { ...t, status: "concluido" });
        toast(`"${t.titulo}" concluída!`);
        await carregarEstado();
        atualizarStats();
        renderKanban("kanban-dashboard");
        renderKanban("kanban-pagina");
        renderTarefas();
    } catch (e) { toast(e.message, "erro"); }
    finally     { setLoading(false); }
}

async function reabrirTarefa(id) {
    const t = STATE.tarefas.find(t => t.id === id);
    if (!t) return;
    try {
        setLoading(true);
        await api.atualizarTarefa(id, { ...t, status: "afazer" });
        toast(`"${t.titulo}" reaberta.`);
        await carregarEstado();
        atualizarStats();
        renderKanban("kanban-dashboard");
        renderKanban("kanban-pagina");
        renderTarefas();
    } catch (e) { toast(e.message, "erro"); }
    finally     { setLoading(false); }
}

// ===== AÇÕES RÁPIDAS DO DASHBOARD =====
async function concluirPrimeira() {
    const t = STATE.tarefas.find(t => t.status !== "concluido");
    if (!t) { toast("Nenhuma tarefa pendente.", "aviso"); return; }
    try {
        setLoading(true);
        await api.atualizarTarefa(t.id, { ...t, status: "concluido" });
        toast(`"${t.titulo}" concluída!`);
        await carregarEstado();
        atualizarStats();
        renderKanban("kanban-dashboard");
    } catch (e) { toast(e.message, "erro"); }
    finally     { setLoading(false); }
}

async function excluirUltimaConcluida() {
    const concluidas = STATE.tarefas.filter(t => t.status === "concluido");
    if (!concluidas.length) { toast("Nenhuma tarefa concluída.", "aviso"); return; }
    const ultima = concluidas[concluidas.length - 1];
    confirmar(`Excluir "${ultima.titulo}"?`, async () => {
        try {
            setLoading(true);
            await api.excluirTarefa(ultima.id);
            toast("Tarefa excluída.");
            await carregarEstado();
            atualizarStats();
            renderKanban("kanban-dashboard");
        } catch (e) { toast(e.message, "erro"); }
        finally     { setLoading(false); }
    });
}

// ===== RENDER KANBAN =====
function renderKanban(containerId) {
    const c = $(containerId); if (!c) return;
    const hoje = new Date().toISOString().split("T")[0];

    const colunas = [
        { key: "afazer",    label: "A Fazer",      cls: "afazer"    },
        { key: "andamento", label: "Em Andamento", cls: "andamento" },
        { key: "concluido", label: "Concluído",    cls: "concluido" },
        { key: "atrasado",  label: "Atrasado",     cls: "atrasado"  }
    ];

    // separa "atrasado" (prazo vencido e não concluído) das demais
    function tarefasDaColuna(key) {
        if (key === "atrasado") {
            return STATE.tarefas.filter(t => t.status !== "concluido" && t.prazo && t.prazo < hoje);
        }
        return STATE.tarefas.filter(t => t.status === key && !(t.prazo && t.prazo < hoje && t.status !== "concluido"));
    }

    c.innerHTML = colunas.map(col => {
        const tarefas = tarefasDaColuna(col.key);
        const cards = tarefas.map(t => {
            const iniciais = (t.responsavel || t.titulo).trim().split(" ").map(p => p[0]).slice(0,2).join("").toUpperCase();
            return `<div class="tarefa">
                <div class="tarefa-topo">
                    <span class="nome-tarefa">${t.titulo}</span>
                    <span class="tag-prioridade ${t.prioridade}">${LABEL_PRI[t.prioridade]}</span>
                </div>
                <div class="tarefa-rodape">
                    ${t.prazo ? `<span class="tarefa-data"><i class="bi bi-calendar3"></i> ${formatarData(t.prazo)}</span>` : "<span></span>"}
                    <div style="display:flex;align-items:center;gap:6px">
                        ${t.status !== "concluido"
                            ? `<button class="btn-ic verde" title="Concluir" data-action="concluir-tarefa" data-id="${t.id}"><i class="bi bi-check-lg"></i></button>`
                            : `<button class="btn-ic amarelo" title="Reabrir" data-action="reabrir-tarefa" data-id="${t.id}"><i class="bi bi-arrow-counterclockwise"></i></button>`
                        }
                        <button class="btn-ic vermelho" title="Excluir" data-action="excluir-tarefa" data-id="${t.id}"><i class="bi bi-trash"></i></button>
                        <span class="tarefa-avatar" title="Editar" data-action="editar-tarefa" data-id="${t.id}" style="cursor:pointer">${iniciais}</span>
                    </div>
                </div>
            </div>`;
        }).join("");

        return `<div class="coluna">
            <div class="coluna-header">
                <span class="coluna-dot dot-${col.cls}"></span>
                <span class="coluna-titulo">${col.label}</span>
                <span class="coluna-badge badge-${col.cls}">${tarefas.length}</span>
            </div>
            ${cards || '<p style="color:#94A3B8;font-size:13px;text-align:center;padding:12px 0">Nenhuma tarefa</p>'}
            <div class="add-tarefa-link" data-action="nova-tarefa-status" data-status="${col.key === 'atrasado' ? 'afazer' : col.key}">
                <i class="bi bi-plus-lg"></i> Adicionar tarefa
            </div>
        </div>`;
    }).join("");
}

// ===== RENDER LISTA TAREFAS =====
function renderTarefas() {
    const c = $("lista-tarefas"); if (!c) return;
    if (!STATE.tarefas.length) { c.innerHTML = "<p style='color:#64748B;padding:10px'>Nenhuma tarefa cadastrada.</p>"; return; }
    c.innerHTML = STATE.tarefas.map(t => {
        const proj = STATE.projetos.find(p => p.id === t.projeto);
        return `<div class="item-card" style="border-left:5px solid ${COR_PRI[t.prioridade]}">
            <div class="item-card-info">
                <h5 style="${t.status === "concluido" ? "text-decoration:line-through;color:#94A3B8" : ""}">${t.titulo}</h5>
                <p style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
                    <span style="background:${COR_PRI[t.prioridade]}22;color:${COR_PRI[t.prioridade]};font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px">${LABEL_PRI[t.prioridade]}</span>
                    <span style="background:#F1F5F9;color:#64748B;font-size:11px;padding:2px 8px;border-radius:99px">${LABEL_ST[t.status]}</span>
                    ${proj ? `<span style="background:${proj.cor}22;color:${proj.cor};font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;border:1px solid ${proj.cor}44">${proj.nome}</span>` : ""}
                    ${t.prazo ? `<span style="color:#94A3B8;font-size:12px"><i class="bi bi-calendar3"></i> ${formatarData(t.prazo)}</span>` : ""}
                </p>
                ${t.desc ? `<p style="color:#94A3B8;font-size:12px;margin-top:4px">${t.desc}</p>` : ""}
            </div>
            <div class="item-card-btns">
                <button class="btn-ic amarelo" data-action="editar-tarefa" data-id="${t.id}"><i class="bi bi-pencil"></i></button>
                <button class="btn-ic vermelho" data-action="excluir-tarefa" data-id="${t.id}"><i class="bi bi-trash"></i></button>
            </div>
        </div>`;
    }).join("");
}

// ===== PROJETOS =====
async function salvarProjeto() {
    const nome = $("p-nome").value.trim();
    if (!nome) { $("p-nome").style.border = "1px solid #EF4444"; $("p-nome").focus(); return; }
    $("p-nome").style.border = "";
    try {
        setLoading(true);
        await api.criarProjeto({ nome, desc: $("p-desc").value.trim(), cor: $("p-cor").value, prazo: $("p-prazo").value });
        toast("Projeto criado!");
        fecharModal("projeto");
        await carregarEstado();
        atualizarStats();
        renderProjetos();
    } catch (e) { toast(e.message, "erro"); }
    finally     { setLoading(false); }
}

async function excluirProjeto(id) {
    const p = STATE.projetos.find(p => p.id === id);
    confirmar(`Excluir o projeto "${p?.nome}"?`, async () => {
        try {
            setLoading(true);
            await api.excluirProjeto(id);
            toast("Projeto excluído.");
            await carregarEstado();
            atualizarStats();
            renderProjetos();
            renderTarefas();
        } catch (e) { toast(e.message, "erro"); }
        finally     { setLoading(false); }
    });
}

function renderProjetos() {
    const c = $("lista-projetos"); if (!c) return;
    if (!STATE.projetos.length) { c.innerHTML = "<p style='color:#64748B;padding:10px'>Nenhum projeto cadastrado.</p>"; return; }
    c.innerHTML = STATE.projetos.map(p => {
        const ts   = STATE.tarefas.filter(t => t.projeto === p.id);
        const done = ts.filter(t => t.status === "concluido").length;
        const pct  = ts.length ? Math.round(done / ts.length * 100) : 0;
        return `<div class="item-card" style="flex-direction:column;align-items:stretch;border-left:5px solid ${p.cor}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                    <h5>${p.nome}</h5>
                    <p>${p.desc}</p>
                    ${p.prazo ? `<p style="color:#94A3B8;font-size:12px;margin-top:4px"><i class="bi bi-calendar3"></i> ${formatarData(p.prazo)}</p>` : ""}
                </div>
                <div class="item-card-btns">
                    <button class="btn-ic verde" data-action="tarefa-para-projeto" data-id="${p.id}"><i class="bi bi-plus-lg"></i> Tarefa</button>
                    <button class="btn-ic vermelho" data-action="excluir-projeto" data-id="${p.id}"><i class="bi bi-trash"></i></button>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;margin-top:12px">
                <div class="barra-wrap"><div class="barra-fill" style="width:${pct}%;background:${p.cor}"></div></div>
                <span style="font-size:12px;color:#64748B;white-space:nowrap">${done}/${ts.length} • ${pct}%</span>
            </div>
        </div>`;
    }).join("");
}

function adicionarTarefaAoProjeto(projetoId) {
    preencherSelectProjetos();
    $("t-projeto").value = projetoId;
    abrirModal("tarefa");
}

// ===== USUÁRIOS =====
function renderUsuarios() {
    const c = $("lista-usuarios"); if (!c) return;
    c.innerHTML = STATE.usuarios.map(u => `
        <div class="item-card">
            <div class="avatar">${u.nome[0].toUpperCase()}</div>
            <div class="item-card-info"><h5>${u.nome}</h5><p>${u.email} · ${u.cargo}</p></div>
        </div>`).join("");
}

// ===== CONFIGURAÇÕES =====
function salvarConfig() {
    const nome  = $("cfg-nome").value.trim();
    const email = $("cfg-email").value.trim();
    $("perfil-nome").textContent  = nome;
    $("perfil-email").textContent = email;
    toast("Configurações salvas!");
}

// ===== DELEGAÇÃO DE EVENTOS =====
document.addEventListener("click", e => {
    if (e.target.classList.contains("modal-overlay")) {
        document.querySelectorAll(".modal-overlay.aberto").forEach(m => m.classList.remove("aberto"));
        _confirmFn = null;
        return;
    }

    const closeBtn = e.target.closest("[data-close]");
    if (closeBtn) { fecharModal(closeBtn.dataset.close); return; }

    const navLink = e.target.closest("[data-page]");
    if (navLink) { e.preventDefault(); ir(navLink.dataset.page); return; }

    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const id     = btn.dataset.id;

    switch (action) {
        case "nova-tarefa":              abrirModal("tarefa"); break;
        case "novo-projeto":             abrirModal("projeto"); break;
        case "salvar-tarefa":            salvarTarefa(); break;
        case "salvar-projeto":           salvarProjeto(); break;
        case "salvar-config":            salvarConfig(); break;
        case "executar-confirm":
            fecharModal("confirm");
            if (_confirmFn) { _confirmFn(); _confirmFn = null; }
            break;
        case "editar-tarefa":            editarTarefa(id); break;
        case "excluir-tarefa":           excluirTarefa(id); break;
        case "concluir-tarefa":          concluirTarefa(id); break;
        case "reabrir-tarefa":           reabrirTarefa(id); break;
        case "excluir-projeto":          excluirProjeto(id); break;
        case "tarefa-para-projeto":      adicionarTarefaAoProjeto(id); break;
        case "concluir-primeira":        concluirPrimeira(); break;
        case "excluir-ultima-concluida": excluirUltimaConcluida(); break;
        case "logout":                   logout(); break;
        case "promover-admin":
            confirmar("Tornar este usuário administrador?", async () => {
                await req("PUT", `/admin/usuarios/${id}/role`, { role: "admin" });
                toast("Usuário promovido a admin!");
                renderAdmin();
            });
            break;
        case "rebaixar-admin":
            confirmar("Remover permissão de admin deste usuário?", async () => {
                await req("PUT", `/admin/usuarios/${id}/role`, { role: "membro" });
                toast("Permissão de admin removida.");
                renderAdmin();
            });
            break;
        case "remover-avatar":
            confirmar("Remover sua foto de perfil?", async () => {
                await req("DELETE", "/usuarios/avatar");
                atualizarAvatarUI(null, auth.usuario()?.nome);
                toast("Foto removida!");
            });
            break;
        case "nova-tarefa-status":
            preencherSelectProjetos();
            abrirModal("tarefa");
            $("t-status").value = btn.dataset.status || "afazer";
            break;
            }
        });

document.addEventListener("keydown", e => {
    if (e.key === "Escape")
        document.querySelectorAll(".modal-overlay.aberto").forEach(m => m.classList.remove("aberto"));
});

// ===== ADMIN =====
async function renderAdmin() {
    const c = $("lista-admin-usuarios"); if (!c) return;
    try {
        const usuarios = await req("GET", "/admin/usuarios");
        $("admin-total").textContent = `${usuarios.length} usuário(s) cadastrado(s)`;
        c.innerHTML = usuarios.map(u => `
            <div class="item-card">
                <div class="avatar" style="${u.avatar ? `background-image:url(${u.avatar});background-size:cover;background-position:center;color:transparent` : ''}">${u.avatar ? '' : u.nome[0].toUpperCase()}</div>
                <div class="item-card-info">
                    <h5>${u.nome} ${u.role === 'admin' ? '<span style="background:#DBEAFE;color:#1D4ED8;font-size:11px;padding:2px 8px;border-radius:99px;font-weight:700">ADMIN</span>' : ''}</h5>
                    <p>${u.email} · ${u.cargo}</p>
                    <p style="font-size:11px;color:#94A3B8">Cadastrado em: ${new Date(u.criado_em).toLocaleDateString('pt-BR')}</p>
                </div>
                <div class="item-card-btns">
                    ${u.role !== 'admin'
                        ? `<button class="btn-ic verde" data-action="promover-admin" data-id="${u.id}"><i class="bi bi-shield-check"></i> Tornar admin</button>`
                        : `<button class="btn-ic amarelo" data-action="rebaixar-admin" data-id="${u.id}"><i class="bi bi-shield-x"></i> Remover admin</button>`
                    }
                </div>
            </div>`).join("");
    } catch(e) { c.innerHTML = `<p style='color:red'>${e.message}</p>`; }
}

// ===== AVATAR =====
function atualizarAvatarUI(url, nome) {
    const img    = $("cfg-avatar-img");
    const span   = $("cfg-avatar-inicial");
    const remover = $("cfg-avatar-remover");
    const headerImg = document.querySelector(".perfil-foto img") || document.querySelector("#perfil-foto");

    if (url) {
        img.src = url;
        img.style.display = "block";
        span.style.display = "none";
        if (remover) remover.style.display = "inline-flex";
        if (headerImg) headerImg.src = url;
    } else {
        img.style.display = "none";
        span.style.display = "block";
        span.textContent = nome ? nome[0].toUpperCase() : "?";
        if (remover) remover.style.display = "none";
    }
}

// ===== HISTÓRICO PARA MINI-GRÁFICOS =====
function registrarHistorico(chave, valor) {
    const dados = JSON.parse(localStorage.getItem("tf_historico") || "{}");
    if (!dados[chave]) dados[chave] = [];
    dados[chave].push(valor);
    if (dados[chave].length > 12) dados[chave].shift(); // mantém só os últimos 12 pontos
    localStorage.setItem("tf_historico", JSON.stringify(dados));
    return dados[chave];
}

function desenharSparkline(svgId, pontos, cor) {
    const svg = $(svgId);
    if (!svg || pontos.length < 2) { if (svg) svg.innerHTML = ""; return; }

    const min = Math.min(...pontos);
    const max = Math.max(...pontos);
    const range = max - min || 1;

    const coords = pontos.map((v, i) => {
        const x = (i / (pontos.length - 1)) * 100;
        const y = 28 - ((v - min) / range) * 26;
        return [x, y];
    });

    const linha = coords.map(([x, y]) => `${x},${y}`).join(" ");
    const area  = `0,30 ${linha} 100,30`;

    svg.innerHTML = `
        <polyline class="linha" points="${linha}" style="stroke:${cor}"></polyline>
        <polygon class="area" points="${area}" style="fill:${cor}"></polygon>
    `;
}

document.getElementById("cfg-avatar-input") && 
document.getElementById("cfg-avatar-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("avatar", file);
    try {
        const res = await fetch("/api/usuarios/avatar", {
            method: "POST",
            headers: { Authorization: "Bearer " + localStorage.getItem("tf_token") },
            body: form
        });
        const data = await res.json();
        if (data.avatar) {
            atualizarAvatarUI(data.avatar, auth.usuario()?.nome);
            toast("Foto atualizada!");
        } else {
            toast("Erro ao enviar foto.");
        }
    } catch(e) { toast("Erro ao enviar foto."); }
});
// ===== INIT =====
window.addEventListener("load", async () => {
    if (auth.logado()) {
        try {
            const me = await req("GET", "/auth/me");
            preencherPerfil();
            const foto = document.getElementById("perfil-foto");
            if (foto && me.avatar) foto.src = me.avatar;
            if (me && me.role === "admin") {
                const menuAdmin = document.getElementById("menu-admin");
                if (menuAdmin) menuAdmin.style.display = "block";
            }
        } catch(e) { preencherPerfil(); }
        ir("dashboard");
    }
});