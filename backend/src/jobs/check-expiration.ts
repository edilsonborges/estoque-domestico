import { TipoNotificacao } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { calcularStatusValidade } from '../utils/validade.js';

export async function checkExpirations() {
  const limiteAtencao = new Date();
  limiteAtencao.setDate(limiteAtencao.getDate() + 5);

  const itens = await prisma.itemEstoque.findMany({
    where: {
      status: 'ATIVO',
      dataValidade: { lte: limiteAtencao },
    },
    include: {
      estoque: {
        include: {
          usuarios: { select: { usuarioId: true } },
        },
      },
    },
  });

  let created = 0;

  for (const item of itens) {
    const statusValidade = calcularStatusValidade(item.dataValidade);
    if (statusValidade === 'OK') continue;

    let tipo: TipoNotificacao;
    let mensagem: string;

    switch (statusValidade) {
      case 'VENCIDO':
        tipo = 'VENCIDO';
        mensagem = `${item.nome} está vencido!`;
        break;
      case 'URGENTE':
        tipo = 'URGENTE';
        mensagem = `${item.nome} vence amanhã ou hoje!`;
        break;
      case 'ATENCAO':
        tipo = 'AVISO';
        mensagem = `${item.nome} vence em breve.`;
        break;
      default:
        continue;
    }

    for (const { usuarioId } of item.estoque.usuarios) {
      // Avoid duplicates: check if a notification for this item+user+type already exists today
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const existing = await prisma.notificacao.findFirst({
        where: {
          itemId: item.id,
          usuarioId,
          tipo,
          criadaEm: { gte: hoje },
        },
      });

      if (!existing) {
        await prisma.notificacao.create({
          data: { usuarioId, itemId: item.id, tipo, mensagem },
        });
        created++;
      }
    }
  }

  return { checked: itens.length, created };
}
