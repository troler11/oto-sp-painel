import { useState } from 'react';
import { Inbox, Target, BarChart3, FileText, UserPlus, ShieldCheck, LogOut, ChevronLeft, ChevronRight, Wifi, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getAvatarCor } from '../utils/helpers';

interface Props {
  filtro: string;
  setFiltro: (f: string) => void;
  contagens: Record<string, number>;
  erroAcesso: string;
  fazerLogout: () => void;
  setModalModelosAberto: (v: boolean) => void;
  setModalNovoUsuarioAberto: (v: boolean) => void;
  abrirGestaoUsuarios: () => void;
  setModalWahaAberto: (v: boolean) => void;
}

const ABAS_NAV = [
  { id: 'ATENDIMENTOS', icon: <Inbox size={17} />, label: 'Atendimentos' },
] as const;

export default function Sidebar({ filtro, setFiltro, contagens, erroAcesso, fazerLogout, setModalModelosAberto, setModalNovoUsuarioAberto, abrirGestaoUsuarios, setModalWahaAberto }: Props) {
  const { sessao } = useApp();
  const [colapsada, setColapsada] = useState(false);
  const isAdmin = sessao?.user.papel === 'admin' || sessao?.user.papel === 'gerente';
  const avatarCor = getAvatarCor(sessao?.user.nome || '');

  const NavBtn = ({ id, icon, label, badge }: { id: string; icon: React.ReactNode; label: string; badge?: number }) => {
    const ativo = filtro === id;
    return (
      <button onClick={() => setFiltro(id)} title={colapsada ? label : undefined}
        className={`w-full flex items-center ${colapsada ? 'justify-center' : 'justify-between'} gap-2.5 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all relative group ${ativo ? 'bg-[#11caa0]/20 text-[#11caa0] font-bold shadow-[inset_2px_0_0_#11caa0]' : 'hover:bg-slate-800/80 hover:text-slate-200'}`}>
        <span className={`flex items-center ${colapsada ? '' : 'gap-2.5'}`}>{icon}</span>
        {!colapsada && <span className="flex-1 text-left truncate">{label}</span>}
        {!colapsada && badge !== undefined && badge > 0 && (
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${ativo ? 'bg-[#11caa0] text-white' : 'bg-slate-700 text-slate-300'}`}>{badge}</span>
        )}
        {colapsada && badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center">{badge > 9 ? '9+' : badge}</span>
        )}
        {colapsada && (
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
            {label}
          </div>
        )}
      </button>
    );
  };

  return (
    <aside className={`${colapsada ? 'w-[68px]' : 'w-64'} bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-slate-400 flex flex-col shrink-0 z-30 transition-all duration-300 relative`}>
      {/* Logo */}
      <div className="h-[72px] flex items-center justify-center px-4 border-b border-slate-800 bg-white shrink-0 overflow-hidden">
        {colapsada
          ? <div className="w-9 h-9 bg-gradient-to-br from-[#11caa0] to-[#005088] rounded-xl flex items-center justify-center font-extrabold text-white text-sm">O</div>
          : <img src="/logo.png" alt="Otoflow" className="h-11 object-contain" />
        }
      </div>

      {/* Toggle collapse */}
      <button onClick={() => setColapsada(!colapsada)}
        className="absolute -right-3 top-16 w-6 h-6 bg-slate-700 hover:bg-[#11caa0] text-white rounded-full flex items-center justify-center z-40 shadow-lg transition-colors border border-slate-600">
        {colapsada ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Status */}
      <div className={`px-4 py-3 border-b border-slate-800 ${colapsada ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider ${erroAcesso ? 'text-red-400' : 'text-emerald-400'}`}>
          <div className={`w-2 h-2 rounded-full shrink-0 ${erroAcesso ? 'bg-red-400' : 'bg-emerald-400 animate-pulse'}`} />
          {!colapsada && (erroAcesso ? 'API Offline' : 'Sistema Online')}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
        {!colapsada && <p className="px-3 text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-2">Operacional</p>}
        {ABAS_NAV.map(item => (
          <NavBtn key={item.id} id={item.id} icon={item.icon} label={item.label}
            badge={item.id === 'ATENDIMENTOS' ? (contagens.PENDENTE ?? 0) + (contagens['EM ATENDIMENTO'] ?? 0) + (contagens.AGENDADO ?? 0) + (contagens.TRIAGEM ?? 0) : contagens[item.id]} />
        ))}

        {!colapsada && <div className="pt-4 pb-1"><p className="px-3 text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-2">Análise</p></div>}
        {colapsada && <div className="py-2 border-t border-slate-800 mx-1" />}
        <NavBtn id="LEADS" icon={<Target size={17} />} label="Recuperação de Leads" />
        <NavBtn id="CONTATOS" icon={<Users size={17} />} label="Contatos" />
        <NavBtn id="RELATORIOS" icon={<BarChart3 size={17} />} label="Relatórios & BI" />

        {isAdmin && (
          <>
            {!colapsada && <div className="pt-4 pb-1"><p className="px-3 text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-2">Configurações</p></div>}
            {colapsada && <div className="py-2 border-t border-slate-800 mx-1" />}
            <NavBtn id="__modelos" icon={<FileText size={17} />} label="Modelos" />
            <NavBtn id="__novo_usuario" icon={<UserPlus size={17} />} label="Novo Utilizador" />
            <NavBtn id="__equipe" icon={<ShieldCheck size={17} />} label="Equipe & Acessos" />
            {(sessao?.user.papel === 'admin' || sessao?.user.papel === 'gerente') && (
              <button onClick={() => setModalWahaAberto(true)} title={colapsada ? 'WhatsApp (WAHA)' : undefined}
                className={`w-full flex items-center ${colapsada ? 'justify-center' : 'gap-2.5'} px-3 py-2.5 rounded-xl font-semibold text-sm transition-all hover:bg-slate-800/80 hover:text-slate-200 relative group`}>
                <Wifi size={17} />
                {!colapsada && <span className="flex-1 text-left">WhatsApp (WAHA)</span>}
                {colapsada && (
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    WhatsApp (WAHA)
                  </div>
                )}
              </button>
            )}
          </>
        )}
      </nav>

      {/* Perfil */}
      <div className="p-2 border-t border-slate-800 shrink-0">
        <div onClick={fazerLogout} title={colapsada ? `${sessao?.user.nome} · Sair` : undefined}
          className={`flex items-center ${colapsada ? 'justify-center' : 'gap-3'} p-2.5 hover:bg-red-500/10 rounded-xl cursor-pointer transition-colors group`}>
          <div className={`w-9 h-9 rounded-full ${avatarCor} flex items-center justify-center font-extrabold text-sm text-white shrink-0`}>
            {sessao?.user.nome.substring(0, 2).toUpperCase()}
          </div>
          {!colapsada && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-white truncate">{sessao?.user.nome}</p>
              <p className="text-[10px] text-slate-500 flex items-center gap-1 group-hover:text-red-400 transition-colors uppercase tracking-wider font-bold">
                <LogOut size={10} /> Sair
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
