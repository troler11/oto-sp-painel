import { useState, useEffect } from 'react';

const _cache = new Map<string, string | null>();

export function useProfilePic(telefone: string | undefined) {
  const tel = telefone?.replace(/\D/g, '') ?? '';
  const [url, setUrl] = useState<string | null>(_cache.has(tel) ? (_cache.get(tel) ?? null) : null);

  useEffect(() => {
    if (!tel) return;
    if (_cache.has(tel)) { setUrl(_cache.get(tel) ?? null); return; }
    fetch(`/api/contatos/${tel}/foto`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { const u = d?.url ?? null; _cache.set(tel, u); setUrl(u); })
      .catch(() => { _cache.set(tel, null); });
  }, [tel]);

  return url;
}
