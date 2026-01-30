import { api } from './api';

export interface ItemEstoque {
  id: string;
  estoque_id: string;
  qr_code_id?: string;
  nome: string;
  categoria: string;
  quantidade: number;
  unidade: string;
  data_compra?: string;
  data_validade?: string;
  localizacao?: string;
  status: string;
  status_validade?: string;
  dias_restantes?: number | null;
  version: number;
  criado_em: string;
  atualizado_em: string;
}

export interface Alerta {
  id: string;
  nome: string;
  dias_restantes: number | null;
  status_validade: string;
}

export interface GetItensParams {
  status?: string;
  localizacao?: string;
  vence_em?: number;
}

export interface CreateItemData {
  estoque_id: string;
  qr_code_id?: string;
  nome: string;
  categoria: string;
  quantidade: number;
  unidade: string;
  data_compra?: string;
  data_validade?: string;
  localizacao?: string;
}

export interface UpdateItemData {
  nome?: string;
  categoria?: string;
  quantidade?: number;
  unidade?: string;
  data_compra?: string;
  data_validade?: string;
  localizacao?: string;
  version: number;
}

export interface ConsumeItemData {
  quantidade: number;
}

export interface DiscardItemData {
  motivo?: string;
}

export async function getItens(
  estoqueId: string,
  params?: GetItensParams,
): Promise<ItemEstoque[]> {
  const { data } = await api.get<ItemEstoque[]>(`/estoques/${estoqueId}/itens`, { params });
  return data;
}

export async function getItem(id: string): Promise<ItemEstoque> {
  const { data } = await api.get<ItemEstoque>(`/itens/${id}`);
  return data;
}

export async function createItem(itemData: CreateItemData): Promise<ItemEstoque> {
  const { data } = await api.post<ItemEstoque>('/itens', itemData);
  return data;
}

export async function updateItem(id: string, itemData: UpdateItemData): Promise<ItemEstoque> {
  const { data } = await api.put<ItemEstoque>(`/itens/${id}`, itemData);
  return data;
}

export async function consumeItem(id: string, consumeData: ConsumeItemData): Promise<ItemEstoque> {
  const { data } = await api.post<ItemEstoque>(`/itens/${id}/consumir`, consumeData);
  return data;
}

export async function discardItem(id: string, discardData: DiscardItemData): Promise<void> {
  await api.post(`/itens/${id}/descartar`, discardData);
}

export async function getAlertas(): Promise<Alerta[]> {
  const { data } = await api.get<Alerta[]>('/itens/alertas');
  return data;
}
