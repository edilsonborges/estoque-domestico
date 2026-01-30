import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { calcularStatusValidade, calcularDiasRestantes } from '../../utils/validade.js';
import type { ListItemsQuery } from './list.schema.js';

export async function listItemsByEstoque(estoqueId: string, query: ListItemsQuery) {
  const where: Prisma.ItemEstoqueWhereInput = { estoqueId };

  if (query.arquivados) {
    where.status = { in: ['CONSUMIDO', 'DESCARTADO'] };
  } else if (query.status) {
    where.status = query.status;
  } else {
    where.status = 'ATIVO';
  }

  if (query.localizacao) where.localizacao = query.localizacao;
  if (query.categoria) where.categoria = query.categoria;

  if (query.vence_em) {
    const limit = new Date();
    limit.setDate(limit.getDate() + query.vence_em);
    where.dataValidade = { lte: limit };
  }

  const skip = (query.pagina - 1) * query.limite;

  const [itens, total] = await Promise.all([
    prisma.itemEstoque.findMany({
      where,
      orderBy: { dataValidade: 'asc' },
      skip,
      take: query.limite,
    }),
    prisma.itemEstoque.count({ where }),
  ]);

  return {
    itens: itens.map((item) => ({
      ...item,
      status_validade: calcularStatusValidade(item.dataValidade),
      dias_restantes: calcularDiasRestantes(item.dataValidade),
    })),
    total,
    pagina: query.pagina,
    totalPaginas: Math.ceil(total / query.limite),
  };
}

export async function getAlertas(usuarioId: string) {
  const estoques = await prisma.estoqueUsuario.findMany({
    where: { usuarioId },
    select: { estoqueId: true },
  });

  const estoqueIds = estoques.map((e) => e.estoqueId);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const limiteAtencao = new Date(hoje);
  limiteAtencao.setDate(limiteAtencao.getDate() + 5);

  const itens = await prisma.itemEstoque.findMany({
    where: {
      estoqueId: { in: estoqueIds },
      status: 'ATIVO',
      dataValidade: { lte: limiteAtencao },
    },
    include: {
      estoque: { select: { id: true, nome: true } },
    },
    orderBy: { dataValidade: 'asc' },
  });

  return itens.map((item) => ({
    ...item,
    status_validade: calcularStatusValidade(item.dataValidade),
    dias_restantes: calcularDiasRestantes(item.dataValidade),
  }));
}
