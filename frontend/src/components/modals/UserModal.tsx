import React from 'react';
import { X, UserPlus } from 'lucide-react';

interface Props {
  form: { nome: string; email: string; senha: string; papel: string };
  setForm: React.Dispatch<React.SetStateAction<{ nome: string; email: string; senha: string; papel: string }>>;
  msg: { texto: string; tipo: string };
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function UserModal({ form, setForm, msg, onSubmit, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
        <div className="bg-[#005088] p-5 flex justify-between items-center text-white">
          <h2 className="font-extrabold flex items-center gap-2"><UserPlus size={20} /> Nova Conta</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {msg.texto && (
            <div className={`p-3 rounded-xl text-sm font-bold border ${msg.tipo === 'erro' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
              {msg.texto}
            </div>
          )}
          {([
            { label: 'Nome', type: 'text', key: 'nome', placeholder: 'Nome completo' },
            { label: 'E-mail', type: 'email', key: 'email', placeholder: 'email@clinica.com' },
            { label: 'Senha', type: 'password', key: 'senha', placeholder: '••••••••' },
          ] as const).map(f => (
            <div key={f.key}>
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">{f.label} *</label>
              <input type={f.type} required placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-[#11caa0] focus:ring-2 focus:ring-[#11caa0]/20 text-sm font-medium" />
            </div>
          ))}
          <div>
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">Acesso *</label>
            <select value={form.papel} onChange={e => setForm({ ...form, papel: e.target.value })}
              className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-[#11caa0] text-sm font-semibold">
              <option value="recepcao">Recepcionista</option>
              <option value="gerente">Gerente</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-[#005088] hover:bg-[#003a66] text-white py-3.5 rounded-xl font-extrabold transition-colors">
            Criar Conta
          </button>
        </form>
      </div>
    </div>
  );
}
