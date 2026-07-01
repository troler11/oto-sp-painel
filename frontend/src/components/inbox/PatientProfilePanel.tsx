import { useEffect, useState } from 'react';
import { IdCard, CalendarDays, Save, Loader2 } from 'lucide-react';
import type { Agendamento } from '../../types';
import { formatarDataBr, formatarHoraBr, formatarHora, getStatusVisual, getUrgencia } from '../../utils/helpers';
import { buildEventosTimeline } from '../PatientTimeline';

interface Props {
  paciente: Agendamento;
  agendamentos: Agendamento[];
  onEditarDados: (item: Agendamento) => void;
  onSalvarObservacoes: (id: number, observacoes: string) => Promise<void>;
}

const ABAS = ['Perfil', 'Histórico', 'Agendamentos', 'Observações'] as const;

export default function PatientProfilePanel({ paciente, agendamentos, onEditarDados, onSalvarObservacoes }: Props) {
  const [aba, setAba] = useState<typeof ABAS[number]>('Perfil');
  const [observacoes, setObservacoes] = useState(paciente.observacoes || '');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { setObservacoes(paciente.observacoes || ''); }, [paciente.id, paciente.observacoes]);

  const outrosTickets = agendamentos.filter(a => a.telefone === paciente.telefone && a.id !== paciente.id)
    .sort((a, b) => new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime());

  const visual = getStatusVisual(paciente.status_atendimento, getUrgencia(paciente.data_criacao));

  const salvar = async () => {
    setSalvando(true);
    try { await onSalvarObservacoes(paciente.id, observacoes); }
    finally { setSalvando(false); }
  };

  return (
    <div className="w-[320px] shrink-0 border-l border-slate-200 bg-white flex flex-col h-full">
      <div className="flex border-b border-slate-100 shrink-0">
        {ABAS.map(a => (
          <button key={a} onClick={() => setAba(a)}
            className={`flex-1 py-2.5 text-[11px] font-extrabold transition-colors border-b-2 ${aba === a ? 'text-[#005088] border-[#005088]' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>
            {a}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {aba === 'Perfil' && (
          <div className="space-y-4">
            <div className="text-center pb-3 border-b border-slate-100">
              <p className="font-extrabold text-slate-800">{paciente.nome_paciente}</p>
              <span className={`inline-block mt-1 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${visual.bg} ${visual.text}`}>{visual.label}</span>
            </div>
            <div className="space-y-2.5 text-xs">
              <div><p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Telefone</p><p className="font-bold text-slate-700">{paciente.telefone}</p></div>
              <div><p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">CPF</p><p className="font-bold text-slate-700">{paciente.cpf_paciente || '—'}</p></div>
              <div><p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Nascimento</p><p className="font-bold text-slate-700">{paciente.nascimento_paciente ? formatarDataBr(paciente.nascimento_paciente) : '—'}</p></div>
              <div><p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Unidade</p><p className="font-bold text-slate-700">{paciente.unidade || '—'}</p></div>
              <div><p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Convênio</p><p className="font-bold text-slate-700">{paciente.pagamento || '—'}</p></div>
              <div><p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Cidade</p><p className="text-slate-400 italic">Em breve</p></div>
              <div><p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Tags</p><p className="text-slate-400 italic">Em breve</p></div>
            </div>
            <button onClick={() => onEditarDados(paciente)}
              className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-xs font-bold transition-colors">
              <IdCard size={14} /> Editar CPF / Nascimento / Convênio
            </button>
          </div>
        )}

        {aba === 'Histórico' && (
          <div className="relative">
            <div className="absolute left-[13px] top-0 bottom-0 w-0.5 bg-slate-200" />
            <div className="space-y-3">
              {buildEventosTimeline(paciente).map((ev, i) => (
                <div key={i} className="flex gap-3 relative">
                  <div className={`w-7 h-7 rounded-full ${ev.cor} text-white flex items-center justify-center shrink-0 z-10 shadow-sm`}>{ev.icon}</div>
                  <div className="flex-1 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                    <p className="font-extrabold text-slate-800 text-xs">{ev.label}</p>
                    {ev.sub && <p className="text-[11px] text-slate-500 mt-0.5 italic">{ev.sub}</p>}
                    {ev.data && <p className="text-[10px] text-slate-400 mt-1 font-bold">{formatarHora(ev.data)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {aba === 'Agendamentos' && (
          <div className="space-y-2">
            {[paciente, ...outrosTickets].filter(t => t.data_consulta).length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">Nenhuma consulta agendada para este contato.</p>
            ) : [paciente, ...outrosTickets].filter(t => t.data_consulta).map(t => (
              <div key={t.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs">
                <p className="font-extrabold text-slate-800 flex items-center gap-1.5"><CalendarDays size={13} /> {formatarDataBr(t.data_consulta!)} · {formatarHoraBr(t.hora_consulta)}</p>
                <p className="text-slate-500 mt-1">Dr(a). {t.medico_final || t.nome_medico || '—'} · {t.unidade}</p>
                <span className={`inline-block mt-1.5 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${getStatusVisual(t.status_atendimento).bg} ${getStatusVisual(t.status_atendimento).text}`}>{getStatusVisual(t.status_atendimento).label}</span>
              </div>
            ))}
            {outrosTickets.length > 0 && (
              <div className="pt-2">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Outros tickets deste contato</p>
                {outrosTickets.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 text-xs">
                    <span className="text-slate-600">{formatarHora(t.data_criacao)}</span>
                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${getStatusVisual(t.status_atendimento).bg} ${getStatusVisual(t.status_atendimento).text}`}>{getStatusVisual(t.status_atendimento).label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {aba === 'Observações' && (
          <div className="space-y-3">
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)}
              placeholder="Notas internas sobre este paciente/atendimento..."
              className="w-full h-40 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-[#11caa0] focus:ring-2 focus:ring-[#11caa0]/20 resize-none" />
            <button onClick={salvar} disabled={salvando}
              className="w-full flex items-center justify-center gap-2 bg-[#005088] hover:bg-[#003a66] disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-bold transition-colors">
              {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar Observações
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
