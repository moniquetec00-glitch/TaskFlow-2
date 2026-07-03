# TaskFlow v2 — Auth + MySQL

Gerenciamento de projetos e tarefas com **autenticação JWT** e banco de dados **MySQL**.  
Cada usuário tem sua própria conta, sessão segura e dados completamente isolados.

---

## Estrutura do Projeto

```
taskflow/
├── server.js                    ← Ponto de entrada
├── package.json
├── .env.example                 ← Copie para .env e configure
├── src/
│   ├── router.js
│   ├── middleware.js
│   ├── middleware/
│   │   └── auth.js              ← Validação do JWT (Bearer token)
│   ├── db/
│   │   └── database.js          ← Camada MySQL (pool de conexões)
│   └── routes/
│       ├── auth.js              ← POST /api/auth/registrar | login | GET /me
│       ├── tarefas.js
│       ├── projetos.js
│       ├── usuarios.js
│       └── stats.js
└── public/
    ├── index.html               ← SPA com tela de login integrada
    └── css/
        ├── style.css
        └── js/
            ├── api.js           ← Fetch wrapper com JWT
            └── app.js           ← Lógica do frontend
```

---

## Pré-requisitos

- **Node.js v18+**
- **MySQL 8+** (ou MariaDB 10.5+)

---

## Configuração

### 1. Instalar dependências

```bash
npm install
```

Isso instala: `mysql2`, `jsonwebtoken`, `bcryptjs`.

### 2. Criar banco de dados MySQL

```sql
CREATE DATABASE taskflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

O schema (tabelas) é criado **automaticamente** ao iniciar o servidor.

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=taskflow
JWT_SECRET=troque_por_algo_longo_e_aleatorio
PORT=3000
```

### 4. Iniciar

```bash
node server.js
# ou em modo dev (Node v18+)
node --watch server.js
```

Acesse: **http://localhost:3000**

---

## Fluxo de Autenticação

```
Usuário → POST /api/auth/registrar  →  cria conta  →  retorna { token, usuario }
Usuário → POST /api/auth/login      →  autentica   →  retorna { token, usuario }
App     → guarda token no localStorage
App     → todas as requisições seguintes enviam: Authorization: Bearer <token>
Servidor → valida JWT em cada rota protegida → filtra dados pelo usuario_id
```

O token expira em **7 dias**. Ao expirar, o app redireciona para a tela de login.

---

## API REST

### Públicas (sem token)
| Método | Endpoint              | Descrição         |
|--------|-----------------------|-------------------|
| POST   | `/api/auth/registrar` | Cria conta        |
| POST   | `/api/auth/login`     | Autentica usuário |

### Protegidas (Bearer token obrigatório)
| Método | Endpoint              | Descrição              |
|--------|-----------------------|------------------------|
| GET    | `/api/auth/me`        | Dados do usuário logado|
| GET    | `/api/stats`          | Contagens do dashboard |
| GET    | `/api/tarefas`        | Lista tarefas do usuário |
| POST   | `/api/tarefas`        | Cria tarefa            |
| GET    | `/api/tarefas/:id`    | Busca tarefa           |
| PUT    | `/api/tarefas/:id`    | Atualiza tarefa        |
| DELETE | `/api/tarefas/:id`    | Exclui tarefa          |
| GET    | `/api/projetos`       | Lista projetos do usuário |
| POST   | `/api/projetos`       | Cria projeto           |
| PUT    | `/api/projetos/:id`   | Atualiza projeto       |
| DELETE | `/api/projetos/:id`   | Exclui projeto         |
| GET    | `/api/usuarios`       | Perfil do usuário logado |

---

## Segurança implementada

| Mecanismo          | Detalhes                                           |
|--------------------|----------------------------------------------------|
| Senhas             | Hash com `bcryptjs` (salt rounds = 10)             |
| Sessão             | JWT assinado com `jsonwebtoken` (expira em 7 dias) |
| Isolamento         | Todas as queries filtram por `usuario_id`          |
| CORS               | Headers configuráveis no middleware                |
| Path traversal     | Bloqueado no servidor de arquivos estáticos        |
| SQL Injection      | Queries parametrizadas via `mysql2` prepared stmts |
