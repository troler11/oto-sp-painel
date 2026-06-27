---
tags: [backend, funções, referência]
---

# Funções do Backend

## Autenticação

### `POST /api/login`
- Valida email + senha no banco (bcrypt)
- Gera `accessToken` (JWT, 12h) e `refreshToken` (JWT, 7 dias)
- Seta ambos como cookies `httpOnly; secure; sameSite=strict`
- Salva hash do refresh token na tabela `refresh_tokens`

### `POST /api/refresh-token`
- Lê cookie `refreshToken`
- Verifica assinatura + se não foi revogado no banco
- Emite novo `accessToken` (12h)

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

### `apenasAdmin`
- Verifica `req.user.papel === 'admin' || 'gerente'`
- Usado nas rotas WAHA e gestão de usuários

### `loginLimiter`
- Rate limit: máx 10 tentativas de login por IP em 15 minutos
- Resposta 429 ao exceder

### `registarAuditoria({ usuario_id, acao, entidade, entidade_id, detalhes, ip })`
- Insere linha na tabela `auditoria_log` de forma assíncrona (não bloqueia response)
- Chamada em todas as operações de escrita

---

## Webhook WhatsApp

### `POST /api/webhook/receber`
- Valida header `x-webhook-secret` com `timingSafeEqual` → `401` se inválido ou ausente
- Suporta 3 formatos de payload:
  - `body.event === 'message' + body.payload` → formato WAHA padrão
  - `body.data.message` → formato alternativo
  - `body.telefone + body.texto` → formato manual/N8N direto
- Extrai telefone com `telefoneRaw.match(/^\d+/)?.[0]` — **nunca usar `replace(/\D/g,'')` aqui** (inclui dígitos do UUID)
- Ignora: `fromMe = true` ou sem texto E sem mídia → `{ status: 'Ignorado' }` com HTTP 200
- Se contato **não encontrado** ou `status_robo = 'Robô'` → `{ status: 'Ignorado' }` (não salva nada); modo Robô também reseta `sessao_intencao` de `'concluido'` para `'triagem'` quando mensagem nova chega
- Se contato em modo `Humano` **ou** `Bloqueado`:
  - Se `payload.hasMedia && payload.media.data`: salva base64 em `mensagens_midia`, guarda `midia_id` em `additional_kwargs`
  - Salva em `chat_messages`; atualiza `ultima_mensagem`; emite `mensagem:nova`

**Integração N8N:** incluir `x-webhook-secret` no header. HTTP 200 `{ status: 'Ignorado' }` não é erro.

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
- Finalizar de `EM ATENDIMENTO → FINALIZADO` direto (sem `data_consulta`) é caminho válido para dúvidas rápidas
- Se `CANCELADO` + `notificar=true`: envia mensagem WhatsApp via WAHA
- **Se `CANCELADO` + `agendamentos.id_itsaude` preenchido**: chama `cancelarNoItsaude(id_itsaude)` para cancelar no iTSaúde. Se falhar, OtoFlow cancela normalmente e retorna `{ avisoItsaude: '<mensagem>' }` no JSON — frontend exibe como toast de aviso.
- Emite evento `agendamento:atualizado` via Socket.io
- Recepcionista não pode alterar card assumido por outra pessoa
- **Reset do contato em `contatos_whatsapp` ao mudar para:**
  - `EM ATENDIMENTO` → `status_robo = 'Humano'` (pausa bot)
  - `PENDENTE` → `status_robo = 'Robô'` (reativa bot)
  - `CANCELADO` → reset completo (ver abaixo)
  - `FINALIZADO` → reset completo (ver abaixo)

**Reset completo** (CANCELADO e FINALIZADO):
```
status_robo = 'Robô', sessao_intencao = 'triagem', sessao_rota = 0,
sessao_atualizada_em = NOW(), coleta_unidade = '', coleta_data = '',
coleta_periodo = '', coleta_horario = '', coleta_convenio = '',
coleta_medico = '', nome_atendimento = '', coleta_id_tisaude = ''
```

### `PUT /api/agendar`
- Atualiza data, hora e médico de um agendamento
- Muda status para `AGENDADO`
- Envia confirmação via WhatsApp (se WAHA configurado)
- **Também faz o reset completo do contato** (igual ao CANCELADO/FINALIZADO)

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
- Suporta `?desde=<ISO>`: retorna apenas mensagens com `created_at > desde` (polling incremental). Frontend envia `desde + 1ms` para evitar re-fetch da última mensagem (PostgreSQL guarda microsegundos, JS só tem milissegundos).
- Para cada mensagem com `additional_kwargs.midia_id` (ou `data.additional_kwargs.midia_id`), faz batch-fetch em `mensagens_midia` e inclui `mediaBase64` + `mediaMimetype` na resposta
- O `LIKE` cobre todos os formatos históricos: bare, `@s.whatsapp.net`, `-v23-UUID`

### `POST /api/chat/enviar`
- Envia mensagem de texto via WAHA API
- Salva no banco com `type: 'ai'`, `session_id = '{tel}@s.whatsapp.net'`

