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
| `consultasAgendadas` | AGENDADO/FINALIZADO **com** `data_consulta` **e** `pagamento` preenchidos |
| `particulares` | `consultasAgendadas` com pagamento "particular" ou "pix" |
| `conveniosCount` | `consultasAgendadas` sem particular/pix |
| `totalPag` | `consultasAgendadas.length` (base dos percentuais de pagamento) |
| `receitaRealizada` | `particulares × R$ 600` |
| `taxaCancelamento` | `cancelados / total × 100` |
| `mediaEsperaMin` | média de `(data_atualizacao - data_criacao)` em minutos |
| `taxaConversaoFunil` | `concluidos / (total + leads) × 100` |
| `agendadosFuturos` | AGENDADO + `data_consulta` + particular/pix |
| `previsaoFaturacao` | `agendadosFuturos × R$ 600` |
| `taxaNoShow` | cancelados com `data_consulta` / (concluídos + esses cancelados) |
| `emAgendamento` | status `AGENDADO` (todos, independente de data) |
| `finalizadosViaConsulta` | FINALIZADO **com** `data_consulta` — via agendamento formal |
| `finalizadosDireto` | FINALIZADO **sem** `data_consulta` — atendimento rápido/dúvida |
| `rankingAtendentes` | agendamentos por `atendente_nome`, ordenado desc |
| `rankingLoyalty` | top 5 médicos por total (exclui 'a confirmar', 'qualquer', 'indiferente') |
| `motivosCancelamento` | até 4 cancelados com `observacoes` |
| `evolucaoDiaria` | contagem de criações por dia nos últimos 14 dias |

## Regra crítica de filtro

Qualquer métrica que deva aplicar-se **apenas a consultas reais** (agendadas) deve usar `consultasAgendadas` como base, ou incluir `&& a.data_consulta && a.pagamento` no filtro. Atendimentos rápidos/dúvidas têm `data_consulta = null` e não devem contaminar estatísticas de pagamento nem médicos.

## Seções do dashboard

1. **KPIs principais** — SLA de Espera · Conversão · Receita Realizada · Previsão 30d
2. **Análise de tipo** — Novos vs Retornos · Demográfico (titular vs terceiro)
3. **Funil de Conversão** — topo comum (Contactos → Triados), depois **bifurcação**:
   - *Via Agendamento*: Em Agendamento → Consulta Realizada (fundo verde)
   - *Atendimento Rápido*: Dúvida/Orientação → Finalizado Direto (fundo índigo)
4. **Distribuição por Unidade** — barras Olímpia vs Tatuapé
5. **Formas de Pagamento** — Particular/PIX vs Convênio (só consultas com `data_consulta`)
6. **Fidelização** — donut Novos vs Retornos
7. **Evolução diária** — barras dos últimos 14 dias
8. **Ranking de Médicos** — top 5 com breakdown novos/retornos
9. **Ranking de Atendentes** — barras com percentual relativo ao primeiro
10. **Análise de cancelamentos** — motivos listados em cards vermelhos
