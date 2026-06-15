---
tags: [componente, sidebar, navegação]
---

# `src/components/Sidebar.tsx`

Barra lateral colapsável com navegação, contadores por status e ações administrativas.

## Props

| Prop | Tipo | Descrição |
|---|---|---|
| `filtro` | `string` | Aba ativa (controla highlight) |
| `setFiltro` | `(f: string) => void` | Muda aba — IDs especiais como `__modelos` disparam modais via `useEffect` no App |
| `contagens` | `Record<string, number>` | Badges numéricos por status |
| `erroAcesso` | `string` | Exibe "API Offline" se preenchido |
| `fazerLogout` | `() => void` | Chamado ao clicar na área do perfil |
| `setModalModelosAberto` | `fn` | Abre modal de modelos |
| `setModalNovoUsuarioAberto` | `fn` | Abre modal de novo usuário |
| `abrirGestaoUsuarios` | `fn` | Abre modal de gestão da equipe |

## Estado interno

```ts
const [colapsada, setColapsada] = useState(false);
```

Alterna entre modo **expandido** (`w-64`, label + badge) e **colapsado** (`w-[68px]`, só ícone + tooltip hover).

## Abas de navegação (`ABAS_NAV`)

| ID | Label | Badge |
|---|---|---|
| `TRIAGEM` | Triagem | contagem de leads |
| `PENDENTE` | Pendentes | contagem PENDENTE |
| `EM ATENDIMENTO` | Em Atendimento | contagem |
| `AGENDADO` | Agendados | contagem |
| `FINALIZADO` | Finalizados | contagem |
| `CANCELADO` | Cancelados | contagem |
| `LEADS` | Recuperação de Leads | — |
| `RELATORIOS` | Relatórios & BI | — |

## IDs especiais (só admin/gerente)

| ID | Efeito |
|---|---|
| `__modelos` | `useEffect` no App detecta e abre `TemplateModal` |
| `__novo_usuario` | Abre `UserModal` |
| `__equipe` | Chama `abrirGestaoUsuarios()` |

## Componente interno `NavBtn`

Renderizado para cada item de navegação. Em modo colapsado exibe tooltip via `group-hover` CSS.
