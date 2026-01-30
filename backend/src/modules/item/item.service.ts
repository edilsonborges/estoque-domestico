import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../types/errors.js';
import { calcularStatusValidade, calcularDiasRestantes } from '../../utils/validade.js';
import type { CreateItemInput, UpdateItemInput } from './item.schema.js';

function enrichItem(item: {
  id: string;
  dataValidade: Date | null;
  [key: string]: unknown;
}) {
  return {
    ...item,
    status_validade: calcularStatusValidade(item.dataValidade),
    dias_restantes: calcularDiasRestantes(item.dataValidade),
  };
}

export async function createItem(input: CreateItemInput) {
  const item = await prisma.$transaction(async (tx) => {
    const newItem = await tx.itemEstoque.create({
      data: {
        estoqueId: input.estoque_id,
        qrCodeId: input.qr_code_id,
        nome: input.nome,
        categoria: input.categoria,
        quantidade: input.quantidade,
        unidade: input.unidade,
        dataCompra: input.data_compra ? new Date(input.data_compra) : null,
        dataValidade: input.data_validade ? new Date(input.data_validade) : null,
        localizacao: input.localizacao,
      },
    });

    await tx.movimentacaoItem.create({
      data: {
        itemId: newItem.id,
        tipo: 'ENTRADA',
        quantidade: input.quantidade,
        observacao: 'Cadastro inicial',
      },
    });

    return newItem;
  });

  return enrichItem(item);
}

export async function getItemById(id: string) {
  const item = await prisma.itemEstoque.findUnique({
    where: { id },
    include: {
      qrCode: true,
      movimentacoes: { orderBy: { criadoEm: 'desc' }, take: 10 },
    },
  });

  if (!item) throw Errors.NOT_FOUND('Item não encontrado');

  return enrichItem(item);
}

export async function updateItem(id: string, input: UpdateItemInput) {
  const item = await prisma.itemEstoque.findUnique({ where: { id } });
  if (!item) throw Errors.NOT_FOUND('Item não encontrado');
  if (item.version !== input.version) {
    throw Errors.CONFLICT('Conflito de versão. Atualize os dados e tente novamente.');
  }

  const oldQtd = Number(item.quantidade);
  const newQtd = input.quantidade ?? oldQtd;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedItem = await tx.itemEstoque.update({
      where: { id, version: input.version },
      data: {
        nome: input.nome,
        categoria: input.categoria,
        quantidade: input.quantidade,
        unidade: input.unidade,
        dataCompra: input.data_compra !== undefined ? (input.data_compra ? new Date(input.data_compra) : null) : undefined,
        dataValidade: input.data_validade !== undefined ? (input.data_validade ? new Date(input.data_validade) : null) : undefined,
        localizacao: input.localizacao,
        version: { increment: 1 },
      },
    });

    if (input.quantidade !== undefined && newQtd !== oldQtd) {
      await tx.movimentacaoItem.create({
        data: {
          itemId: id,
          tipo: 'AJUSTE',
          quantidade: new Decimal(newQtd - oldQtd),
          observacao: `Ajuste de ${oldQtd} para ${newQtd}`,
        },
      });
    }

    return updatedItem;
  });

  return enrichItem(updated);
}
