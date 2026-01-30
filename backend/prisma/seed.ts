import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.notificacao.deleteMany();
  await prisma.movimentacaoItem.deleteMany();
  await prisma.itemEstoque.deleteMany();
  await prisma.qrCode.deleteMany();
  await prisma.estoqueUsuario.deleteMany();
  await prisma.estoque.deleteMany();
  await prisma.usuario.deleteMany();

  // Create user
  const senhaHash = await bcrypt.hash('123456', 10);
  const usuario = await prisma.usuario.create({
    data: {
      nome: 'João Silva',
      email: 'joao@test.com',
      senhaHash,
    },
  });

  // Create estoque
  const estoque = await prisma.estoque.create({
    data: {
      nome: 'Minha Despensa',
      descricao: 'Despensa principal da casa',
      usuarios: {
        create: { usuarioId: usuario.id, papel: 'ADMIN' },
      },
    },
  });

  // Create QR codes
  const qrs = await Promise.all(
    ['qr-001', 'qr-002', 'qr-003', 'qr-004', 'qr-005'].map((codigo) =>
      prisma.qrCode.create({ data: { codigo } }),
    ),
  );

  // Create items with various expiration statuses
  const hoje = new Date();
  const items = [
    {
      nome: 'Leite Integral',
      categoria: 'Laticínios',
      quantidade: 2,
      unidade: 'L',
      localizacao: 'Geladeira',
      dataValidade: new Date(hoje.getTime() + 1 * 24 * 60 * 60 * 1000), // tomorrow
      qrCodeId: qrs[0].id,
    },
    {
      nome: 'Arroz Branco',
      categoria: 'Grãos',
      quantidade: 5,
      unidade: 'kg',
      localizacao: 'Armário',
      dataValidade: new Date(hoje.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 days
      qrCodeId: qrs[1].id,
    },
    {
      nome: 'Iogurte Natural',
      categoria: 'Laticínios',
      quantidade: 4,
      unidade: 'un',
      localizacao: 'Geladeira',
      dataValidade: new Date(hoje.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
      qrCodeId: qrs[2].id,
    },
    {
      nome: 'Presunto',
      categoria: 'Frios',
      quantidade: 0.3,
      unidade: 'kg',
      localizacao: 'Geladeira',
      dataValidade: new Date(hoje.getTime() - 2 * 24 * 60 * 60 * 1000), // expired 2 days ago
      qrCodeId: qrs[3].id,
    },
    {
      nome: 'Feijão Preto',
      categoria: 'Grãos',
      quantidade: 2,
      unidade: 'kg',
      localizacao: 'Armário',
      dataValidade: new Date(hoje.getTime() + 180 * 24 * 60 * 60 * 1000), // 180 days
      qrCodeId: qrs[4].id,
    },
  ];

  for (const item of items) {
    await prisma.itemEstoque.create({
      data: {
        estoqueId: estoque.id,
        ...item,
        movimentacoes: {
          create: {
            tipo: 'ENTRADA',
            quantidade: item.quantidade,
            observacao: 'Cadastro inicial (seed)',
          },
        },
      },
    });
  }

  console.log('Seed completed: 1 user, 1 estoque, 5 QR codes, 5 items');
  console.log('Login: joao@test.com / 123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
