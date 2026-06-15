---
tags: [componente, skeleton, toast, confirm]
---

# Componentes utilitários

---

## `CardSkeleton.tsx` — Loading skeleton

Exibido durante o **primeiro carregamento** (`primeiraCarregamento === true`). Usa animação shimmer via Tailwind `animate-[shimmer_1.5s_infinite]`.

### Exports

```ts
// Skeleton de um único card
export default function CardSkeleton(): JSX.Element

// Grid de N skeletons (padrão: 6)
export function CardSkeletonGrid({ count = 6 }: { count?: number }): JSX.Element
```

### Como usar no App

```tsx
{primeiraCarregamento ? (
  <CardSkeletonGrid count={6} />
) : (
  // grid real de cards
)}
```

### Animação CSS (definida em `index.css` via Tailwind)

```css
@keyframes shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
```

---

## `ConfirmModal.tsx` — Modal de confirmação

Renderiza o modal gerenciado por `useConfirm()`. Três variantes visuais:

| `tipo` | Cor do header | Botão confirmar |
|---|---|---|
| `'perigo'` | vermelho | vermelho |
| `'aviso'` | âmbar | âmbar |
| `'info'` (padrão) | azul (`#005088`) | azul |

### Props (recebe `confirmState` e `responder` de `useConfirm()`)

```tsx
<ConfirmModal
  state={confirmState}   // { aberto, mensagem, titulo, tipo, confirmLabel, cancelLabel }
  onResponder={responder} // (valor: boolean) => void
/>
```

Só renderiza quando `state.aberto === true`.

---

## `ToastContainer.tsx` — Container de toasts

Stack de notificações fixo no canto superior direito (`fixed top-4 right-4 z-[200]`).

### Props

```tsx
<ToastContainer
  toasts={toasts}      // Toast[]
  onRemover={remover}  // (id: number) => void
/>
```

### Visual por tipo

| Tipo | Cor |
|---|---|
| `'sucesso'` | verde (`emerald`) |
| `'erro'` | vermelho |
| `'aviso'` | âmbar |
| `'info'` | azul |

Cada toast tem botão `×` para fechar manualmente. Auto-fecha em 4s via `setTimeout` no hook.
