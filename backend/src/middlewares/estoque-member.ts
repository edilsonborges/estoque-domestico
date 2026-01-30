import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { Errors } from '../types/errors.js';

export async function requireEstoqueMember(
  request: FastifyRequest<{ Params: { estoqueId: string } }>,
  _reply: FastifyReply,
) {
  const { estoqueId } = request.params;
  const usuarioId = request.userId;

  const membership = await prisma.estoqueUsuario.findUnique({
    where: {
      estoqueId_usuarioId: { estoqueId, usuarioId },
    },
  });

  if (!membership) {
    throw Errors.FORBIDDEN('Você não é membro deste estoque');
  }
}
