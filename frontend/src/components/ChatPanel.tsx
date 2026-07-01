import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, XCircle, FileText, ChevronDown, ChevronUp, Settings2, Edit2, Trash2, RefreshCw, Send, Paperclip, CheckCircle2, CalendarDays, Bot, Lock, PanelRight, ArrowRight, User } from 'lucide-react';
import type { Agendamento, ModeloMensagem, MensagemChat, PacienteChat, Lead } from '../types';
import { useApp } from '../context/AppContext';
import { useProfilePic } from '../hooks/useProfilePic';
import { AcoesMenu } from './PatientCard';

function base64ToBlob(b64: string, mime: string): string {
  try {
    // Strip data URL prefix se existir
    const raw = b64.includes(',') ? b64.split(',')[1] : b64;
    // URL-safe base64 → standard base64 + remove espaços/quebras
    const std = raw.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
    // Padding
    const padded = std + '='.repeat((4 - std.length % 4) % 4);
    const bin = atob(padded);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([arr], { type: mime }));
  } catch (e) {
    console.error('base64ToBlob falhou:', e);
    return '';
  }
}

function AudioMessage({ base64, mimetype }: { base64: string; mimetype: string }) {
  const src = useMemo(() => base64ToBlob(base64, mimetype), [base64, mimetype]);
  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);
  return <audio controls src={src} className="max-w-[280px] rounded-xl" />;
}

function VideoMessage({ base64, mimetype }: { base64: string; mimetype: string }) {
  const src = useMemo(() => base64ToBlob(base64, mimetype), [base64, mimetype]);
  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);
  return <video controls src={src} className="max-w-[280px] rounded-xl" />;
}

// Extrai o texto exibível de uma mensagem, aplicando os filtros de blocos N8N.
// Retorna null quando a mensagem inteira deve ser ocultada (echo, vazia, JSON puro).
function extrairTextoFinal(msg: MensagemChat, mensagens: MensagemChat[], idx: number): string | null {
  // Oculta echo N8N: paciente que repete exatamente o que o bot acabou de dizer
  if (msg.origem === 'paciente' && idx > 0) {
    const prev = mensagens[idx - 1];
    if (prev.origem === 'ia_ou_recepcao') {
      const prevTexto = prev.texto.split('$$$')[0].trim();
      if (msg.texto.trim() === prevTexto) return null;
    }
  }
  // Padrões que extraem só o valor e ignoram o resto da mensagem
  const msgOriginalMatch = msg.texto.match(/\[Mensagem original:\s*([\s\S]*?)\]/);
  const aceitoRaw = !msgOriginalMatch && msg.texto.match(/\[[^\]]*ACEITO:\s*([^\]]+)\]/);
  // Se o conteúdo do ACEITO tiver conv=, extrai só o valor do conv
  const aceitoMatch = aceitoRaw
    ? { val: aceitoRaw[1].match(/conv="([^"]+)"/) ? aceitoRaw[1].match(/conv="([^"]+)"/)![1] : aceitoRaw[1].trim() }
    : null;
  const inicioColetaMatch = !msgOriginalMatch && !aceitoRaw && msg.texto.match(/\[INICIO COLETA:.*?paciente escolheu\s+"([^"]+)"/s);
  // Só usa Responder EXATAMENTE se ele estiver FORA de um bloco [...]
  const textoSemBlocos = msg.texto.replace(/\[[^\]]*\]/g, '');
  const responderExatamenteMatch = !msgOriginalMatch && !aceitoRaw && !inicioColetaMatch
    && textoSemBlocos.includes('Responder EXATAMENTE:')
    && msg.texto.match(/Responder EXATAMENTE:\s*"([\s\S]*?)"/);
  const convMatch = !msgOriginalMatch && !aceitoRaw && !inicioColetaMatch && !responderExatamenteMatch && msg.texto.match(/conv="([^"]+)"/);

  // Strip N8N blocks ANTES do split em $$$, pois $$$ pode estar dentro do bloco
  const textoFinal = msgOriginalMatch
    ? msgOriginalMatch[1].trim()
    : aceitoMatch
    ? aceitoMatch.val
    : inicioColetaMatch
    ? inicioColetaMatch[1].trim()
    : responderExatamenteMatch
    ? responderExatamenteMatch[1].trim()
    : convMatch
    ? convMatch[1].trim()
    : msg.texto
        .replace(/\[[A-Z][A-Z0-9_]+\][\s\S]*?\[\/[A-Z_]+\]/g, '')
        .replace(/\[[^\]:]+:[^\]]*\]/g, '')
        .replace(/\[[A-Z][A-Z0-9_]+\]/g, '')
        .split('$$$')[0].trim();
  if (!textoFinal) return null;
  try { if (textoFinal.startsWith('{') && JSON.parse(textoFinal)) return null; } catch { /* não é JSON */ }
  return textoFinal;
}

