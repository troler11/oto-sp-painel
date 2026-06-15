import { AlertTriangle, Info, X, Trash2, Check } from 'lucide-react';

interface Props {
  aberto: boolean;
  titulo?: string;
  mensagem: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tipo?: 'perigo' | 'aviso' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const CONFIG = {
  perigo: { icon: <Trash2 size={22} />, cor: 'from-red-500 to-red-600', btn: 'bg-red-500 hover:bg-red-600', bg: 'bg-red-50', tc: 'text-red-700', border: 'border-red-100' },
  aviso: { icon: <AlertTriangle size={22} />, cor: 'from-amber-500 to-orange-500', btn: 'bg-amber-500 hover:bg-amber-600', bg: 'bg-amber-50', tc: 'text-amber-700', border: 'border-amber-100' },
  info: { icon: <Info size={22} />, cor: 'from-blue-500 to-indigo-500', btn: 'bg-blue-500 hover:bg-blue-600', bg: 'bg-blue-50', tc: 'text-blue-700', border: 'border-blue-100' },
};

export default function ConfirmModal({ aberto, titulo, mensagem, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', tipo = 'perigo', onConfirm, onCancel }: Props) {
  if (!aberto) return null;
  const c = CONFIG[tipo];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
        <div className={`bg-gradient-to-r ${c.cor} p-5 flex justify-between items-center text-white`}>
          <div className="flex items-center gap-3 font-extrabold text-base">
            {c.icon} {titulo || (tipo === 'perigo' ? 'Confirmar exclusão' : tipo === 'aviso' ? 'Atenção' : 'Confirmar')}
          </div>
          <button onClick={onCancel} className="hover:bg-white/20 p-1.5 rounded-xl transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6">
          <div className={`${c.bg} ${c.border} border rounded-xl p-4 mb-5`}>
            <p className={`${c.tc} text-sm font-semibold leading-relaxed`}>{mensagem}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-sm transition-colors">
              {cancelLabel}
            </button>
            <button onClick={onConfirm}
              className={`flex-1 ${c.btn} text-white py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm`}>
              <Check size={16} /> {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
