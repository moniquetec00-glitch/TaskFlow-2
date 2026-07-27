<img src="./public/logo.png" alt="TaskFlow Logo" width="400"/>

# TaskFlow v2

Sistema de gerenciamento de projetos e tarefas com autenticação JWT, banco de dados MySQL e upload de avatar via Cloudinary.

---

## Funcionalidades

- Cadastro e login de usuários com JWT
- Dashboard com estatísticas
- Gerenciamento de projetos e tarefas
- Quadro Kanban
- Upload de foto de perfil (Cloudinary)
- Painel administrativo (apenas admins)
- Promoção/remoção de administradores

---

## Estrutura do projeto

```
taskflow/
├── server.js                  ← Ponto de entrada
├── package.json
├── .env.example               ← Modelo de variáveis de ambiente
├── src/
│   ├── router.js              ← Roteador HTTP
│   ├── middleware.js          ← CORS, bodyParser, static, logger
│   ├── middleware/
│   │   └── auth.js            ← Validação JWT
│   ├── db/
│   │   └── database.js        ← Pool MySQL + schema automático
│   └── routes/
│       ├── auth.js            ← /api/auth/*
│       ├── tarefas.js         ← /api/tarefas/*
│       ├── projetos.js        ← /api/projetos/*
│       ├── usuarios.js        ← /api/usuarios
│       ├── stats.js           ← /api/stats
│       ├── admin.js           ← /api/admin/* (apenas admins)
│       └── upload.js          ← /api/usuarios/avatar
└── public/
    ├── index.html
    └── css/
        ├── style.css
        └── js/
            ├── api.js
            └── app.js
```

---

## Como rodar localmente

### Pré-requisitos

- Node.js v18+
- MySQL 8+
- Conta no Cloudinary (gratuita)

### Passos

1. Clone o repositório:
```bash
git clone https://github.com/VitorLopz/tasflow.git
cd tasflow
```

2. Instale as dependências:
```bash
npm install
```

3. Crie o banco de dados no MySQL:
```sql
CREATE DATABASE taskflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

4. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```
Edite o `.env` com suas credenciais.

5. Inicie o servidor:
```bash
node server.js
```

6. Acesse: http://localhost:3000

---

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `DB_HOST` | Host do MySQL |
| `DB_PORT` | Porta do MySQL (padrão: 3306) |
| `DB_USER` | Usuário do MySQL |
| `DB_PASSWORD` | Senha do MySQL |
| `DB_NAME` | Nome do banco (taskflow) |
| `JWT_SECRET` | Chave secreta para tokens JWT |
| `PORT` | Porta do servidor (padrão: 3000) |
| `CLOUDINARY_CLOUD_NAME` | Cloud name do Cloudinary |
| `CLOUDINARY_API_KEY` | API Key do Cloudinary |
| `CLOUDINARY_API_SECRET` | API Secret do Cloudinary |

---

## Deploy (Railway)

O projeto está configurado para deploy automático no Railway via GitHub.

Variáveis de ambiente configuradas no Railway com referências ao MySQL interno:

```
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
MYSQL_URL=${{MySQL.MYSQL_URL}}
```

---

## Painel Admin

O primeiro usuário admin deve ser promovido manualmente via banco de dados:

```sql
UPDATE usuarios SET role = 'admin' WHERE email = 'seu@email.com';
```

Após isso, o painel Admin fica disponível na sidebar para promover/rebaixar outros usuários.

---

## Tecnologias

- **Backend:** Node.js, mysql2, jsonwebtoken, bcryptjs, cloudinary, multer
- **Frontend:** HTML, CSS, JavaScript puro, Bootstrap Icons
- **Banco:** MySQL 8
- **Hospedagem:** Railway
- **Armazenamento de imagens:** Cloudinary
