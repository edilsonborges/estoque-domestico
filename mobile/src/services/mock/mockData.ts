function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function daysAgo(days: number): string {
  return daysFromNow(-days);
}

const now = new Date().toISOString();

export const MOCK_USER = {
  id: 'usr-001',
  nome: 'João Silva',
  email: 'joao@test.com',
  senha: '123456',
};

export const MOCK_TOKEN =
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c3ItMDAxIiwiZXhwIjo5OTk5OTk5OTk5fQ.mock';

export const MOCK_ESTOQUES = [
  {
    id: 'est-001',
    nome: 'Casa Principal',
    descricao: 'Estoque da cozinha e dispensa',
    criado_em: daysAgo(30),
    atualizado_em: daysAgo(1),
  },
  {
    id: 'est-002',
    nome: 'Escritório',
    descricao: 'Snacks e bebidas do escritório',
    criado_em: daysAgo(15),
    atualizado_em: daysAgo(3),
  },
];

export const MOCK_QR_CODES = [
  { id: 'qr-001', codigo: 'QR-UUID-001', item_id: 'item-001', ativo: true },
  { id: 'qr-002', codigo: 'QR-UUID-002', item_id: 'item-002', ativo: true },
  { id: 'qr-003', codigo: 'QR-UUID-003', item_id: 'item-003', ativo: true },
  { id: 'qr-004', codigo: 'QR-UUID-004', item_id: 'item-004', ativo: true },
  { id: 'qr-005', codigo: 'QR-UUID-005', item_id: 'item-005', ativo: true },
  { id: 'qr-006', codigo: 'QR-UUID-006', item_id: null, ativo: true },
];

export function getInitialItems() {
  return [
    {
      id: 'item-001',
      estoque_id: 'est-001',
      qr_code_id: 'qr-001',
      nome: 'Leite Integral',
      categoria: 'Laticínios',
      quantidade: 2,
      unidade: 'litros',
      data_compra: daysAgo(3),
      data_validade: daysFromNow(7),
      localizacao: 'Geladeira',
      status: 'ATIVO',
      status_validade: 'OK',
      dias_restantes: 7,
      version: 1,
      criado_em: daysAgo(3),
      atualizado_em: daysAgo(3),
    },
    {
      id: 'item-002',
      estoque_id: 'est-001',
      qr_code_id: 'qr-002',
      nome: 'Iogurte Natural',
      categoria: 'Laticínios',
      quantidade: 4,
      unidade: 'unidades',
      data_compra: daysAgo(5),
      data_validade: daysFromNow(3),
      localizacao: 'Geladeira',
      status: 'ATIVO',
      status_validade: 'ATENCAO',
      dias_restantes: 3,
      version: 1,
      criado_em: daysAgo(5),
      atualizado_em: daysAgo(5),
    },
    {
      id: 'item-003',
      estoque_id: 'est-001',
      qr_code_id: 'qr-003',
      nome: 'Peito de Frango',
      categoria: 'Carnes',
      quantidade: 1,
      unidade: 'kg',
      data_compra: daysAgo(4),
      data_validade: daysFromNow(1),
      localizacao: 'Freezer',
      status: 'ATIVO',
      status_validade: 'URGENTE',
      dias_restantes: 1,
      version: 1,
      criado_em: daysAgo(4),
      atualizado_em: daysAgo(4),
    },
    {
      id: 'item-004',
      estoque_id: 'est-001',
      qr_code_id: 'qr-004',
      nome: 'Arroz Integral',
      categoria: 'Grãos',
      quantidade: 5,
      unidade: 'kg',
      data_compra: daysAgo(10),
      data_validade: daysFromNow(180),
      localizacao: 'Dispensa',
      status: 'ATIVO',
      status_validade: 'OK',
      dias_restantes: 180,
      version: 1,
      criado_em: daysAgo(10),
      atualizado_em: daysAgo(10),
    },
    {
      id: 'item-005',
      estoque_id: 'est-001',
      qr_code_id: 'qr-005',
      nome: 'Banana Prata',
      categoria: 'Frutas',
      quantidade: 6,
      unidade: 'unidades',
      data_compra: daysAgo(6),
      data_validade: daysFromNow(-1),
      localizacao: 'Fruteira',
      status: 'ATIVO',
      status_validade: 'VENCIDO',
      dias_restantes: -1,
      version: 1,
      criado_em: daysAgo(6),
      atualizado_em: daysAgo(6),
    },
  ];
}

export function getInitialMovimentacoes() {
  return [
    {
      id: 'mov-001',
      item_id: 'item-001',
      tipo: 'ENTRADA',
      quantidade: 2,
      criado_em: daysAgo(3),
    },
    {
      id: 'mov-002',
      item_id: 'item-002',
      tipo: 'ENTRADA',
      quantidade: 4,
      criado_em: daysAgo(5),
    },
    {
      id: 'mov-003',
      item_id: 'item-003',
      tipo: 'ENTRADA',
      quantidade: 1,
      criado_em: daysAgo(4),
    },
    {
      id: 'mov-004',
      item_id: 'item-004',
      tipo: 'ENTRADA',
      quantidade: 5,
      criado_em: daysAgo(10),
    },
    {
      id: 'mov-005',
      item_id: 'item-005',
      tipo: 'ENTRADA',
      quantidade: 6,
      criado_em: daysAgo(6),
    },
  ];
}

export function getInitialNotificacoes() {
  return [
    {
      id: 'notif-001',
      tipo: 'VENCIDO' as const,
      mensagem: 'Banana Prata venceu!',
      lida: false,
      criadaEm: daysAgo(1),
      item: {
        id: 'item-005',
        nome: 'Banana Prata',
        dataValidade: daysFromNow(-1),
        status: 'ATIVO',
      },
    },
    {
      id: 'notif-002',
      tipo: 'URGENTE' as const,
      mensagem: 'Peito de Frango vence amanhã!',
      lida: false,
      criadaEm: daysAgo(0),
      item: {
        id: 'item-003',
        nome: 'Peito de Frango',
        dataValidade: daysFromNow(1),
        status: 'ATIVO',
      },
    },
    {
      id: 'notif-003',
      tipo: 'AVISO' as const,
      mensagem: 'Iogurte Natural vence em 3 dias.',
      lida: true,
      criadaEm: daysAgo(2),
      item: {
        id: 'item-002',
        nome: 'Iogurte Natural',
        dataValidade: daysFromNow(3),
        status: 'ATIVO',
      },
    },
  ];
}
