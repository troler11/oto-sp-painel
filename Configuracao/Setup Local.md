---
tags: [config, dev, local]
---

# Setup Local

## Pré-requisitos

- Node.js 20+
- PostgreSQL rodando localmente ou acessível via rede
- (Opcional) Docker Desktop para produção

## 1. Configurar variáveis de ambiente

Crie/edite o arquivo `.env` na raiz do projeto.
Ver [[Configuracao/Variaveis de Ambiente]] para todos os campos.

Para desenvolvimento local, use:
```
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173
```

## 2. Rodar o backend

```bash
cd backend
npm install
node server.js
# Rodando em http://localhost:3000
```

## 3. Rodar o frontend

```bash
cd frontend
npm install
npm run dev
# Rodando em http://localhost:5173
```

O Vite está configurado com proxy:
- `/api/*` → `http://localhost:3000`
- `/socket.io` → `ws://localhost:3000`

## 4. Acessar

Abra **http://localhost:5173** no navegador.

---

## Rodar via Docker (produção local)

```bash
# Na raiz do projeto
docker compose up --build
# Frontend em http://localhost:80
# Backend em http://localhost:3000
```

Ver [[Deploy/EasyPanel]] para deploy em nuvem.
