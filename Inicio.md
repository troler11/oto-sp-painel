---
tags: [home, índice]
---

# OtoFlow CRM

Sistema de gestão para clínica de otorrinolaringologia.

## Navegação

### Projeto
- [[Projeto/Visao Geral]] — arquitetura, stack e estrutura de pastas
- [[Projeto/Funcoes Frontend]] — todas as funções React, hooks, utilitários, componentes
- [[Projeto/Funcoes Backend]] — todas as rotas, middlewares, segurança

### Arquivos detalhados
- [[Projeto/Arquivos/src-hooks-useConfirm]] — como o confirm modal funciona por dentro
- [[Projeto/Arquivos/src-hooks-useToast]] — fila de toasts e auto-dismiss
- [[Projeto/Arquivos/src-utils-helpers]] — funções de formatação e getAvatarCor / getUrgencia
- [[Projeto/Arquivos/src-context-AppContext]] — contexto global, fetchSeguro, sessão
- [[Projeto/Arquivos/src-components-Header]] — busca, filtro de datas, notificações
- [[Projeto/Arquivos/src-components-Sidebar]] — navegação, badges, modo colapsado
- [[Projeto/Arquivos/src-components-PatientCard]] — card do kanban, timer ao vivo, botões por status
- [[Projeto/Arquivos/src-components-Dashboard]] — métricas, KPIs e seções do BI
- [[Projeto/Arquivos/src-components-ChatPanel]] — chat WhatsApp, modelos, pausar bot
- [[Projeto/Arquivos/src-components-PatientTimeline]] — linha do tempo do paciente
- [[Projeto/Arquivos/src-components-modals]] — ScheduleModal, CancelModal, UserModal, UserManagementModal, TemplateModal
- [[Projeto/Arquivos/src-components-utilitarios]] — CardSkeleton, ConfirmModal, ToastContainer

### Configuração
- [[Configuracao/Variaveis de Ambiente]] — todos os secrets e variáveis
- [[Configuracao/Setup Local]] — como rodar localmente

### Referência
- [[API/Endpoints]] — tabela de todas as rotas da API

### Deploy
- [[Deploy/EasyPanel]] — guia de deploy + erros comuns

### Banco de dados
- `banco/migrations.sql` — script de criação completa do banco

## Status atual

| Componente | Status |
|---|---|
| Backend Node/Express | ✅ |
| Auth httpOnly cookie + JWT + Refresh Token | ✅ |
| Socket.io tempo real | ✅ |
| Rate limit + helmet + CORS restrito | ✅ |
| Auditoria de ações | ✅ |
| Frontend React 19 + Vite + Tailwind | ✅ |
| Kanban drag & drop (@dnd-kit) | ✅ |
| Toast notifications + Confirm modals | ✅ |
| Skeleton loading | ✅ |
| Avatar colorido por nome | ✅ |
| Timer ao vivo nos cards pendentes | ✅ |
| Timeline do paciente | ✅ |
| Sidebar colapsável | ✅ |
| Atalhos de teclado | ✅ |
| Relatórios & BI | ✅ |
| Chat WhatsApp integrado | ✅ |
| Finalizar sem agendar (dúvida rápida) | ✅ |

## Repositório

- GitHub: https://github.com/troler11/oto-sp-painel
- Branch principal: `master`
