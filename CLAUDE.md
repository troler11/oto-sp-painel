# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (dev local)
```bash
cd frontend
npm run dev       # Vite dev server em http://localhost:5173
npm run build     # Build de produção (tsc + vite build)
```

### Backend (dev local)
```bash
cd backend
node server.js    # Requer variáveis de ambiente definidas (ver .env)
```

### Docker (produção)
```bash
docker compose up --build   # Usa env_file: .env na raiz
```

## Arquitetura

### Monorepo sem workspace
`backend/` e `frontend/` são projetos Node independentes. O Docker multi-stage compila o frontend e serve o `dist/` como arquivos estáticos pelo Express (`/app/public`). Em dev local, o Vite faz proxy de `/api` e `/socket.io` para `localhost:3000`.

### Backend — arquivo único
Todo o backend vive em `backend/server.js`. A ordem de leitura é:
1. Configuração (helmet, CORS, rate limit, logger, cache)
2. Variáveis de ambiente + validação obrigatória (`JWT_SECRET`, `REFRESH_SECRET`)
3. Pool PostgreSQL + criação automática de tabelas extras (`auditoria_log`, `refresh_tokens`, `mensagens_midia`) e índices
4. Middleware `verificarToken` (lê cookie `token`)
5. Rotas em ordem: webhook → auth → usuários → médicos → agendamentos → leads → contatos → modelos → chat → relatórios
6. Servidor HTTP + Socket.io

### Auth flow
- Login seta dois cookies `httpOnly`: `token` (12h) e `refresh_token` (7d, path `/api/refresh-token`)
- `fetchSeguro` no frontend sempre usa `credentials: 'include'` — nunca Authorization header
- Token expirado retorna `401 { expirado: true }` — frontend chama `POST /api/refresh-token` e retenta
- Logout revoga o refresh token no banco (`revogado = true`)

### Frontend — estado centralizado em App.tsx
`App.tsx` é o único componente com estado global e lógica de negócio. Todos os componentes filhos recebem callbacks via props. O `AppContext` expõe apenas `sessao`, `fetchSeguro`, `adicionarNotificacao` e `setNotificacaoErro`.

### Fluxo do Kanban
Statuses: `PENDENTE → EM ATENDIMENTO → AGENDADO → FINALIZADO / CANCELADO`

Existe um segundo caminho de finalização direta:
`EM ATENDIMENTO → FINALIZADO` (botão "Finalizar Atendimento") — para dúvidas rápidas sem agendar consulta.

A distinção entre os dois caminhos é feita pelo campo `data_consulta`:
- **Via Agendamento**: `data_consulta` preenchida
- **Atendimento Rápido / Dúvida**: `data_consulta = null`

Qualquer lógica que deva aplicar-se **apenas a consultas reais** deve incluir `&& a.data_consulta` no filtro. Isso inclui: Formas de Pagamento, Ranking de Médicos, campo de pagamento no card e no perfil do paciente.

### Socket.io
Conexão iniciada em `useEffect` após login (`io({ withCredentials: true })`). O backend autentica o socket via middleware que lê o mesmo cookie `token`. Eventos: `agendamento:atualizado` e `mensagem:nova`.

O handler `mensagem:nova` usa `pacienteAtivoChatRef` (não a variável de estado diretamente) para evitar closure stale — o `useEffect` do socket só roda uma vez ao logar. Além disso, existe um polling de fallback de 5s enquanto `chatAberto` for verdadeiro.

### Tipos TypeScript
Todas as interfaces estão em `frontend/src/types.ts`. Sempre importar como `import type { ... }` — o Vite com rolldown falha no build se usar import de valor para tipos.

### Cache in-memory (backend)
Rotas `GET /api/medicos` (5min) e `GET /api/modelos` (2min) usam cache Map. Chamar `clearCache('medicos:')` ou `clearCache('modelos:')` após qualquer escrita nessas entidades.

