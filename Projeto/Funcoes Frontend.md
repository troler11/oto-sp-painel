---
tags: [frontend, funções, referência]
---

# Funções do Frontend

## App.tsx — Funções principais

### Auth
| Função | Descrição |
|---|---|
| `fazerLogin(e)` | POST `/api/login` com email+senha → seta cookie httpOnly → atualiza `sessao` |
| `fazerLogout()` | POST `/api/logout` → limpa sessão e dados locais |
| `restaurar()` (useEffect) | GET `/api/me` na montagem → restaura sessão sem re-login se cookie ainda válido |

### Dados
| Função | Descrição |
|---|---|
| `buscarDados()` | GET `/api/agendamentos` + `/api/leads` em paralelo. Detecta novos pacientes e dispara toast. Atualiza `agendamentos` e `leads`. |
| `buscarModelos()` | GET `/api/modelos` → atualiza `modelos` no estado |
| `fetchSeguro(url, options)` | Wrapper de `fetch` que sempre inclui `credentials: 'include'` e `Content-Type: application/json` |

### Atendimentos / Kanban
| Função | Descrição |
|---|---|
| `assumirAtendimento(id)` | PUT `/api/status` → `EM ATENDIMENTO`. Atualiza card localmente + toast |
| `devolverParaFila(id)` | Confirm → PUT `/api/status` → `PENDENTE`. Remove atendente do card |
| `iniciarAgendamento(paciente, isEdicao)` | Abre `ScheduleModal` pré-preenchido. Em edição, carrega data/hora/médico atual |
| `confirmarDataEHora(e)` | PUT `/api/agendar` com data, hora e médico → status `AGENDADO` |
| `finalizarAtendimento(id)` | Confirm → PUT `/api/status` → `FINALIZADO`. Disponível em `EM ATENDIMENTO` e `AGENDADO` |
| `iniciarCancelamento(paciente)` | Abre `CancelModal` com paciente selecionado |
| `confirmarCancelamento(e)` | PUT `/api/status` → `CANCELADO` com motivo. Se estava `AGENDADO`, envia notificação WhatsApp |

### Drag & Drop
| Função | Descrição |
|---|---|
| `handleDragStart(event)` | Registra card sendo arrastado em `dragAtivo` |
| `handleDragEnd(event)` | Detecta coluna de destino → PUT `/api/status` se status diferente. Suporta: PENDENTE, EM ATENDIMENTO, AGENDADO |

### Chat / WhatsApp
| Função | Descrição |
|---|---|
| `carregarChat(paciente, isLead)` | GET `/api/chat/:telefone` → abre painel lateral com histórico |
| `enviarMensagemChat(e)` | POST `/api/chat/enviar` → adiciona mensagem localmente |
| `interromperRobo(telefone)` | Confirm → PUT `/api/chat/:tel/interromper-robo` → status `Humano` |

### Leads
| Função | Descrição |
|---|---|
| `descartarLead(id)` | Confirm perigo → DELETE `/api/leads/:id` |
| `converterParaPendente(lead)` | Confirm → POST `/api/leads/:id/converter` → cria ficha PENDENTE |

### Usuários (admin)
| Função | Descrição |
|---|---|
| `criarNovaConta(e)` | POST `/api/usuarios` com nome, email, senha, papel |
| `abrirGestaoUsuarios()` | GET `/api/usuarios` → abre `UserManagementModal` |
| `atualizarNomeUsuario(id)` | PUT `/api/usuarios/:id` com novo nome |
| `alterarSenhaUsuario(id)` | PUT `/api/usuarios/:id/senha` com nova senha |
| `excluirUsuario(id)` | Confirm perigo → DELETE `/api/usuarios/:id` |

### Modelos de mensagem
| Função | Descrição |
|---|---|
| `salvarModelo(e)` | POST ou PUT `/api/modelos` dependendo se está editando |
| `removerModelo(id)` | Confirm perigo → DELETE `/api/modelos/:id` |
| `abrirEdicaoModelo(modelo)` | Pré-preenche form e abre `TemplateModal` em modo edição |

### Filtros e contagens
| Função | Descrição |
|---|---|
| `aplicarFiltros(items, isLead)` | Filtra por texto (nome/CPF) e por intervalo de datas |
| `contagens` | Objeto com total por status: `TRIAGEM`, `PENDENTE`, `EM ATENDIMENTO`, `AGENDADO`, `FINALIZADO`, `CANCELADO` |

### Notificações
| Função | Descrição |
|---|---|
| `adicionarNotificacao(texto, tipo)` | Adiciona ao painel de notificações (máx 20). Tipos: `info`, `sucesso`, `aviso` |

---

## Hooks customizados

### `useConfirm()` — `src/hooks/useConfirm.tsx`
Substitui `window.confirm()` por um modal estilizado que retorna `Promise<boolean>`.

