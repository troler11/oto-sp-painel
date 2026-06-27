---
tags: [projeto, arquitetura]
---

# Visão Geral — OtoFlow CRM

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Node.js + Express |
| Banco de dados | PostgreSQL |
| Auth | JWT em httpOnly cookie + Refresh Token |
| WebSocket | Socket.io |
| Frontend | React 19 + Vite 6 + TypeScript |
| Estilo | Tailwind CSS 3 |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Calendário | FullCalendar (timegrid + daygrid) |
| Ícones | lucide-react |
| Deploy | Docker (multi-stage) via EasyPanel |

## Estrutura de pastas

```
oto-sp-painel/
├── backend/
│   ├── server.js        # toda a API em arquivo único
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # componente raiz, kanban, drag & drop
│   │   ├── types.ts                 # interfaces TypeScript
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx          # colapsável com ícones
│   │   │   ├── PatientCard.tsx      # card com timer ao vivo + avatar colorido
│   │   │   ├── CalendarView.tsx     # visão calendário
│   │   │   ├── Dashboard.tsx        # relatórios e métricas
│   │   │   ├── ChatPanel.tsx        # chat WhatsApp
│   │   │   ├── PatientTimeline.tsx  # histórico cronológico do paciente
│   │   │   ├── CardSkeleton.tsx     # loading skeleton
│   │   │   ├── ConfirmModal.tsx     # modal de confirmação customizado
│   │   │   ├── ToastContainer.tsx   # notificações toast
│   │   │   └── modals/
│   │   │       ├── ScheduleModal.tsx
│   │   │       ├── CancelModal.tsx
│   │   │       ├── TemplateModal.tsx
│   │   │       ├── UserModal.tsx
│   │   │       └── UserManagementModal.tsx
│   │   ├── context/
│   │   │   └── AppContext.tsx       # sessão, fetchSeguro, notificações
│   │   ├── hooks/
│   │   │   ├── useConfirm.tsx       # substitui window.confirm()
│   │   │   ├── useToast.tsx         # toast com auto-dismiss 4s
│   │   │   └── useProfilePic.ts     # foto de perfil WhatsApp via WAHA, cache em módulo
│   │   └── utils/
│   │       └── helpers.ts           # formatação, getAvatarCor, getUrgencia
│   ├── vite.config.ts               # proxy /api e /socket.io → localhost:3000
│   └── package.json
├── Dockerfile                       # multi-stage: build frontend + serve via backend
├── docker-compose.yml               # usa env_file: .env
└── .env                             # NÃO commitado — ver [[Configuracao/Variaveis de Ambiente]]
```

## Fluxo de autenticação

```
Login → POST /api/login
     → backend seta cookie httpOnly (token JWT 15min)
     → backend seta cookie httpOnly (refreshToken 7d)
     → frontend usa credentials: 'include' em todas as chamadas
     → token expirado → POST /api/refresh-token (automático via fetchSeguro)
     → logout → POST /api/logout (revoga refresh token no banco)
```

## Eventos Socket.io

| Evento | Direção | Descrição |
|---|---|---|
| `agendamento:atualizado` | server → client | kanban atualizado |
| `mensagem:nova` | server → client | nova mensagem WhatsApp |

## Papéis de usuário

| Papel | Permissões |
|---|---|
| `admin` | tudo, incluindo gestão de usuários e relatórios |
| `recepcao` | agendamentos, chat, kanban |
