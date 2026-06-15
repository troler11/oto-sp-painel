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
