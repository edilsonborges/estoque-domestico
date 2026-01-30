import { useState, useCallback } from 'react';
import { lookupBarcode, BarcodeProductResult } from '../services/barcode.service';

export function useBarcodeLookup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BarcodeProductResult | null>(null);
  const [error, setError] = useState(false);

  const lookup = useCallback(async (barcode: string) => {
    setLoading(true);
    setError(false);
    setResult(null);

    try {
      const data = await lookupBarcode(barcode);
      setResult(data);
      return data;
    } catch {
      setError(true);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(false);
    setLoading(false);
  }, []);

  return { loading, result, error, lookup, reset };
}
