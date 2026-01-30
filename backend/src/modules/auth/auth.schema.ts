import { z } from 'zod';

export const registerSchema = z.object({
  nome: z.string().min(2).max(120),
  email: z.string().email().max(150),
  senha: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
