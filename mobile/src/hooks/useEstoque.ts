import { useState, useEffect, useCallback } from 'react';
import { getEstoques, type Estoque } from '../services/estoque.service';

export function useEstoque() {
  const [estoque, setEstoque] = useState<Estoque | null>(null);
  const [estoques, setEstoques] = useState<Estoque[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEstoques = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEstoques();
      setEstoques(data);
      if (data.length > 0) {
        setEstoque(data[0]);
      }
    } catch {
      setEstoques([]);
      setEstoque(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEstoques();
  }, [fetchEstoques]);

  return { estoque, estoques, loading, refresh: fetchEstoques };
}
