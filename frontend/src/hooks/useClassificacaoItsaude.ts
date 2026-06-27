import { useState, useEffect } from 'react';

type Classificacao = 'novo_lead' | 'novo_paciente' | 'recorrente' | null;
interface Resultado { classificacao: Classificacao; nome_itsaude?: string; total_consultas?: number; }

const _cache = new Map<number, Resultado>();

export function useClassificacaoItsaude(leadId: number) {
  const [dados, setDados] = useState<Resultado & { carregando: boolean }>(
    _cache.has(leadId) ? { ..._cache.get(leadId)!, carregando: false } : { classificacao: null, carregando: true }
  );

  useEffect(() => {
    if (_cache.has(leadId)) { setDados({ ..._cache.get(leadId)!, carregando: false }); return; }
    fetch(`/api/leads/${leadId}/classificar-itsaude`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { classificacao: null })
      .then(d => { _cache.set(leadId, d); setDados({ ...d, carregando: false }); })
      .catch(() => setDados({ classificacao: null, carregando: false }));
  }, [leadId]);

  return dados;
}
