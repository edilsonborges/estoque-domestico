import { z } from 'zod';

export const listItemsQuerySchema = z.object({
  status: z.enum(['ATIVO', 'CONSUMIDO', 'DESCARTADO', 'VENCIDO']).optional(),
  localizacao: z.string().optional(),
  categoria: z.string().optional(),
  vence_em: z.coerce.number().int().positive().optional(), // days
  arquivados: z.coerce.boolean().optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(20),
});

export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;
