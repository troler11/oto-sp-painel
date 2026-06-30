import React, { useState, useEffect } from 'react';
import { X, CalendarDays, Save, Loader2, ChevronDown } from 'lucide-react';
import type { Agendamento } from '../../types';

const API_URL = '/api';
const UNIDADES = ['Vila Olímpia', 'Tatuapé'];
const MEDICOS_INVALIDOS = ['Qualquer', 'Indiferente', 'A confirmar'];

interface Props {
  paciente: Agendamento;
  medicoInicial: string;
  dataInicial: string;
  horaInicial: string;
  onSubmit: (medico: string, data: string, hora: string) => Promise<void>;
  onClose: () => void;
  fetchSeguro: (url: string, opts?: RequestInit) => Promise<Response>;
}

interface Medico { id: number; nome: string; }

function formatarDataBr(iso: string) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

export default function ScheduleModal({ paciente, medicoInicial, dataInicial, horaInicial, onSubmit, onClose, fetchSeguro }: Props) {
  const unidadeInicial = paciente.unidade && UNIDADES.includes(paciente.unidade) ? paciente.unidade : UNIDADES[0];

  const [unidade, setUnidade] = useState(unidadeInicial);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [medicoId, setMedicoId] = useState<number | null>(null);
  const [medicoNome, setMedicoNome] = useState('');
  const [dias, setDias] = useState<string[]>([]);
  const [dataSel, setDataSel] = useState('');
  const [horarios, setHorarios] = useState<string[]>([]);
  const [horaSel, setHoraSel] = useState('');
  const [carregando, setCarregando] = useState<'medicos' | 'dias' | 'horarios' | null>(null);
  const [erroMedicos, setErroMedicos] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Busca médicos ao montar ou trocar unidade
  useEffect(() => {
    setMedicos([]); setMedicoId(null); setMedicoNome('');
    setDias([]); setDataSel(''); setHorarios([]); setHoraSel('');
    setErroMedicos(false);
    setCarregando('medicos');
    fetchSeguro(`${API_URL}/itsaude/medicos?unidade=${encodeURIComponent(unidade)}`)
      .then(r => r.json())
      .then((lista: Medico[]) => {
        setMedicos(lista);
        // Tenta pré-selecionar pelo nome inicial
        if (medicoInicial && !MEDICOS_INVALIDOS.includes(medicoInicial)) {
          const prefNorm = medicoInicial.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^dr[a]?\.\s*/i, '');
          const match = lista.find(m => {
            const n = m.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^dr[a]?\.\s*/i, '');
            return n.includes(prefNorm) || prefNorm.includes(n);
          });
          if (match) { setMedicoId(match.id); setMedicoNome(match.nome); }
        }
      })
      .catch(() => setErroMedicos(true))
      .finally(() => setCarregando(null));
  }, [unidade]); // eslint-disable-line react-hooks/exhaustive-deps

  // Busca dias ao selecionar médico
  useEffect(() => {
    if (!medicoId) return;
    setDias([]); setDataSel(''); setHorarios([]); setHoraSel('');
    setCarregando('dias');
    const hoje = new Date().toISOString().split('T')[0];
    fetchSeguro(`${API_URL}/itsaude/dias?unidade=${encodeURIComponent(unidade)}&idCalendar=${medicoId}&dataInicio=${hoje}`)
      .then(r => r.json())
      .then((lista: string[]) => {
        setDias(lista);
        // Tenta pré-selecionar data inicial
        if (dataInicial && lista.includes(dataInicial)) setDataSel(dataInicial);
        else if (lista.length > 0) setDataSel(lista[0]);
      })
      .catch(() => {})
      .finally(() => setCarregando(null));
  }, [medicoId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Busca horários ao selecionar data
  useEffect(() => {
    if (!medicoId || !dataSel) return;
    setHorarios([]); setHoraSel('');
    setCarregando('horarios');
    fetchSeguro(`${API_URL}/itsaude/horarios?unidade=${encodeURIComponent(unidade)}&idCalendar=${medicoId}&data=${dataSel}`)
      .then(r => r.json())
      .then((lista: string[]) => {
        setHorarios(lista);
        // Tenta pré-selecionar horário inicial
        if (horaInicial && lista.includes(horaInicial)) setHoraSel(horaInicial);
        else if (lista.length > 0) setHoraSel(lista[0]);
      })
      .catch(() => {})
      .finally(() => setCarregando(null));
  }, [dataSel]); // eslint-disable-line react-hooks/exhaustive-deps

  const podeSalvar = medicoNome && dataSel && horaSel && !enviando;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeSalvar) return;
    setEnviando(true);
    try { await onSubmit(medicoNome, dataSel, horaSel); }
    finally { setEnviando(false); }
  };

  const temCpf = Boolean(paciente.cpf_paciente);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
        <div className="bg-gradient-to-r from-[#11caa0] to-[#0e9f7e] p-5 flex justify-between items-center text-white">
          <h2 className="font-extrabold flex items-center gap-2"><CalendarDays size={20} /> Confirmar Consulta</h2>
          <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-xl transition-colors"><X size={19} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Cabeçalho do paciente */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="font-extrabold text-lg text-[#005088]">{paciente.nome_paciente}</p>
            <div className="flex gap-2 text-xs text-slate-500 mt-1 flex-wrap">
              {paciente.periodo_atendimento && <span className="text-amber-600 font-bold">Prefere {paciente.periodo_atendimento}</span>}
              <span className={`font-bold ${temCpf ? 'text-emerald-600' : 'text-orange-500'}`}>
                {temCpf ? '✓ CPF presente' : '⚠ Sem CPF — agendará só no OtoFlow'}
              </span>
            </div>
          </div>

          {/* Unidade */}
          <div>
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">Unidade *</label>
            <div className="relative">
              <select value={unidade} onChange={e => setUnidade(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 pr-9 outline-none focus:border-[#11caa0] focus:ring-2 focus:ring-[#11caa0]/20 font-semibold text-sm appearance-none bg-white">
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Médico */}
          <div>
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-2">
              Médico(a) *
              {carregando === 'medicos' && <Loader2 size={13} className="animate-spin text-[#11caa0]" />}
            </label>
            {erroMedicos || (medicos.length === 0 && carregando !== 'medicos') ? (
              <input type="text" value={medicoNome} onChange={e => setMedicoNome(e.target.value)} required
                placeholder="Digite o nome do médico..."
                className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-[#11caa0] focus:ring-2 focus:ring-[#11caa0]/20 font-semibold text-sm" />
            ) : (
              <div className="relative">
                <select
                  value={medicoId ?? ''}
                  onChange={e => {
                    const id = Number(e.target.value);
                    setMedicoId(id);
                    setMedicoNome(medicos.find(m => m.id === id)?.nome || '');
                  }}
                  disabled={carregando === 'medicos' || medicos.length === 0}
                  className="w-full border border-slate-200 rounded-xl p-3 pr-9 outline-none focus:border-[#11caa0] focus:ring-2 focus:ring-[#11caa0]/20 font-semibold text-sm appearance-none bg-white disabled:opacity-60">
                  <option value="">Selecione o médico...</option>
                  {medicos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Data */}
          <div>
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-2">
              Data disponível *
              {carregando === 'dias' && <Loader2 size={13} className="animate-spin text-[#11caa0]" />}
            </label>
            {dias.length === 0 && carregando !== 'dias' && medicoId ? (
              <p className="text-sm text-orange-500 font-bold p-3 bg-orange-50 rounded-xl border border-orange-100">
                Sem vagas nos próximos 30 dias para este médico.
              </p>
            ) : (
              <div className="relative">
                <select value={dataSel} onChange={e => setDataSel(e.target.value)}
                  disabled={!medicoId || carregando === 'dias' || dias.length === 0}
                  className="w-full border border-slate-200 rounded-xl p-3 pr-9 outline-none focus:border-[#11caa0] focus:ring-2 focus:ring-[#11caa0]/20 font-semibold text-sm appearance-none bg-white disabled:opacity-60">
                  {!medicoId && <option value="">Selecione o médico primeiro...</option>}
                  {dias.length === 0 && medicoId && <option value="">Buscando datas...</option>}
                  {dias.map(d => <option key={d} value={d}>{formatarDataBr(d)}</option>)}
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Horário */}
          <div>
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-2">
              Horário *
              {carregando === 'horarios' && <Loader2 size={13} className="animate-spin text-[#11caa0]" />}
              {horaSel && <span className="text-[#11caa0] normal-case font-semibold">· {horaSel} selecionado</span>}
            </label>
            <div className="relative">
              <select value={horaSel} onChange={e => setHoraSel(e.target.value)}
                disabled={!dataSel || carregando === 'horarios' || horarios.length === 0}
                className="w-full border border-slate-200 rounded-xl p-3 pr-9 outline-none focus:border-[#11caa0] focus:ring-2 focus:ring-[#11caa0]/20 font-semibold text-sm appearance-none bg-white disabled:opacity-60">
                {!dataSel && <option value="">Selecione a data primeiro...</option>}
                {dataSel && horarios.length === 0 && <option value="">Buscando horários...</option>}
                {horarios.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <button type="submit" disabled={!podeSalvar}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white py-3.5 rounded-xl font-extrabold transition-all shadow-md hover:shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {enviando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {enviando ? 'Salvando...' : 'Salvar na Agenda'}
          </button>
        </form>
      </div>
    </div>
  );
}
