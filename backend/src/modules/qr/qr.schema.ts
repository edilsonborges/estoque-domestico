import { z } from 'zod';

export const resolveQrSchema = z.object({
  codigo: z.string().min(1),
  estoque_id: z.string().uuid(),
});

export type ResolveQrInput = z.infer<typeof resolveQrSchema>;
