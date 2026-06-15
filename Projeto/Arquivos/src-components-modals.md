---
tags: [componente, modal, formulário]
---

# Modais — `src/components/modals/`

Todos os modais são componentes controlados: recebem estado e callbacks via props, sem estado interno próprio.

---

## `ScheduleModal.tsx` — Agendar / Remarcar Consulta

**Abre quando:** `iniciarAgendamento(paciente)` ou `iniciarAgendamento(paciente, true)` (edição)

### Props

| Prop | Descrição |
|---|---|
| `paciente` | Exibido no card de resumo (nome, unidade, período preferido) |
| `data` / `setData` | Input `type="date"` |
| `hora` / `setHora` | Input `type="time"` |
| `medico` / `setMedico` | Input de texto livre |
| `onSubmit` | Chama `confirmarDataEHora()` → PUT `/api/agendar` |
| `onClose` | Fecha o modal |

**Cabeçalho:** gradiente verde (`#11caa0` → `#0e9f7e`)

---

## `CancelModal.tsx` — Cancelar Consulta

**Abre quando:** `iniciarCancelamento(paciente)`

### Props

| Prop | Descrição |
|---|---|
| `paciente` | Exibe nome e data/hora da consulta agendada (se houver) |
| `motivo` / `setMotivo` | Textarea obrigatória |
| `onSubmit` | Chama `confirmarCancelamento()` → PUT `/api/status` `CANCELADO` |
| `onClose` | Fecha o modal |

**Comportamento:** se o agendamento estava `AGENDADO`, `notificar: true` é enviado → backend envia WhatsApp.

**Cabeçalho:** gradiente vermelho

---

## `UserModal.tsx` — Criar Novo Usuário (admin/gerente)

**Abre quando:** sidebar clica em `__novo_usuario`

### Props

| Prop | Descrição |
|---|---|
| `form` | `{ nome, email, senha, papel }` |
| `setForm` | Atualiza campos do formulário |
| `msg` | `{ texto, tipo }` — feedback de sucesso/erro após submit |
| `onSubmit` | Chama `criarNovaConta()` → POST `/api/usuarios` |
| `onClose` | Fecha o modal |

**Papéis disponíveis:** `recepcao` · `gerente` (admin não pode ser criado via UI)

---

## `UserManagementModal.tsx` — Gestão de Equipe (admin/gerente)

**Abre quando:** sidebar clica em `__equipe`

### Props

| Prop | Descrição |
|---|---|
| `usuarios` | Lista carregada de GET `/api/usuarios` |
| `editandoSenhaId` / `setEditandoSenhaId` | Controla inline de nova senha |
| `novaSenha` / `setNovaSenha` | Campo de nova senha |
| `editandoUsuarioId` / `setEditandoUsuarioId` | Controla inline de novo nome |
| `novoNome` / `setNovoNome` | Campo de novo nome |
| `onAtualizarNome(id)` | PUT `/api/usuarios/:id` |
| `onAlterarSenha(id)` | PUT `/api/usuarios/:id/senha` |
| `onExcluir(id)` | DELETE com confirm de perigo |
| `onClose` | Fecha o modal |

**Proteção:** botão excluir não aparece para o próprio usuário logado (`sessao?.user.email !== u.email`).

---

## `TemplateModal.tsx` — CRUD de Modelos de Mensagem (admin/gerente)

**Abre quando:** sidebar `__modelos` ou botão "Gerir" no ChatPanel

### Props

| Prop | Descrição |
|---|---|
| `modelos` | Lista atual |
| `editando` | `ModeloMensagem \| null` — define se é criação ou edição |
| `form` / `setForm` | `{ titulo, texto }` |
| `onSubmit` | POST ou PUT dependendo de `editando` |
| `onEditar(m)` | Pré-preenche form com dados do modelo |
| `onRemover(id)` | DELETE com confirm |
| `onClose` | Fecha o modal |

**Layout:** formulário no topo + lista dos modelos existentes abaixo (scroll interno `max-h-[90vh]`).
