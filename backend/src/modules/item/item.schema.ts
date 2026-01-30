import { z } from 'zod';

export const createItemSchema = z.object({
  estoque_id: z.string().uuid(),
  qr_code_id: z.string().uuid().optional(),
  nome: z.string().min(1).max(150),
  categoria: z.string().max(50).optional(),
  quantidade: z.number().positive(),
  unidade: z.string().max(10).optional(),
  data_compra: z.string().optional(),
  data_validade: z.string().optional(),
  localizacao: z.string().max(50).optional(),
});

export const updateItemSchema = z.object({
  nome: z.string().min(1).max(150).optional(),
  categoria: z.string().max(50).optional(),
  quantidade: z.number().positive().optional(),
  unidade: z.string().max(10).optional(),
  data_compra: z.string().optional(),
  data_validade: z.string().optional(),
  localizacao: z.string().max(50).optional(),
  version: z.number().int(),
});

export const consumeItemSchema = z.object({
  quantidade: z.number().positive(),
  observacao: z.string().optional(),
  version: z.number().int(),
});

export const discardItemSchema = z.object({
  observacao: z.string().optional(),
  version: z.number().int(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type ConsumeItemInput = z.infer<typeof consumeItemSchema>;
export type DiscardItemInput = z.infer<typeof discardItemSchema>;
