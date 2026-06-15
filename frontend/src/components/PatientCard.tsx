import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, MessageSquare, User, CreditCard, MapPin, XCircle, CalendarDays, RefreshCw, Lock, SunMedium, Stethoscope, Edit2, Flame, History } from 'lucide-react';
import type { Agendamento } from '../types';
import { formatarDataBr, formatarHoraBr, formatarHora, getUrgencia, getAvatarCor } from '../utils/helpers';
import { useApp } from '../context/AppContext';

interface Props {
  item: Agendamento;
  onChat: (item: Agendamento) => void;
  onAgendar: (item: Agendamento, isEdicao?: boolean) => void;
  onCancelar: (item: Agendamento) => void;
  onAssumir: (id: number) => void;
  onDevolver: (id: number) => void;
  onFinalizar: (id: number) => void;
  onTimeline: (item: Agendamento) => void;
}

function useTimerVivo(dataCriacao: string, ativo: boolean) {
  const [tempo, setTempo] = useState('');
  useEffect(() => {
    if (!ativo) return;
    const atualizar = () => {
      const diff = Math.floor((Date.now() - new Date(dataCriacao).getTime()) / 1000);
      if (diff < 60) setTempo(`${diff}s`);
      else if (diff < 3600) setTempo(`${Math.floor(diff / 60)}min ${diff % 60}s`);
      else setTempo(`${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}min`);
    };
    atualizar();
    const t = setInterval(atualizar, 1000);
    return () => clearInterval(t);
  }, [dataCriacao, ativo]);
  return tempo;
}

