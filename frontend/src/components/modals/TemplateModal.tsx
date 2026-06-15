import React from 'react';
import { X, FileText, Plus, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import { ModeloMensagem } from '../../types';

interface Props {
  modelos: ModeloMensagem[];
  editando: ModeloMensagem | null;
  form: { titulo: string; texto: string };
  setForm: React.Dispatch<React.SetStateAction<{ titulo: string; texto: string }>>;
  onSubmit: (e: React.FormEvent) => void;
  onEditar: (m: ModeloMensagem) => void;
  onRemover: (id: number) => void;
  onClose: () => void;
}

export default function TemplateModal({ modelos, editando, form, setForm, onSubmit, onEditar, onRemover, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
        <div className="bg-gradient-to-r from-[#11caa0] to-[#0e9f7e] p-5 flex justify-between items-center text-white shrink-0">
          <h2 className="font-extrabold flex items-center gap-2">
            <FileText size={20} /> {editando ? 'Editar Modelo' : 'Novo Modelo'}
          </h2>
          <button onClick={() => { onClose(); }}><X size={20} /></button>
        </div>
        <div className="p-5 overflow-y-auto custom-scrollbar space-y-5">
          <form onSubmit={onSubmit} className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Novo Modelo</p>
            <div>
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">Título</label>
              <input type="text" required placeholder="Ex: Confirmação de Agendamento"
                className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-[#11caa0] text-sm font-medium"
                value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">Texto</label>
              <textarea required placeholder="Texto da mensagem..."
                className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-[#11caa0] h-28 resize-none text-sm font-medium"
                value={form.texto} onChange={e => setForm({ ...form, texto: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-[#11caa0] text-white py-3 rounded-xl font-extrabold flex items-center justify-center gap-2 hover:bg-[#0e9f7e] transition-colors">
                {editando ? <><RefreshCw size={16} /> Atualizar</> : <><Plus size={16} /> Criar</>}
              </button>
              {editando && (
                <button type="button" onClick={() => { setForm({ titulo: '', texto: '' }); }}
                  className="bg-slate-200 text-slate-700 px-5 rounded-xl font-bold hover:bg-slate-300 transition-colors">
                  Cancelar
                </button>
              )}
            </div>
          </form>
          <div className="space-y-2">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Modelos Existentes</p>
            {modelos.length === 0
              ? <p className="text-sm text-slate-400 italic py-4 text-center">Nenhum modelo criado ainda.</p>
              : modelos.map(m => (
                <div key={m.id} className="border border-slate-200 rounded-xl p-4 flex justify-between items-start bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-1 pr-4">
                    <p className="font-extrabold text-[#005088] text-sm">{m.titulo}</p>
                    <p className="text-xs text-slate-500 mt-1 italic line-clamp-2">"{m.texto}"</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => onEditar(m)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={15} /></button>
                    <button onClick={() => onRemover(m.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
