---
tags: [deploy, easypanel, produção]
---

# Deploy — EasyPanel

## Repositório

- GitHub: https://github.com/troler11/oto-sp-painel
- Branch: `master`

## Passos para deploy

1. No EasyPanel, crie um novo **App** do tipo **Dockerfile**
2. Conecte ao repositório `troler11/oto-sp-painel`
3. Dockerfile path: `Dockerfile` (raiz do projeto)
4. Configure todas as variáveis de ambiente (ver abaixo)
5. Clique em **Deploy**

## Variáveis obrigatórias no EasyPanel

Ir em **App → Environment** e adicionar:

```
NODE_ENV=production
PORT=3000
DB_HOST=...
DB_PORT=5432
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
JWT_SECRET=...
REFRESH_SECRET=...
WEBHOOK_SECRET=...
WAHA_API_URL=...
WAHA_SESSION=default
WAHA_API_KEY=...
ALLOWED_ORIGINS=https://clinicaoto-siteteste.6lmhzj.easypanel.host
LOG_LEVEL=INFO
```

> Os valores dos secrets estão no arquivo `.env` local em:
> `C:\Users\lucas.bueno\Desktop\oto-sp-painel\.env`

## O que o Dockerfile faz

```
Estágio 1 (frontend-build):
  - node:20-alpine
  - copia package.json + lock → npm ci (versões exatas)
  - copia todo o src/ e configs
  - npx vite build → gera /dist

Estágio 2 (backend):
  - node:20-alpine
  - npm install --omit=dev
  - copia backend/
  - copia /dist do estágio 1 → /app/public
  - USER node (não-root)
  - EXPOSE 3000
```

## Portas

| Porta | Serviço |
|---|---|
| `3000` | Backend Node.js (serve também o frontend compilado em `/public`) |

## Erros comuns

| Erro | Causa | Solução |
|---|---|---|
| `JWT_SECRET não definido` | Variável não configurada no EasyPanel | Adicionar em Environment Variables |
| `MISSING_EXPORT DragEndEvent` | Vite 8 via create-vite no Dockerfile antigo | Resolvido — Dockerfile reescrito |
| `Sessao not exported` | import sem `type` no Vite 8/rolldown | Resolvido — todos os imports corrigidos |
| Erro de conexão ao banco | DB_HOST/DB_PASSWORD incorretos | Verificar credenciais |