### Papéis de usuário
`admin` e `gerente` têm acesso total. `recepcao` não pode alterar cards assumidos por outros atendentes (verificação em `PUT /api/status` e `PUT /api/agendar`).

### Chat WhatsApp — session_id
O WAHA pode enviar session IDs no formato `5511997255184-v23-UUID@s.whatsapp.net`. Para extrair o telefone, usar `telefoneRaw.match(/^\d+/)?.[0]` — **nunca** `replace(/\D/g,'')`, que inclui dígitos do UUID.

A query de histórico usa `session_id LIKE '55119..%'` para cobrir todos os formatos históricos armazenados (inclusive os gerados com o bug antigo).

### Webhook — autenticação e comportamento
O N8N deve enviar o header `x-webhook-secret` com o valor de `WEBHOOK_SECRET` do `.env`. Sem ele retorna 401.

HTTP 200 com `{ status: 'Ignorado' }` **não é erro** — significa que o contato está em modo Robô ou não foi encontrado. Nesse caso nada é salvo no banco.

Salva em `chat_messages` quando `status_robo = 'Humano'` **ou** `'Bloqueado'` (staff vê, bot não responde).

**Imagens recebidas de pacientes:** se `body.payload.hasMedia === true` e `body.payload.media.data` existir, o base64 é salvo em `mensagens_midia` e o `id` gravado em `additional_kwargs.midia_id`. Requer `WHATSAPP_DOWNLOAD_ON_RECEIVE=TRUE` no WAHA. O campo `midia_id` pode estar em `msg.additional_kwargs` (formato novo) ou `msg.data.additional_kwargs` (formato N8N) — o GET /api/chat lê os dois.

**Mensagem sem texto:** não é mais ignorada se houver mídia (imagem sem legenda).

**Reentrada na Triagem:** quando um contato com `sessao_intencao='concluido'` (bot encerrou o fluxo) manda nova mensagem no modo Robô, o backend reseta `sessao_intencao` para `'triagem'` — contato volta a aparecer na Triagem.

### Valores ignorados em campos de médico
Os valores `'A confirmar'`, `'Qualquer'` e `'Indiferente'` são tratados como ausência de médico em: `PatientCard`, Ranking de Médicos (Dashboard) e pré-preenchimento do `ScheduleModal`.

### CANCELADO — dois subtipos visuais
`CANCELADO + data_consulta IS NOT NULL` → "Consulta Cancelada" (vermelho)
`CANCELADO + data_consulta IS NULL` → "Ticket Descartado" (cinza)
Sem novo status no banco — apenas visual. Usado em `PatientCard`, `CancelModal`, `Dashboard`.

### Reset do contato ao fechar um ticket
Quando um agendamento muda para `FINALIZADO`, `CANCELADO` ou `AGENDADO`, o backend atualiza `contatos_whatsapp` com:
`status_robo='Robô'`, `sessao_intencao='triagem'`, `sessao_rota=0`, `sessao_atualizada_em=NOW()` e zera todos os campos `coleta_*`, `nome_atendimento`, `coleta_id_tisaude`.

### Triagem — filtro de sessao_intencao
Leads com `sessao_intencao = 'concluido'` são excluídos da view Triagem e da contagem no menu lateral. A lógica vive no frontend (`leads.filter(l => l.sessao_intencao !== 'concluido')`). A API também exclui contatos com ficha ativa (PENDENTE/EM ATENDIMENTO/AGENDADO).

**Reentrada:** contato com ficha FINALIZADA volta à Triagem se mandar nova mensagem após o fechamento (`ultima_mensagem > MAX(data_atualizacao)` das fichas finalizadas). Contatos AGENDADO nunca reaparecem — exclusão absoluta.

### Aba Contatos
Lista **todos** os contatos (sem filtro de ficha), max 500, ordenado por `ultima_mensagem DESC`.

`status_robo = 'Bloqueado'`: bot não age (N8N checa via API), mensagens ainda chegam ao chat do staff. Contatos bloqueados não aparecem em Leads nem Triagem.

