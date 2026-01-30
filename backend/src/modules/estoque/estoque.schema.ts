import { z } from 'zod';

export const createEstoqueSchema = z.object({
  nome: z.string().min(1).max(100),
  descricao: z.string().optional(),
});

export type CreateEstoqueInput = z.infer<typeof createEstoqueSchema>;
