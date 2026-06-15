import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { Agendamento } from '../types';

interface Props { agendamentos: Agendamento[]; onCardClick: (ag: Agendamento) => void; }

const COR_STATUS: Record<string, string> = {
  AGENDADO: '#11caa0',
  FINALIZADO: '#6366f1',
  CANCELADO: '#ef4444',
  PENDENTE: '#f59e0b',
  'EM ATENDIMENTO': '#f97316',
};

export default function CalendarView({ agendamentos, onCardClick }: Props) {
  const eventos = agendamentos
    .filter(a => a.data_consulta && a.hora_consulta)
    .map(a => {
      const [ano, mes, dia] = a.data_consulta!.split('T')[0].split('-');
      const [h, m] = a.hora_consulta!.substring(0, 5).split(':');
      const start = new Date(+ano, +mes - 1, +dia, +h, +m);
      const end = new Date(start.getTime() + 30 * 60000);
      return {
        id: String(a.id),
        title: a.nome_paciente,
        start,
        end,
        backgroundColor: COR_STATUS[a.status_atendimento] || '#94a3b8',
        borderColor: 'transparent',
        extendedProps: { agendamento: a },
      };
    });

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
      <style>{`
        .fc { font-family: 'Inter', sans-serif; font-size: 13px; }
        .fc-toolbar-title { font-size: 15px !important; font-weight: 800 !important; color: #0f172a; }
        .fc-button { background: #005088 !important; border-color: #005088 !important; font-weight: 700 !important; border-radius: 10px !important; padding: 6px 14px !important; font-size: 12px !important; }
        .fc-button:hover { background: #003a66 !important; }
        .fc-button-active { background: #11caa0 !important; border-color: #11caa0 !important; }
        .fc-event { border-radius: 8px !important; padding: 2px 6px !important; font-weight: 700 !important; font-size: 11px !important; cursor: pointer; }
        .fc-col-header-cell { background: #f8fafc; font-weight: 800 !important; color: #475569; font-size: 11px !important; text-transform: uppercase; letter-spacing: 0.05em; }
        .fc-timegrid-slot { height: 40px !important; }
        .fc-scrollgrid { border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0 !important; }
        .fc-day-today { background: #f0fdf4 !important; }
        .fc-timegrid-now-indicator-line { border-color: #11caa0 !important; }
        .fc-timegrid-now-indicator-arrow { border-top-color: #11caa0 !important; }
      `}</style>
      <FullCalendar
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        locale="pt-br"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
        buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia' }}
        events={eventos}
        slotMinTime="07:00:00"
        slotMaxTime="19:00:00"
        allDaySlot={false}
        height="auto"
        eventClick={info => {
          const ag = info.event.extendedProps.agendamento as Agendamento;
          onCardClick(ag);
        }}
        eventContent={arg => (
          <div className="px-1 py-0.5 overflow-hidden">
            <p className="font-extrabold text-[11px] leading-tight truncate">{arg.event.title}</p>
            <p className="text-[10px] opacity-80">{arg.timeText}</p>
          </div>
        )}
        nowIndicator
        weekends
      />
    </div>
  );
}
