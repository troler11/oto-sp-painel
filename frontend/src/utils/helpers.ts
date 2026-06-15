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

export const getUrgencia = (data_criacao: string): 'alta' | 'media' | 'normal' => {
  const diff = (Date.now() - new Date(data_criacao).getTime()) / 60000;
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
