import { useState, useEffect } from 'react';

// Cache LRU simples: Map preserva ordem de inserção, então reinserir uma chave
// existente a move para o fim. Ao estourar o limite, remove a mais antiga (primeira).
const CACHE_MAX = 300;
const _cache = new Map<string, string | null>();

function cacheGet(tel: string): string | null | undefined {
  if (!_cache.has(tel)) return undefined;
  const val = _cache.get(tel);
  _cache.delete(tel);
  _cache.set(tel, val ?? null);
  return val;
}

function cacheSet(tel: string, val: string | null) {
  _cache.delete(tel);
  _cache.set(tel, val);
  if (_cache.size > CACHE_MAX) {
    const chaveAntiga = _cache.keys().next().value;
    if (chaveAntiga !== undefined) _cache.delete(chaveAntiga);
  }
}

export function useProfilePic(telefone: string | undefined) {
  const tel = telefone?.replace(/\D/g, '') ?? '';
  const [url, setUrl] = useState<string | null>(() => cacheGet(tel) ?? null);

  useEffect(() => {
    if (!tel) return;
    const cached = cacheGet(tel);
    if (cached !== undefined) { setUrl(cached); return; }
    fetch(`/api/contatos/${tel}/foto`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { const u = d?.url ?? null; cacheSet(tel, u); setUrl(u); })
      .catch(() => { cacheSet(tel, null); });
  }, [tel]);

  return url;
}
