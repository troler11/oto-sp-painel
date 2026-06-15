import React from 'react';
import { X, CalendarDays, Save } from 'lucide-react';
import { Agendamento } from '../../types';
import { formatarDataBr } from '../../utils/helpers';

interface Props {
  paciente: Agendamento;
  data: string; setData: (v: string) => void;
  hora: string; setHora: (v: string) => void;
  medico: string; setMedico: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function ScheduleModal({ paciente, data, setData, hora, setHora, medico, setMedico, onSubmit, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
        <div className="bg-gradient-to-r from-[#11caa0] to-[#0e9f7e] p-5 flex justify-between items-center text-white">
          <h2 className="font-extrabold flex items-center gap-2"><CalendarDays size={20} /> Confirmar Consulta</h2>
          <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-xl transition-colors"><X size={19} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="font-extrabold text-lg text-[#005088]">{paciente.nome_paciente}</p>
            <div className="flex gap-2 text-xs text-slate-500 mt-1">
              <span className="font-semibold">{paciente.unidade}</span>
              {paciente.periodo_atendimento && <span className="text-amber-600 font-bold">· Prefere {paciente.periodo_atendimento}</span>}
            </div>
          </div>
          <div>
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">Médico(a) *</label>
            <input type="text" required value={medico} onChange={e => setMedico(e.target.value)}
              placeholder="Digite o nome do médico..."
              className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-[#11caa0] focus:ring-2 focus:ring-[#11caa0]/20 font-semibold text-sm transition-all" />
          </div>
          <div>
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">Data *</label>
            <input type="date" required value={data} onChange={e => setData(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-[#11caa0] font-semibold text-sm" />
          </div>
          <div>
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
              Horário * {hora && <span className="text-[#11caa0] normal-case font-semibold">· {hora} selecionado</span>}
            </label>
            <input type="time" required value={hora} onChange={e => setHora(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-[#11caa0] font-semibold text-sm" />
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white py-3.5 rounded-xl font-extrabold transition-all shadow-md hover:shadow-emerald-200 flex items-center justify-center gap-2">
            <Save size={18} /> Salvar na Agenda
          </button>
        </form>
      </div>
    </div>
  );
}
