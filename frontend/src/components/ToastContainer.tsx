import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import type { Toast } from '../hooks/useToast';

const CONFIG = {
  sucesso: { icon: <CheckCircle2 size={18} />, bg: 'bg-emerald-500', border: 'border-emerald-400' },
  erro: { icon: <AlertCircle size={18} />, bg: 'bg-red-500', border: 'border-red-400' },
  info: { icon: <Info size={18} />, bg: 'bg-blue-500', border: 'border-blue-400' },
  aviso: { icon: <AlertTriangle size={18} />, bg: 'bg-amber-500', border: 'border-amber-400' },
};

interface Props { toasts: Toast[]; onRemover: (id: number) => void; }

export default function ToastContainer({ toasts, onRemover }: Props) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-4 right-4 z-[500] flex flex-col gap-2 max-w-sm">
      {toasts.map(t => {
        const c = CONFIG[t.tipo];
        return (
          <div key={t.id} className={`${c.bg} text-white px-4 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl border border-white/20 animate-slide-up`}>
            <span className="shrink-0">{c.icon}</span>
            <p className="flex-1 text-sm font-semibold leading-snug">{t.texto}</p>
            <button onClick={() => onRemover(t.id)} className="shrink-0 hover:bg-white/20 p-1 rounded-lg transition-colors"><X size={15} /></button>
          </div>
        );
      })}
    </div>
  );
}
