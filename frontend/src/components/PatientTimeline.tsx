import { X, Clock, User, CalendarDays, CheckCircle2, XCircle, Activity, MessageSquare } from 'lucide-react';
import type { Agendamento } from '../types';
import { formatarHora, formatarDataBr } from '../utils/helpers';

interface Props { paciente: Agendamento; onClose: () => void; }

interface Evento { icon: React.ReactNode; label: string; sub?: string; cor: string; data?: string; }

export default function PatientTimeline({ paciente, onClose }: Props) {
  const eventos: Evento[] = [];

  eventos.push({
    icon: <Activity size={14} />, label: 'Ficha criada pela IA',
    sub: `${paciente.intencao || 'Consulta'} · ${paciente.unidade}`,
    cor: 'bg-blue-500', data: paciente.data_criacao,
  });

  if (paciente.atendente_nome) {
    eventos.push({
      icon: <User size={14} />, label: `Assumido por ${paciente.atendente_nome}`,
      sub: 'Em atendimento',
      cor: 'bg-amber-500', data: paciente.data_atendimento,
    });
  }

  if (['AGENDADO', 'FINALIZADO'].includes(paciente.status_atendimento) && paciente.data_consulta) {
    eventos.push({
      icon: <CalendarDays size={14} />, label: 'Consulta agendada',
      sub: `${formatarDataBr(paciente.data_consulta)} às ${paciente.hora_consulta?.substring(0, 5)} · Dr(a). ${paciente.medico_final || '—'}`,
      cor: 'bg-emerald-500', data: paciente.data_atualizacao,
    });
  }

  if (paciente.status_atendimento === 'FINALIZADO') {
    eventos.push({
      icon: <CheckCircle2 size={14} />, label: 'Consulta realizada',
      sub: 'Atendimento concluído com sucesso',
      cor: 'bg-indigo-500', data: paciente.data_atualizacao,
    });
  }

  if (paciente.status_atendimento === 'CANCELADO') {
    eventos.push({
      icon: <XCircle size={14} />, label: 'Consulta cancelada',
      sub: paciente.observacoes || 'Sem justificativa',
      cor: 'bg-red-500', data: paciente.data_cancelamento,
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
        <div className="bg-gradient-to-r from-[#005088] to-[#003a66] p-5 flex justify-between items-center text-white">
          <div>
            <h2 className="font-extrabold flex items-center gap-2"><Clock size={18} /> Histórico do Paciente</h2>
            <p className="text-[11px] text-blue-200 mt-0.5">{paciente.nome_paciente}</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-xl transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6">
          <div className="bg-slate-50 rounded-xl p-4 mb-5 grid grid-cols-3 gap-3 text-xs">
            <div><p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">CPF</p><p className="font-bold text-slate-700">{paciente.cpf_paciente || '—'}</p></div>
            <div><p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Telefone</p><p className="font-bold text-slate-700">{paciente.telefone}</p></div>
            <div><p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Especialidade</p><p className="font-bold text-slate-700">{paciente.especialidade || '—'}</p></div>
          </div>

          <div className="relative">
            <div className="absolute left-[17px] top-0 bottom-0 w-0.5 bg-slate-200" />
            <div className="space-y-4">
              {eventos.map((ev, i) => (
                <div key={i} className="flex gap-4 relative">
                  <div className={`w-9 h-9 rounded-full ${ev.cor} text-white flex items-center justify-center shrink-0 z-10 shadow-sm`}>
                    {ev.icon}
                  </div>
                  <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="font-extrabold text-slate-800 text-sm">{ev.label}</p>
                    {ev.sub && <p className="text-xs text-slate-500 mt-0.5 italic">{ev.sub}</p>}
                    {ev.data && <p className="text-[10px] text-slate-400 mt-1.5 font-bold">{formatarHora(ev.data)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
