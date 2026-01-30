import { useState, useEffect, useCallback } from 'react';
import { getItens, type ItemEstoque } from '../services/item.service';

interface UseItemsOptions {
  arquivados?: boolean;
}

export function useItems(estoqueId: string | undefined, options?: UseItemsOptions) {
  const [items, setItems] = useState<ItemEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchItems = useCallback(async () => {
    if (!estoqueId) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const status = options?.arquivados ? 'CONSUMIDO,DESCARTADO' : 'ATIVO';
      const data = await getItens(estoqueId, { status });
      setItems(data);
      setTotal(data.length);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [estoqueId, options?.arquivados]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, refresh: fetchItems, total };
}
