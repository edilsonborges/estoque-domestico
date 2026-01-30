import { z } from 'zod';

export const listNotificacoesQuerySchema = z.object({
  lida: z.coerce.boolean().optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(20),
});

export type ListNotificacoesQuery = z.infer<typeof listNotificacoesQuerySchema>;