### `POST /api/chat/enviar-midia`
- Recebe arquivo via multipart (campo `arquivo`, multer memoryStorage, 10MB max)
- Encoding do nome: `Buffer.from(originalname, 'latin1').toString('utf8')`
- `image/*` → WAHA `/api/sendImage`; outros → `/api/sendFile` com `file.filename` (não `name`)
- **Salva base64 em `mensagens_midia`** e guarda apenas `midia_id` em `chat_messages.additional_kwargs` — evita coluna JSONB gigante

### `PUT /api/chat/:telefone/interromper-robo`
- Atualiza `status_robo = 'Humano'` em `contatos_whatsapp`
- Bot para de responder automaticamente

---

## Leads

### `GET /api/leads`
- Lista contatos sem agendamento ativo
- **Exclusão absoluta:** `PENDENTE`, `EM ATENDIMENTO`, `AGENDADO`, `Bloqueado`
- **Exclusão condicional (FINALIZADO):** só aparece se `ultima_mensagem > MAX(data_atualizacao)` das fichas finalizadas (reentrada por nova mensagem)
- Retorna `sessao_intencao` para filtro de Triagem no frontend

### `PATCH /api/leads/:id/nome`
- Atualiza `nome_titular` em `contatos_whatsapp`

### `DELETE /api/leads/:id` (admin/gerente)
- Remove contato permanentemente

### `POST /api/leads/:id/converter`
- Cria agendamento `PENDENTE` a partir do lead
- Nome: `nome_atendimento || nome_titular || telefone`
- Seta `status_robo = 'Humano'` (bot para, atendente usa chat)

---

## Contatos

### `GET /api/contatos`
- Lista todos os contatos (sem filtro de ficha), max 500, `ORDER BY ultima_mensagem DESC`

### `POST /api/contatos`
- `UPSERT` por `telefone`: se já existe, atualiza `nome_titular`
- Retorna o contato completo

### `PATCH /api/contatos/:id`
- Atualiza `nome_titular` e/ou `telefone`

### `PATCH /api/contatos/:id/bloquear`
- `{ bloquear: true }` → `status_robo = 'Bloqueado'`
- `{ bloquear: false }` → `status_robo = 'Robô'`

**status_robo = 'Bloqueado':** mensagens do paciente chegam ao chat do staff (salvas em `chat_messages`), bot N8N não responde (N8N deve checar `status_robo` antes de agir). Contato não aparece em Leads nem Triagem.

### `GET /api/contatos/:telefone/foto`
- Busca foto de perfil do WhatsApp via WAHA: `GET /api/contacts/profile-picture?contactId=${tel}@s.whatsapp.net&session=${WAHA_SESSION}`
- Campo retornado pelo WAHA: `profilePictureURL` (URL em maiúsculo)
- Cache em memória de 1h. Sentinela `'NONE'` (string) para contatos sem foto — **nunca `null`**, pois `getCache` retorna `null` tanto para chave não encontrada quanto para valor nulo
- Se WAHA offline (`WAHA_BASE_URL` não definida): retorna `503`
- Retorna `{ url: '...' }` ou `404`

---

## WAHA — Gestão de Sessão WhatsApp (admin/gerente)

### `GET /api/waha/status`
- Chama `GET /api/sessions` no WAHA
- Retorna `{ status, me }` — status possíveis: `WORKING`, `SCAN_QR_CODE`, `STARTING`, `STOPPED`, `FAILED`
- Retorna `STOPPED` se lista vazia ou API inacessível (nunca `UNKNOWN`)

### `GET /api/waha/qr`
- Chama `GET /api/{session}/auth/qr`
- Retorna `{ qr: 'data:image/png;base64,...' }`

### `POST /api/waha/start`
- Para a sessão primeiro (reset de FAILED/estados quebrados)
- Tenta iniciar; se 404/422/400 cria a sessão e reinicia
- Retorna `{ status: 'STARTING' }`

### `POST /api/waha/stop`
- Para a sessão (mantém número vinculado)

### `POST /api/waha/logout`
- Para + desloga (desvincula número — próximo start exige novo QR)

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
| `wahaHeaders()` | Retorna `{ 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY }` |
| `setCache(key, value, ttlMs)` | Salva valor em Map com TTL |
| `getCache(key)` | Retorna valor do cache se não expirado, `null` para chave não encontrada OU valor nulo — use sentinela `'NONE'` para distinguir "sem resultado" de "não buscado" |
| `clearCache(prefix)` | Remove todas as chaves que começam com o prefixo |
| `validar.email(v)` | Regex de email |
| `validar.minLen(v, n)` | String com mínimo de n caracteres |
| `validar.numero(v, min)` | Número numérico >= min |
| `validar.time(v)` | Formato `HH:MM` ou `HH:MM:SS` |
| `validar.date(v)` | Data parseable pelo JS |
| `_loginItsaude()` | POST `https://api.tisaude.com/api/login` com `ITSAUDE_LOGIN`/`ITSAUDE_SENHA`. Salva token + expiração (50min). Retorna `access_token`. |
| `cancelarNoItsaude(idItsaude)` | POST `https://api.tisaude.com/api/schedule/status/update/:id/-2` com Bearer token. Auto-refresh em 401. Lança erro se falhar. |

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
