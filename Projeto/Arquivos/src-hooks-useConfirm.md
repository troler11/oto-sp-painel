---
tags: [hook, modal, confirm]
---

# `src/hooks/useConfirm.tsx`

Substitui `window.confirm()` por um modal estilizado assíncrono. Retorna uma `Promise<boolean>` que só resolve quando o usuário clica em Confirmar ou Cancelar.

## Interfaces

```ts
interface ConfirmOptions {
  mensagem: string;
  titulo?: string;
  confirmLabel?: string;   // padrão: "Confirmar"
  cancelLabel?: string;    // padrão: "Cancelar"
  tipo?: 'perigo' | 'aviso' | 'info';
}
```

## Retorno de `useConfirm()`

| Campo | Tipo | Descrição |
|---|---|---|
| `confirm` | `(options) => Promise<boolean>` | Abre o modal e aguarda resposta |
| `confirmState` | `ConfirmState` | Estado atual passado para `<ConfirmModal>` |
| `responder` | `(valor: boolean) => void` | Chamado pelos botões do modal — resolve a Promise |

## Como usar

```tsx
const { confirm, confirmState, responder } = useConfirm();

// Em qualquer função assíncrona:
const ok = await confirm({
  mensagem: 'Excluir permanentemente?',
  titulo: 'Atenção',
  tipo: 'perigo',
  confirmLabel: 'Excluir',
});
if (ok) { /* executa ação */ }

// No JSX:
<ConfirmModal state={confirmState} onResponder={responder} />
```

## Funcionamento interno

1. `confirm()` cria uma `new Promise` e salva o `resolve` no estado
2. O modal renderiza com `aberto: true`
3. Ao clicar Confirmar/Cancelar, `responder(true/false)` chama `state.resolve(valor)` e fecha o modal
