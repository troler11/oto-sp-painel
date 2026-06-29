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

O build do frontend usa `manualChunks` no Vite: `vendor-react`, `vendor-calendar`, `vendor-dnd`. Modais são lazy-loaded via `React.lazy` + `Suspense` para reduzir o bundle inicial.

### Backend — arquivo único
Todo o backend vive em `backend/server.js`. A ordem de leitura é:
1. Configuração (helmet, CORS, rate limit, logger, cache)
2. Variáveis de ambiente + validação obrigatória (`JWT_SECRET`, `REFRESH_SECRET`)
3. Pool PostgreSQL (`min: 3`) + criação automática de tabelas extras (`auditoria_log`, `refresh_tokens`, `mensagens_midia`) e índices
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

Callbacks são memoizados com `useCallback`. Valores derivados pesados (`contagens`, `filtrosAg`, `filtrosLeads`, `listaLeads`) são memoizados com `useMemo`. `PatientCard` é envolto em `React.memo`. O ticker de tempo vivo usa um singleton global (`_tickListeners`) em vez de um `setInterval` por card.

### Fluxo do Kanban
Statuses: `PENDENTE → EM ATENDIMENTO → AGENDADO → CONFIRMADO → FINALIZADO / CANCELADO`

Existe um segundo caminho de finalização direta:
`EM ATENDIMENTO → FINALIZADO` (botão "Finalizar Atendimento") — para dúvidas rápidas sem agendar consulta.

A distinção entre os dois caminhos é feita pelo campo `data_consulta`:
- **Via Agendamento**: `data_consulta` preenchida
- **Atendimento Rápido / Dúvida**: `data_consulta = null`

Qualquer lógica que deva aplicar-se **apenas a consultas reais** deve incluir `&& a.data_consulta` no filtro. Isso inclui: Formas de Pagamento, Ranking de Médicos, campo de pagamento no card e no perfil do paciente.

**CONFIRMADO** é um status entre AGENDADO e FINALIZADO (paciente confirmou presença). Visual: barra violeta (`from-violet-500 to-violet-600`), label `'✓ Confirmado pelo Paciente'`. Botões: Chat, Cancelar, Concluir Consulta. **Não dispara reset de `contatos_whatsapp`** — atendimento ainda está em curso.

**PENDENTE** é ordenado do mais antigo para o mais novo (`data_criacao ASC`) — quem espera há mais tempo aparece primeiro.

### Socket.io
Conexão iniciada em `useEffect` após login (`io({ withCredentials: true })`). O backend autentica o socket via middleware que lê o mesmo cookie `token`. Eventos: `agendamento:atualizado` e `mensagem:nova`.

O handler `mensagem:nova` usa `pacienteAtivoChatRef` (não a variável de estado diretamente) para evitar closure stale — o `useEffect` do socket só roda uma vez ao logar. Além disso, existe um polling de fallback de 5s enquanto `chatAberto` for verdadeiro que busca **apenas mensagens novas** via `?desde=<timestamp>+1ms` (merge incremental — não refaz o histórico completo).

O payload de `mensagem:nova` inclui `{ telefone, texto, origem? }`. O campo `origem` é passado pelo backend quando a mensagem não é do paciente (ex: `/receber-enviado` emite `origem: 'ia_ou_recepcao'`). O frontend usa `payload.origem ?? 'paciente'` — sem isso, mensagens do bot apareceriam no lado esquerdo até o chat ser reaberto.

### Tipos TypeScript
Todas as interfaces estão em `frontend/src/types.ts`. Sempre importar como `import type { ... }` — o Vite com rolldown falha no build se usar import de valor para tipos.

### Cache in-memory (backend)
Rotas com cache Map:
- `GET /api/medicos` — 5min, chave `medicos:*`
- `GET /api/modelos` — 2min, chave `modelos:*`
- `GET /api/leads` — 2min, chave `leads:lista`
- `GET /api/relatorios/resumo` — 5min, chave `relatorios:resumo:${data_inicio}:${data_fim}`
- `GET /api/relatorios/evolucao-diaria` — 10min, chave `relatorios:evolucao:${dias}`

Chamar `clearCache('<prefixo>:')` após qualquer escrita nas entidades correspondentes. `GET /api/leads` é invalidado em `DELETE /api/leads/:id` e `POST /api/leads/:id/converter`.

