---
tags: [hook, toast, notificação]
---

# `src/hooks/useToast.tsx`

Gerencia uma fila de notificações temporárias. Cada toast desaparece automaticamente após **4 segundos**.

## Tipos

```ts
type ToastTipo = 'sucesso' | 'erro' | 'info' | 'aviso';

interface Toast {
  id: number;      // timestamp Date.now()
  texto: string;
  tipo: ToastTipo;
}
```

## Retorno de `useToast()`

| Campo | Tipo | Descrição |
|---|---|---|
| `toasts` | `Toast[]` | Lista atual — passada para `<ToastContainer>` |
| `toast(texto, tipo)` | `function` | Adiciona toast e agenda remoção em 4s |
| `remover(id)` | `function` | Remove um toast manualmente (ao clicar no X) |

## Como usar

```tsx
const { toasts, toast, remover } = useToast();

toast('Consulta agendada!', 'sucesso');
toast('Erro ao salvar.', 'erro');
toast('Sessão expirada.', 'aviso');
toast('Nova mensagem recebida.', 'info');

// No JSX:
<ToastContainer toasts={toasts} onRemover={remover} />
```
