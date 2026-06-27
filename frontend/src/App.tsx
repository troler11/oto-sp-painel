import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  DndContext, DragOverlay,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Activity, CheckCircle2, XCircle, CalendarDays, X,
  AlertCircle, Target, ArrowRight, MessageSquare, Trash2, Download, Edit2,
} from 'lucide-react';

import { AppContext } from './context/AppContext';
import type { Sessao, Agendamento, Lead, Notificacao, ModeloMensagem, Usuario, MensagemChat, PacienteChat } from './types';
import { tempoAtras, getAvatarCor } from './utils/helpers';
import { useConfirm } from './hooks/useConfirm';
import { useToast } from './hooks/useToast';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import PatientCard from './components/PatientCard';
import ChatPanel from './components/ChatPanel';
import PatientTimeline from './components/PatientTimeline';
import ConfirmModal from './components/ConfirmModal';
import ToastContainer from './components/ToastContainer';
import { CardSkeletonGrid } from './components/CardSkeleton';
import ScheduleModal from './components/modals/ScheduleModal';
import CancelModal from './components/modals/CancelModal';
import UserModal from './components/modals/UserModal';
import UserManagementModal from './components/modals/UserManagementModal';
import TemplateModal from './components/modals/TemplateModal';
import WahaModal from './components/modals/WahaModal';

const API_URL = '/api';

