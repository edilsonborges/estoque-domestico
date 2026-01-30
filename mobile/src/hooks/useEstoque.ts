import { useState, useEffect } from 'react';
import { getEstoques, type Estoque } from '../services/estoque.service';
import { useCachedQuery } from './useCachedQuery';

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export function useEstoque() {
  const { data: estoques, loading, refresh } = useCachedQuery<Estoque[]>(
    'estoques',
    getEstoques,
    { ttl: CACHE_TTL },
  );

  const [estoque, setEstoque] = useState<Estoque | null>(null);

  useEffect(() => {
    if (estoques && estoques.length > 0) {
      setEstoque(estoques[0]);
    } else {
      setEstoque(null);
    }
  }, [estoques]);

  return {
    estoque,
    estoques: estoques ?? [],
    loading,
    refresh,
  };
}
