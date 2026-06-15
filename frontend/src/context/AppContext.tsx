import { createContext, useContext } from 'react';
import { Sessao, Notificacao } from '../types';

interface AppContextValue {
  sessao: Sessao | null;
  fetchSeguro: (url: string, options?: RequestInit) => Promise<Response>;
  adicionarNotificacao: (texto: string, tipo: Notificacao['tipo']) => void;
  setNotificacaoErro: (msg: string | null) => void;
}

export const AppContext = createContext<AppContextValue>({} as AppContextValue);
export const useApp = () => useContext(AppContext);
