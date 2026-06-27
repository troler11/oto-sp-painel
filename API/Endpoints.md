---
tags: [api, backend, rotas]
---

# Endpoints da API

Base URL: `http://localhost:3000` (local) ou seu domínio em produção.
Todas as rotas protegidas exigem cookie `token` (httpOnly) — enviado automaticamente com `credentials: 'include'`.

## Saúde

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/health` | Não | Verifica se o servidor está no ar |

## Autenticação

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/api/login` | Não | Login — seta cookies `token` e `refreshToken` |
| POST | `/api/refresh-token` | Cookie | Renova o access token usando o refresh token |
| POST | `/api/logout` | Sim | Revoga refresh token e limpa cookies |
| GET | `/api/me` | Sim | Retorna dados do usuário logado |

## Usuários

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/usuarios` | Admin | Lista todos os usuários |
| POST | `/api/usuarios` | Admin | Cria novo usuário |
| PUT | `/api/usuarios/:id` | Admin | Atualiza usuário |
| PUT | `/api/usuarios/:id/senha` | Admin | Altera senha |
| DELETE | `/api/usuarios/:id` | Admin | Remove usuário |

## Médicos

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/medicos` | Sim | Lista médicos |
| POST | `/api/medicos` | Admin | Cadastra médico |
| PUT | `/api/medicos/:id` | Admin | Atualiza médico |
| DELETE | `/api/medicos/:id` | Admin | Remove médico |

## Agendamentos / Kanban

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/agendamentos` | Sim | Lista agendamentos (com filtros) |
| PUT | `/api/status` | Sim | Atualiza status de um agendamento |
| PUT | `/api/agendar` | Sim | Agenda consulta (data, hora, médico) |
| PATCH | `/api/agendamentos/:id/nome` | Sim | Edita nome_paciente |

## Leads

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/leads` | Sim | Lista leads (exclui PENDENTE/EM ATENDIMENTO/AGENDADO e Bloqueados) |
| PATCH | `/api/leads/:id/nome` | Sim | Edita nome_titular do contato |
| DELETE | `/api/leads/:id` | Admin | Remove lead |
| POST | `/api/leads/:id/converter` | Sim | Converte lead em agendamento PENDENTE (seta status_robo='Humano') |

## Contatos

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/contatos` | Sim | Lista todos os contatos (max 500) |
| POST | `/api/contatos` | Sim | Cria/upsert contato por telefone |
| PATCH | `/api/contatos/:id` | Sim | Edita nome e/ou telefone |
| PATCH | `/api/contatos/:id/bloquear` | Sim | Toggle Bloqueado ↔ Robô |

## Chat / WhatsApp

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/chat/:telefone` | Sim | Histórico de mensagens (inclui mediaBase64/mediaMimetype) |
| POST | `/api/chat/enviar` | Sim | Envia mensagem de texto via WAHA |
| POST | `/api/chat/enviar-midia` | Sim | Envia imagem/PDF via WAHA (multipart, campo `arquivo`) |
| PUT | `/api/chat/:telefone/interromper-robo` | Sim | Passa para atendimento humano |

## Modelos de Mensagem

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/modelos` | Sim | Lista modelos |
| POST | `/api/modelos` | Admin | Cria modelo |
| PUT | `/api/modelos/:id` | Admin | Atualiza modelo |
| DELETE | `/api/modelos/:id` | Admin | Remove modelo |

## Relatórios

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/relatorios/resumo` | Admin | Métricas gerais |
| GET | `/api/relatorios/evolucao-diaria` | Admin | Evolução por dia |

## Webhook WAHA

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/api/webhook/receber` | Header `x-webhook-secret` | Recebe mensagens do WhatsApp |

## Auditoria

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/auditoria` | Admin | Log de ações do sistema |
