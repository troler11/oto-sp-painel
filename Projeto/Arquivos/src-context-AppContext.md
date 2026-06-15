---
tags: [context, react, sessão]
---

# `src/context/AppContext.tsx`

Contexto React que expõe dados globais para todos os componentes filhos sem prop drilling.

## Interface exposta

```ts
interface AppContextValue {
  sessao: Sessao | null;
  fetchSeguro: (url: string, options?: RequestInit) => Promise<Response>;
  adicionarNotificacao: (texto: string, tipo: Notificacao['tipo']) => void;
  setNotificacaoErro: (msg: string | null) => void;
}
```

## Como consumir

```tsx
import { useApp } from '../context/AppContext';

function MeuComponente() {
  const { sessao, fetchSeguro } = useApp();
  // sessao.user.nome, sessao.user.papel, sessao.user.email
}
```

## Onde é provido

`App.tsx` envolve toda a árvore com `<AppContext.Provider value={{ sessao, fetchSeguro, adicionarNotificacao, setNotificacaoErro }}>`.

## Campos do `sessao`

| Campo | Tipo | Descrição |
|---|---|---|
| `sessao.user.nome` | `string` | Nome do usuário logado |
| `sessao.user.email` | `string` | Email do usuário |
| `sessao.user.papel` | `string` | `admin` \| `gerente` \| `recepcao` |

## `fetchSeguro`

Wrapper de `fetch` que sempre inclui:
- `credentials: 'include'` → envia cookies httpOnly automaticamente
- `Content-Type: application/json`
- Qualquer header/option adicional passado como segundo argumento

**Nunca usar `fetch` diretamente para chamadas à API** — usar sempre `fetchSeguro`.
