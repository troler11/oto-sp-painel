import React, { useState, useRef, useEffect } from 'react';
import { X, XCircle, FileText, ChevronDown, ChevronUp, Settings2, Edit2, Trash2, RefreshCw, Send, Paperclip } from 'lucide-react';
import type { ModeloMensagem, MensagemChat, PacienteChat } from '../types';
import { useApp } from '../context/AppContext';
import { useProfilePic } from '../hooks/useProfilePic';

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
  onAbrirModelos: () => void;
  onEditarModelo: (m: ModeloMensagem) => void;
  onRemoverModelo: (id: number) => void;
}

export default function ChatPanel({ pacienteAtivoChat, mensagens, novaMensagem, setNovaMensagem, enviandoMensagem, digitando, modelos, dropdownModelosAberto, setDropdownModelosAberto, onClose, onEnviar, onEnviarMidia, enviandoMidia, onInterromperRobo, onAbrirModelos, onEditarModelo, onRemoverModelo }: Props) {
  const { sessao } = useApp();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = sessao?.user.papel === 'admin' || sessao?.user.papel === 'gerente';
  const fotoPerfil = useProfilePic(pacienteAtivoChat.telefone);
  const [fotoErro, setFotoErro] = useState(false);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensagens]);

  return (
    <aside className="fixed right-0 top-0 h-screen w-[400px] bg-white border-l border-slate-200 shadow-2xl flex flex-col z-[60] animate-slide-up">
      <div className="p-4 bg-gradient-to-r from-[#005088] to-[#003a66] text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          {fotoPerfil && !fotoErro ? (
            <img src={fotoPerfil} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-white/30" onError={() => setFotoErro(true)} />
          ) : (
            <div className="w-11 h-11 bg-white/15 border border-white/20 rounded-full flex items-center justify-center font-extrabold text-base">
              {pacienteAtivoChat.nome_paciente?.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-extrabold truncate w-44">{pacienteAtivoChat.nome_paciente}</p>
            <p className="text-[11px] text-[#11caa0] font-bold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-[#11caa0] rounded-full animate-pulse inline-block" /> Chat em Tempo Real
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!pacienteAtivoChat.bloquearEnvio && (
            <button onClick={() => onInterromperRobo(pacienteAtivoChat.telefone)}
              className="bg-orange-500/80 hover:bg-orange-500 text-white text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg flex items-center gap-1 uppercase tracking-wider transition-colors">
              <XCircle size={13} /> Pausar Bot
            </button>
          )}
          <button onClick={() => { onClose(); setDropdownModelosAberto(false); }} className="p-2 hover:bg-white/15 rounded-xl transition-colors"><X size={19} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#eae6df] custom-scrollbar">
        {mensagens.map((msg, idx) => {
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
          return (
          <div key={idx} className={`flex ${msg.origem === 'sistema' ? 'justify-center' : msg.origem === 'paciente' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] text-[13px] shadow-sm ${msg.origem === 'sistema' ? 'bg-orange-100 text-orange-900 rounded-xl px-4 py-2 text-xs font-bold border border-orange-200' : msg.origem === 'paciente' ? 'bg-white text-slate-800 rounded-2xl rounded-tl-md px-4 py-3' : 'bg-[#dcf8c6] text-slate-800 rounded-2xl rounded-tr-md px-4 py-3'}`}>
              {msg.mediaBase64 && msg.mediaMimetype?.startsWith('image/') ? (
                <img
                  src={`data:${msg.mediaMimetype};base64,${msg.mediaBase64}`}
                  alt={textoFinal}
                  className="max-w-[240px] rounded-xl mb-1 cursor-pointer"
                  onClick={() => window.open(`data:${msg.mediaMimetype};base64,${msg.mediaBase64}`)}
                />
              ) : msg.mediaBase64 && msg.mediaMimetype?.startsWith('audio/') ? (
                <audio
                  controls
                  src={`data:${msg.mediaMimetype};base64,${msg.mediaBase64}`}
                  className="max-w-[280px] rounded-xl"
                />
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
                  download={textoFinal.replace(/^[📷🎵📄📎] /, '')}
                  className="flex items-center gap-2 text-[#005088] font-bold underline"
                >
                  {textoFinal}
                </a>
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed font-medium">{textoFinal}</p>
              )}
              {msg.origem !== 'sistema' && (
                <span className="text-[10px] text-slate-400/80 block mt-1.5 text-right font-bold">
                  {new Date(msg.data).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
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

        <form onSubmit={onEnviar} className="flex items-center gap-2">
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
          <input type="text" value={novaMensagem} onChange={e => setNovaMensagem(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnviar(e as unknown as React.FormEvent); } }}
            placeholder={pacienteAtivoChat.bloquearEnvio ? 'Apenas leitura...' : 'Enter para enviar · Shift+Enter nova linha'}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-[#11caa0] focus:ring-2 focus:ring-[#11caa0]/20 text-sm font-medium disabled:bg-slate-100 disabled:cursor-not-allowed transition-all placeholder-slate-400"
            disabled={pacienteAtivoChat.bloquearEnvio} />
          <button type="submit" disabled={!novaMensagem.trim() || enviandoMensagem || pacienteAtivoChat.bloquearEnvio}
            className="p-3.5 bg-gradient-to-r from-[#005088] to-[#003a66] text-white rounded-2xl hover:opacity-90 disabled:opacity-50 transition-all shadow-md">
            {enviandoMensagem ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </aside>
  );
}
