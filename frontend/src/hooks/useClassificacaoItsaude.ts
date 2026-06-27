import { useState, useEffect } from 'react';

type Classificacao = 'novo_lead' | 'novo_paciente' | 'recorrente' | null;
interface Resultado { classificacao: Classificacao; nome_itsaude?: string; total_consultas?: number; }

const _cache = new Map<number, Resultado>();

async function _fetch(leadId: number): Promise<Resultado> {
  if (_cache.has(leadId)) return _cache.get(leadId)!;
  try {
    const r = await fetch(`/api/leads/${leadId}/classificar-itsaude`, { credentials: 'include' });
    const d: Resultado = r.ok ? await r.json() : { classificacao: null };
    _cache.set(leadId, d);
    return d;
  } catch {
    const d: Resultado = { classificacao: null };
    _cache.set(leadId, d);
    return d;
  }
}

export async function prefetchClassificacoes(ids: number[]): Promise<Record<number, Classificacao>> {
  const results = await Promise.allSettled(ids.map(id => _fetch(id)));
  const mapa: Record<number, Classificacao> = {};
  ids.forEach((id, i) => {
    const r = results[i];
    mapa[id] = r.status === 'fulfilled' ? (r.value.classificacao ?? null) : null;
  });
  return mapa;
}

export function useClassificacaoItsaude(leadId: number) {
  const [dados, setDados] = useState<Resultado & { carregando: boolean }>(
    _cache.has(leadId) ? { ..._cache.get(leadId)!, carregando: false } : { classificacao: null, carregando: true }
  );

  useEffect(() => {
    _fetch(leadId).then(d => setDados({ ...d, carregando: false }));
  }, [leadId]);

  return dados;
}
