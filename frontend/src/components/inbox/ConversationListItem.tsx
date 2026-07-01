import { useProfilePic } from '../../hooks/useProfilePic';
import { Bot, User, Flame } from 'lucide-react';
import type { Agendamento } from '../../types';
import { getAvatarCor, getStatusVisual, getUrgencia, tempoAtras } from '../../utils/helpers';

interface Props {
  item: Agendamento;
  selecionado: boolean;
  onClick: () => void;
  temMsgNova?: boolean;
  statusRobo?: string;
}

// Linha compacta de lista de conversas (estilo Intercom/HubSpot Inbox) — substitui
// o card grande quando o objetivo é escanear dezenas de pacientes rapidamente.
// Sem botões de ação aqui de propósito: as ações vivem no cabeçalho do chat.
export default function ConversationListItem({ item, selecionado, onClick, temMsgNova, statusRobo }: Props) {
  const fotoPerfil = useProfilePic(item.telefone);
  const avatarCor = getAvatarCor(item.nome_paciente);
  const urgencia = getUrgencia(item.data_criacao);
  const visual = getStatusVisual(item.status_atendimento, urgencia);
  const isBot = statusRobo === 'Robô';

  // Linha de contexto: na Fase 1 não temos preview real da última mensagem
  // (exigiria uma rota nova) — mostra o tipo de consulta/intenção como contexto.
  const contexto = item.tipo_consulta?.replace(/_/g, ' ') || item.intencao || item.especialidade || visual.label;

  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-100 text-left transition-colors relative ${selecionado ? 'bg-[#11caa0]/10' : 'hover:bg-slate-50'}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${visual.dot}`} />
      <div className="relative shrink-0 ml-1">
        {fotoPerfil ? (
          <img src={fotoPerfil} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className={`w-9 h-9 rounded-full ${avatarCor} text-white flex items-center justify-center font-extrabold text-[11px]`}>
            {item.nome_paciente.substring(0, 2).toUpperCase()}
          </div>
        )}
        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white ${isBot ? 'bg-blue-500' : 'bg-emerald-500'}`} title={isBot ? 'IA respondendo' : 'Atendimento humano'}>
          {isBot ? <Bot size={9} className="text-white" /> : <User size={9} className="text-white" />}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-slate-800 text-sm truncate">{item.nome_paciente}</p>
          <span className="text-[10px] text-slate-400 font-semibold shrink-0">{tempoAtras(item.data_atualizacao || item.data_criacao)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs text-slate-500 truncate">{contexto}</p>
          <div className="flex items-center gap-1 shrink-0">
            {(urgencia === 'alta' || urgencia === 'critica') && item.status_atendimento === 'PENDENTE' && (
              <Flame size={12} className="text-red-500 animate-pulse" />
            )}
            {temMsgNova && <span className="w-2 h-2 bg-red-500 rounded-full" />}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${visual.bg} ${visual.text}`}>{visual.label}</span>
          {item.atendente_nome && (
            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[90px]">{item.atendente_nome}</span>
          )}
        </div>
      </div>
    </button>
  );
}
