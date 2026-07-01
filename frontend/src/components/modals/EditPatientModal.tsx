import React, { useState } from 'react';
import { X, Save, Loader2, IdCard } from 'lucide-react';
import type { Agendamento } from '../../types';

interface Props {
  paciente: Agendamento;
  onSubmit: (dados: { cpf_paciente: string; nascimento_paciente: string; pagamento: string }) => Promise<void>;
  onClose: () => void;
}

function maskCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function cpfValido(v: string): boolean {
  const cpf = v.replace(/\D/g, '');
  if (!cpf) return true; // opcional
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (fatorInicial: number) => {
    let soma = 0;
    for (let i = 0; i < fatorInicial - 1; i++) soma += Number(cpf[i]) * (fatorInicial - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(10) === Number(cpf[9]) && digito(11) === Number(cpf[10]);
}

export default function EditPatientModal({ paciente, onSubmit, onClose }: Props) {
  const [cpf, setCpf] = useState(maskCpf(paciente.cpf_paciente || ''));
  const [nascimento, setNascimento] = useState(paciente.nascimento_paciente ? paciente.nascimento_paciente.split('T')[0] : '');
  const [pagamento, setPagamento] = useState(paciente.pagamento || '');
  const [enviando, setEnviando] = useState(false);

  const cpfOk = cpfValido(cpf);
  const podeSalvar = cpfOk && !enviando;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeSalvar) return;
    setEnviando(true);
    try { await onSubmit({ cpf_paciente: cpf, nascimento_paciente: nascimento, pagamento }); }
    finally { setEnviando(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
        <div className="bg-gradient-to-r from-[#005088] to-[#003a66] p-5 flex justify-between items-center text-white">
          <h2 className="font-extrabold flex items-center gap-2"><IdCard size={20} /> Dados Cadastrais</h2>
          <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-xl transition-colors"><X size={19} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="font-extrabold text-lg text-[#005088]">{paciente.nome_paciente}</p>
            <p className="text-xs text-slate-400 mt-1">Preencha ou corrija os dados coletados pelo bot. CPF e nascimento são necessários para sincronizar o agendamento com o iTSaúde.</p>
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">CPF</label>
            <input type="text" value={cpf} onChange={e => setCpf(maskCpf(e.target.value))}
              placeholder="000.000.000-00"
              className={`w-full border rounded-xl p-3 outline-none focus:ring-2 text-sm font-medium ${cpfOk ? 'border-slate-200 focus:border-[#11caa0] focus:ring-[#11caa0]/20' : 'border-red-300 focus:border-red-400 focus:ring-red-100'}`} />
            {!cpfOk && <p className="text-[11px] text-red-500 font-semibold mt-1">CPF inválido.</p>}
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">Data de nascimento</label>
            <input type="date" value={nascimento} onChange={e => setNascimento(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-[#11caa0] focus:ring-2 focus:ring-[#11caa0]/20 text-sm font-medium" />
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">Convênio / Pagamento</label>
            <input type="text" value={pagamento} onChange={e => setPagamento(e.target.value)}
              placeholder="Ex: Particular, Bradesco Saúde..."
              className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-[#11caa0] focus:ring-2 focus:ring-[#11caa0]/20 text-sm font-medium" />
          </div>

          <button type="submit" disabled={!podeSalvar}
            className="w-full bg-gradient-to-r from-[#005088] to-[#003a66] hover:opacity-90 text-white py-3.5 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {enviando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {enviando ? 'Salvando...' : 'Salvar Dados'}
          </button>
        </form>
      </div>
    </div>
  );
}
