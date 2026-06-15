---
tags: [backend, funções, referência]
---

# Funções do Backend

## Autenticação

### `POST /api/login`
- Valida email + senha no banco (bcrypt)
- Gera `accessToken` (JWT, 15min) e `refreshToken` (JWT, 7 dias)
- Seta ambos como cookies `httpOnly; secure; sameSite=strict`
- Salva hash do refresh token na tabela `refresh_tokens`

### `POST /api/refresh-token`
- Lê cookie `refreshToken`
- Verifica assinatura + se não foi revogado no banco
- Emite novo `accessToken` (15min)

### `POST /api/logout`
- Revoga refresh token no banco (`revogado = true`)
- Limpa os dois cookies

### `GET /api/me`
- Retorna dados do usuário logado a partir do JWT no cookie

---

## Middleware

### `verificarToken`
- Lê `req.cookies.token`
- Verifica assinatura JWT com `JWT_SECRET`
- Em expirado → `401 { expirado: true }` → frontend chama `/api/refresh-token`
- Injeta `req.user = { id, nome, email, papel }`

### `loginLimiter`
- Rate limit: máx 10 tentativas de login por IP em 15 minutos
- Resposta 429 ao exceder

### `registarAuditoria({ usuario_id, acao, entidade, entidade_id, detalhes, ip })`
- Insere linha na tabela `auditoria_log` de forma assíncrona (não bloqueia response)
- Chamada em todas as operações de escrita

---

## Webhook WhatsApp

### `POST /api/webhook/receber`
- Valida header `x-webhook-secret` com `timingSafeEqual` (evita timing attacks)
- Suporta 3 formatos de payload WAHA
- Extrai telefone com `telefoneRaw.match(/^\d+/)?.[0]` — captura só os dígitos iniciais, ignorando sufixos como `-v23-UUID` ou `@s.whatsapp.net`. **Nunca usar `replace(/\D/g,'')` aqui** — inclui dígitos do UUID.
- Se contato em modo `Humano`: salva mensagem em `chat_messages` + emite `mensagem:nova` via Socket.io
- Se contato em modo `Robô`: ignora (o bot responde diretamente)

---

## Agendamentos

### `GET /api/agendamentos`
- Suporta filtros opcionais: `status`, `medico`, `unidade`, `data_inicio`, `data_fim`
- Suporta paginação: `?page=1&limit=100`
- JOIN com `contatos_whatsapp` para trazer `telefone` e `nome_titular`
- Ordenado por `data_criacao DESC`

### `PUT /api/status`
- Atualiza `status_atendimento` de um agendamento
- Status válidos: `PENDENTE`, `EM ATENDIMENTO`, `AGENDADO`, `FINALIZADO`, `CANCELADO`
- Finalizar de `EM ATENDIMENTO → FINALIZADO` direto (sem `data_consulta`) é um caminho válido para atendimentos rápidos/dúvidas
- Se `CANCELADO` + `notificar=true`: envia mensagem WhatsApp via WAHA
- Emite evento `agendamento:atualizado` via Socket.io para todos os clientes
- Recepcionista não pode alterar card assumido por outra pessoa

### `PUT /api/agendar`
- Atualiza data, hora e médico de um agendamento
- Muda status para `AGENDADO`
- Envia confirmação via WhatsApp (se WAHA configurado)

---

## Usuários

### `GET /api/usuarios` (admin/gerente)
- Lista todos os usuários sem expor `senha_hash`

### `POST /api/usuarios` (admin/gerente)
- Valida: nome ≥ 2 chars, email válido, senha ≥ 6 chars, papel = `recepcao` ou `gerente`
- Hash bcrypt com `saltRounds=12`

### `PUT /api/usuarios/:id` (admin/gerente)
- Atualiza nome

### `PUT /api/usuarios/:id/senha` (admin/gerente)
- Atualiza senha + revoga todos os refresh tokens do usuário

### `DELETE /api/usuarios/:id` (admin/gerente)
- Remove usuário + seus refresh tokens
- Não permite auto-exclusão

---

## Médicos

### `GET /api/medicos`
- Cache de 5 minutos em memória

### `POST /api/medicos` (admin/gerente)
- Valida: nome, unidade, horários no formato `HH:MM`, duração mínima 10 min

