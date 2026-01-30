import { api } from './api';

export interface NotificacaoItem {
  id: string;
  nome: string;
  dataValidade: string;
  status: string;
}

export interface Notificacao {
  id: string;
  tipo: 'AVISO' | 'URGENTE' | 'VENCIDO';
  mensagem: string;
  lida: boolean;
  criadaEm: string;
  item: NotificacaoItem;
}

export interface ListNotificacoesResponse {
  notificacoes: Notificacao[];
  total: number;
  naoLidas: number;
}

export async function getNotificacoes(
  params?: { lida?: boolean },
): Promise<ListNotificacoesResponse> {
  const { data } = await api.get<ListNotificacoesResponse>('/notificacoes', {
    params,
  });
  return data;
}

export async function markAsRead(id: string) {
  const { data } = await api.post(`/notificacoes/${id}/lida`);
  return data;
}
