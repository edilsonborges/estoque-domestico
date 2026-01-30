import { prisma } from '../../lib/prisma.js';
import { calcularStatusValidade, calcularDiasRestantes } from '../../utils/validade.js';
import type { ResolveQrInput } from './qr.schema.js';

export async function resolveQr(input: ResolveQrInput) {
  // Find or create the QR code record
  let qrCode = await prisma.qrCode.findUnique({
    where: { codigo: input.codigo },
  });

  if (!qrCode) {
    qrCode = await prisma.qrCode.create({
      data: { codigo: input.codigo },
    });
  }

  // Check for an active item linked to this QR in this estoque
  const itemAtivo = await prisma.itemEstoque.findFirst({
    where: {
      qrCodeId: qrCode.id,
      estoqueId: input.estoque_id,
      status: 'ATIVO',
    },
  });

  if (itemAtivo) {
    return {
      resultado: 'EXISTENTE' as const,
      item: {
        ...itemAtivo,
        status_validade: calcularStatusValidade(itemAtivo.dataValidade),
        dias_restantes: calcularDiasRestantes(itemAtivo.dataValidade),
      },
    };
  }

  // No active item — return NOVO so the client can register a new item
  return {
    resultado: 'NOVO' as const,
    qr_code_id: qrCode.id,
  };
}
