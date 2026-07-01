import type { Dispatch, SetStateAction } from 'react';
import { ChevronRight, Search, X, CalendarDays, Bell, RefreshCw, LayoutGrid, Rows3 } from 'lucide-react';
import type { Notificacao } from '../types';

interface Props {
  filtro: string;
  searchTerm: string; setSearchTerm: (v: string) => void;
  dataInicio: string; setDataInicio: (v: string) => void;
  dataFim: string; setDataFim: (v: string) => void;
  carregandoDados: boolean;
  buscarDados: () => void;
  notificacoes: Notificacao[];
  setNotificacoes: Dispatch<SetStateAction<Notificacao[]>>;
  painelNotifAberto: boolean;
  setPainelNotifAberto: (v: boolean) => void;
  densidade: 'confortavel' | 'compacta';
  setDensidade: (v: 'confortavel' | 'compacta') => void;
}

const TITULO: Record<string, string> = {
  RELATORIOS: 'Relatórios & BI',
  LEADS: 'Recuperação Ativa',
  ATENDIMENTOS: 'Atendimentos',
};

const ABAS_COM_CARDS = ['TRIAGEM', 'LEADS'];

export default function Header({ filtro, searchTerm, setSearchTerm, dataInicio, setDataInicio, dataFim, setDataFim, carregandoDados, buscarDados, notificacoes, setNotificacoes, painelNotifAberto, setPainelNotifAberto, densidade, setDensidade }: Props) {
  const naoLidas = notificacoes.filter(n => !n.lida).length;
  const titulo = TITULO[filtro] || (filtro.charAt(0) + filtro.slice(1).toLowerCase() + 's');

  return (
    <header className="h-[72px] bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400 font-semibold">OtoFlow</span>
          <ChevronRight size={14} className="text-slate-300" />
          <span className="font-extrabold text-slate-800">{titulo}</span>
        </div>

        {filtro !== 'RELATORIOS' && (
          <div className="flex items-center bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 w-64 focus-within:ring-2 focus-within:ring-[#11caa0]/30 focus-within:border-[#11caa0] transition-all">
            <Search size={15} className="text-slate-400 shrink-0" />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar paciente, telefone ou CPF..."
              className="bg-transparent border-none outline-none ml-2 text-sm w-full text-slate-700 placeholder-slate-400 font-medium" />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={14} /></button>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {filtro !== 'RELATORIOS' && filtro !== 'LEADS' && (
          <div className="hidden lg:flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-sm">
            <CalendarDays size={14} className="text-slate-400" />
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              className="outline-none text-slate-700 font-bold bg-transparent text-xs" />
            <span className="text-slate-300">—</span>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
              className="outline-none text-slate-700 font-bold bg-transparent text-xs" />
            {(dataInicio || dataFim) && (
              <button onClick={() => { setDataInicio(''); setDataFim(''); }} className="text-slate-400 hover:text-red-500 transition-colors"><X size={13} /></button>
            )}
          </div>
        )}

        {ABAS_COM_CARDS.includes(filtro) && (
          <button onClick={() => setDensidade(densidade === 'compacta' ? 'confortavel' : 'compacta')}
            title={densidade === 'compacta' ? 'Mudar para visão confortável' : 'Mudar para visão compacta'}
            className="p-2.5 text-slate-500 hover:bg-slate-100 hover:text-[#005088] rounded-xl transition-colors">
            {densidade === 'compacta' ? <LayoutGrid size={18} /> : <Rows3 size={18} />}
          </button>
        )}

        <div className="relative">
          <button onClick={() => { setPainelNotifAberto(!painelNotifAberto); if (!painelNotifAberto) setNotificacoes(prev => prev.map(n => ({ ...n, lida: true }))); }}
            className="relative p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-xl transition-colors">
            <Bell size={19} />
            {naoLidas > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center">{naoLidas}</span>
            )}
          </button>
          {painelNotifAberto && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-slide-up">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <p className="font-extrabold text-slate-800 text-sm">Notificações</p>
                <button onClick={() => setNotificacoes([])} className="text-xs text-slate-400 hover:text-red-500 transition-colors font-bold">Limpar</button>
              </div>
              <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {notificacoes.length === 0
                  ? <div className="p-6 text-center text-slate-400 text-sm">Sem notificações.</div>
                  : notificacoes.map(n => (
                    <div key={n.id} className={`p-3 border-b border-slate-50 flex items-start gap-3 ${!n.lida ? 'bg-blue-50/50' : ''}`}>
                      <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${n.tipo === 'sucesso' ? 'bg-emerald-400' : n.tipo === 'aviso' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-700">{n.texto}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{n.hora}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <button onClick={buscarDados} className="p-2.5 text-slate-500 hover:bg-slate-100 hover:text-[#005088] rounded-xl transition-colors">
          <RefreshCw size={18} className={carregandoDados ? 'animate-spin text-[#11caa0]' : ''} />
        </button>
      </div>
    </header>
  );
}