`GET /api/contatos/:telefone/foto` cacheia a URL da foto de perfil WAHA por 1h. Usa sentinela `'NONE'` (string) para indicar "sem foto cacheado" — **nunca** usar `null`, pois `getCache` retorna `null` tanto para chave inexistente quanto para valor `null`, tornando os casos indistinguíveis.

### Papéis de usuário
`admin` e `gerente` têm acesso total. `recepcao` não pode alterar cards assumidos por outros atendentes (verificação em `PUT /api/status` e `PUT /api/agendar`).

### Chat WhatsApp — session_id
O WAHA pode enviar session IDs no formato `5511997255184-v23-UUID@s.whatsapp.net`. Para extrair o telefone, usar `telefoneRaw.match(/^\d+/)?.[0]` — **nunca** `replace(/\D/g,'')`, que inclui dígitos do UUID.

A query de histórico usa `session_id LIKE '55119..%'` para cobrir todos os formatos históricos armazenados (inclusive os gerados com o bug antigo).

### Webhook — autenticação e comportamento
O N8N deve enviar o header `x-webhook-secret` com o valor de `WEBHOOK_SECRET` do `.env`. Sem ele retorna 401.

Existem três endpoints webhook com comportamentos distintos:

| Endpoint | `type` salvo | Lado chat | Filtra `fromMe` | Checa `status_robo` |
|---|---|---|---|---|
| `POST /api/webhook/receber` | `human` | Paciente (esquerda) | Sim | Sim — ignora se `'Robô'` |
| `POST /api/webhook/receber-robo` | `human` | Paciente (esquerda) | Sim | Não — salva sempre |
| `POST /api/webhook/receber-enviado` | `ai` | Staff/bot (direita) | Não | Não — salva sempre |

HTTP 200 com `{ status: 'Ignorado' }` **não é erro** — significa que o contato está em modo Robô ou não foi encontrado. Nesse caso nada é salvo no banco (apenas em `/receber`).

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

**CONFIRMADO não dispara reset** — atendimento ainda está em curso.

### Triagem — critérios de exibição
`GET /api/leads` retorna contatos que passam em **todos** estes critérios:
1. Sem ticket `PENDENTE` ou `EM ATENDIMENTO` (exclusão absoluta — alguém está atendendo)
2. `ultima_mensagem > MAX(COALESCE(data_atualizacao, data_criacao))` de qualquer ticket vinculado ao **mesmo telefone** (JOIN via `contatos_whatsapp`) — ou sem nenhum ticket
3. `status_robo != 'Bloqueado'`

AGENDADO e FINALIZADO são condicionais: o contato reaparece se mandou mensagem depois do último ticket ser atualizado. O JOIN usa telefone (não `contato_id`) para cobrir tickets de registros duplicados do mesmo número.

Frontend filtra adicionalmente: `sessao_intencao !== 'concluido'` (bot encerrou o fluxo sem nova mensagem).

**Reentrada via webhook:** quando contato com `sessao_intencao='concluido'` manda nova mensagem no modo Robô, o backend reseta `sessao_intencao` para `'triagem'`.

### Recuperação de Leads — critérios de exibição
Fonte: `GET /api/contatos` (todos os contatos, max 500) — **diferente** da Triagem.
Filtros aplicados no frontend:
1. `status_robo !== 'Bloqueado'`
2. Classificação iTSaúde: só aparecem `novo_lead` e `novo_paciente` — `recorrente` é escondido
3. Busca por texto (nome/telefone)

State separado: Triagem usa `leads` (de `GET /api/leads`), Recuperação usa `contatos` (de `GET /api/contatos`).

### Classificação iTSaúde — leads
Rota `GET /api/leads/:id/classificar-itsaude` — busca contato por ID, remove prefixo 55, consulta iTSaúde:
- Não encontrado → `novo_lead`
- Encontrado, sem consultas → `novo_paciente`
- Encontrado, com consultas → `recorrente` (+ `total_consultas` se página 1 tem dados)

**Paginação:** timeline usa `page=1` + range 5 anos atrás até 2 anos no futuro. Se `next_page_url` não vazio → paciente tem mais páginas = `recorrente` (sem contagem). Conta apenas eventos `type === 'appointment'` excluindo `status.name` contendo "desmarcado".

Cache backend: 30min por ID (`itsaude-classif:<id>`). **Checar com `!== null`** (getCache retorna null para ausente E expirado).

