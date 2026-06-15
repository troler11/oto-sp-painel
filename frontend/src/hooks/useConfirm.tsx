import { useState, useCallback, useRef } from 'react';

interface ConfirmOptions {
  titulo?: string;
  mensagem: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tipo?: 'perigo' | 'aviso' | 'info';
}

interface ConfirmState extends ConfirmOptions {
  aberto: boolean;
  resolve: ((v: boolean) => void) | null;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    aberto: false, mensagem: '', resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const opts = typeof options === 'string' ? { mensagem: options } : options;
    return new Promise(resolve => {
      setState({ aberto: true, resolve, ...opts });
    });
  }, []);

  const responder = useCallback((valor: boolean) => {
    state.resolve?.(valor);
    setState(s => ({ ...s, aberto: false, resolve: null }));
  }, [state]);

  return { confirm, confirmState: state, responder };
}
