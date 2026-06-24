import { X, Users, Edit2, Key, Trash2 } from 'lucide-react';
import { Usuario } from '../../types';
import { useApp } from '../../context/AppContext';

interface Props {
  usuarios: Usuario[];
  editandoSenhaId: number | null; setEditandoSenhaId: (v: number | null) => void;
  novaSenha: string; setNovaSenha: (v: string) => void;
  editandoUsuarioId: number | null; setEditandoUsuarioId: (v: number | null) => void;
  novoNome: string; setNovoNome: (v: string) => void;
  onAtualizarNome: (id: number) => void;
  onAlterarSenha: (id: number) => void;
  onExcluir: (id: number) => void;
  onClose: () => void;
}

export default function UserManagementModal({ usuarios, editandoSenhaId, setEditandoSenhaId, novaSenha, setNovaSenha, editandoUsuarioId, setEditandoUsuarioId, novoNome, setNovoNome, onAtualizarNome, onAlterarSenha, onExcluir, onClose }: Props) {
  const { sessao } = useApp();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
        <div className="bg-[#005088] p-5 flex justify-between items-center text-white shrink-0">
          <h2 className="font-extrabold flex items-center gap-2"><Users size={20} /> Equipe & Acessos</h2>
          <button onClick={() => { onClose(); setEditandoSenhaId(null); setEditandoUsuarioId(null); }}><X size={20} /></button>
        </div>
        <div className="p-5 overflow-y-auto custom-scrollbar space-y-3">
          {usuarios.map(u => (
            <div key={u.id} className="border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row justify-between md:items-center gap-3 bg-slate-50/50 hover:bg-white transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-gradient-to-br from-[#11caa0] to-[#005088] rounded-full flex items-center justify-center text-white font-extrabold text-sm shrink-0">
                  {u.nome.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  {editandoUsuarioId === u.id ? (
                    <div className="flex gap-2">
                      <input type="text" className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-[#11caa0] w-40" value={novoNome} onChange={e => setNovoNome(e.target.value)} autoFocus />
                      <button onClick={() => onAtualizarNome(u.id)} className="bg-[#11caa0] text-white px-2.5 rounded-lg font-bold text-xs">OK</button>
                      <button onClick={() => setEditandoUsuarioId(null)} className="bg-slate-200 text-slate-600 px-2.5 rounded-lg font-bold text-xs">X</button>
                    </div>
                  ) : (
                    <p className="font-extrabold text-slate-800 text-sm">{u.nome}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">@{u.usuario || '—'}</p>
                  <span className="inline-block mt-1 text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 tracking-wider">{u.papel}</span>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                {editandoSenhaId === u.id ? (
                  <>
                    <input type="password" placeholder="Nova senha" className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#11caa0] w-32" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} autoFocus />
                    <button onClick={() => onAlterarSenha(u.id)} className="bg-[#11caa0] text-white px-2.5 rounded-lg font-bold text-xs">OK</button>
                    <button onClick={() => setEditandoSenhaId(null)} className="bg-slate-200 text-slate-600 px-2.5 rounded-lg font-bold text-xs">X</button>
                  </>
                ) : editandoUsuarioId !== u.id && (
                  <>
                    <button onClick={() => { setEditandoUsuarioId(u.id); setNovoNome(u.nome); setEditandoSenhaId(null); }}
                      className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"><Edit2 size={15} /></button>
                    <button onClick={() => { setEditandoSenhaId(u.id); setNovaSenha(''); setEditandoUsuarioId(null); }}
                      className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-[#11caa0] transition-colors"><Key size={15} /></button>
                    {sessao?.user.nome !== u.nome && (
                      <button onClick={() => onExcluir(u.id)} className="p-2 bg-white border border-red-100 rounded-lg text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
