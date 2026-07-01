import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Agendamento, Contato, Lead } from '../../types';
import { useApp } from '../../context/AppContext';
import ConversationListItem, { type ConversaItem } from './ConversationListItem';

interface Props {
  itens: Agendamento[]; // já filtrado por busca/período (aplicarFiltros) em App.tsx
  leadsTriagem: Lead[]; // contatos ainda sem ticket, em conversa ativa com a IA (aplicarFiltros já aplicado)
  contatos: Contato[];
  telefonesComMsgNova: Set<string>;
  selecionadoTicketId: number | null;
  selecionadoLeadId: number | null;
  onSelecionarTicket: (item: Agendamento) => void;
  onSelecionarLead: (lead: Lead) => void;
}

const STATUS_OPCOES = [
  { id: 'TODOS', label: 'Todos os atendimentos' },
  { id: 'PENDENTE', label: 'Pendentes' },
  { id: 'EM ATENDIMENTO', label: 'Em Atendimento' },
  { id: 'AGENDADO', label: 'Agendados' },
  { id: 'FINALIZADO', label: 'Finalizados' },
  { id: 'CANCELADO', label: 'Cancelados' },
] as const;

const QUICK_FILTROS = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'MEUS', label: 'Meus atendimentos' },
  { id: 'EM_ATENDIMENTO_TODOS', label: 'Em Atendimento (Todos)' },
  { id: 'BOT', label: 'IA' },
  { id: 'HUMANO', label: 'Humano' },
  { id: 'URGENTES', label: 'Urgentes' },
] as const;

const PAGE_SIZE = 30;

