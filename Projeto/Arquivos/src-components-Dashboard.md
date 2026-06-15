---
tags: [componente, dashboard, relatórios, kpi]
---

# `src/components/Dashboard.tsx`

Painel de relatórios e BI. Recebe `agendamentos` e `leads` já filtrados e calcula todas as métricas localmente (sem chamadas de API extras).

## Props

```ts
interface Props {
  agendamentos: Agendamento[];
  leads: Lead[];
}
```

## Métricas calculadas

| Variável | Cálculo |
|---|---|
| `totalAtendimentos` | `agendamentos.length` |
| `concluidos` | status `AGENDADO` ou `FINALIZADO` |
| `cancelados` | status `CANCELADO` |
| `finalizados` | status `FINALIZADO` |
| `particulares` | concluídos com pagamento contendo "particular" ou "pix" |
| `receitaRealizada` | `particulares × R$ 600` |
| `taxaCancelamento` | `cancelados / total × 100` |
| `mediaEsperaMin` | média de `(data_atualizacao - data_criacao)` em minutos |
| `taxaConversaoFunil` | `concluidos / (total + leads) × 100` |
| `previsaoFaturacao` | agendados futuros particulares × R$ 600 |
| `taxaNoShow` | cancelados que tinham `data_consulta` / (concluidos + esses cancelados) |
| `rankingAtendentes` | agendamentos por `atendente_nome`, ordenado desc |
| `rankingLoyalty` | top 5 médicos por total de atendimentos |
| `motivosCancelamento` | até 4 cancelados com `observacoes` |
| `evolucaoDiaria` | contagem de criações por dia nos últimos 14 dias |

## Seções do dashboard

1. **KPIs principais** — SLA de Espera · Conversão · Receita Realizada · Previsão 30d
2. **Análise de tipo** — Novos vs Retornos · Demográfico (titular vs terceiro)
3. **Funil de atendimento** — barras por status
4. **Unidades** — distribuição Olímpia vs Tatuapé
5. **Formas de pagamento** — Particular vs Convênio
6. **Evolução diária** — barras dos últimos 14 dias
7. **Ranking de atendentes** — barras com percentual relativo ao primeiro
8. **Loyalty médicos** — top 5 médicos com breakdown novos/retornos
9. **Análise de cancelamentos** — motivos listados em cards vermelhos
