import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../types/errors.js';
import type { DiscardItemInput } from './item.schema.js';

export async function discardItem(id: string, input: DiscardItemInput) {
  const item = await prisma.itemEstoque.findUnique({ where: { id } });
  if (!item) throw Errors.NOT_FOUND('Item não encontrado');
  if (item.status !== 'ATIVO') throw Errors.VALIDATION('Apenas itens ativos podem ser descartados');
  if (item.version !== input.version) {
    throw Errors.CONFLICT('Conflito de versão. Atualize os dados e tente novamente.');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedItem = await tx.itemEstoque.update({
      where: { id, version: input.version },
      data: {
        status: 'DESCARTADO',
        quantidade: 0,
        version: { increment: 1 },
      },
    });

    await tx.movimentacaoItem.create({
      data: {
        itemId: id,
        tipo: 'DESCARTE',
        quantidade: new Decimal(-Number(item.quantidade)),
        observacao: input.observacao || 'Descarte',
      },
    });

    // Free the QR code for reuse
    if (item.qrCodeId) {
      await tx.itemEstoque.update({
        where: { id },
        data: { qrCodeId: null },
      });
    }

    return updatedItem;
  });

  return updated;
}
