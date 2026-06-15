import { Clock, CreditCard, MapPin, Activity, XCircle, CalendarDays, AlertCircle, TrendingUp, DollarSign, BarChart3, PieChart, Users, Target, CheckCircle2, FileText, Wallet, Filter, BarChart2, Award } from 'lucide-react';
import type { Agendamento, Lead } from '../types';
import { formatarDataBr, formatarHora } from '../utils/helpers';

interface Props { agendamentos: Agendamento[]; leads: Lead[]; }

export default function Dashboard({ agendamentos, leads }: Props) {
  const totalAtendimentos = agendamentos.length;
  const concluidos = agendamentos.filter(a => ['AGENDADO', 'FINALIZADO'].includes(a.status_atendimento)).length;
  const cancelados = agendamentos.filter(a => a.status_atendimento === 'CANCELADO').length;
  const finalizados = agendamentos.filter(a => a.status_atendimento === 'FINALIZADO').length;
  const particulares = agendamentos.filter(a => ['AGENDADO', 'FINALIZADO'].includes(a.status_atendimento) && (a.pagamento?.toLowerCase().includes('particular') || a.pagamento?.toLowerCase().includes('pix'))).length;
  const receitaRealizada = particulares * 600;
  const taxaCancelamento = totalAtendimentos > 0 ? Math.round((cancelados / totalAtendimentos) * 100) : 0;

  let totalEsperaMs = 0, itensComEspera = 0;
  agendamentos.forEach(a => {
    if (a.atendente_nome && a.data_atualizacao && a.data_criacao) {
      const espera = new Date(a.data_atualizacao).getTime() - new Date(a.data_criacao).getTime();
      if (espera > 0) { totalEsperaMs += espera; itensComEspera++; }
    }
  });
  const mediaEsperaMin = itensComEspera > 0 ? Math.round((totalEsperaMs / itensComEspera) / 60000) : 0;

  const contatosTotais = totalAtendimentos + leads.length;
  const taxaConversaoFunil = contatosTotais > 0 ? Math.round((concluidos / contatosTotais) * 100) : 0;
  const agendadosFuturos = agendamentos.filter(a => a.status_atendimento === 'AGENDADO' && a.pagamento?.toLowerCase().includes('particular')).length;
  const previsaoFaturacao = agendadosFuturos * 600;

  const noShowCount = agendamentos.filter(a => a.status_atendimento === 'CANCELADO' && a.data_consulta).length;
  const taxaNoShow = concluidos > 0 ? Math.round((noShowCount / (concluidos + noShowCount)) * 100) : 0;

  const novosCount = agendamentos.filter(a => a.tipo_consulta?.toLowerCase().includes('agendamento') || a.tipo_consulta?.toLowerCase().includes('consulta')).length;
  const retornosCount = agendamentos.filter(a => a.tipo_consulta?.toLowerCase().includes('retorno')).length;
  const totalRetencao = novosCount + retornosCount || 1;

  const terceiros = agendamentos.filter(a => a.para_terceiro === true).length;
  const titulares = agendamentos.filter(a => a.para_terceiro === false).length;
  const totalDemografico = terceiros + titulares || 1;

  const uniOlimpia = agendamentos.filter(a => a.unidade?.toLowerCase().includes('olimpia') || a.unidade?.toLowerCase().includes('olímpia')).length;
  const uniTatuape = agendamentos.filter(a => a.unidade?.toLowerCase().includes('tatuap')).length;
  const totalUni = uniOlimpia + uniTatuape || 1;

  const conveniosCount = totalAtendimentos - particulares;
  const totalPag = (particulares + conveniosCount) || 1;

  const atendentes: Record<string, number> = {};
  agendamentos.forEach(a => { if (a.atendente_nome && a.status_atendimento !== 'PENDENTE') { atendentes[a.atendente_nome] = (atendentes[a.atendente_nome] || 0) + 1; } });
  const rankingAtendentes = Object.entries(atendentes).sort((a, b) => b[1] - a[1]);
  const maxAtendimentos = rankingAtendentes[0]?.[1] || 1;

  const medicosData: Record<string, { total: number; retornos: number; novos: number }> = {};
  agendamentos.forEach(a => {
    const med = a.medico_final || a.nome_medico;
    if (med && !['indiferente', 'qualquer'].includes(med.toLowerCase())) {
      if (!medicosData[med]) medicosData[med] = { total: 0, retornos: 0, novos: 0 };
      medicosData[med].total++;
      if (a.tipo_consulta?.toLowerCase() === 'retorno') medicosData[med].retornos++;
      else medicosData[med].novos++;
    }
  });
  const rankingLoyalty = Object.entries(medicosData).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
  const motivosCancelamento = agendamentos.filter(a => a.status_atendimento === 'CANCELADO' && a.observacoes).slice(0, 4);

  const hoje = new Date();
  const evolucaoDiaria = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(hoje); d.setDate(hoje.getDate() - (13 - i));
    const ds = d.toISOString().split('T')[0];
    const qtd = agendamentos.filter(a => a.data_criacao?.split('T')[0] === ds).length;
    return { dia: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), qtd };
  });
  const maxEvol = Math.max(...evolucaoDiaria.map(e => e.qtd), 1);


  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      {/* KPIs PRINCIPAIS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'SLA de Espera', valor: `${mediaEsperaMin} min`, sub: 'Tempo médio na fila', icon: <Clock size={22} />, cor: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', tc: 'text-indigo-600', cardBg: 'from-white to-indigo-50/60', borderT: 'border-t-2 border-indigo-200' },
          { label: 'Conversão', valor: `${taxaConversaoFunil}%`, sub: `${concluidos} de ${contatosTotais} contactos`, icon: <TrendingUp size={22} />, cor: 'from-[#11caa0] to-[#0e9f7e]', bg: 'bg-emerald-50', tc: 'text-emerald-600', cardBg: 'from-white to-emerald-50/60', borderT: 'border-t-2 border-emerald-200' },
          { label: 'Receita Realizada', valor: `R$ ${receitaRealizada.toLocaleString('pt-BR')}`, sub: 'Consultas particulares', icon: <Wallet size={22} />, cor: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', tc: 'text-blue-600', cardBg: 'from-white to-blue-50/60', borderT: 'border-t-2 border-blue-200' },
          { label: 'Previsão 30d', valor: `R$ ${previsaoFaturacao.toLocaleString('pt-BR')}`, sub: 'Cashflow agendado', icon: <DollarSign size={22} />, cor: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', tc: 'text-amber-600', cardBg: 'from-white to-amber-50/60', borderT: 'border-t-2 border-amber-200' },
        ].map((kpi, i) => (
          <div key={i} className={`bg-gradient-to-br ${kpi.cardBg} rounded-2xl p-5 shadow-sm border border-slate-200 ${kpi.borderT} hover:shadow-md transition-all hover:-translate-y-0.5`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                <h3 className={`text-2xl font-extrabold bg-gradient-to-r ${kpi.cor} bg-clip-text text-transparent`}>{kpi.valor}</h3>
              </div>
              <div className={`${kpi.bg} p-3 rounded-xl ${kpi.tc}`}>{kpi.icon}</div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-semibold tracking-wide uppercase">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* KPIs SECUNDÁRIOS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Fichas', valor: totalAtendimentos, icon: <FileText size={18} />, cor: 'text-slate-600', bg: 'bg-slate-100' },
          { label: 'Finalizados', valor: finalizados, icon: <CheckCircle2 size={18} />, cor: 'text-emerald-700', bg: 'bg-emerald-100' },
          { label: 'Cancelamentos', valor: cancelados, icon: <XCircle size={18} />, cor: 'text-red-700', bg: 'bg-red-100' },
          { label: 'Taxa No-Show', valor: `${taxaNoShow}%`, icon: <AlertCircle size={18} />, cor: 'text-orange-700', bg: 'bg-orange-100' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 flex items-center gap-3">
            <div className={`${k.bg} ${k.cor} p-2.5 rounded-lg`}>{k.icon}</div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{k.label}</p>
              <p className={`text-xl font-extrabold ${k.cor}`}>{k.valor}</p>
            </div>
          </div>
        ))}
      </div>

      {/* EVOLUÇÃO DIÁRIA */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-extrabold text-slate-800 mb-5 flex items-center gap-2 uppercase tracking-wider">
          <BarChart2 size={18} className="text-[#11caa0]" /> Evolução dos Últimos 14 Dias
        </h3>
        <div className="flex items-end gap-1.5 h-32">
          {evolucaoDiaria.map((item, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <span className="text-[10px] text-slate-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">{item.qtd}</span>
              <div className="w-full bg-gradient-to-t from-[#11caa0] to-[#11caa0]/60 rounded-t-md transition-all hover:from-[#005088] hover:to-[#005088]/60 cursor-pointer"
                style={{ height: `${Math.max((item.qtd / maxEvol) * 100, 4)}%` }} title={`${item.dia}: ${item.qtd} atendimentos`} />
              <span className="text-[9px] text-slate-400 font-medium">{item.dia}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FUNIL */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-extrabold text-slate-800 mb-5 flex items-center gap-2 uppercase tracking-wider">
            <Filter size={18} className="text-indigo-500" /> Funil de Conversão
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Contactos Totais', qtd: contatosTotais, pct: 100, cor: 'bg-slate-200', tc: 'text-slate-700' },
              { label: 'Triados pela IA', qtd: totalAtendimentos, pct: contatosTotais > 0 ? Math.round((totalAtendimentos / contatosTotais) * 100) : 0, cor: 'bg-blue-400', tc: 'text-blue-700' },
              { label: 'Consultas Agendadas', qtd: concluidos, pct: contatosTotais > 0 ? Math.round((concluidos / contatosTotais) * 100) : 0, cor: 'bg-[#11caa0]', tc: 'text-emerald-700' },
              { label: 'Consultas Realizadas', qtd: finalizados, pct: contatosTotais > 0 ? Math.round((finalizados / contatosTotais) * 100) : 0, cor: 'bg-indigo-500', tc: 'text-indigo-700' },
            ].map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-700">{item.label}</span>
                  <span className={item.tc}>{item.qtd} <span className="font-normal text-slate-400">({item.pct}%)</span></span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className={`${item.cor} h-2 rounded-full transition-all duration-700`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* UNIDADES */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-extrabold text-slate-800 mb-5 flex items-center gap-2 uppercase tracking-wider">
            <MapPin size={18} className="text-blue-500" /> Distribuição por Unidade
          </h3>
          <div className="space-y-5">
            {[
              { nome: 'Vila Olímpia', qtd: uniOlimpia, cor: 'from-blue-500 to-blue-400' },
              { nome: 'Tatuapé', qtd: uniTatuape, cor: 'from-indigo-500 to-indigo-400' },
            ].map((uni, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm font-bold mb-2">
                  <span className="text-slate-700">{uni.nome}</span>
                  <span className="text-slate-500">{uni.qtd} atend. · {Math.round((uni.qtd / totalUni) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className={`bg-gradient-to-r ${uni.cor} h-3 rounded-full transition-all duration-700`} style={{ width: `${(uni.qtd / totalUni) * 100}%` }} />
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="text-2xl font-extrabold text-blue-600">{uniOlimpia}</p><p className="text-[11px] text-blue-500 font-bold mt-0.5">Vila Olímpia</p></div>
              <div className="bg-indigo-50 rounded-xl p-3 text-center"><p className="text-2xl font-extrabold text-indigo-600">{uniTatuape}</p><p className="text-[11px] text-indigo-500 font-bold mt-0.5">Tatuapé</p></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PAGAMENTOS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-extrabold text-slate-800 mb-5 flex items-center gap-2 uppercase tracking-wider">
            <CreditCard size={18} className="text-amber-500" /> Formas de Pagamento
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Particular/PIX', qtd: particulares, cor: 'bg-amber-400', bg: 'bg-amber-50', tc: 'text-amber-700' },
              { label: 'Convênios', qtd: conveniosCount, cor: 'bg-blue-400', bg: 'bg-blue-50', tc: 'text-blue-700' },
            ].map((p, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className={`${p.bg} ${p.tc} px-2 py-0.5 rounded-md`}>{p.label}</span>
                  <span className="text-slate-600">{p.qtd} ({Math.round((p.qtd / totalPag) * 100)}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className={`${p.cor} h-2.5 rounded-full`} style={{ width: `${(p.qtd / totalPag) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FIDELIZAÇÃO */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <h3 className="text-sm font-extrabold text-slate-800 mb-5 flex items-center gap-2 uppercase tracking-wider">
            <PieChart size={18} className="text-[#11caa0]" /> Fidelização
          </h3>
          <div className="flex-1 flex items-center justify-center gap-6">
            <div className="relative w-28 h-28 rounded-full shrink-0"
              style={{ background: `conic-gradient(#11caa0 0% ${(retornosCount / totalRetencao) * 100}%, #6366f1 ${(retornosCount / totalRetencao) * 100}% 100%)` }}>
              <div className="absolute inset-3 bg-white rounded-full flex flex-col items-center justify-center">
                <span className="font-extrabold text-slate-800 text-lg">{Math.round((retornosCount / totalRetencao) * 100)}%</span>
                <span className="text-[9px] text-slate-500 font-bold">Retorno</span>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { cor: 'bg-indigo-500', label: `${novosCount} Novos`, pct: Math.round((novosCount / totalRetencao) * 100) },
                { cor: 'bg-[#11caa0]', label: `${retornosCount} Retornos`, pct: Math.round((retornosCount / totalRetencao) * 100) },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.cor} shrink-0`} />
                  <div>
                    <p className="text-xs font-extrabold text-slate-700">{item.label}</p>
                    <p className="text-[10px] text-slate-400">{item.pct}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PÚBLICO */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-extrabold text-slate-800 mb-5 flex items-center gap-2 uppercase tracking-wider">
            <Users size={18} className="text-blue-500" /> Perfil do Paciente
          </h3>
          <div className="space-y-4">
            <div className="w-full h-5 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
              <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-full transition-all duration-700 rounded-full" style={{ width: `${(titulares / totalDemografico) * 100}%` }} />
              <div className="bg-gradient-to-r from-purple-500 to-purple-400 h-full transition-all duration-700 rounded-full" style={{ width: `${(terceiros / totalDemografico) * 100}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-xl font-extrabold text-blue-600">{Math.round((titulares / totalDemografico) * 100)}%</p>
                <p className="text-[11px] text-blue-500 font-bold mt-0.5">Titulares</p>
                <p className="text-[10px] text-blue-400">{titulares} pac.</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-xl font-extrabold text-purple-600">{Math.round((terceiros / totalDemografico) * 100)}%</p>
                <p className="text-[11px] text-purple-500 font-bold mt-0.5">Dependentes</p>
                <p className="text-[10px] text-purple-400">{terceiros} pac.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RANKING MÉDICOS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-extrabold text-slate-800 mb-5 flex items-center gap-2 uppercase tracking-wider">
            <Award size={18} className="text-teal-500" /> Ranking de Médicos
          </h3>
          <div className="space-y-3">
            {rankingLoyalty.length === 0
              ? <p className="text-xs text-slate-400 italic py-4 text-center">Sem dados médicos suficientes.</p>
              : rankingLoyalty.map(([med, s], idx) => (
                <div key={med} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100 group">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-500'}`}>{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate">Dr(a). {med}</p>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full flex overflow-hidden mt-1">
                      <div className="bg-indigo-400 h-full" style={{ width: `${(s.novos / s.total) * 100}%` }} />
                      <div className="bg-teal-400 h-full" style={{ width: `${(s.retornos / s.total) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-slate-800">{s.total}</p>
                    <p className="text-[10px] text-slate-400">{s.novos}N · {s.retornos}R</p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* PRODUTIVIDADE */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-extrabold text-slate-800 mb-5 flex items-center gap-2 uppercase tracking-wider">
            <BarChart3 size={18} className="text-indigo-500" /> Produtividade da Equipe
          </h3>
          <div className="space-y-4">
            {rankingAtendentes.length === 0
              ? <p className="text-xs text-slate-400 italic py-4 text-center">Nenhum atendimento assumido no período.</p>
              : rankingAtendentes.map(([nome, qtd], idx) => (
                <div key={nome} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-extrabold text-slate-600">{nome.substring(0, 2).toUpperCase()}</div>
                      {nome}
                    </span>
                    <span className="text-slate-500">{qtd} tickets</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${idx === 0 ? 'bg-gradient-to-r from-indigo-500 to-indigo-400' : 'bg-gradient-to-r from-slate-400 to-slate-300'}`}
                      style={{ width: `${(qtd / maxAtendimentos) * 100}%` }} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* CANCELAMENTOS */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
            <AlertCircle size={18} className="text-red-500" /> Análise de Cancelamentos
          </h3>
          <div className="bg-red-50 px-3 py-1.5 rounded-lg">
            <span className="text-sm font-extrabold text-red-600">{taxaCancelamento}% de cancelamento</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {motivosCancelamento.length === 0
            ? <div className="col-span-2 flex items-center gap-3 py-6 justify-center"><CheckCircle2 size={24} className="text-emerald-400" /><p className="text-slate-500 font-bold">Excelente! Sem cancelamentos recentes com justificativa.</p></div>
            : motivosCancelamento.map((a, i) => (
              <div key={i} className="flex items-start gap-3 bg-red-50/70 p-4 rounded-xl border border-red-100">
                <XCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-red-900 font-semibold italic">"{a.observacoes}"</p>
                  <p className="text-[10px] text-red-500 mt-1.5 font-bold uppercase tracking-wider">{a.nome_paciente} · {formatarDataBr(a.data_criacao)}</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
