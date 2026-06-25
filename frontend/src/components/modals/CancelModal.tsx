import React from 'react';
import { X, XCircle } from 'lucide-react';
import { Agendamento } from '../../types';
import { formatarDataBr, formatarHoraBr } from '../../utils/helpers';

interface Props {
  paciente: Agendamento;
  motivo: string; setMotivo: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function CancelModal({ paciente, motivo, setMotivo, onSubmit, onClose }: Props) {
  const isConsulta = Boolean(paciente.data_consulta);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
        <div className={`bg-gradient-to-r ${isConsulta ? 'from-red-500 to-red-600' : 'from-slate-500 to-slate-600'} p-5 flex justify-between items-center text-white`}>
          <h2 className="font-extrabold flex items-center gap-2">
            <XCircle size={20} /> {isConsulta ? 'Cancelar Consulta' : 'Descartar Ticket'}
          </h2>
          <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-xl transition-colors"><X size={19} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className={`${isConsulta ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-200'} p-4 rounded-xl border`}>
            <p className={`font-extrabold text-lg ${isConsulta ? 'text-red-900' : 'text-slate-800'}`}>{paciente.nome_paciente}</p>
            {paciente.data_consulta && (
              <p className="text-red-600 text-sm font-semibold mt-1">
                Agendada para {formatarDataBr(paciente.data_consulta)} às {formatarHoraBr(paciente.hora_consulta)}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">Motivo *</label>
            <textarea required value={motivo} onChange={e => setMotivo(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 resize-none h-24 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 text-sm font-medium"
              placeholder={isConsulta ? 'Descreva o motivo do cancelamento...' : 'Descreva o motivo do descarte...'} />
          </div>
          <button type="submit" className={`w-full bg-gradient-to-r ${isConsulta ? 'from-red-500 to-red-600' : 'from-slate-500 to-slate-600'} hover:opacity-90 text-white py-3.5 rounded-xl font-extrabold shadow-md transition-all`}>
            {isConsulta ? 'Confirmar Cancelamento' : 'Confirmar Descarte'}
          </button>
        </form>
      </div>
    </div>
  );
}
