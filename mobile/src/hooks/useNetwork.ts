import { useContext } from 'react';
import { NetworkContext } from '../contexts/NetworkContext';

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return ctx;
}
