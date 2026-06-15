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

## Variáveis de ambiente obrigatórias
`JWT_SECRET` e `REFRESH_SECRET` — o servidor chama `process.exit(1)` se ausentes.
Ver `.env` na raiz (não commitado) ou `Configuracao/Variaveis de Ambiente.md` no vault.

## Banco de dados
Script de criação completo em `banco/migrations.sql`. As tabelas `auditoria_log` e `refresh_tokens` são criadas automaticamente pelo servidor na inicialização. As demais (`usuarios`, `agendamentos`, `contatos_whatsapp`, `medicos`, `chat_messages`, `modelos_mensagem`) precisam ser criadas manualmente antes do primeiro uso.
