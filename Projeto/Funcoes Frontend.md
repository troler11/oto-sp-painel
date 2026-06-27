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
| `buscarDados()` | GET `/api/agendamentos` + `/api/leads` + `/api/contatos` em paralelo. Detecta novos pacientes e dispara toast. |
| `buscarModelos()` | GET `/api/modelos` → atualiza `modelos` no estado |
| `fetchSeguro(url, options)` | Wrapper de `fetch` que sempre inclui `credentials: 'include'` e `Content-Type: application/json`. **Não usar para FormData** — vai sobrescrever o boundary. |

### Atendimentos / Kanban
| Função | Descrição |
|---|---|
| `assumirAtendimento(id)` | PUT `/api/status` → `EM ATENDIMENTO`. Atualiza card localmente + toast |
| `devolverParaFila(id)` | Confirm → PUT `/api/status` → `PENDENTE`. Remove atendente do card |
| `iniciarAgendamento(paciente, isEdicao)` | Abre `ScheduleModal` pré-preenchido. Em edição, carrega data/hora/médico atual |
| `confirmarDataEHora(e)` | PUT `/api/agendar` com data, hora e médico → status `AGENDADO` |
| `finalizarAtendimento(id)` | Confirm → PUT `/api/status` → `FINALIZADO`. Disponível em `EM ATENDIMENTO` e `AGENDADO` |
| `iniciarCancelamento(paciente)` | Abre `CancelModal` com paciente selecionado |
| `confirmarCancelamento(e)` | PUT `/api/status` → `CANCELADO` com motivo. Se estava `AGENDADO`, envia notificação WhatsApp. Se resposta incluir `avisoItsaude`, exibe toast de aviso (cancelamento iTSaúde falhou). |

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
| `enviarMidiaChat(file)` | FormData → POST `/api/chat/enviar-midia` (usa `fetch` raw, não `fetchSeguro`). Optimistic: adiciona mensagem com base64 lido via FileReader antes da resposta. |
| `interromperRobo(telefone)` | Confirm → PUT `/api/chat/:tel/interromper-robo` → status `Humano` |
| `exportarLeadsCSV()` | Gera CSV UTF-8 BOM. Botão visível apenas no filtro LEADS. |

**Atualização em tempo real do chat:**
- Socket.io: handler `mensagem:nova` usa `pacienteAtivoChatRef.current` (ref, não closure) para comparar telefone e evitar o bug de closure estale no `useEffect([sessao])`
- Polling de fallback: quando `chatAberto`, faz GET `/api/chat/:tel?desde=<ultimo_timestamp+1ms>` a cada 5s — incremental, traz só mensagens novas. O `+1ms` resolve a diferença de precisão microsegundo (PostgreSQL) vs milissegundo (JS). `ultimaMsgDataRef` guarda o timestamp da última mensagem conhecida.

### Leads e Triagem
| Função | Descrição |
|---|---|
| `descartarLead(id)` | Confirm perigo → DELETE `/api/leads/:id` |
| `converterParaPendente(lead)` | Confirm → POST `/api/leads/:id/converter` → cria ficha PENDENTE + status_robo='Humano' |
| `renomearLead(id, nome)` | PATCH `/api/leads/:id/nome` — inline no card (lápis no hover) |
| `renomearAgendamento(id, nome)` | PATCH `/api/agendamentos/:id/nome` — inline no PatientCard |

**Filtros de Triagem:**
- `TRIAGEM` mostra leads com `sessao_intencao !== 'concluido'`
- Leads com PENDENTE/EM ATENDIMENTO/AGENDADO nunca aparecem; FINALIZADO reaparece se nova mensagem

### Contatos
| Função | Descrição |
|---|---|
| `bloquearContato(id, bloquear)` | PATCH `/api/contatos/:id/bloquear` → toggle Bloqueado ↔ Robô |
| `adicionarContato()` | POST `/api/contatos` → cria/upsert por telefone; form inline |
| `salvarEdicaoContato()` | PATCH `/api/contatos/:id` → edita nome e telefone |

**Estado local:**
- `contatos: Contato[]` — todos os contatos, carregados em `buscarDados()`
- `searchContatos` — filtro por nome ou telefone em tempo real
- `novoContatoForm` — controla form de adição inline
- `editandoContato` — controla linha em edição inline

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

### `useProfilePic(telefone)` — `src/hooks/useProfilePic.ts`
Hook que busca a foto de perfil do WhatsApp de um contato via `GET /api/contatos/:tel/foto`. Cache em módulo (Map), persiste entre re-renders sem re-fetch. Retorna `string | null` (URL da foto ou null se sem foto / WAHA offline).

```ts
const foto = useProfilePic(item.telefone);
// usar junto com estado fotoErro para fallback:
// foto && !fotoErro → <img onError={() => setFotoErro(true)} />
// caso contrário → div com iniciais coloridas (getAvatarCor)
```

Usado em: `PatientCard`, `ProfileAvatar` (App.tsx — lead cards e aba Contatos), `ChatPanel`.

### `useConfirm()` — `src/hooks/useConfirm.tsx`
Substitui `window.confirm()` por um modal estilizado que retorna `Promise<boolean>`.

