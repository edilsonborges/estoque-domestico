import { prisma } from '../../lib/prisma.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { Errors } from '../../types/errors.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.usuario.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw Errors.CONFLICT('Email já cadastrado');
  }

  const senhaHash = await hashPassword(input.senha);

  const usuario = await prisma.usuario.create({
    data: {
      nome: input.nome,
      email: input.email,
      senhaHash,
    },
    select: {
      id: true,
      nome: true,
      email: true,
      criadoEm: true,
    },
  });

  return usuario;
}

export async function loginUser(input: LoginInput) {
  const usuario = await prisma.usuario.findUnique({
    where: { email: input.email },
  });

  if (!usuario || !usuario.ativo) {
    throw Errors.UNAUTHORIZED('Credenciais inválidas');
  }

  const validPassword = await verifyPassword(input.senha, usuario.senhaHash);
  if (!validPassword) {
    throw Errors.UNAUTHORIZED('Credenciais inválidas');
  }

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
  };
}