export default function ConversationList({ itens, leadsTriagem, contatos, telefonesComMsgNova, selecionadoTicketId, selecionadoLeadId, onSelecionarTicket, onSelecionarLead }: Props) {
  const { sessao } = useApp();
  const [statusFiltro, setStatusFiltro] = useState<typeof STATUS_OPCOES[number]['id']>('TODOS');
  const [quickFiltro, setQuickFiltro] = useState<typeof QUICK_FILTROS[number]['id']>('TODOS');
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const statusRoboPorTelefone = useMemo(() => new Map(contatos.map(c => [c.telefone, c.status_robo])), [contatos]);

  const lista = useMemo<ConversaItem[]>(() => {
    let tickets = itens.filter(a => {
      if (statusFiltro === 'TODOS') return true;
      if (statusFiltro === 'AGENDADO') return a.status_atendimento === 'AGENDADO' || a.status_atendimento === 'CONFIRMADO';
      return a.status_atendimento === statusFiltro;
    });
    // Leads em triagem (sem ticket) só fazem sentido dentro de "Todos os atendimentos" —
    // filtrar por status de ticket (Pendente/Agendado/...) não se aplica a eles.
    let triagem = statusFiltro === 'TODOS' ? leadsTriagem : [];

    if (quickFiltro === 'MEUS') {
      // "Meus atendimentos" = o que estou atendendo agora, não finalizado/cancelado
      tickets = tickets.filter(a => a.atendente_nome === sessao?.user.nome && ['EM ATENDIMENTO', 'AGENDADO', 'CONFIRMADO'].includes(a.status_atendimento));
      triagem = [];
    }
    if (quickFiltro === 'EM_ATENDIMENTO_TODOS') {
      // Visão de qualquer atendente sobre todo mundo que está em atendimento — para cobrir
      // uns aos outros quando necessário, não só o que cada um assumiu para si
      tickets = tickets.filter(a => a.status_atendimento === 'EM ATENDIMENTO');
      triagem = [];
    }
    if (quickFiltro === 'BOT') {
      // "IA" = o que está sendo triado/atendido pela IA agora
      triagem = triagem.filter(l => l.status_robo === 'Robô');
      tickets = tickets.filter(a => statusRoboPorTelefone.get(a.telefone) === 'Robô');
    }
    if (quickFiltro === 'HUMANO') {
      // "Humano" = o que está pendente para atendimento humano
      triagem = triagem.filter(l => l.status_robo !== 'Robô');
      tickets = tickets.filter(a => a.status_atendimento === 'PENDENTE');
    }
    if (quickFiltro === 'URGENTES') {
      triagem = [];
      tickets = tickets.filter(a => a.status_atendimento === 'PENDENTE' && (Date.now() - new Date(a.data_criacao).getTime()) / 60000 > 60);
    }

    const combinado: ConversaItem[] = [
      ...tickets.map((ticket): ConversaItem => ({ tipo: 'ticket', ticket })),
      ...triagem.map((lead): ConversaItem => ({ tipo: 'triagem', lead })),
    ];

    combinado.sort((a, b) => {
      if (statusFiltro === 'PENDENTE' && a.tipo === 'ticket' && b.tipo === 'ticket') {
        return new Date(a.ticket.data_criacao).getTime() - new Date(b.ticket.data_criacao).getTime();
      }
      const ta = a.tipo === 'ticket' ? new Date(a.ticket.data_atualizacao || a.ticket.data_criacao).getTime() : new Date(a.lead.ultima_mensagem).getTime();
      const tb = b.tipo === 'ticket' ? new Date(b.ticket.data_atualizacao || b.ticket.data_criacao).getTime() : new Date(b.lead.ultima_mensagem).getTime();
      return tb - ta;
    });
    return combinado;
  }, [itens, leadsTriagem, statusFiltro, quickFiltro, sessao, statusRoboPorTelefone]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [statusFiltro, quickFiltro, itens.length, leadsTriagem.length]);

  const statusLabel = STATUS_OPCOES.find(s => s.id === statusFiltro)?.label;

  return (
    <div className="w-[360px] shrink-0 border-r border-slate-200 bg-white flex flex-col h-full">
      <div className="p-3 border-b border-slate-100 shrink-0 space-y-2">
        <div className="relative">
          <button onClick={() => setDropdownAberto(v => !v)}
            className="w-full flex items-center justify-between gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-700 transition-colors">
            {statusLabel}
            <ChevronDown size={14} className="text-slate-400" />
          </button>
          {dropdownAberto && (
            <div className="absolute top-full mt-1 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
              {STATUS_OPCOES.map(op => (
                <button key={op.id} onClick={() => { setStatusFiltro(op.id); setDropdownAberto(false); }}
                  className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors ${statusFiltro === op.id ? 'bg-[#11caa0]/10 text-[#0e9f7e]' : 'text-slate-600 hover:bg-slate-50'}`}>
                  {op.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {QUICK_FILTROS.map(qf => (
            <button key={qf.id} onClick={() => setQuickFiltro(qf.id)}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ${quickFiltro === qf.id ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
              {qf.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{lista.length} atendimento{lista.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {lista.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">Nenhum atendimento encontrado.</div>
        ) : (
          <>
            {lista.slice(0, visibleCount).map(item => {
              const telefone = item.tipo === 'ticket' ? item.ticket.telefone : item.lead.telefone;
              const chave = item.tipo === 'ticket' ? `ticket-${item.ticket.id}` : `lead-${item.lead.id}`;
              const selecionado = item.tipo === 'ticket' ? item.ticket.id === selecionadoTicketId : item.lead.id === selecionadoLeadId;
              return (
                <ConversationListItem key={chave} item={item} selecionado={selecionado}
                  onClick={() => item.tipo === 'ticket' ? onSelecionarTicket(item.ticket) : onSelecionarLead(item.lead)}
                  temMsgNova={telefonesComMsgNova.has(String(telefone).replace(/\D/g, ''))}
                  statusRobo={item.tipo === 'ticket' ? statusRoboPorTelefone.get(item.ticket.telefone) : undefined} />
              );
            })}
            {lista.length > visibleCount && (
              <button onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                className="w-full py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors">
                Carregar mais ({lista.length - visibleCount} restantes)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