```ts
const { confirm, confirmState, responder } = useConfirm();

const ok = await confirm({
  mensagem: 'Deseja excluir?',
  titulo: 'Confirmar exclusão',   // opcional
  tipo: 'perigo',                 // 'perigo' | 'aviso' | 'info'
  confirmLabel: 'Excluir',
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
| `Sidebar` | `components/Sidebar.tsx` | Navegação lateral colapsável, badges de contagem, ações admin+gerente |
| `Header` | `components/Header.tsx` | Barra superior, busca, filtro de datas, painel de notificações |
| `PatientCard` | `components/PatientCard.tsx` | Card do kanban com timer ao vivo, avatar (foto de perfil WhatsApp ou iniciais coloridas), telefone visível, ações por status. CANCELADO mostra "Consulta Cancelada" (vermelho, com data_consulta) ou "Ticket Descartado" (cinza, sem data_consulta) |
| `Dashboard` | `components/Dashboard.tsx` | Relatórios, KPIs, gráficos. Cancelamentos separados em "Consultas Canceladas" e "Tickets Descartados" |
| `ChatPanel` | `components/ChatPanel.tsx` | Painel lateral de chat WhatsApp. Header mostra foto de perfil WhatsApp (ou iniciais). Filtra blocos N8N, renderiza imagens inline e docs como link de download. Botão Paperclip para enviar mídia. |
| `ProfileAvatar` | inline em `App.tsx` | Componente reutilizável que usa `useProfilePic` para exibir foto de perfil ou iniciais coloridas. Usado em lead cards (Triagem/Leads) e aba Contatos. |
| `PatientTimeline` | `components/PatientTimeline.tsx` | Modal com histórico cronológico de eventos do paciente |
| `CardSkeleton` | `components/CardSkeleton.tsx` | Skeleton loading com animação shimmer |
| `ConfirmModal` | `components/ConfirmModal.tsx` | Modal de confirmação com 3 tipos: perigo/aviso/info |
| `ToastContainer` | `components/ToastContainer.tsx` | Container de toasts fixo no canto superior direito |
| `ScheduleModal` | `components/modals/ScheduleModal.tsx` | Modal para agendar/remarcar consulta (data, hora, médico) |
| `CancelModal` | `components/modals/CancelModal.tsx` | Título e cores adaptam: "Cancelar Consulta" (vermelho, com data_consulta) vs "Descartar Ticket" (cinza) |
| `UserModal` | `components/modals/UserModal.tsx` | Modal de criação de novo usuário |
| `UserManagementModal` | `components/modals/UserManagementModal.tsx` | Gestão de equipe: editar nome, trocar senha, excluir |
| `TemplateModal` | `components/modals/TemplateModal.tsx` | CRUD de modelos de mensagem WhatsApp |
| `WahaModal` | `components/modals/WahaModal.tsx` | Gestão de sessão WAHA: status, QR code, conectar/pausar/deslogar. Visível para admin e gerente |

---

## ChatPanel — Filtro de mensagens N8N

Operações aplicadas **antes** do split em `$$$` (ordem importa):
1. `[Mensagem original: VALUE]` → exibe apenas VALUE
2. `[* ACEITO: VALUE]` → exibe apenas VALUE
3. `[TAG]...[/TAG]` → remove bloco inteiro
4. `[TAG: value]` → remove
5. `[TAG]` standalone → remove
6. Split em `$$$` → exibe só antes
7. Texto vazio → oculta
8. JSON puro (`{...}`) → oculta

## ChatPanel — Renderização de mídia

| Condição | Renderização |
|---|---|
| `mediaBase64 + mimetype.startsWith('image/')` | `<img>` inline, clique abre em nova aba |
| `mediaBase64` (outro tipo) | Link de download com nome do arquivo |
| Sem mídia | Texto normal |

Mídia de pacientes vem de `mensagens_midia` via `midia_id`. Mídia enviada pelo staff vem de `additional_kwargs.mediaBase64`.

---

## Socket.io — eventos em tempo real

| Evento | Direção | Ação no frontend |
|---|---|---|
| `agendamento:atualizado` | server → client | Atualiza card específico no estado sem refetch |
| `mensagem:nova` | server → client | Se chat aberto para o telefone: adiciona mensagem. Caso contrário: notificação. Usa `pacienteAtivoChatRef` para evitar closure stale. |

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
TRIAGEM (leads sem ficha ativa, sessao_intencao != 'concluido')
    ↓ converterParaPendente()
PENDENTE
    ↓ assumirAtendimento()
EM ATENDIMENTO
    ├─ iniciarAgendamento() → AGENDADO  ← reset contato
    │      └─ finalizarAtendimento() → FINALIZADO  ← reset contato
    ├─ finalizarAtendimento() → FINALIZADO  ← reset contato (dúvida rápida)
    ├─ iniciarCancelamento() → CANCELADO  ← reset contato
    └─ devolverParaFila() → PENDENTE

Drag & Drop: mover entre PENDENTE / EM ATENDIMENTO / AGENDADO
```

## Separação CANCELADO

O status `CANCELADO` tem dois subtipos visuais (sem novo campo no banco):

| Tipo | Condição | Visual |
|---|---|---|
| Consulta Cancelada | `CANCELADO + data_consulta IS NOT NULL` | Badge vermelho |
| Ticket Descartado | `CANCELADO + data_consulta IS NULL` | Badge cinza |

Usado em: `PatientCard`, `CancelModal`, `Dashboard` (KPIs e análise separados em abas).
