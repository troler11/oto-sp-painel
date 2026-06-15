---
tags: [componente, header, busca, notificações]
---

# `src/components/Header.tsx`

Barra superior fixa (`h-[72px]`). Exibe breadcrumb, busca, filtro de datas, sino de notificações e botão de refresh.

## Props

| Prop | Tipo | Descrição |
|---|---|---|
| `filtro` | `string` | Aba ativa — determina título e visibilidade dos filtros |
| `searchTerm` / `setSearchTerm` | `string / fn` | Busca por nome ou CPF |
| `dataInicio` / `setDataInicio` | `string / fn` | Filtro de data inicial (input date) |
| `dataFim` / `setDataFim` | `string / fn` | Filtro de data final |
| `carregandoDados` | `boolean` | Ativa animação de spin no botão de refresh |
| `buscarDados` | `() => void` | Chamado pelo botão de refresh |
| `notificacoes` | `Notificacao[]` | Lista de notificações para o painel |
| `setNotificacoes` | `Dispatch` | Usado para marcar todas como lidas e para limpar |
| `painelNotifAberto` / `setPainelNotifAberto` | `boolean / fn` | Controla visibilidade do dropdown |

## Comportamento

- **Busca**: oculta quando `filtro === 'RELATORIOS'`
- **Filtro de datas**: visível apenas quando `filtro` não é `RELATORIOS` nem `LEADS`
- **Notificações**: ao abrir o painel, todas são marcadas como lidas (`lida: true`)
- **Badge**: exibe contador vermelho com as não lidas
- **Título**: usa mapa `TITULO[filtro]` ou capitaliza o filtro automaticamente

## Lógica interna

```ts
const naoLidas = notificacoes.filter(n => !n.lida).length;
const titulo = TITULO[filtro] || (filtro.charAt(0) + filtro.slice(1).toLowerCase() + 's');
```

Mapa de títulos:
```ts
const TITULO = {
  RELATORIOS: 'Relatórios & BI',
  LEADS: 'Recuperação Ativa',
  'EM ATENDIMENTO': 'Em Atendimento',
}
```
