---
tags: [componente, kanban, card, paciente]
---

# `src/components/PatientCard.tsx`

Card do kanban. Renderiza diferente de acordo com `item.status_atendimento`. Inclui timer ao vivo, avatar colorido e indicador de urgência.

## Props

| Prop | Tipo | Descrição |
|---|---|---|
| `item` | `Agendamento` | Dados do agendamento |
| `onChat` | `(item) => void` | Abre ChatPanel para este paciente |
| `onAgendar` | `(item, isEdicao?) => void` | Abre ScheduleModal (novo ou edição) |
| `onCancelar` | `(item) => void` | Abre CancelModal |
| `onAssumir` | `(id) => void` | Chama `assumirAtendimento` |
| `onDevolver` | `(id) => void` | Chama `devolverParaFila` |
| `onFinalizar` | `(id) => void` | Chama `finalizarAtendimento` |
| `onTimeline` | `(item) => void` | Abre PatientTimeline |

## Hook interno `useTimerVivo`

```ts
function useTimerVivo(dataCriacao: string, ativo: boolean): string
```

Atualiza a cada 1 segundo via `setInterval`. Só roda quando `ativo = true` (status PENDENTE). Formato:
- `< 60s` → `"45s na fila"`
- `< 1h` → `"12min 30s na fila"`
- `≥ 1h` → `"1h 5min na fila"`

## Lógica de permissão

```ts
const podeEditar = sessao?.user.nome === item.atendente_nome 
  || sessao?.user.papel === 'admin' 
  || sessao?.user.papel === 'gerente';
```

Botões de ação ficam desabilitados (`cursor-not-allowed`) se `!podeEditar`.

## Lógica do campo médico

Valores `'A confirmar'`, `'Qualquer'` e `'Indiferente'` são tratados como ausência de médico — o campo não é exibido. Para status `AGENDADO`/`FINALIZADO` usa `medico_final`; nos demais usa `nome_medico`.

```ts
const MEDICO_IGNORAR = ['qualquer', 'indiferente', 'a confirmar'];
const medicoRaw = (['AGENDADO', 'FINALIZADO'].includes(item.status_atendimento) && item.medico_final)
  ? item.medico_final
  : (item.nome_medico || '');
const medicoExibir = MEDICO_IGNORAR.includes(medicoRaw.toLowerCase()) ? '' : medicoRaw;
```

## Visibilidade do campo Pagamento

O campo de pagamento **só é exibido quando `item.data_consulta` está preenchido** (consulta formal agendada). Atendimentos rápidos/dúvidas (sem `data_consulta`) não mostram pagamento.

## Botões por status

| Status | Botões disponíveis |
|---|---|
| `PENDENTE` | Chat · Assumir Ficha |
| `EM ATENDIMENTO` | Chat · Agendar · Cancelar · Devolver à Fila · **Finalizar Atendimento** |
| `AGENDADO` | Chat · Remarcar · Cancelar · **Concluir Consulta** |
| `FINALIZADO` | Ver Histórico (chat) |
| `CANCELADO` | — (só exibe dados) |

## Indicador de urgência

Baseado em `getUrgencia(item.data_criacao)`:

| Urgência | Borda | Ícone Flame |
|---|---|---|
| `alta` (> 60 min) | `border-red-300` | vermelho + `animate-pulse` |
| `media` (> 30 min) | `border-amber-200` | âmbar |
| `normal` | `border-slate-200` | nenhum |

## Avatar — foto de perfil ou iniciais

Usa `useProfilePic(item.telefone)` para buscar a foto de perfil do WhatsApp via WAHA. Estado `fotoErro` captura falhas de carregamento da imagem.

```tsx
const fotoPerfil = useProfilePic(item.telefone);
const [fotoErro, setFotoErro] = useState(false);
// Se foto disponível:
<img src={fotoPerfil} className="w-10 h-10 rounded-full object-cover" onError={() => setFotoErro(true)} />
// Fallback:
<div className={`w-10 h-10 rounded-full ${getAvatarCor(item.nome_paciente)} ...`}>iniciais</div>
```

A mesma lógica `getAvatarCor` é aplicada ao avatar do atendente exibido no badge.

## Campo telefone

Exibido abaixo de CPF e data de nascimento:

```tsx
{item.telefone && <p className="text-xs text-slate-500">Tel: {item.telefone}</p>}
```