Frontend: hook `useClassificacaoItsaude` em `frontend/src/hooks/useClassificacaoItsaude.ts` com cache em módulo Map. `prefetchClassificacoes(ids)` faz bulk paralelo ao entrar na aba Recuperação. `LeadClassificacaoBadge` em App.tsx exibe badge nos cards de ambas as abas.

### Aba Contatos
Lista **todos** os contatos (sem filtro de ficha), max 500, ordenado por `ultima_mensagem DESC`.

`status_robo = 'Bloqueado'`: bot não age (N8N checa via API), mensagens ainda chegam ao chat do staff. Contatos bloqueados não aparecem em Leads nem Triagem.

Rotas:
- `GET /api/contatos` — lista completa
- `POST /api/contatos` — cria/upsert por telefone
- `PATCH /api/contatos/:id` — edita nome e/ou telefone
- `PATCH /api/contatos/:id/bloquear` — toggle `'Bloqueado'` ↔ `'Robô'`

Frontend: busca em tempo real (nome/telefone), form inline de adição, edição inline por linha (lápis no hover).

### Novo Ticket manual
Botão "Novo Ticket" na barra de abas do kanban abre modal com campos telefone e nome. Rota `POST /api/agendamentos/manual`:
- Adiciona prefixo `55` automaticamente se número tiver 10-11 dígitos
- Faz upsert em `contatos_whatsapp` pelo telefone
- Cria agendamento `PENDENTE` vinculado ao contato
- Seta `status_robo = 'Humano'` para o bot não responder

### Converter lead → nome do paciente
A rota `POST /api/leads/:id/converter` usa `nome_atendimento || nome_titular || telefone` como nome do paciente na ficha criada. `nome_atendimento` é o nome coletado pelo bot N8N durante o fluxo. Após criar a ficha, seta `status_robo = 'Humano'` (para o bot parar de responder e o atendente poder usar o chat).

### WAHA — gestão de sessão
Rotas `/api/waha/*` disponíveis para `admin` e `gerente`. O start sempre faz um stop primeiro (reset de estados FAILED) e cria a sessão se não existir (404/422). Status nunca retorna UNKNOWN — usa STOPPED como fallback. Variáveis: `WAHA_API_URL`, `WAHA_API_KEY`, `WAHA_SESSION`.

### ChatPanel — filtro de mensagens N8N
Operações aplicadas **antes** do split em `$$$`:
1. `[Mensagem original: VALUE]` → exibe apenas VALUE
2. `[* ACEITO: VALUE]` → exibe apenas VALUE
3. `[INICIO COLETA: ...paciente escolheu "VALUE"...]` → exibe apenas VALUE
4. `[TAG]...[/TAG]` → remove o bloco inteiro
5. `[TAG: value]` → remove
6. `[TAG]` standalone → remove
7. Após strip, split em `$$$` → exibe só a parte antes
8. Se texto vazio após tudo → oculta mensagem
9. Se texto é JSON puro (começa com `{` e é válido) → oculta mensagem

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

Salva **midia_id** em `chat_messages.additional_kwargs` (o base64 vai para `mensagens_midia`, não inline no JSONB — evita coluna gigante).

### Foto de perfil WhatsApp
`GET /api/contatos/:telefone/foto` — busca via `GET /api/contacts/profile-picture?contactId=${tel}@s.whatsapp.net&session=${WAHA_SESSION}` no WAHA. Campo retornado: `profilePictureURL` (URL em maiúsculo). Cache de 1h com sentinela `'NONE'` para sem-foto.

Frontend: hook `useProfilePic` (`frontend/src/hooks/useProfilePic.ts`) com cache em módulo Map. Usado em: `PatientCard`, `ProfileAvatar` (lead cards + aba Contatos em App.tsx), `ChatPanel` header. Fallback para iniciais coloridas via `onError`. CSP liberado para `https://*.whatsapp.net` no helmet.

### Integração iTSaúde
Ao cancelar agendamento com `agendamentos.id_itsaude` preenchido, backend chama `POST https://api.tisaude.com/api/schedule/status/update/:id/-2`. Login automático via `POST /api/login` (credenciais `ITSAUDE_LOGIN` / `ITSAUDE_SENHA`) com token cacheado por 50min. Auto-relogin em 401. Falha no iTSaúde não bloqueia o cancelamento — OtoFlow cancela e retorna `{ avisoItsaude: '...' }` para o frontend exibir como toast de aviso.

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