function labelSeparadorData(d: Date): string {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  const dia = new Date(d); dia.setHours(0, 0, 0, 0);
  if (dia.getTime() === hoje.getTime()) return 'Hoje';
  if (dia.getTime() === ontem.getTime()) return 'Ontem';
  return dia.toLocaleDateString('pt-BR', dia.getFullYear() === hoje.getFullYear() ? { day: '2-digit', month: 'long' } : { day: '2-digit', month: 'long', year: 'numeric' });
}

function SeparadorData({ data }: { data: Date }) {
  return (
    <div className="flex justify-center my-2">
      <span className="bg-white/80 text-slate-500 text-[11px] font-bold px-3 py-1 rounded-lg shadow-sm">{labelSeparadorData(data)}</span>
    </div>
  );
}

interface Props {
  pacienteAtivoChat: PacienteChat;
  mensagens: MensagemChat[];
  novaMensagem: string; setNovaMensagem: (v: string) => void;
  enviandoMensagem: boolean;
  digitando: boolean;
  modelos: ModeloMensagem[];
  dropdownModelosAberto: boolean; setDropdownModelosAberto: (v: boolean) => void;
  onClose: () => void;
  onEnviar: (e: React.FormEvent) => void;
  onEnviarMidia: (file: File) => void;
  enviandoMidia?: boolean;
  onInterromperRobo: (telefone: string) => void;
  onReativarRobo?: (telefone: string) => void;
  onAbrirModelos: () => void;
  onEditarModelo: (m: ModeloMensagem) => void;
  onRemoverModelo: (id: number) => void;
  // Ticket associado (só existe quando o chat é aberto de dentro da caixa de
  // entrada "Atendimentos" — Triagem/Recuperação de Leads não têm ticket ainda)
  agendamento?: Agendamento | null;
  onAssumir?: (id: number) => void;
  onAgendar?: (item: Agendamento, isEdicao?: boolean) => void;
  onCancelar?: (item: Agendamento) => void;
  onDevolver?: (id: number) => void;
  onFinalizar?: (id: number) => void;
  // Painel de dados do paciente (Perfil/Histórico/Agendamentos/Observações) — fica escondido por padrão
  perfilAberto?: boolean;
  onTogglePerfil?: () => void;
  // Lead ainda em triagem com a IA (sem ticket) — mutuamente exclusivo com `agendamento`
  leadTriagem?: Lead | null;
  onCriarFicha?: (lead: Lead) => void;
  onDescartarLead?: (id: number) => void;
}

