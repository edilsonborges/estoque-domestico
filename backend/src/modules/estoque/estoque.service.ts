import { prisma } from '../../lib/prisma.js';
import type { CreateEstoqueInput } from './estoque.schema.js';

export async function createEstoque(input: CreateEstoqueInput, usuarioId: string) {
  const estoque = await prisma.estoque.create({
    data: {
      nome: input.nome,
      descricao: input.descricao,
      usuarios: {
        create: {
          usuarioId,
          papel: 'ADMIN',
        },
      },
    },
    include: {
      usuarios: {
        select: { papel: true, usuarioId: true },
      },
    },
  });

  return estoque;
}

export async function listEstoquesByUser(usuarioId: string) {
  const estoques = await prisma.estoque.findMany({
    where: {
      usuarios: {
        some: { usuarioId },
      },
    },
    include: {
      usuarios: {
        select: { papel: true, usuarioId: true },
      },
      _count: {
        select: { itens: true },
      },
    },
    orderBy: { criadoEm: 'desc' },
  });

  return estoques;
}

export async function getEstoqueById(id: string) {
  return prisma.estoque.findUnique({
    where: { id },
    include: {
      usuarios: {
        select: { papel: true, usuarioId: true },
      },
      _count: {
        select: { itens: true },
      },
    },
  });
}