```ts
const { confirm, confirmState, responder } = useConfirm();

// Uso:
const ok = await confirm({
  mensagem: 'Deseja excluir?',
  titulo: 'Confirmar exclusão',   // opcional
  tipo: 'perigo',                 // 'perigo' | 'aviso' | 'info'
  confirmLabel: 'Excluir',        // texto do botão de confirmação
});
if (ok) { /* executa ação */ }
```

### `useToast()` — `src/hooks/useToast.tsx`
Notificações temporárias (4 segundos) no canto superior direito.

```ts
const { toasts, toast, remover } = useToast();

toast('Mensagem', 'sucesso');  // tipos: 'sucesso' | 'erro' | 'info' | 'aviso'
```

---

## Utilitários — `src/utils/helpers.ts`

| Função | Assinatura | Descrição |
|---|---|---|
| `formatarDataBr` | `(data?: string) => string` | `2024-01-15` → `15/01/2024` |
| `formatarHoraBr` | `(hora?: string) => string` | `14:30:00` → `14:30` |
| `formatarHora` | `(iso?: string) => string` | ISO → `15/01/2024 às 14:30` |
| `tempoAtras` | `(iso?: string) => string` | ISO → `5 min atrás` / `2h atrás` / data |
| `getUrgencia` | `(data_criacao: string) => 'alta' \| 'media' \| 'normal'` | > 60min = alta, > 30min = média |
| `getAvatarCor` | `(nome: string) => string` | Hash do nome → classe Tailwind de cor (10 cores) |

---

## Componentes e responsabilidades

| Componente | Arquivo | O que faz |
|---|---|---|
| `Sidebar` | `components/Sidebar.tsx` | Navegação lateral colapsável, badges de contagem, ações admin |
| `Header` | `components/Header.tsx` | Barra superior, busca, filtro de datas, painel de notificações |
| `PatientCard` | `components/PatientCard.tsx` | Card do kanban com timer ao vivo, avatar colorido, ações por status |
| `Dashboard` | `components/Dashboard.tsx` | Relatórios, KPIs, gráficos, análise de cancelamentos |
| `ChatPanel` | `components/ChatPanel.tsx` | Painel lateral de chat WhatsApp com modelos de mensagem |
| `PatientTimeline` | `components/PatientTimeline.tsx` | Modal com histórico cronológico de eventos do paciente |
| `CardSkeleton` | `components/CardSkeleton.tsx` | Skeleton loading com animação shimmer durante carregamento inicial |
| `ConfirmModal` | `components/ConfirmModal.tsx` | Modal de confirmação com 3 tipos: perigo/aviso/info |
| `ToastContainer` | `components/ToastContainer.tsx` | Container de toasts fixo no canto superior direito |
| `ScheduleModal` | `components/modals/ScheduleModal.tsx` | Modal para agendar/remarcar consulta (data, hora, médico) |
| `CancelModal` | `components/modals/CancelModal.tsx` | Modal de cancelamento com campo de motivo |
| `UserModal` | `components/modals/UserModal.tsx` | Modal de criação de novo usuário |
| `UserManagementModal` | `components/modals/UserManagementModal.tsx` | Gestão de equipe: editar nome, trocar senha, excluir |
| `TemplateModal` | `components/modals/TemplateModal.tsx` | CRUD de modelos de mensagem WhatsApp |

---

## Socket.io — eventos em tempo real

| Evento | Direção | Ação no frontend |
|---|---|---|
| `agendamento:atualizado` | server → client | Atualiza card específico no estado sem refetch |
| `mensagem:nova` | server → client | Se chat aberto para o telefone: adiciona mensagem. Caso contrário: notificação |

---

## Atalhos de teclado

| Tecla | Ação |
|---|---|
| `Esc` | Fecha chat, modais e timeline abertos |
| `R` | Recarrega dados (buscarDados) |
| `1` | Vai para Triagem |
| `2` | Vai para Pendentes |
| `3` | Vai para Em Atendimento |
| `4` | Vai para Agendados |
| `5` | Vai para Finalizados |
| `6` | Vai para Cancelados |
| `D` | Vai para Relatórios |

---

## Fluxo do kanban

```
TRIAGEM (leads)
    ↓ converterParaPendente()
PENDENTE
    ↓ assumirAtendimento()
EM ATENDIMENTO
    ├─ iniciarAgendamento() → AGENDADO
    │      └─ finalizarAtendimento() → FINALIZADO
    ├─ finalizarAtendimento() → FINALIZADO  ← atendimento de dúvida rápida
    ├─ iniciarCancelamento() → CANCELADO
    └─ devolverParaFila() → PENDENTE

Drag & Drop: mover entre PENDENTE / EM ATENDIMENTO / AGENDADO
```
