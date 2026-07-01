export const formatarDataBr = (data?: string) => {
  if (!data) return '';
  const partes = data.split('T')[0].split('-');
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : data.split('T')[0];
};

export const formatarHoraBr = (horaString?: string) => (!horaString ? '' : horaString.substring(0, 5));

export const formatarHora = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

export const tempoAtras = (iso?: string) => {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return formatarDataBr(iso);
};

export const getUrgencia = (data_criacao: string): 'critica' | 'alta' | 'media' | 'normal' => {
  const diff = (Date.now() - new Date(data_criacao).getTime()) / 60000;
  if (diff > 120) return 'critica';
  if (diff > 60) return 'alta';
  if (diff > 30) return 'media';
  return 'normal';
};

const AVATAR_CORES = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500',
  'bg-amber-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
  'bg-pink-500', 'bg-orange-500',
];

export const getAvatarCor = (nome: string): string => {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_CORES[Math.abs(hash) % AVATAR_CORES.length];
};

export interface StatusVisual { dot: string; label: string; text: string; bg: string; border: string; }

// Fonte única de cor/status — usada na lista de conversas, cabeçalho do chat e painel lateral,
// pra evitar que cada tela calcule a cor de um jeito ligeiramente diferente.
export const getStatusVisual = (status: string, urgencia?: 'critica' | 'alta' | 'media' | 'normal'): StatusVisual => {
  if (status === 'PENDENTE') {
    if (urgencia === 'critica' || urgencia === 'alta') return { dot: 'bg-red-500', label: 'Urgente', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    if (urgencia === 'media') return { dot: 'bg-amber-400', label: 'Pendente', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
    return { dot: 'bg-amber-300', label: 'Pendente', text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' };
  }
  if (status === 'EM ATENDIMENTO') return { dot: 'bg-orange-400', label: 'Em Atendimento', text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
  if (status === 'AGENDADO') return { dot: 'bg-blue-500', label: 'Agendado', text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
  if (status === 'CONFIRMADO') return { dot: 'bg-violet-500', label: 'Confirmado', text: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' };
  if (status === 'FINALIZADO') return { dot: 'bg-slate-400', label: 'Finalizado', text: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' };
  return { dot: 'bg-slate-300', label: 'Cancelado', text: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' };
};
