---
tags: [componente, chat, whatsapp]
---

# `src/components/ChatPanel.tsx`

Painel lateral deslizante (`w-[400px]`, `fixed right-0`) para atendimento via WhatsApp. Estilo visual inspirado no WhatsApp (fundo `#eae6df`, balões com `#dcf8c6`).

## Props

| Prop | Tipo | Descrição |
|---|---|---|
| `pacienteAtivoChat` | `PacienteChat` | `{ telefone, nome_paciente, bloquearEnvio }` |
| `mensagens` | `MensagemChat[]` | Histórico exibido em balões |
| `novaMensagem` / `setNovaMensagem` | `string / fn` | Controla input de texto |
| `enviandoMensagem` | `boolean` | Ativa spinner no botão de envio |
| `digitando` | `boolean` | Exibe três pontinhos animados |
| `modelos` | `ModeloMensagem[]` | Lista para o dropdown |
| `dropdownModelosAberto` / `setDropdownModelosAberto` | `boolean / fn` | Controla dropdown de modelos |
| `onClose` | `() => void` | Fecha o painel |
| `onEnviar` | `(e) => void` | Submete a mensagem |
| `onInterromperRobo` | `(telefone) => void` | Pausa o bot |
| `onAbrirModelos` | `() => void` | Abre TemplateModal para gerir modelos |
| `onEditarModelo` | `(m) => void` | Pré-preenche form e abre TemplateModal |
| `onRemoverModelo` | `(id) => void` | Remove modelo com confirm |

## Comportamento dos balões

| `msg.origem` | Alinhamento | Cor |
|---|---|---|
| `'paciente'` | esquerda | branco |
| `'ia_ou_recepcao'` | direita | `#dcf8c6` (verde claro) |
| `'sistema'` | centro | laranja claro |

## Scroll automático

```ts
const chatEndRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [mensagens]);
```

## Dropdown de modelos

- Clica no modelo → preenche `novaMensagem` com `m.texto` e fecha dropdown
- Admin/gerente veem botões de editar/remover por modelo (`opacity-0 group-hover:opacity-100`)
- Botão "Gerir" → abre `TemplateModal` completo

## `bloquearEnvio`

Quando `true`, input fica desabilitado e placeholder exibe "Apenas leitura...". Ocorre quando outro atendente já assumiu o paciente e o usuário atual não é admin/gerente.

## Atalho de teclado

`Enter` envia a mensagem. `Shift+Enter` adiciona nova linha.
