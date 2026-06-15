import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  email: string; setEmail: (v: string) => void;
  senha: string; setSenha: (v: string) => void;
  carregandoAuth: boolean;
  erroAuth: string;
  fazerLogin: (e: React.FormEvent) => void;
}

export default function LoginPage({ email, setEmail, senha, setSenha, carregandoAuth, erroAuth, fazerLogin }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#003a66] to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#11caa0]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#005088]/10 rounded-full blur-3xl" />
      </div>
      <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/10 relative">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Otoflow CRM" className="h-20 object-contain mb-4 drop-shadow-2xl" />
          <p className="text-slate-400 text-sm">Sistema de Gestão Clínica</p>
        </div>
        <form onSubmit={fazerLogin} className="space-y-4">
          {erroAuth && (
            <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-sm flex items-center gap-2 border border-red-500/20">
              <AlertCircle size={16} /> {erroAuth}
            </div>
          )}
          <div>
            <label className="text-sm font-bold text-slate-300 block mb-1.5">E-mail</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/10 border border-white/20 text-white rounded-xl p-3.5 outline-none focus:border-[#11caa0] placeholder-slate-500 transition-colors"
              placeholder="recepcao@clinica.com" />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-300 block mb-1.5">Senha</label>
            <input type="password" required value={senha} onChange={e => setSenha(e.target.value)}
              className="w-full bg-white/10 border border-white/20 text-white rounded-xl p-3.5 outline-none focus:border-[#11caa0] placeholder-slate-500 transition-colors"
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={carregandoAuth}
            className="w-full bg-gradient-to-r from-[#11caa0] to-[#005088] text-white font-bold py-4 rounded-xl flex justify-center items-center transition-all shadow-lg hover:shadow-[#11caa0]/25 hover:scale-[1.02] active:scale-[0.98] mt-2">
            {carregandoAuth ? <RefreshCw className="animate-spin" size={20} /> : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
