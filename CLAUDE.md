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
3. Pool PostgreSQL + criação automática de tabelas extras (`auditoria_log`, `refresh_tokens`) e índices
4. Middleware `verificarToken` (lê cookie `token`)
5. Rotas em ordem: webhook → auth → usuários → médicos → agendamentos → leads → modelos → chat → relatórios
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
Leads com `sessao_intencao = 'concluido'` são excluídos da view Triagem e da contagem no menu lateral. A lógica vive no frontend (`leads.filter(l => l.sessao_intencao !== 'concluido')`). A API também exclui contatos com ficha ativa (PENDENTE/EM ATENDIMENTO/AGENDADO/FINALIZADO com data_consulta).

### Converter lead → nome do paciente
A rota `POST /api/leads/:id/converter` usa `nome_atendimento || nome_titular || telefone` como nome do paciente na ficha criada. `nome_atendimento` é o nome coletado pelo bot N8N durante o fluxo.

### WAHA — gestão de sessão
Rotas `/api/waha/*` disponíveis para `admin` e `gerente`. O start sempre faz um stop primeiro (reset de estados FAILED) e cria a sessão se não existir (404/422). Status nunca retorna UNKNOWN — usa STOPPED como fallback. Variáveis: `WAHA_API_URL`, `WAHA_API_KEY`, `WAHA_SESSION`.

### ChatPanel — filtro de mensagens N8N
Mensagens com `$$$` têm o payload N8N removido (exibe só o texto antes). Mensagens que são JSON puro (sem texto visível) são ocultadas completamente.

## Variáveis de ambiente obrigatórias
`JWT_SECRET` e `REFRESH_SECRET` — o servidor chama `process.exit(1)` se ausentes.
Ver `.env` na raiz (não commitado) ou `Configuracao/Variaveis de Ambiente.md` no vault.

## Banco de dados
Script de criação completo em `banco/migrations.sql`. As tabelas `auditoria_log` e `refresh_tokens` são criadas automaticamente pelo servidor na inicialização. As demais (`usuarios`, `agendamentos`, `contatos_whatsapp`, `medicos`, `chat_messages`, `modelos_mensagem`) precisam ser criadas manualmente antes do primeiro uso.
