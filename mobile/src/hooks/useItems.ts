import { getItens, type ItemEstoque } from '../services/item.service';
import { useCachedQuery } from './useCachedQuery';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface UseItemsOptions {
  arquivados?: boolean;
}

export function useItems(estoqueId: string | undefined, options?: UseItemsOptions) {
  const status = options?.arquivados ? 'CONSUMIDO,DESCARTADO' : 'ATIVO';
  const cacheKey = `items:${estoqueId}:${status}`;

  const { data, loading, refresh } = useCachedQuery<ItemEstoque[]>(
    cacheKey,
    () => getItens(estoqueId!, { status }),
    { ttl: CACHE_TTL, enabled: !!estoqueId },
  );

  return {
    items: data ?? [],
    loading,
    refresh,
    total: data?.length ?? 0,
  };
}
