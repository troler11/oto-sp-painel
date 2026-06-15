import { useState, useCallback } from 'react';

export type ToastTipo = 'sucesso' | 'erro' | 'info' | 'aviso';

export interface Toast {
  id: number;
  texto: string;
  tipo: ToastTipo;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((texto: string, tipo: ToastTipo = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, texto, tipo }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const remover = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, toast, remover };
}
