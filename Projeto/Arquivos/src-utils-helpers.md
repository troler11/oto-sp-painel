---
tags: [utils, helpers, formatação]
---

# `src/utils/helpers.ts`

Funções utilitárias puras sem dependências externas.

## Formatação de datas e horas

### `formatarDataBr(data?: string): string`
Converte ISO date para formato brasileiro.
```ts
formatarDataBr('2024-01-15')        // → "15/01/2024"
formatarDataBr('2024-01-15T10:30') // → "15/01/2024"
formatarDataBr(undefined)           // → ""
```

### `formatarHoraBr(hora?: string): string`
Trunca `HH:MM:SS` para `HH:MM`.
```ts
formatarHoraBr('14:30:00') // → "14:30"
formatarHoraBr('09:05')    // → "09:05"
```

### `formatarHora(iso?: string): string`
Data e hora completa a partir de ISO timestamp.
```ts
formatarHora('2024-01-15T14:30:00Z') // → "15/01/2024 às 14:30"
```

### `tempoAtras(iso?: string): string`
Tempo relativo legível.
```ts
tempoAtras('...')  // → "45s atrás" | "12 min atrás" | "3h atrás" | "15/01/2024"
```
Limites: < 60s → segundos · < 3600s → minutos · < 86400s → horas · senão → data BR.

---

## Lógica de negócio

### `getUrgencia(data_criacao: string): 'alta' | 'media' | 'normal'`
Calcula urgência de um card pendente com base no tempo na fila.

| Tempo na fila | Urgência | Cor no card |
|---|---|---|
| > 60 min | `alta` | vermelho + ícone Flame animado |
| > 30 min | `media` | âmbar + ícone Flame |
| ≤ 30 min | `normal` | cinza |

### `getAvatarCor(nome: string): string`
Retorna classe Tailwind de cor de fundo de forma determinística pelo nome.  
Mesmo nome → sempre mesma cor em qualquer sessão.

```ts
getAvatarCor('Lucas Bueno') // → "bg-violet-500" (por exemplo)
```

**Paleta disponível (10 cores):**
`bg-violet-500` · `bg-blue-500` · `bg-emerald-500` · `bg-rose-500` · `bg-amber-500` · `bg-cyan-500` · `bg-indigo-500` · `bg-teal-500` · `bg-pink-500` · `bg-orange-500`

**Algoritmo:** hash djb2 do nome → `Math.abs(hash) % 10` → índice na paleta.