// Wrapper sortable para cada card no drag & drop
function SortableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export default function App() {
  // ── Auth ──────────────────────────────────────────────────────
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregandoAuth, setCarregandoAuth] = useState(false);
  const [verificandoSessaoInicial, setVerificandoSessaoInicial] = useState(true);
  const [erroAuth, setErroAuth] = useState('');

  // ── Data ──────────────────────────────────────────────────────
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filtro, setFiltro] = useState('TRIAGEM');
  const [editandoNomeLead, setEditandoNomeLead] = useState<{ id: number; valor: string } | null>(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [carregandoDados, setCarregandoDados] = useState(false);
  const [primeiraCarregamento, setPrimeiraCarregamento] = useState(true);
  const [erroAcesso, setErroAcesso] = useState('');
  const [notificacaoErro, setNotificacaoErro] = useState<string | null>(null);
  const prevAgendamentosRef = useRef<number>(0);

  // ── Notificações ──────────────────────────────────────────────
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [painelNotifAberto, setPainelNotifAberto] = useState(false);

  // ── Toast + Confirm ───────────────────────────────────────────
  const { toasts, toast, remover: removerToast } = useToast();
  const { confirm, confirmState, responder } = useConfirm();

  // ── Timeline ──────────────────────────────────────────────────
  const [pacienteTimeline, setPacienteTimeline] = useState<Agendamento | null>(null);

  // ── Chat ──────────────────────────────────────────────────────
  const [chatAberto, setChatAberto] = useState(false);
  const [pacienteAtivoChat, setPacienteAtivoChat] = useState<PacienteChat | null>(null);
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);
  const [enviandoMidia, setEnviandoMidia] = useState(false);
  const [digitando, setDigitando] = useState(false);

  // ── Modelos ───────────────────────────────────────────────────
  const [modelos, setModelos] = useState<ModeloMensagem[]>([]);
  const [dropdownModelosAberto, setDropdownModelosAberto] = useState(false);
  const [modalModelosAberto, setModalModelosAberto] = useState(false);
  const [editandoModelo, setEditandoModelo] = useState<ModeloMensagem | null>(null);
  const [novoModeloForm, setNovoModeloForm] = useState({ titulo: '', texto: '' });

  // ── Modais ────────────────────────────────────────────────────
  const [modalAberto, setModalAberto] = useState(false);
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Agendamento | null>(null);
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [horaSelecionada, setHoraSelecionada] = useState('');
  const [medicoSelecionado, setMedicoSelecionado] = useState('');

  const [modalCancelamentoAberto, setModalCancelamentoAberto] = useState(false);
  const [pacienteCancelamento, setPacienteCancelamento] = useState<Agendamento | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  const [modalNovoUsuarioAberto, setModalNovoUsuarioAberto] = useState(false);
  const [novoUsuarioForm, setNovoUsuarioForm] = useState({ nome: '', usuario: '', senha: '', papel: 'recepcao' });
  const [msgNovoUsuario, setMsgNovoUsuario] = useState({ texto: '', tipo: '' });

  const [modalGestaoUsuariosAberto, setModalGestaoUsuariosAberto] = useState(false);
  const [modalWahaAberto, setModalWahaAberto] = useState(false);
  const [listaUsuarios, setListaUsuarios] = useState<Usuario[]>([]);
  const [editandoSenhaId, setEditandoSenhaId] = useState<number | null>(null);
  const [novaSenhaGestao, setNovaSenhaGestao] = useState('');
  const [editandoUsuarioId, setEditandoUsuarioId] = useState<number | null>(null);
  const [novoNomeGestao, setNovoNomeGestao] = useState('');

  // ── Drag & Drop ───────────────────────────────────────────────
  const [dragAtivo, setDragAtivo] = useState<Agendamento | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // ── Socket ────────────────────────────────────────────────────
  const socketRef = useRef<Socket | null>(null);
  const pacienteAtivoChatRef = useRef<PacienteChat | null>(null);

  // ── Effects ───────────────────────────────────────────────────
  useEffect(() => { document.title = 'OtoFlow CRM | Gestão de Atendimentos'; }, []);
  useEffect(() => { pacienteAtivoChatRef.current = pacienteAtivoChat; }, [pacienteAtivoChat]);

  // Polling de fallback: quando o chat está aberto, busca mensagens a cada 5s
  useEffect(() => {
    if (!chatAberto || !pacienteAtivoChat?.telefone) return;
    const tel = pacienteAtivoChat.telefone;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/chat/${tel}`, { credentials: 'include' });
        if (!res.ok) return;
        const novas: MensagemChat[] = await res.json();
        setMensagens(prev => novas.length !== prev.length ? novas : prev);
      } catch { /* silencioso */ }
    }, 5000);
    return () => clearInterval(poll);
  }, [chatAberto, pacienteAtivoChat?.telefone]);

  useEffect(() => {
    const restaurar = async () => {
      try {
        const res = await fetch(`${API_URL}/me`, { credentials: 'include' });
        if (res.ok) { const data = await res.json(); setSessao({ user: data.usuario }); }
      } catch (e) { /* silencioso */ }
      setVerificandoSessaoInicial(false);
    };
    restaurar();
  }, []);

  useEffect(() => {
    if (!sessao) return;
    buscarDados();
    buscarModelos();

    const socket = io({ withCredentials: true, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('agendamento:atualizado', (payload: Partial<Agendamento> & { id: number }) => {
      setAgendamentos(prev => prev.map(a => a.id === payload.id ? { ...a, ...payload } : a));
    });

    socket.on('mensagem:nova', (payload: { telefone: string; texto: string }) => {
      if (pacienteAtivoChatRef.current?.telefone === payload.telefone) {
        setMensagens(prev => [...prev, { texto: payload.texto, origem: 'paciente', data: new Date().toISOString() }]);
      } else {
        adicionarNotificacao(`Nova mensagem de ${payload.telefone}`, 'info');
      }
    });

    const interval = setInterval(buscarDados, 60000);
    return () => { socket.disconnect(); socketRef.current = null; clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessao]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') { setChatAberto(false); setModalAberto(false); setModalCancelamentoAberto(false); setPacienteTimeline(null); }
      if (e.key === 'r' || e.key === 'R') buscarDados();
      if (e.key === '1') setFiltro('TRIAGEM');
      if (e.key === '2') setFiltro('PENDENTE');
      if (e.key === '3') setFiltro('EM ATENDIMENTO');
      if (e.key === '4') setFiltro('AGENDADO');
      if (e.key === '5') setFiltro('FINALIZADO');
      if (e.key === '6') setFiltro('CANCELADO');
      if (e.key === 'd' || e.key === 'D') setFiltro('RELATORIOS');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sidebar actions
  useEffect(() => {
    if (filtro === '__modelos') { setModalModelosAberto(true); setFiltro('TRIAGEM'); }
    if (filtro === '__novo_usuario') { setModalNovoUsuarioAberto(true); setFiltro('TRIAGEM'); }
    if (filtro === '__equipe') { abrirGestaoUsuarios(); setFiltro('TRIAGEM'); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  // ── fetchSeguro ───────────────────────────────────────────────
  const fetchSeguro = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    return fetch(url, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers } });
  }, []);

  // ── buscarDados ───────────────────────────────────────────────
  const buscarDados = async () => {
    if (!sessao) return;
    setCarregandoDados(true);
    try {
      const [resA, resL] = await Promise.all([fetchSeguro(`${API_URL}/agendamentos`), fetchSeguro(`${API_URL}/leads`)]);
      if (resA.status === 401) { fazerLogout(); return; }
      if (resA.ok && resA.headers.get('content-type')?.includes('application/json')) {
        const data: Agendamento[] = await resA.json();
        const limpos = data.map(a => a.status_atendimento === 'PENDENTE' ? { ...a, atendente_nome: undefined } : a);
        if (prevAgendamentosRef.current > 0 && limpos.length > prevAgendamentosRef.current) {
          adicionarNotificacao(`${limpos.length - prevAgendamentosRef.current} novo(s) paciente(s) na fila!`, 'info');
          toast(`${limpos.length - prevAgendamentosRef.current} novo(s) paciente(s) na fila!`, 'info');
        }
        prevAgendamentosRef.current = limpos.length;
        setAgendamentos(limpos);
      }
      if (resL.ok && resL.headers.get('content-type')?.includes('application/json')) setLeads(await resL.json());
    } catch (e: any) { setErroAcesso(e.message); }
    finally { setCarregandoDados(false); setPrimeiraCarregamento(false); }
  };

  const buscarModelos = async () => {
    try {
      const res = await fetchSeguro(`${API_URL}/modelos`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) setModelos(await res.json());
    } catch (e) { /* silencioso */ }
  };

  // ── Notificações ──────────────────────────────────────────────
  const adicionarNotificacao = (texto: string, tipo: Notificacao['tipo']) => {
    setNotificacoes(prev => [{ id: Date.now(), texto, tipo, lida: false, hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }, ...prev].slice(0, 20));
  };

  // ── Auth ──────────────────────────────────────────────────────
  const fazerLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setCarregandoAuth(true); setErroAuth('');
    try {
      const res = await fetch(`${API_URL}/login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha }) });
      const ct = res.headers.get('content-type');
      if (!ct?.includes('application/json')) throw new Error('Erro de servidor.');
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Falha no login');
      setSessao({ user: data.usuario });
    } catch (err: any) { setErroAuth(err.message === 'Failed to fetch' ? 'A API está offline.' : err.message); }
    finally { setCarregandoAuth(false); }
  };

  const fazerLogout = async () => {
    try { await fetch(`${API_URL}/logout`, { method: 'POST', credentials: 'include' }); } catch (e) { /* silencioso */ }
    setSessao(null); setAgendamentos([]); setLeads([]);
  };

  // ── Chat ──────────────────────────────────────────────────────
  const carregarChat = async (paciente: Agendamento | Lead, isLead = false) => {
    const tel = String((paciente as any).telefone || '').replace(/\D/g, '');
    if (!tel) { toast('Sem número de contacto válido.', 'erro'); return; }
    const ag = paciente as Agendamento;
    const isAdminOrManager = sessao?.user.papel === 'admin' || sessao?.user.papel === 'gerente';
    const isConcluido = ['FINALIZADO', 'CANCELADO'].includes(ag.status_atendimento);
    const bloquearEnvio = isLead ? false : (!isConcluido && Boolean(ag.atendente_nome) && ag.atendente_nome !== sessao?.user.nome && !isAdminOrManager);
    setPacienteAtivoChat({ telefone: tel, nome_paciente: isLead ? (paciente as Lead).nome_titular : ag.nome_paciente, bloquearEnvio });
    setChatAberto(true);
    try {
      const res = await fetchSeguro(`${API_URL}/chat/${tel}`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) setMensagens(await res.json());
    } catch (e) { /* silencioso */ }
  };

  const enviarMensagemChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaMensagem.trim() || enviandoMensagem || !pacienteAtivoChat?.telefone || pacienteAtivoChat.bloquearEnvio) return;
    setEnviandoMensagem(true); setDigitando(true);
    setTimeout(() => setDigitando(false), 1500);
    try {
      const res = await fetchSeguro(`${API_URL}/chat/enviar`, { method: 'POST', body: JSON.stringify({ telefone: pacienteAtivoChat.telefone, texto: novaMensagem }) });
      if (res.ok) { setMensagens(prev => [...prev, { texto: novaMensagem, origem: 'ia_ou_recepcao', data: new Date().toISOString() }]); setNovaMensagem(''); }
    } catch (e) { /* silencioso */ } finally { setEnviandoMensagem(false); }
  };

  const enviarMidiaChat = async (file: File) => {
    if (!pacienteAtivoChat?.telefone || pacienteAtivoChat.bloquearEnvio) return;
    setEnviandoMidia(true);
    try {
      const form = new FormData();
      form.append('arquivo', file);
      form.append('telefone', pacienteAtivoChat.telefone);
      const res = await fetch(`${API_URL}/chat/enviar-midia`, { method: 'POST', credentials: 'include', body: form });
      if (res.ok) {
        const reader = new FileReader();
        reader.onload = () => {
          const b64 = (reader.result as string).split(',')[1];
          setMensagens(prev => [...prev, { texto: `📎 ${file.name}`, origem: 'ia_ou_recepcao', data: new Date().toISOString(), mediaBase64: b64, mediaMimetype: file.type }]);
        };
        reader.readAsDataURL(file);
      } else {
        adicionarNotificacao('Erro ao enviar arquivo.', 'erro');
      }
    } catch { adicionarNotificacao('Erro ao enviar arquivo.', 'erro'); }
    finally { setEnviandoMidia(false); }
  };

  const interromperRobo = async (telefone: string) => {
    const ok = await confirm({ mensagem: 'Deseja interromper o robô e assumir este atendimento?', tipo: 'aviso', confirmLabel: 'Assumir', titulo: 'Pausar Bot' });
    if (!ok) return;
    try {
      const res = await fetchSeguro(`${API_URL}/chat/${telefone}/interromper-robo`, { method: 'PUT' });
      if (res.ok) { setLeads(prev => prev.map(l => l.telefone === telefone ? { ...l, status_robo: 'Humano' } : l)); toast('Robô pausado. Você assumiu o atendimento.', 'sucesso'); adicionarNotificacao('Robô pausado.', 'sucesso'); }
      else { const d = await res.json(); toast(d.erro || 'Falha ao pausar.', 'erro'); }
    } catch (e) { toast('Erro de conexão.', 'erro'); }
  };

  const descartarLead = async (id: number) => {
    const ok = await confirm({ mensagem: 'Deseja remover este contacto definitivamente? Esta ação não pode ser desfeita.', tipo: 'perigo', confirmLabel: 'Remover' });
    if (!ok) return;
    try {
      const res = await fetchSeguro(`${API_URL}/leads/${id}`, { method: 'DELETE' });
      if (res.ok) { setLeads(prev => prev.filter(l => l.id !== id)); toast('Contacto removido.', 'sucesso'); }
    } catch (e) { toast('Erro ao descartar.', 'erro'); }
  };

  const converterParaPendente = async (lead: Lead) => {
    const ok = await confirm({ mensagem: `Criar ficha para ${lead.nome_titular || lead.telefone}?`, tipo: 'info', confirmLabel: 'Criar Ficha', titulo: 'Novo Atendimento' });
    if (!ok) return;
    try {
      const res = await fetchSeguro(`${API_URL}/leads/${lead.id}/converter`, { method: 'POST' });
      if (res.ok) { setLeads(prev => prev.filter(l => l.id !== lead.id)); buscarDados(); toast('Ficha criada com sucesso!', 'sucesso'); adicionarNotificacao('Ficha criada!', 'sucesso'); }
      else { const d = await res.json(); toast(d.erro || 'Falha ao converter.', 'erro'); }
    } catch (e) { toast('Erro de conexão.', 'erro'); }
  };

  // ── Atendimentos ──────────────────────────────────────────────
  const assumirAtendimento = async (id: number) => {
    const nome = sessao!.user.nome; const agora = new Date().toISOString();
    const res = await fetchSeguro(`${API_URL}/status`, { method: 'PUT', body: JSON.stringify({ id, status: 'EM ATENDIMENTO', atendente: nome, data_atendimento: agora }) });
    if (res.ok) { setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status_atendimento: 'EM ATENDIMENTO', atendente_nome: nome, data_atendimento: agora } : a)); toast('Paciente assumido.', 'sucesso'); adicionarNotificacao('Paciente assumido.', 'sucesso'); }
    else { const d = await res.json().catch(() => ({})); toast(d.erro || 'Falha.', 'erro'); }
  };

  const devolverParaFila = async (id: number) => {
    const ok = await confirm({ mensagem: 'Devolver este paciente para a fila de Pendentes?', tipo: 'aviso', confirmLabel: 'Devolver' });
    if (!ok) return;
    const res = await fetchSeguro(`${API_URL}/status`, { method: 'PUT', body: JSON.stringify({ id, status: 'PENDENTE', atendente: null }) });
    if (res.ok) setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status_atendimento: 'PENDENTE', atendente_nome: undefined } : a));
    else { const d = await res.json().catch(() => ({})); toast(d.erro || 'Falha.', 'erro'); }
  };

  const iniciarAgendamento = (paciente: Agendamento, isEdicao = false) => {
    setPacienteSelecionado(paciente);
    if (isEdicao) { setMedicoSelecionado(paciente.medico_final || ''); setDataSelecionada(paciente.data_consulta ? paciente.data_consulta.split('T')[0] : ''); setHoraSelecionada(paciente.hora_consulta ? paciente.hora_consulta.substring(0, 5) : ''); }
    else { const mp = paciente.nome_medico && !['Qualquer', 'Indiferente', 'A confirmar'].includes(paciente.nome_medico) ? paciente.nome_medico : ''; setMedicoSelecionado(mp); setDataSelecionada(''); setHoraSelecionada(''); }
    setModalAberto(true);
  };

  const confirmarDataEHora = async (e: React.FormEvent) => {
    e.preventDefault(); if (!pacienteSelecionado) return;
    const res = await fetchSeguro(`${API_URL}/agendar`, { method: 'PUT', body: JSON.stringify({ id: pacienteSelecionado.id, data_consulta: dataSelecionada, hora_consulta: horaSelecionada, medico_final: medicoSelecionado }) });
    if (res.ok) { setAgendamentos(prev => prev.map(a => a.id === pacienteSelecionado.id ? { ...a, status_atendimento: 'AGENDADO', data_consulta: dataSelecionada, hora_consulta: horaSelecionada, medico_final: medicoSelecionado } : a)); setModalAberto(false); toast(`Consulta agendada para ${dataSelecionada}`, 'sucesso'); adicionarNotificacao('Consulta agendada!', 'sucesso'); }
    else { const d = await res.json().catch(() => ({})); toast(d.erro || 'Falha.', 'erro'); }
  };

  const finalizarAtendimento = async (id: number) => {
    const ok = await confirm({ mensagem: 'Deseja marcar esta consulta como finalizada?', tipo: 'info', confirmLabel: 'Finalizar', titulo: 'Concluir Consulta' });
    if (!ok) return;
    const res = await fetchSeguro(`${API_URL}/status`, { method: 'PUT', body: JSON.stringify({ id, status: 'FINALIZADO' }) });
    if (res.ok) { setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status_atendimento: 'FINALIZADO' } : a)); toast('Consulta finalizada!', 'sucesso'); adicionarNotificacao('Consulta finalizada!', 'sucesso'); }
  };

  const renomearAgendamento = async (id: number, novoNome: string) => {
    const res = await fetchSeguro(`${API_URL}/agendamentos/${id}/nome`, { method: 'PATCH', body: JSON.stringify({ nome: novoNome }) });
    if (res.ok) setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, nome_paciente: novoNome } : a));
    else toast('Erro ao renomear.', 'erro');
  };

  const renomearLead = async (id: number, novoNome: string) => {
    const res = await fetchSeguro(`${API_URL}/leads/${id}/nome`, { method: 'PATCH', body: JSON.stringify({ nome: novoNome }) });
    if (res.ok) setLeads(prev => prev.map(l => l.id === id ? { ...l, nome_titular: novoNome } : l));
    else toast('Erro ao renomear.', 'erro');
  };

  const iniciarCancelamento = (paciente: Agendamento) => { setPacienteCancelamento(paciente); setMotivoCancelamento(''); setModalCancelamentoAberto(true); };

  const confirmarCancelamento = async (e: React.FormEvent) => {
    e.preventDefault(); if (!pacienteCancelamento) return;
    const agora = new Date().toISOString();
    const res = await fetchSeguro(`${API_URL}/status`, { method: 'PUT', body: JSON.stringify({ id: pacienteCancelamento.id, status: 'CANCELADO', observacoes: motivoCancelamento, notificar: pacienteCancelamento.status_atendimento === 'AGENDADO', data_cancelamento: agora }) });
    if (res.ok) { setAgendamentos(prev => prev.map(a => a.id === pacienteCancelamento.id ? { ...a, status_atendimento: 'CANCELADO', observacoes: motivoCancelamento, data_cancelamento: agora } : a)); setModalCancelamentoAberto(false); toast('Consulta cancelada.', 'aviso'); }
  };

  // ── Drag & Drop ───────────────────────────────────────────────
  const DRAG_STATUS_MAP: Record<string, string> = { 'PENDENTE': 'PENDENTE', 'EM ATENDIMENTO': 'EM ATENDIMENTO', 'AGENDADO': 'AGENDADO' };

  const handleDragStart = (event: DragStartEvent) => {
    const ag = agendamentos.find(a => String(a.id) === event.active.id);
    if (ag) setDragAtivo(ag);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDragAtivo(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const novoStatus = DRAG_STATUS_MAP[over.id as string];
    if (!novoStatus) return;
    const ag = agendamentos.find(a => String(a.id) === active.id);
    if (!ag || ag.status_atendimento === novoStatus) return;
    const nome = sessao!.user.nome; const agora = new Date().toISOString();
    const res = await fetchSeguro(`${API_URL}/status`, { method: 'PUT', body: JSON.stringify({ id: ag.id, status: novoStatus, atendente: novoStatus === 'EM ATENDIMENTO' ? nome : null, data_atendimento: novoStatus === 'EM ATENDIMENTO' ? agora : undefined }) });
    if (res.ok) { setAgendamentos(prev => prev.map(a => a.id === ag.id ? { ...a, status_atendimento: novoStatus, atendente_nome: novoStatus === 'EM ATENDIMENTO' ? nome : undefined } : a)); toast(`Movido para ${novoStatus.toLowerCase()}`, 'sucesso'); }
    else toast('Não foi possível mover o card.', 'erro');
  };

  // ── Usuários ──────────────────────────────────────────────────
  const criarNovaConta = async (e: React.FormEvent) => {
    e.preventDefault(); setMsgNovoUsuario({ texto: 'A processar...', tipo: 'loading' });
    try {
      const res = await fetchSeguro(`${API_URL}/usuarios`, { method: 'POST', body: JSON.stringify(novoUsuarioForm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro);
      setMsgNovoUsuario({ texto: data.mensagem, tipo: 'sucesso' });
      setTimeout(() => { setModalNovoUsuarioAberto(false); setNovoUsuarioForm({ nome: '', usuario: '', senha: '', papel: 'recepcao' }); setMsgNovoUsuario({ texto: '', tipo: '' }); }, 2000);
    } catch (err: any) { setMsgNovoUsuario({ texto: err.message, tipo: 'erro' }); }
  };

  const abrirGestaoUsuarios = async () => {
    setModalGestaoUsuariosAberto(true);
    try {
      const res = await fetchSeguro(`${API_URL}/usuarios`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) setListaUsuarios(await res.json());
    } catch (e) { /* silencioso */ }
  };

  const atualizarNomeUsuario = async (id: number) => {
    const res = await fetchSeguro(`${API_URL}/usuarios/${id}`, { method: 'PUT', body: JSON.stringify({ nome: novoNomeGestao }) });
    if (res.ok) { setListaUsuarios(prev => prev.map(u => u.id === id ? { ...u, nome: novoNomeGestao } : u)); setEditandoUsuarioId(null); }
  };

  const alterarSenhaUsuario = async (id: number) => {
    const res = await fetchSeguro(`${API_URL}/usuarios/${id}/senha`, { method: 'PUT', body: JSON.stringify({ novaSenha: novaSenhaGestao }) });
    if (res.ok) { setEditandoSenhaId(null); setNovaSenhaGestao(''); toast('Senha alterada.', 'sucesso'); }
  };

  const excluirUsuario = async (id: number) => {
    const ok = await confirm({ mensagem: 'Excluir utilizador permanentemente?', tipo: 'perigo', confirmLabel: 'Excluir' });
    if (!ok) return;
    const res = await fetchSeguro(`${API_URL}/usuarios/${id}`, { method: 'DELETE' });
    if (res.ok) { setListaUsuarios(prev => prev.filter(u => u.id !== id)); toast('Utilizador removido.', 'sucesso'); }
  };

  // ── Modelos ───────────────────────────────────────────────────
  const salvarModelo = async (e: React.FormEvent) => {
    e.preventDefault(); if (!novoModeloForm.titulo || !novoModeloForm.texto) return;
    const url = editandoModelo ? `${API_URL}/modelos/${editandoModelo.id}` : `${API_URL}/modelos`;
    const res = await fetchSeguro(url, { method: editandoModelo ? 'PUT' : 'POST', body: JSON.stringify(novoModeloForm) });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const m = await res.json();
      if (editandoModelo) setModelos(prev => prev.map(item => item.id === m.id ? m : item));
      else setModelos(prev => [...prev, m]);
      setNovoModeloForm({ titulo: '', texto: '' }); setEditandoModelo(null); setModalModelosAberto(false); toast('Modelo salvo.', 'sucesso');
    }
  };

  const removerModelo = async (id: number) => {
    const ok = await confirm({ mensagem: 'Remover este modelo permanentemente?', tipo: 'perigo', confirmLabel: 'Remover' });
    if (!ok) return;
    const res = await fetchSeguro(`${API_URL}/modelos/${id}`, { method: 'DELETE' });
    if (res.ok) { setModelos(prev => prev.filter(m => m.id !== id)); toast('Modelo removido.', 'sucesso'); }
  };

  const abrirEdicaoModelo = (modelo: ModeloMensagem) => { setEditandoModelo(modelo); setNovoModeloForm({ titulo: modelo.titulo, texto: modelo.texto }); setModalModelosAberto(true); setDropdownModelosAberto(false); };

  // ── Filtros ───────────────────────────────────────────────────
  const aplicarFiltros = <T extends Agendamento | Lead>(items: T[], isLead = false): T[] => {
    return items.filter(item => {
      const ag = item as Agendamento; const ld = item as Lead;
      const termo = searchTerm.toLowerCase();
      const matchText = (ag.nome_paciente || ld.nome_titular || '').toLowerCase().includes(termo) ||
        (ag.cpf_paciente || ld.cpf_titular || '').replace(/\D/g, '').includes(termo.replace(/\D/g, ''));
      let matchData = true;
      if (dataInicio || dataFim) {
        let dStr = '';
        if (isLead) dStr = new Date(ld.ultima_mensagem).toISOString().split('T')[0];
        else dStr = (['AGENDADO', 'FINALIZADO'].includes(ag.status_atendimento)) ? (ag.data_consulta ? ag.data_consulta.split('T')[0] : '') : new Date(ag.data_criacao).toISOString().split('T')[0];
        if (!dStr) matchData = false;
        else if (dataInicio && dataFim) matchData = dStr >= dataInicio && dStr <= dataFim;
        else if (dataInicio) matchData = dStr >= dataInicio;
        else if (dataFim) matchData = dStr <= dataFim;
      }
      return matchText && matchData;
    });
  };

  const contagens: Record<string, number> = {
    TRIAGEM: leads.filter(l => l.sessao_intencao !== 'concluido').length, PENDENTE: agendamentos.filter(a => a.status_atendimento === 'PENDENTE').length,
    'EM ATENDIMENTO': agendamentos.filter(a => a.status_atendimento === 'EM ATENDIMENTO').length,
    AGENDADO: agendamentos.filter(a => a.status_atendimento === 'AGENDADO').length,
    FINALIZADO: agendamentos.filter(a => a.status_atendimento === 'FINALIZADO').length,
    CANCELADO: agendamentos.filter(a => a.status_atendimento === 'CANCELADO').length,
  };

  // ── Loading inicial ───────────────────────────────────────────
  if (verificandoSessaoInicial) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#11caa0] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-bold">A carregar OtoFlow...</p>
        </div>
      </div>
    );
  }

  // ── Login ─────────────────────────────────────────────────────
  if (!sessao) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#003a66] to-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#11caa0]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#005088]/10 rounded-full blur-3xl" />
        </div>
        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/10 relative">
          <div className="flex flex-col items-center mb-8">
            <img src="/logo.png" alt="Otoflow CRM" className="h-20 object-contain mb-4 drop-shadow-2xl" />
            <p className="text-slate-400 text-sm">Sistema de Gestão Clínica</p>
          </div>
          <form onSubmit={fazerLogin} className="space-y-4">
            {erroAuth && <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-sm flex items-center gap-2 border border-red-500/20"><AlertCircle size={16} /> {erroAuth}</div>}
            <div>
              <label className="text-sm font-bold text-slate-300 block mb-1.5">Usuário</label>
              <input type="text" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/10 border border-white/20 text-white rounded-xl p-3.5 outline-none focus:border-[#11caa0] placeholder-slate-500 transition-colors" placeholder="nome de usuário" />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-300 block mb-1.5">Senha</label>
              <input type="password" required value={senha} onChange={e => setSenha(e.target.value)} className="w-full bg-white/10 border border-white/20 text-white rounded-xl p-3.5 outline-none focus:border-[#11caa0] placeholder-slate-500 transition-colors" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={carregandoAuth} className="w-full bg-gradient-to-r from-[#11caa0] to-[#005088] text-white font-bold py-4 rounded-xl flex justify-center items-center transition-all shadow-lg hover:shadow-[#11caa0]/25 hover:scale-[1.02] active:scale-[0.98] mt-2">
              {carregandoAuth ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Entrar no Sistema'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── App autenticado ───────────────────────────────────────────
  const ABAS = ['TRIAGEM', 'PENDENTE', 'EM ATENDIMENTO', 'AGENDADO', 'FINALIZADO', 'CANCELADO'] as const;
  const filtrosLeads = aplicarFiltros(leads, true);
  const filtrosAg = aplicarFiltros(agendamentos);

  const exportarLeadsCSV = () => {
    const BOM = '﻿';
    const headers = ['Nome', 'Telefone', 'CPF', 'Status Bot', 'Última Mensagem', 'Data Cadastro'];
    const rows = filtrosLeads.map(lead => [
      lead.nome_atendimento || lead.nome_titular || lead.telefone,
      lead.telefone,
      lead.cpf_titular || '',
      lead.status_robo,
      lead.ultima_mensagem ? new Date(lead.ultima_mensagem).toLocaleString('pt-BR') : '',
      lead.data_cadastro ? new Date(lead.data_cadastro).toLocaleDateString('pt-BR') : '',
    ]);
    const csv = BOM + [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderKanban = () => {
    if (filtro === 'TRIAGEM' || filtro === 'LEADS') {
      const isTriage = filtro === 'TRIAGEM';
      const lista = isTriage
        ? filtrosLeads.filter(l => l.sessao_intencao !== 'concluido')
        : filtrosLeads;
      return lista.length ? lista.map(lead => (
        <div key={lead.id} className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all relative flex flex-col group`}>
          <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${isTriage ? 'bg-gradient-to-b from-[#11caa0] to-[#0e9f7e]' : 'bg-gradient-to-b from-purple-500 to-purple-600'}`} />
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-10 h-10 ${getAvatarCor(lead.nome_titular || lead.nome_atendimento || lead.telefone)} text-white rounded-full flex items-center justify-center font-extrabold text-sm shrink-0 shadow-sm`}>
                {(lead.nome_titular || lead.nome_atendimento || lead.telefone).substring(0, 2).toUpperCase()}
              </div>
              <div>
                {editandoNomeLead?.id === lead.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      value={editandoNomeLead.valor}
                      onChange={e => setEditandoNomeLead({ id: lead.id, valor: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && editandoNomeLead.valor.trim().length >= 2) { renomearLead(lead.id, editandoNomeLead.valor.trim()); setEditandoNomeLead(null); }
                        if (e.key === 'Escape') setEditandoNomeLead(null);
                      }}
                      className="text-sm font-bold text-slate-800 border-b border-[#11caa0] outline-none bg-transparent w-36"
                      autoFocus
                    />
                    <button onClick={() => { if (editandoNomeLead.valor.trim().length >= 2) { renomearLead(lead.id, editandoNomeLead.valor.trim()); setEditandoNomeLead(null); } }} className="text-[#11caa0] hover:text-[#0e9f7e]"><CheckCircle2 size={13} /></button>
                    <button onClick={() => setEditandoNomeLead(null)} className="text-slate-400 hover:text-red-400"><XCircle size={13} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 group/nome">
                    <h3 className="font-bold text-slate-800 leading-tight">
                      {lead.nome_titular || lead.nome_atendimento || lead.telefone}
                      {lead.nome_titular && lead.nome_atendimento && <span className="font-normal text-slate-500"> ({lead.nome_atendimento})</span>}
                    </h3>
                    <button onClick={() => setEditandoNomeLead({ id: lead.id, valor: lead.nome_titular || '' })} className="opacity-0 group-hover/nome:opacity-100 text-slate-300 hover:text-[#005088] transition-opacity" title="Editar nome"><Edit2 size={11} /></button>
                  </div>
                )}
                {(lead.nome_atendimento || lead.nome_titular) && <p className="text-[10px] text-slate-400 font-semibold">{lead.telefone}</p>}
                {!isTriage && lead.cpf_titular && <p className="text-[10px] text-slate-400 font-semibold">CPF: {lead.cpf_titular}</p>}
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{tempoAtras(lead.ultima_mensagem)}</p>
              </div>
            </div>
            {isTriage && <span className={`px-2 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider ${lead.status_robo === 'Robô' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>{lead.status_robo === 'Robô' ? '🤖 Bot' : '👤 Pausado'}</span>}
          </div>
          <div className="mt-auto pt-3 border-t border-slate-100 flex flex-col gap-2">
            <button onClick={() => carregarChat(lead, true)} className={`w-full ${isTriage ? 'bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700' : 'bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700'} py-2.5 rounded-xl flex justify-center items-center gap-2 transition-colors font-bold text-xs`}>
              <MessageSquare size={15} /> {isTriage ? 'Ver Conversa' : 'Iniciar Resgate'}
            </button>
            {isTriage && lead.status_robo === 'Robô' && (
              <button onClick={() => interromperRobo(lead.telefone)} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl flex justify-center items-center gap-2 font-bold text-xs shadow-sm transition-colors">
                <XCircle size={15} /> Pausar Bot & Assumir
              </button>
            )}
            {isTriage && lead.status_robo !== 'Robô' && (
              <div className="flex gap-2">
                <button onClick={() => converterParaPendente(lead)} className="flex-[2] bg-gradient-to-r from-[#005088] to-[#003a66] text-white py-2.5 rounded-xl flex justify-center items-center gap-1.5 font-bold text-xs shadow-sm hover:opacity-90 transition-opacity">
                  <ArrowRight size={13} /> Criar Ficha
                </button>
                <button onClick={() => descartarLead(lead.id)} className="flex-1 bg-white border border-red-200 text-red-500 hover:bg-red-50 py-2.5 rounded-xl flex justify-center transition-colors font-bold">
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      )) : (
        <div className="col-span-full py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">{isTriage ? <Activity size={32} className="text-slate-300" /> : <Target size={32} className="text-slate-300" />}</div>
          <p className="text-slate-500 font-bold">{isTriage ? 'Nenhum fluxo de triagem ativo.' : 'Sem leads para recuperação.'}</p>
          {isTriage && <p className="text-slate-400 text-sm mt-1">As conversas do bot aparecem aqui.</p>}
        </div>
      );
    }

    const lista = filtrosAg.filter(a => a.status_atendimento === filtro);

    if (primeiraCarregamento) return <CardSkeletonGrid count={6} />;

    if (!lista.length) return (
      <div className="col-span-full py-20 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} className="text-slate-300" /></div>
        <p className="text-slate-500 font-bold">Sem registos nesta fila.</p>
      </div>
    );

    return lista.map(item => (
      <SortableCard key={item.id} id={String(item.id)}>
        <PatientCard item={item} onChat={carregarChat} onAgendar={iniciarAgendamento} onCancelar={iniciarCancelamento} onAssumir={assumirAtendimento} onDevolver={devolverParaFila} onFinalizar={finalizarAtendimento} onTimeline={setPacienteTimeline} onRenomear={renomearAgendamento} />
      </SortableCard>
    ));
  };

  return (
    <AppContext.Provider value={{ sessao, fetchSeguro, adicionarNotificacao, setNotificacaoErro }}>
      <div className="flex h-screen bg-[#F0F4F8] font-sans text-slate-800 overflow-hidden">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          * { font-family: 'Inter', sans-serif; }
          .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          @keyframes slide-up { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
          .animate-slide-up { animation: slide-up 0.2s ease; }
          @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        `}</style>

        <ToastContainer toasts={toasts} onRemover={removerToast} />
        <ConfirmModal {...confirmState} onConfirm={() => responder(true)} onCancel={() => responder(false)} />

        {/* Toast de erro legado (para compatibilidade) */}
        {notificacaoErro && (
          <div className="fixed top-4 right-4 z-[400] animate-slide-up max-w-sm">
            <div className="bg-red-600 text-white px-5 py-4 rounded-2xl flex items-start gap-3 shadow-2xl">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div className="flex-1"><p className="font-extrabold text-sm">Ação Rejeitada</p><p className="text-xs opacity-90 mt-0.5">{notificacaoErro}</p></div>
              <button onClick={() => setNotificacaoErro(null)} className="hover:bg-white/20 p-1 rounded-lg transition-colors ml-1"><X size={16} /></button>
            </div>
          </div>
        )}

        <Sidebar filtro={filtro} setFiltro={setFiltro} contagens={contagens} erroAcesso={erroAcesso} fazerLogout={fazerLogout} setModalModelosAberto={setModalModelosAberto} setModalNovoUsuarioAberto={setModalNovoUsuarioAberto} abrirGestaoUsuarios={abrirGestaoUsuarios} setModalWahaAberto={setModalWahaAberto} />

        <main className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ${chatAberto ? 'mr-[400px]' : ''}`}>
          <Header filtro={filtro} searchTerm={searchTerm} setSearchTerm={setSearchTerm} dataInicio={dataInicio} setDataInicio={setDataInicio} dataFim={dataFim} setDataFim={setDataFim} carregandoDados={carregandoDados} buscarDados={buscarDados} notificacoes={notificacoes} setNotificacoes={setNotificacoes} painelNotifAberto={painelNotifAberto} setPainelNotifAberto={setPainelNotifAberto} />

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {!['RELATORIOS', 'LEADS'].includes(filtro) && (
              <div className="flex gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-x-auto scrollbar-hide">
                {ABAS.map(aba => (
                  <button key={aba} onClick={() => setFiltro(aba)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold text-xs transition-all whitespace-nowrap ${filtro === aba ? 'bg-[#005088] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
                    {aba === 'TRIAGEM' ? 'Triagem' : aba === 'PENDENTE' ? 'Pendentes' : aba === 'EM ATENDIMENTO' ? 'Em Atendimento' : aba === 'AGENDADO' ? 'Agendados' : aba === 'FINALIZADO' ? 'Finalizados' : 'Cancelados'}
                    {(contagens[aba] ?? 0) > 0 && <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filtro === aba ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{contagens[aba]}</span>}
                  </button>
                ))}
              </div>
            )}

            {filtro === 'LEADS' && (
              <div className="flex justify-between items-center mb-5">
                <p className="text-sm font-bold text-slate-500">{filtrosLeads.length} leads encontrados</p>
                <button onClick={exportarLeadsCSV} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm">
                  <Download size={15} /> Exportar Excel
                </button>
              </div>
            )}

            {filtro === 'RELATORIOS' ? (
              <Dashboard agendamentos={agendamentos} leads={leads} />
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <SortableContext items={filtrosAg.map(a => String(a.id))} strategy={verticalListSortingStrategy}>
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 pb-10">
                    {renderKanban()}
                  </div>
                </SortableContext>
                <DragOverlay>
                  {dragAtivo && (
                    <div className="bg-white rounded-2xl p-4 shadow-2xl border border-[#11caa0] opacity-95 rotate-1 scale-105">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full ${getAvatarCor(dragAtivo.nome_paciente)} text-white flex items-center justify-center font-extrabold text-xs`}>{dragAtivo.nome_paciente.substring(0, 2).toUpperCase()}</div>
                        <p className="font-bold text-slate-800 text-sm">{dragAtivo.nome_paciente}</p>
                      </div>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </main>

        {chatAberto && pacienteAtivoChat && (
          <ChatPanel pacienteAtivoChat={pacienteAtivoChat} mensagens={mensagens} novaMensagem={novaMensagem} setNovaMensagem={setNovaMensagem} enviandoMensagem={enviandoMensagem} digitando={digitando} modelos={modelos} dropdownModelosAberto={dropdownModelosAberto} setDropdownModelosAberto={setDropdownModelosAberto} onClose={() => { setChatAberto(false); setDropdownModelosAberto(false); }} onEnviar={enviarMensagemChat} onEnviarMidia={enviarMidiaChat} enviandoMidia={enviandoMidia} onInterromperRobo={interromperRobo} onAbrirModelos={() => { setModalModelosAberto(true); setDropdownModelosAberto(false); }} onEditarModelo={abrirEdicaoModelo} onRemoverModelo={removerModelo} />
        )}

        {pacienteTimeline && <PatientTimeline paciente={pacienteTimeline} onClose={() => setPacienteTimeline(null)} />}
        {modalAberto && pacienteSelecionado && <ScheduleModal paciente={pacienteSelecionado} data={dataSelecionada} setData={setDataSelecionada} hora={horaSelecionada} setHora={setHoraSelecionada} medico={medicoSelecionado} setMedico={setMedicoSelecionado} onSubmit={confirmarDataEHora} onClose={() => setModalAberto(false)} />}
        {modalCancelamentoAberto && pacienteCancelamento && <CancelModal paciente={pacienteCancelamento} motivo={motivoCancelamento} setMotivo={setMotivoCancelamento} onSubmit={confirmarCancelamento} onClose={() => setModalCancelamentoAberto(false)} />}
        {modalNovoUsuarioAberto && <UserModal form={novoUsuarioForm} setForm={setNovoUsuarioForm} msg={msgNovoUsuario} onSubmit={criarNovaConta} onClose={() => setModalNovoUsuarioAberto(false)} />}
        {modalGestaoUsuariosAberto && <UserManagementModal usuarios={listaUsuarios} editandoSenhaId={editandoSenhaId} setEditandoSenhaId={setEditandoSenhaId} novaSenha={novaSenhaGestao} setNovaSenha={setNovaSenhaGestao} editandoUsuarioId={editandoUsuarioId} setEditandoUsuarioId={setEditandoUsuarioId} novoNome={novoNomeGestao} setNovoNome={setNovoNomeGestao} onAtualizarNome={atualizarNomeUsuario} onAlterarSenha={alterarSenhaUsuario} onExcluir={excluirUsuario} onClose={() => { setModalGestaoUsuariosAberto(false); setEditandoSenhaId(null); setEditandoUsuarioId(null); }} />}
        {modalWahaAberto && <WahaModal onClose={() => setModalWahaAberto(false)} />}
        {modalModelosAberto && <TemplateModal modelos={modelos} editando={editandoModelo} form={novoModeloForm} setForm={setNovoModeloForm} onSubmit={salvarModelo} onEditar={abrirEdicaoModelo} onRemover={removerModelo} onClose={() => { setModalModelosAberto(false); setEditandoModelo(null); setNovoModeloForm({ titulo: '', texto: '' }); }} />}
      </div>
    </AppContext.Provider>
  );
}
