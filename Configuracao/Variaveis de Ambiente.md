---
tags: [config, secrets, env]
---

# Variáveis de Ambiente

> O arquivo `.env` fica em `C:\Users\lucas.bueno\Desktop\oto-sp-painel\.env`
> **Nunca commitar esse arquivo no Git.**
> No EasyPanel, configurar em **App → Environment Variables**.

## Banco de Dados

| Variável | Exemplo | Descrição |
|---|---|---|
| `DB_HOST` | `34.100.200.10` | IP ou hostname do PostgreSQL |
| `DB_PORT` | `5432` | Porta (padrão 5432) |
| `DB_NAME` | `otoflow` | Nome do banco |
| `DB_USER` | `postgres` | Usuário |
| `DB_PASSWORD` | `senha_forte` | Senha |

## Segurança / JWT

| Variável | Descrição |
|---|---|
| `JWT_SECRET` | Secret do token de acesso (15min) — 128 hex chars |
| `REFRESH_SECRET` | Secret do refresh token (7 dias) — 128 hex chars |
| `WEBHOOK_SECRET` | Token para validar webhooks do WAHA — 64 hex chars |

> Gerar novos secrets: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

## WhatsApp / WAHA

| Variável | Exemplo | Descrição |
|---|---|---|
| `WAHA_API_URL` | `http://192.168.1.10:3001/api/sendText` | Endpoint de envio |
| `WAHA_SESSION` | `default` | Nome da sessão WAHA |
| `WAHA_API_KEY` | `sua_chave` | Chave de API do WAHA |

## Servidor

| Variável | Valor | Descrição |
|---|---|---|
| `NODE_ENV` | `production` | Ativa cookies secure + outros ajustes |
| `PORT` | `3000` | Porta do servidor Express |
| `LOG_LEVEL` | `INFO` | DEBUG / INFO / WARN / ERROR |
| `ALLOWED_ORIGINS` | `https://meupainel.com` | Origens CORS permitidas (separar por vírgula) |
