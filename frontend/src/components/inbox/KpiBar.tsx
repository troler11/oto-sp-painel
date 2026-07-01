import { useMemo } from 'react';
import { Clock, Bot, UserCheck, CalendarCheck, Users, AlertTriangle } from 'lucide-react';
import type { Agendamento, Lead } from '../../types';

interface Props { agendamentos: Agendamento[]; leads: Lead[]; contatos: Lead[]; }

// Calculado inteiramente no cliente a partir de dados já carregados — sem chamada
// nova ao backend (ver limitações da Fase 1 no plano: "mensagens hoje" fica de fora
// por exigir COUNT em chat_limpo).
export default function KpiBar({ agendamentos, leads, contatos: _contatos }: Props) {
  const kpis = useMemo(() => {
    const fila = agendamentos.filter(a => a.status_atendimento === 'PENDENTE').length;
    const emAtendimento = agendamentos.filter(a => a.status_atendimento === 'EM ATENDIMENTO').length;
    const agendados = agendamentos.filter(a => a.status_atendimento === 'AGENDADO' || a.status_atendimento === 'CONFIRMADO').length;
    // Só conta triagem real (contato sem ticket, em conversa ativa com o bot) — não usa
    // status_robo de `contatos` porque ele é resetado para 'Robô' ao finalizar/cancelar/
    // agendar um ticket, o que infla essa contagem com atendimentos já encerrados.
    const iaRespondendo = leads.filter(l => l.sessao_intencao !== 'concluido' && l.status_robo === 'Robô').length;
    const semResposta = agendamentos.filter(a => a.status_atendimento === 'PENDENTE' && (Date.now() - new Date(a.data_criacao).getTime()) / 60000 > 60).length;

    let totalEsperaMs = 0, itensComEspera = 0;
    agendamentos.forEach(a => {
      if (a.data_atendimento && a.data_criacao) {
        const espera = new Date(a.data_atendimento).getTime() - new Date(a.data_criacao).getTime();
        if (espera > 0 && espera < 24 * 60 * 60 * 1000) { totalEsperaMs += espera; itensComEspera++; }
      }
    });
    const tempoMedioMin = itensComEspera > 0 ? Math.round((totalEsperaMs / itensComEspera) / 60000) : 0;

    return { fila, emAtendimento, agendados, iaRespondendo, semResposta, tempoMedioMin, novosLeads: leads.length };
  }, [agendamentos, leads]);

  const itens = [
    { label: 'Fila Atual', valor: kpis.fila, icon: <Clock size={16} />, cor: 'text-amber-600 bg-amber-50' },
    { label: 'Em Atendimento', valor: kpis.emAtendimento, icon: <UserCheck size={16} />, cor: 'text-orange-600 bg-orange-50' },
    { label: 'Consultas Agendadas', valor: kpis.agendados, icon: <CalendarCheck size={16} />, cor: 'text-blue-600 bg-blue-50' },
    { label: 'IA Respondendo', valor: kpis.iaRespondendo, icon: <Bot size={16} />, cor: 'text-emerald-600 bg-emerald-50' },
    { label: 'Novos Leads', valor: kpis.novosLeads, icon: <Users size={16} />, cor: 'text-violet-600 bg-violet-50' },
    { label: 'Tempo Médio', valor: `${kpis.tempoMedioMin}min`, icon: <Clock size={16} />, cor: 'text-indigo-600 bg-indigo-50' },
    { label: 'Sem Resposta', valor: kpis.semResposta, icon: <AlertTriangle size={16} />, cor: 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="flex gap-2 px-4 py-2.5 bg-white border-b border-slate-200 overflow-x-auto scrollbar-hide shrink-0">
      {itens.map((kpi, i) => (
        <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl shrink-0 ${kpi.cor}`}>
          {kpi.icon}
          <div className="leading-tight">
            <p className="text-sm font-extrabold">{kpi.valor}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">{kpi.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
