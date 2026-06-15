---
tags: [componente, timeline, histórico, modal]
---

# `src/components/PatientTimeline.tsx`

Modal com linha do tempo cronológica de um agendamento. Exibe eventos com ícone, label, detalhe e timestamp.

## Props

```ts
interface Props {
  paciente: Agendamento;
  onClose: () => void;
}
```

## Eventos gerados (em ordem)

| Evento | Condição | Cor |
|---|---|---|
| Ficha criada pela IA | sempre | azul (`bg-blue-500`) |
| Assumido por [atendente] | `paciente.atendente_nome` existe | âmbar (`bg-amber-500`) |
| Consulta agendada | status `AGENDADO` ou `FINALIZADO` + `data_consulta` | verde (`bg-emerald-500`) |
| Consulta realizada | status `FINALIZADO` | índigo (`bg-indigo-500`) |
| Consulta cancelada | status `CANCELADO` | vermelho (`bg-red-500`) |

## Dados exibidos no resumo do paciente

- CPF · Telefone · Especialidade · Pagamento

## Design da timeline

Linha vertical absoluta (`left-[17px]`, `w-0.5`, `bg-slate-200`) conecta os ícones circulares. Cada evento tem:
- Ícone colorido (círculo 36px)
- Card cinza claro com label, subtítulo e timestamp formatado via `formatarHora()`

## Como abrir

No `App.tsx`:
```tsx
// Estado:
const [pacienteTimeline, setPacienteTimeline] = useState<Agendamento | null>(null);

// Renderização:
{pacienteTimeline && (
  <PatientTimeline
    paciente={pacienteTimeline}
    onClose={() => setPacienteTimeline(null)}
  />
)}

// Passado para PatientCard:
onTimeline={setPacienteTimeline}
```