export default function PatientCard({ item, onChat, onAgendar, onCancelar, onAssumir, onDevolver, onFinalizar, onTimeline }: Props) {
  const { sessao } = useApp();
  const podeEditar = sessao?.user.nome === item.atendente_nome || sessao?.user.papel === 'admin' || sessao?.user.papel === 'gerente';
  const MEDICO_IGNORAR = ['qualquer', 'indiferente', 'a confirmar'];
  const medicoRaw = (['AGENDADO', 'FINALIZADO'].includes(item.status_atendimento) && item.medico_final) ? item.medico_final : (item.nome_medico || '');
  const medicoExibir = MEDICO_IGNORAR.includes(medicoRaw.toLowerCase()) ? '' : medicoRaw;
  const urgencia = getUrgencia(item.data_criacao);
  const isPendente = item.status_atendimento === 'PENDENTE';
  const timerVivo = useTimerVivo(item.data_criacao, isPendente);
  const avatarCor = getAvatarCor(item.nome_paciente);

  const corBorda = isPendente
    ? urgencia === 'alta' ? 'border-red-300 shadow-red-50' : urgencia === 'media' ? 'border-amber-200' : 'border-slate-200'
    : 'border-slate-200';

  const corBarra = isPendente
    ? urgencia === 'alta' ? 'bg-gradient-to-b from-red-500 to-orange-500' : urgencia === 'media' ? 'bg-amber-400' : 'bg-amber-300'
    : item.status_atendimento === 'EM ATENDIMENTO' ? 'bg-gradient-to-b from-amber-400 to-orange-400 animate-pulse'
    : item.status_atendimento === 'AGENDADO' ? 'bg-gradient-to-b from-emerald-500 to-teal-500'
    : item.status_atendimento === 'FINALIZADO' ? 'bg-indigo-500' : 'bg-slate-300';

  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border transition-all hover:shadow-xl hover:-translate-y-1 relative flex flex-col group ${corBorda}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${corBarra}`} />

      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-full ${avatarCor} text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-sm`}>
            {item.nome_paciente.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 leading-tight truncate">{item.nome_paciente}</h3>
            {item.tipo_consulta && (
              <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${item.tipo_consulta.toLowerCase().includes('cancelamento') ? 'bg-red-100 text-red-700' : item.tipo_consulta.toLowerCase().includes('retorno') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                {item.tipo_consulta.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {isPendente && urgencia !== 'normal' && (
            <Flame size={15} className={urgencia === 'alta' ? 'text-red-500 animate-pulse' : 'text-amber-400'} />
          )}
          <button onClick={() => onTimeline(item)}
            className="p-1.5 text-slate-300 hover:text-[#005088] hover:bg-slate-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            title="Ver histórico">
            <History size={14} />
          </button>
        </div>
      </div>

      {/* Timer ao vivo */}
      {isPendente && (
        <div className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg mb-3 tabular-nums ${urgencia === 'alta' ? 'bg-red-50 text-red-600 border border-red-200' : urgencia === 'media' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
          <Clock size={11} className={urgencia === 'alta' ? 'animate-pulse' : ''} />
          {timerVivo} na fila
        </div>
      )}

      <div className="space-y-1 text-xs border-l-2 border-slate-100 pl-2.5 mb-4">
        <p className="text-slate-600"><span className="text-slate-400">CPF:</span> {item.cpf_paciente || 'N/A'}</p>
        {item.nascimento_paciente && <p className="text-slate-600"><span className="text-slate-400">Nasc:</span> {formatarDataBr(item.nascimento_paciente)}</p>}
        <p className="text-slate-600"><span className="text-slate-400">Entrada:</span> {formatarHora(item.data_criacao)}</p>
      </div>

      {item.para_terceiro && (
        <span className="inline-block mb-3 bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-100">Por: {item.nome_titular}</span>
      )}

      {item.atendente_nome && (
        <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1.5 rounded-lg">
          <div className={`w-5 h-5 rounded-full ${getAvatarCor(item.atendente_nome)} text-white flex items-center justify-center text-[9px] font-extrabold shrink-0`}>
            {item.atendente_nome.substring(0, 1)}
          </div>
          {item.atendente_nome}
        </div>
      )}

      {['AGENDADO', 'FINALIZADO'].includes(item.status_atendimento) && item.data_consulta && (
        <div className={`border rounded-xl p-3 mb-4 text-center ${item.status_atendimento === 'FINALIZADO' ? 'bg-indigo-50 border-indigo-100' : 'bg-emerald-50 border-emerald-100'}`}>
          <p className={`text-[9px] font-extrabold uppercase tracking-widest mb-1 ${item.status_atendimento === 'FINALIZADO' ? 'text-indigo-500' : 'text-emerald-500'}`}>
            {item.status_atendimento === 'FINALIZADO' ? '✓ Realizada' : '✓ Confirmada'}
          </p>
          <p className={`text-sm font-extrabold flex items-center justify-center gap-1.5 ${item.status_atendimento === 'FINALIZADO' ? 'text-indigo-900' : 'text-emerald-900'}`}>
            <CalendarDays size={14} /> {formatarDataBr(item.data_consulta)} · {formatarHoraBr(item.hora_consulta)}
          </p>
        </div>
      )}

      {item.status_atendimento === 'CANCELADO' && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
          <p className="text-[9px] text-red-500 font-extrabold uppercase tracking-widest mb-1">Cancelado</p>
          <p className="text-xs font-bold text-red-900">{item.data_cancelamento ? formatarHora(item.data_cancelamento) : '—'}</p>
          <p className="text-xs text-red-700 italic mt-1">"{item.observacoes || 'Sem justificativa'}"</p>
        </div>
      )}

      <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs mb-4 flex-grow">
        {item.periodo_atendimento && <div className="flex items-center gap-2 text-slate-700"><SunMedium size={13} className="text-amber-500" /><span className="font-semibold">{item.periodo_atendimento}</span></div>}
        {medicoExibir && <div className="flex items-center gap-2 text-slate-700"><Stethoscope size={13} className="text-blue-500" /><span className="font-semibold">{medicoExibir}</span></div>}
        <div className="flex items-center gap-2 text-slate-700"><MapPin size={13} className="text-slate-400" /><span className="font-semibold">{item.unidade}</span></div>
        <div className="flex items-center gap-2 text-slate-700"><CreditCard size={13} className="text-slate-400" /><span className="font-semibold">{item.pagamento}</span></div>
      </div>

      <div className="space-y-2 mt-auto">
        {item.status_atendimento === 'PENDENTE' && (
          <div className="flex gap-2">
            <button onClick={() => onChat(item)} className="p-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"><MessageSquare size={17} /></button>
            <button onClick={() => onAssumir(item.id)} className="flex-1 bg-gradient-to-r from-[#005088] to-[#003a66] hover:opacity-90 text-white py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all hover:shadow-[#005088]/30">Assumir Ficha</button>
          </div>
        )}
        {item.status_atendimento === 'EM ATENDIMENTO' && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button onClick={() => onChat(item)} className="p-2.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl transition-colors border border-amber-100"><MessageSquare size={17} /></button>
              <button disabled={!podeEditar} onClick={() => podeEditar && onAgendar(item)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${podeEditar ? 'bg-gradient-to-r from-[#11caa0] to-[#0e9f7e] text-white shadow-sm hover:shadow-[#11caa0]/25' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                {podeEditar ? 'Agendar' : <><Lock size={13} /> Bloqueado</>}
              </button>
              <button disabled={!podeEditar} onClick={() => podeEditar && onCancelar(item)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${podeEditar ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-colors' : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'}`}>
                Cancelar
              </button>
            </div>
            <button disabled={!podeEditar} onClick={() => podeEditar && onDevolver(item.id)}
              className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${podeEditar ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
              <RefreshCw size={13} /> Devolver à Fila
            </button>
            <button disabled={!podeEditar} onClick={() => podeEditar && onFinalizar(item.id)}
              className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${podeEditar ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
              <CheckCircle2 size={16} /> Finalizar Atendimento
            </button>
          </div>
        )}
        {item.status_atendimento === 'AGENDADO' && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button onClick={() => onChat(item)} className="p-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"><MessageSquare size={17} /></button>
              <button disabled={!podeEditar} onClick={() => podeEditar && onAgendar(item, true)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 ${podeEditar ? 'bg-white border border-blue-200 text-blue-600 hover:bg-blue-50' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                {podeEditar ? <><Edit2 size={13} /> Remarcar</> : <><Lock size={12} /> Bloqueado</>}
              </button>
              <button disabled={!podeEditar} onClick={() => podeEditar && onCancelar(item)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold ${podeEditar ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-colors' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                Cancelar
              </button>
            </div>
            <button disabled={!podeEditar} onClick={() => podeEditar && onFinalizar(item.id)}
              className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${podeEditar ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
              <CheckCircle2 size={17} /> Concluir Consulta
            </button>
          </div>
        )}
        {item.status_atendimento === 'FINALIZADO' && (
          <button onClick={() => onChat(item)} className="w-full bg-slate-100 text-slate-600 hover:bg-slate-200 py-3 rounded-xl text-sm font-bold flex justify-center gap-2 transition-colors">
            <MessageSquare size={17} /> Ver Histórico
          </button>
        )}
      </div>
    </div>
  );
}
