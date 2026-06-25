import { useState, useEffect, useCallback } from 'react';
import { X, Wifi, WifiOff, RefreshCw, QrCode, Play, Square, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const API_URL = '/api';

interface Props { onClose: () => void; }

type SessionStatus = 'WORKING' | 'SCAN_QR_CODE' | 'STARTING' | 'STOPPED' | 'FAILED' | string;

export default function WahaModal({ onClose }: Props) {
  const { fetchSeguro } = useApp();
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [acao, setAcao] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const buscarStatus = useCallback(async () => {
    setErro(null);
    try {
      const r = await fetchSeguro(`${API_URL}/waha/status`);
      if (!r.ok) { const d = await r.json(); setErro(d.erro || 'Erro ao buscar status.'); return; }
      const d = await r.json();
      setStatus(d.status || d.engine?.status || 'UNKNOWN');
    } catch {
      setErro('Não foi possível contactar o WAHA.');
    } finally {
      setCarregando(false);
    }
  }, [fetchSeguro]);

  const buscarQR = useCallback(async () => {
    try {
      const r = await fetchSeguro(`${API_URL}/waha/qr`);
      if (!r.ok) return;
      const d = await r.json();
      setQr(d.value || d.qr || null);
    } catch { /* silencioso */ }
  }, [fetchSeguro]);

  useEffect(() => {
    buscarStatus();
  }, [buscarStatus]);

  useEffect(() => {
    if (status === 'SCAN_QR_CODE') buscarQR();
    else setQr(null);
  }, [status, buscarQR]);

  // Polling automático quando aguardando QR ou iniciando
  useEffect(() => {
    if (!['SCAN_QR_CODE', 'STARTING'].includes(status || '')) return;
    const t = setInterval(buscarStatus, 4000);
    return () => clearInterval(t);
  }, [status, buscarStatus]);

  const executar = async (endpoint: string, label: string) => {
    setAcao(label);
    setErro(null);
    try {
      const r = await fetchSeguro(`${API_URL}/waha/${endpoint}`, { method: 'POST' });
      if (!r.ok) { const d = await r.json(); setErro(d.erro || 'Ação falhou.'); }
      else { await buscarStatus(); }
    } catch {
      setErro('Erro ao executar ação.');
    } finally {
      setAcao(null);
    }
  };

  const statusInfo = () => {
    switch (status) {
      case 'WORKING':      return { label: 'Conectado', cor: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle2 size={16} className="text-emerald-500" /> };
      case 'SCAN_QR_CODE': return { label: 'Aguardando QR Code', cor: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: <QrCode size={16} className="text-amber-500" /> };
      case 'STARTING':     return { label: 'Iniciando...', cor: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: <Loader2 size={16} className="text-blue-500 animate-spin" /> };
      case 'STOPPED':      return { label: 'Parado', cor: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', icon: <WifiOff size={16} className="text-slate-400" /> };
      case 'FAILED':       return { label: 'Falhou', cor: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: <AlertCircle size={16} className="text-red-500" /> };
      default:             return { label: status || '—', cor: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', icon: <WifiOff size={16} className="text-slate-400" /> };
    }
  };

  const info = statusInfo();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#005088] to-[#003a66] p-5 flex justify-between items-center text-white">
          <h2 className="font-extrabold flex items-center gap-2">
            <Wifi size={20} /> Configuração WhatsApp (WAHA)
          </h2>
          <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-xl transition-colors"><X size={19} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Status da Sessão</p>
              <button onClick={() => { setCarregando(true); buscarStatus(); }}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#005088] font-bold transition-colors">
                <RefreshCw size={13} className={carregando ? 'animate-spin' : ''} /> Atualizar
              </button>
            </div>
            {carregando ? (
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <Loader2 size={16} className="text-slate-400 animate-spin" />
                <span className="text-sm text-slate-500 font-medium">Verificando...</span>
              </div>
            ) : (
              <div className={`flex items-center gap-2.5 p-3 rounded-xl border ${info.bg}`}>
                {info.icon}
                <span className={`text-sm font-extrabold ${info.cor}`}>{info.label}</span>
              </div>
            )}
          </div>

          {/* QR Code */}
          {status === 'SCAN_QR_CODE' && (
            <div className="text-center">
              <p className="text-xs text-slate-500 font-bold mb-3 uppercase tracking-wider">Escaneie com o WhatsApp</p>
              {qr ? (
                <div className="inline-block p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-sm">
                  <img src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`} alt="QR Code" className="w-48 h-48" />
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 py-8 bg-slate-50 rounded-xl border border-slate-200">
                  <Loader2 size={18} className="text-slate-400 animate-spin" />
                  <span className="text-sm text-slate-500">Carregando QR...</span>
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-2">Atualizando automaticamente a cada 4s</p>
            </div>
          )}

          {/* Erro */}
          {erro && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700 font-semibold">{erro}</p>
            </div>
          )}

          {/* Botões de ação */}
          <div className="grid grid-cols-2 gap-3">
            {status !== 'WORKING' && (
              <button disabled={!!acao} onClick={() => executar('start', 'start')}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 rounded-xl font-extrabold text-sm transition-colors shadow-sm">
                {acao === 'start' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                Conectar
              </button>
            )}
            {status === 'WORKING' && (
              <button disabled={!!acao} onClick={() => executar('stop', 'stop')}
                className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl font-extrabold text-sm transition-colors shadow-sm">
                {acao === 'stop' ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />}
                Desconectar
              </button>
            )}
            <button disabled={!!acao} onClick={() => executar('restart', 'restart')}
              className="flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 py-3 rounded-xl font-extrabold text-sm transition-colors">
              {acao === 'restart' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Reiniciar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
