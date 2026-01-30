import { api } from './api';

export interface Estoque {
  id: string;
  nome: string;
  descricao?: string;
  criado_em: string;
  atualizado_em: string;
}

export async function getEstoques(): Promise<Estoque[]> {
  const { data } = await api.get<Estoque[]>('/estoques');
  return data;
}

export async function getEstoque(id: string): Promise<Estoque> {
  const { data } = await api.get<Estoque>(`/estoques/${id}`);
  return data;
}