### `PUT /api/medicos/:id` / `DELETE /api/medicos/:id` (admin/gerente)
- Invalida cache `medicos:` automaticamente

---

## Chat

### `GET /api/chat/:telefone`
- Busca mensagens em `chat_messages` com `session_id LIKE '55119..%'`
- O `LIKE` com prefixo do número cobre todos os formatos históricos: bare, `@s.whatsapp.net`, `-v23-UUID` e variantes com dígitos extras gravadas por versões anteriores

### `POST /api/chat/enviar`
- Envia mensagem via WAHA API
- Salva no banco para histórico com `session_id = '{telefone}@s.whatsapp.net'`

### `PUT /api/chat/:telefone/interromper-robo`
- Atualiza `status_robo = 'Humano'` em `contatos_whatsapp`
- Bot para de responder automaticamente

---

## Leads

### `GET /api/leads`
- Lista contatos sem agendamento ativo (PENDENTE/EM ATENDIMENTO/AGENDADO)
- Usa `LATERAL JOIN` para buscar último status de agendamento

### `DELETE /api/leads/:id` (admin/gerente)
- Remove contato permanentemente

### `POST /api/leads/:id/converter`
- Cria agendamento `PENDENTE` a partir do lead
- Atualiza `status_robo = 'Finalizado'` no contato

---

## Modelos de mensagem

### `GET /api/modelos`
- Cache de 2 minutos

### `POST /api/modelos` (admin/gerente)
- Cria modelo com `titulo` e `texto`

### `PUT /api/modelos/:id` / `DELETE /api/modelos/:id` (admin/gerente)
- Invalida cache automaticamente

---

## Relatórios

### `GET /api/relatorios/resumo` (admin/gerente)
- Aceita filtros `data_inicio` e `data_fim`
- Retorna: total, porStatus, porUnidade, porPagamento, topMedicos (top 10)

### `GET /api/relatorios/evolucao-diaria` (admin/gerente)
- Aceita `?dias=30` (máx 90)
- Retorna: total, agendados, finalizados, cancelados por dia

---

## Auditoria

### `GET /api/auditoria` (admin)
- Lista log de ações com paginação (`?page=1&limit=50`)
- Filtros: `usuario_id`, `acao`, `entidade`

---

## Funções internas

| Função | Descrição |
|---|---|
| `enviarWhatsApp(telefone, texto)` | POST para WAHA_API_URL com timeout de 10s |
| `setCache(key, value, ttlMs)` | Salva valor em Map com TTL |
| `getCache(key)` | Retorna valor do cache se não expirado |
| `clearCache(prefix)` | Remove todas as chaves que começam com o prefixo |
| `validar.email(v)` | Regex de email |
| `validar.minLen(v, n)` | String com mínimo de n caracteres |
| `validar.numero(v, min)` | Número numérico >= min |
| `validar.time(v)` | Formato `HH:MM` ou `HH:MM:SS` |
| `validar.date(v)` | Data parseable pelo JS |

---

## Socket.io

| Evento emitido | Quando | Payload |
|---|---|---|
| `agendamento:atualizado` | PUT /api/status ou PUT /api/agendar | `{ id, status_atendimento, atendente_nome, data_consulta, ... }` |
| `mensagem:nova` | Webhook recebe mensagem de contato em modo Humano | `{ telefone, texto }` |

Auth do socket: middleware verifica cookie `token` JWT antes de aceitar conexão.

---

## Segurança implementada

| Medida | Detalhe |
|---|---|
| httpOnly cookies | JWT nunca exposto ao JS do browser |
| bcrypt saltRounds=12 | Hash de senhas robusto |
| helmet | Headers de segurança HTTP (CSP, HSTS, etc.) |
| rate limit | 10 tentativas de login / 15min por IP |
| CORS restrito | Apenas origens listadas em `ALLOWED_ORIGINS` |
| timingSafeEqual | Comparação do webhook secret sem timing attack |
| Refresh token revogação | Logout e troca de senha invalidam todos os tokens |
| USER node (Docker) | Container roda como usuário não-root |
| Validação de papéis | Rotas admin verificam `req.user.papel` |
