import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../types/errors.js';
import type { ListNotificacoesQuery } from './notificacao.schema.js';

export async function listNotificacoes(usuarioId: string, query: ListNotificacoesQuery) {
  const where: Prisma.NotificacaoWhereInput = { usuarioId };
  if (query.lida !== undefined) where.lida = query.lida;

  const skip = (query.pagina - 1) * query.limite;

  const [notificacoes, total, naoLidas] = await Promise.all([
    prisma.notificacao.findMany({
      where,
      include: {
        item: {
          select: { id: true, nome: true, dataValidade: true, status: true },
        },
      },
      orderBy: { criadaEm: 'desc' },
      skip,
      take: query.limite,
    }),
    prisma.notificacao.count({ where }),
    prisma.notificacao.count({ where: { usuarioId, lida: false } }),
  ]);

  return {
    notificacoes,
    total,
    naoLidas,
    pagina: query.pagina,
    totalPaginas: Math.ceil(total / query.limite),
  };
}

export async function markAsRead(id: string, usuarioId: string) {
  const notificacao = await prisma.notificacao.findUnique({ where: { id } });
  if (!notificacao) throw Errors.NOT_FOUND('Notificação não encontrada');
  if (notificacao.usuarioId !== usuarioId) throw Errors.FORBIDDEN('Acesso negado');

  return prisma.notificacao.update({
    where: { id },
    data: { lida: true },
  });
}