export default function ChatPanel({ pacienteAtivoChat, mensagens, novaMensagem, setNovaMensagem, enviandoMensagem, digitando, modelos, dropdownModelosAberto, setDropdownModelosAberto, onClose, onEnviar, onEnviarMidia, enviandoMidia, onInterromperRobo, onReativarRobo, onAbrirModelos, onEditarModelo, onRemoverModelo, agendamento, onAssumir, onAgendar, onCancelar, onDevolver, onFinalizar, perfilAberto, onTogglePerfil, leadTriagem, onCriarFicha, onDescartarLead }: Props) {
  const { sessao } = useApp();
  const podeEditar = !agendamento || ['AGENDADO', 'CONFIRMADO', 'EM ATENDIMENTO'].includes(agendamento.status_atendimento) || sessao?.user.nome === agendamento.atendente_nome || sessao?.user.papel === 'admin' || sessao?.user.papel === 'gerente';
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isAdmin = sessao?.user.papel === 'admin' || sessao?.user.papel === 'gerente';
  const fotoPerfil = useProfilePic(pacienteAtivoChat.telefone);
  const [fotoErro, setFotoErro] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensagens]);

  // Auto-cresce o campo de texto conforme o conteúdo (igual WhatsApp), até um limite
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [novaMensagem]);

  const slashQuery = novaMensagem.startsWith('/') ? novaMensagem.slice(1).toLowerCase() : null;
  const modelosSlash = slashQuery === null ? [] : modelos.filter(m => m.titulo.toLowerCase().includes(slashQuery) || m.texto.toLowerCase().includes(slashQuery));
  useEffect(() => { setSlashIndex(0); }, [slashQuery]);

  const selecionarModeloSlash = (m: ModeloMensagem) => { setNovaMensagem(m.texto); textareaRef.current?.focus(); };

  const mensagensVisiveis = useMemo(() => {
    const out: { msg: MensagemChat; textoFinal: string }[] = [];
    mensagens.forEach((msg, idx) => {
      const textoFinal = extrairTextoFinal(msg, mensagens, idx);
      if (textoFinal !== null) out.push({ msg, textoFinal });
    });
    return out;
  }, [mensagens]);

  return (
    <aside className="flex-1 h-full min-w-0 bg-white flex flex-col animate-slide-up">
      <div className="p-4 bg-gradient-to-r from-[#005088] to-[#003a66] text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {fotoPerfil && !fotoErro ? (
            <img src={fotoPerfil} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-white/30 shrink-0" onError={() => setFotoErro(true)} />
          ) : (
            <div className="w-11 h-11 bg-white/15 border border-white/20 rounded-full flex items-center justify-center font-extrabold text-base shrink-0">
              {pacienteAtivoChat.nome_paciente?.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-extrabold truncate">{pacienteAtivoChat.nome_paciente}</p>
            <p className="text-[11px] text-[#11caa0] font-bold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-[#11caa0] rounded-full animate-pulse inline-block" /> Chat em Tempo Real
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!pacienteAtivoChat.bloquearEnvio ? (
            <button onClick={() => onInterromperRobo(pacienteAtivoChat.telefone)}
              className="bg-orange-500/80 hover:bg-orange-500 text-white text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg flex items-center gap-1 uppercase tracking-wider transition-colors">
              <XCircle size={13} /> Pausar Bot
            </button>
          ) : onReativarRobo && (
            <button onClick={() => onReativarRobo(pacienteAtivoChat.telefone)}
              className="bg-blue-500/80 hover:bg-blue-500 text-white text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg flex items-center gap-1 uppercase tracking-wider transition-colors">
              <Bot size={13} /> Reativar Bot
            </button>
          )}
          {onTogglePerfil && agendamento && (
            <button onClick={onTogglePerfil} title={perfilAberto ? 'Esconder dados do paciente' : 'Mostrar dados do paciente'}
              className={`p-2 rounded-xl transition-colors ${perfilAberto ? 'bg-white/25' : 'hover:bg-white/15'}`}>
              <PanelRight size={18} />
            </button>
          )}
          <button onClick={() => { onClose(); setDropdownModelosAberto(false); }} className="p-2 hover:bg-white/15 rounded-xl transition-colors"><X size={19} /></button>
        </div>
      </div>

      {agendamento && (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0 overflow-x-auto scrollbar-hide">
          {agendamento.status_atendimento === 'PENDENTE' && onAssumir && (
            <button onClick={() => onAssumir(agendamento.id)}
              className="bg-gradient-to-r from-[#005088] to-[#003a66] hover:opacity-90 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all shrink-0">
              Assumir Ficha
            </button>
          )}
          {agendamento.status_atendimento === 'EM ATENDIMENTO' && onAgendar && (
            <>
              <button disabled={!podeEditar} onClick={() => podeEditar && onAgendar(agendamento)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${podeEditar ? 'bg-gradient-to-r from-[#11caa0] to-[#0e9f7e] text-white shadow-sm' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                {podeEditar ? <><CalendarDays size={13} /> Agendar</> : <><Lock size={12} /> Bloqueado</>}
              </button>
              {onFinalizar && (
                <button disabled={!podeEditar} onClick={() => podeEditar && onFinalizar(agendamento.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${podeEditar ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                  <CheckCircle2 size={13} /> Finalizar
                </button>
              )}
              <AcoesMenu disabled={!podeEditar} items={[
                ...(onDevolver ? [{ label: 'Devolver à Fila', icon: <RefreshCw size={14} />, onClick: () => onDevolver(agendamento.id) }] : []),
                ...(onCancelar ? [{ label: 'Cancelar', icon: <XCircle size={14} />, onClick: () => onCancelar(agendamento), perigo: true }] : []),
              ]} />
            </>
          )}
          {(agendamento.status_atendimento === 'AGENDADO' || agendamento.status_atendimento === 'CONFIRMADO') && (
            <>
              {onAgendar && (
                <button disabled={!podeEditar} onClick={() => podeEditar && onAgendar(agendamento, true)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${podeEditar ? 'bg-white border border-blue-200 text-blue-600' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                  <Edit2 size={13} /> Remarcar
                </button>
              )}
              {onFinalizar && (
                <button disabled={!podeEditar} onClick={() => podeEditar && onFinalizar(agendamento.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${podeEditar ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                  <CheckCircle2 size={13} /> Concluir Consulta
                </button>
              )}
              {onCancelar && <AcoesMenu disabled={!podeEditar} items={[{ label: 'Cancelar', icon: <XCircle size={14} />, onClick: () => onCancelar(agendamento), perigo: true }]} />}
            </>
          )}
        </div>
      )}

      {leadTriagem && (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0 overflow-x-auto scrollbar-hide">
          {leadTriagem.status_robo === 'Robô' ? (
            <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5"><Bot size={14} /> Conversando com a IA — ainda sem ficha de atendimento</span>
          ) : (
            <>
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mr-auto shrink-0"><User size={14} /> Triagem pausada — aguardando decisão</span>
              {onCriarFicha && (
                <button onClick={() => onCriarFicha(leadTriagem)}
                  className="bg-gradient-to-r from-[#005088] to-[#003a66] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:opacity-90 transition-all shrink-0 flex items-center gap-1.5">
                  <ArrowRight size={13} /> Criar Ficha
                </button>
              )}
              {onDescartarLead && (
                <button onClick={() => onDescartarLead(leadTriagem.id)}
                  className="bg-white border border-red-200 text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors shrink-0" title="Descartar contacto">
                  <Trash2 size={14} />
                </button>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#eae6df] custom-scrollbar">
        {leadTriagem && leadTriagem.status_robo === 'Robô' && (
          <div className="flex justify-center">
            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
              <Bot size={12} /> Conversando com a IA
            </span>
          </div>
        )}
        {mensagensVisiveis.map(({ msg, textoFinal }, i) => {
          const dataAtual = new Date(msg.data);
          const dataAnterior = i > 0 ? new Date(mensagensVisiveis[i - 1].msg.data) : null;
          const mudouDia = !dataAnterior || dataAtual.toDateString() !== dataAnterior.toDateString();
          return (
          <React.Fragment key={i}>
            {mudouDia && <SeparadorData data={dataAtual} />}
            <div className={`flex ${msg.origem === 'sistema' ? 'justify-center' : msg.origem === 'paciente' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] text-[13px] shadow-sm ${msg.origem === 'sistema' ? 'bg-orange-100 text-orange-900 rounded-xl px-4 py-2 text-xs font-bold border border-orange-200' : msg.origem === 'paciente' ? 'bg-white text-slate-800 rounded-2xl rounded-tl-md px-4 py-3' : 'bg-[#dcf8c6] text-slate-800 rounded-2xl rounded-tr-md px-4 py-3'}`}>
                {msg.mediaBase64 && msg.mediaMimetype?.startsWith('image/') ? (
                  <img
                    src={base64ToBlob(msg.mediaBase64, msg.mediaMimetype)}
                    alt={textoFinal}
                    className="max-w-[240px] rounded-xl mb-1 cursor-pointer"
                    onClick={() => window.open(base64ToBlob(msg.mediaBase64!, msg.mediaMimetype!))}
                  />
                ) : msg.mediaBase64 && msg.mediaMimetype?.startsWith('audio/') ? (
                  <AudioMessage base64={msg.mediaBase64} mimetype={msg.mediaMimetype} />
                ) : msg.mediaBase64 && msg.mediaMimetype?.startsWith('video/') ? (
                  <VideoMessage base64={msg.mediaBase64} mimetype={msg.mediaMimetype} />
                ) : msg.mediaBase64 && msg.mediaMimetype === 'application/pdf' ? (
                  <a
                    href={`data:application/pdf;base64,${msg.mediaBase64}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[#005088] font-bold underline"
                  >
                    📄 {textoFinal.replace(/^📄 /, '')}
                  </a>
                ) : msg.mediaBase64 ? (
                  <a
                    href={`data:${msg.mediaMimetype};base64,${msg.mediaBase64}`}
                    download={textoFinal.replace(/^[📷🎵🎥📄📎] /, '')}
                    className="flex items-center gap-2 text-[#005088] font-bold underline"
                  >
                    {textoFinal}
                  </a>
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed font-medium">{textoFinal}</p>
                )}
                {msg.origem !== 'sistema' && (
                  <span className="text-[10px] text-slate-400/80 block mt-1.5 text-right font-bold">
                    {dataAtual.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          </React.Fragment>
          );
        })}
        {digitando && (
          <div className="flex justify-end">
            <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-md px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="bg-white border-t border-slate-100 p-3 space-y-2 shrink-0">
        <div className="relative">
          <button onClick={() => setDropdownModelosAberto(!dropdownModelosAberto)}
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 transition-all border border-slate-200">
            <FileText size={14} className="text-[#11caa0]" />
            Modelos
            {dropdownModelosAberto ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
          {dropdownModelosAberto && (
            <div className="absolute bottom-full mb-2 left-0 w-[350px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-[70] max-h-72 overflow-y-auto custom-scrollbar animate-slide-up">
              <div className="p-3 border-b bg-slate-50 flex justify-between items-center sticky top-0 z-10">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Escolha um modelo</span>
                {isAdmin && (
                  <button onClick={onAbrirModelos} className="text-[10px] font-extrabold text-[#11caa0] flex items-center gap-1 hover:underline">
                    <Settings2 size={11} /> Gerir
                  </button>
                )}
              </div>
              {modelos.length === 0
                ? <p className="p-4 text-xs text-slate-400 italic text-center">Nenhum modelo cadastrado.</p>
                : modelos.map(m => (
                  <div key={m.id} className="group flex items-center border-b last:border-0 border-slate-100 hover:bg-slate-50 transition-colors">
                    <button onClick={() => { setNovaMensagem(m.texto); setDropdownModelosAberto(false); }} className="flex-1 text-left p-3 min-w-0">
                      <p className="text-xs font-extrabold text-[#005088] truncate">{m.titulo}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{m.texto}</p>
                    </button>
                    {isAdmin && (
                      <div className="flex gap-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEditarModelo(m)} className="p-1.5 text-slate-400 hover:text-blue-500"><Edit2 size={13} /></button>
                        <button onClick={() => onRemoverModelo(m.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

        <form onSubmit={onEnviar} className="flex items-end gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
            onChange={e => { const f = e.target.files?.[0]; if (f) { onEnviarMidia(f); e.target.value = ''; } }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={pacienteAtivoChat.bloquearEnvio || enviandoMidia}
            title="Enviar arquivo ou imagem"
            className="p-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl disabled:opacity-50 transition-all shrink-0">
            {enviandoMidia ? <RefreshCw className="animate-spin" size={18} /> : <Paperclip size={18} />}
          </button>
          <div className="relative flex-1">
            {slashQuery !== null && (
              <div className="absolute bottom-full mb-2 left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl z-[70] max-h-56 overflow-y-auto custom-scrollbar animate-slide-up">
                {modelosSlash.length === 0 ? (
                  <p className="p-3 text-xs text-slate-400 italic text-center">Nenhum modelo encontrado para "/{slashQuery}".</p>
                ) : modelosSlash.map((m, i) => (
                  <button type="button" key={m.id} onClick={() => selecionarModeloSlash(m)}
                    onMouseEnter={() => setSlashIndex(i)}
                    className={`w-full text-left p-3 border-b last:border-0 border-slate-100 transition-colors ${i === slashIndex ? 'bg-[#11caa0]/10' : 'hover:bg-slate-50'}`}>
                    <p className="text-xs font-extrabold text-[#005088] truncate">/{m.titulo}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{m.texto}</p>
                  </button>
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              rows={1}
              value={novaMensagem}
              onChange={e => setNovaMensagem(e.target.value)}
              onKeyDown={e => {
                if (slashQuery !== null && modelosSlash.length > 0) {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIndex(i => Math.min(i + 1, modelosSlash.length - 1)); return; }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIndex(i => Math.max(i - 1, 0)); return; }
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); selecionarModeloSlash(modelosSlash[slashIndex]); return; }
                  if (e.key === 'Escape') { e.preventDefault(); setNovaMensagem(''); return; }
                }
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnviar(e as unknown as React.FormEvent); }
              }}
              placeholder={pacienteAtivoChat.bloquearEnvio ? 'Apenas leitura...' : 'Digite / para usar um modelo · Enter para enviar · Shift+Enter nova linha'}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-[#11caa0] focus:ring-2 focus:ring-[#11caa0]/20 text-sm font-medium disabled:bg-slate-100 disabled:cursor-not-allowed transition-all placeholder-slate-400 resize-none custom-scrollbar leading-relaxed"
              disabled={pacienteAtivoChat.bloquearEnvio} />
          </div>
          <button type="submit" disabled={!novaMensagem.trim() || enviandoMensagem || pacienteAtivoChat.bloquearEnvio}
            className="p-3.5 bg-gradient-to-r from-[#005088] to-[#003a66] text-white rounded-2xl hover:opacity-90 disabled:opacity-50 transition-all shadow-md shrink-0">
            {enviandoMensagem ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </aside>
  );
}
