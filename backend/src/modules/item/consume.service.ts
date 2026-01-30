import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../types/errors.js';
import type { ConsumeItemInput } from './item.schema.js';

export async function consumeItem(id: string, input: ConsumeItemInput) {
  const item = await prisma.itemEstoque.findUnique({ where: { id } });
  if (!item) throw Errors.NOT_FOUND('Item não encontrado');
  if (item.status !== 'ATIVO') throw Errors.VALIDATION('Apenas itens ativos podem ser consumidos');
  if (item.version !== input.version) {
    throw Errors.CONFLICT('Conflito de versão. Atualize os dados e tente novamente.');
  }

  const currentQtd = Number(item.quantidade);
  if (input.quantidade > currentQtd) {
    throw Errors.VALIDATION('Quantidade a consumir maior que o estoque disponível');
  }

  const newQtd = currentQtd - input.quantidade;
  const isConsumoTotal = newQtd === 0;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedItem = await tx.itemEstoque.update({
      where: { id, version: input.version },
      data: {
        quantidade: newQtd,
        status: isConsumoTotal ? 'CONSUMIDO' : 'ATIVO',
        version: { increment: 1 },
      },
    });

    await tx.movimentacaoItem.create({
      data: {
        itemId: id,
        tipo: 'CONSUMO',
        quantidade: new Decimal(-input.quantidade),
        observacao: input.observacao || (isConsumoTotal ? 'Consumo total' : 'Consumo parcial'),
      },
    });

    return updatedItem;
  });

  return updated;
}