Rotas:
- `GET /api/contatos` — lista completa
- `POST /api/contatos` — cria/upsert por telefone
- `PATCH /api/contatos/:id` — edita nome e/ou telefone
- `PATCH /api/contatos/:id/bloquear` — toggle `'Bloqueado'` ↔ `'Robô'`

Frontend: busca em tempo real (nome/telefone), form inline de adição, edição inline por linha (lápis no hover).

### Converter lead → nome do paciente
A rota `POST /api/leads/:id/converter` usa `nome_atendimento || nome_titular || telefone` como nome do paciente na ficha criada. `nome_atendimento` é o nome coletado pelo bot N8N durante o fluxo. Após criar a ficha, seta `status_robo = 'Humano'` (para o bot parar de responder e o atendente poder usar o chat).

### WAHA — gestão de sessão
Rotas `/api/waha/*` disponíveis para `admin` e `gerente`. O start sempre faz um stop primeiro (reset de estados FAILED) e cria a sessão se não existir (404/422). Status nunca retorna UNKNOWN — usa STOPPED como fallback. Variáveis: `WAHA_API_URL`, `WAHA_API_KEY`, `WAHA_SESSION`.

### ChatPanel — filtro de mensagens N8N
Operações aplicadas **antes** do split em `$$$`:
1. `[Mensagem original: VALUE]` → exibe apenas VALUE
2. `[* ACEITO: VALUE]` → exibe apenas VALUE
3. `[TAG]...[/TAG]` → remove o bloco inteiro
4. `[TAG: value]` → remove
5. `[TAG]` standalone → remove
6. Após strip, split em `$$$` → exibe só a parte antes
7. Se texto vazio após tudo → oculta mensagem
8. Se texto é JSON puro (começa com `{` e é válido) → oculta mensagem

**Renderização de mídia no chat:**
- `msg.mediaBase64 + mediaMimetype.startsWith('image/')` → `<img>` inline clicável (abre em nova aba)
- `msg.mediaBase64` de outro tipo → link de download com o nome do arquivo
- Imagens enviadas pelo staff: base64 em `additional_kwargs.mediaBase64`
- Imagens recebidas de pacientes: base64 buscado em `mensagens_midia` pelo `midia_id`

## Variáveis de ambiente obrigatórias
`JWT_SECRET` e `REFRESH_SECRET` — o servidor chama `process.exit(1)` se ausentes.
Ver `.env` na raiz (não commitado) ou `Configuracao/Variaveis de Ambiente.md` no vault.

### Envio de mídia pelo staff
`POST /api/chat/enviar-midia` — multipart com campo `arquivo` (multer, 10MB max). Converte para base64, detecta mimetype:
- `image/*` → WAHA `/api/sendImage`
- outros → WAHA `/api/sendFile` com campo `file.filename` (não `name`)

Encoding do nome: `Buffer.from(originalname, 'latin1').toString('utf8')` — corrige caracteres especiais do multer.

Salva em `chat_messages` com `additional_kwargs: { mediaBase64, mediaMimetype, sender }`.

## Banco de dados
Script de criação completo em `banco/migrations.sql`. Tabelas criadas automaticamente pelo servidor: `auditoria_log`, `refresh_tokens`, `mensagens_midia`. As demais (`usuarios`, `agendamentos`, `contatos_whatsapp`, `medicos`, `chat_messages`, `modelos_mensagem`) precisam ser criadas manualmente antes do primeiro uso.

### `mensagens_midia`
```sql
CREATE TABLE mensagens_midia (
  id               SERIAL PRIMARY KEY,
  mimetype         VARCHAR(100) NOT NULL,
  conteudo_base64  TEXT NOT NULL,
  data_criacao     TIMESTAMPTZ DEFAULT NOW()
);
```
Armazena mídia recebida de pacientes via WAHA webhook. Referenciada por `chat_messages.message.additional_kwargs.midia_id` (ou `data.additional_kwargs.midia_id` no formato N8N).
