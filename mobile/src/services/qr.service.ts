import { api } from './api';

interface QrResolveExistente {
  status: 'EXISTENTE';
  item: {
    id: string;
    nome: string;
    quantidade: number;
    unidade: string;
    data_validade?: string;
    status_validade?: string;
    localizacao?: string;
  };
}

interface QrResolveNovo {
  status: 'NOVO';
  qr_code_id: string;
}

export type QrResolveResponse = QrResolveExistente | QrResolveNovo;

export async function resolveQr(codigo: string, estoqueId: string): Promise<QrResolveResponse> {
  const { data } = await api.post<QrResolveResponse>('/qr/resolve', {
    codigo,
    estoque_id: estoqueId,
  });
  return data;
}
