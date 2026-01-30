import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import {
  MOCK_USER,
  MOCK_TOKEN,
  MOCK_ESTOQUES,
  MOCK_QR_CODES,
  getInitialItems,
  getInitialMovimentacoes,
  getInitialNotificacoes,
} from './mockData';

const STORAGE_PREFIX = '@mock_db:';

// --- Storage helpers ---

async function getCollection<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(`${STORAGE_PREFIX}${key}`);
  return raw ? JSON.parse(raw) : [];
}

async function setCollection<T>(key: string, data: T[]): Promise<void> {
  await AsyncStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
}

async function ensureSeeded(): Promise<void> {
  const seeded = await AsyncStorage.getItem(`${STORAGE_PREFIX}__seeded`);
  if (seeded) return;
  await setCollection('items', getInitialItems());
  await setCollection('movimentacoes', getInitialMovimentacoes());
  await setCollection('notificacoes', getInitialNotificacoes());
  await setCollection('qr_codes', MOCK_QR_CODES);
  await AsyncStorage.setItem(`${STORAGE_PREFIX}__seeded`, 'true');
}

// --- Helpers ---

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function delay(): Promise<void> {
  const ms = 50 + Math.random() * 100;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeValidadeStatus(dataValidade?: string): {
  status_validade?: string;
  dias_restantes?: number | null;
} {
  if (!dataValidade) return { status_validade: undefined, dias_restantes: null };
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(dataValidade);
  exp.setHours(0, 0, 0, 0);
  const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  let status: string;
  if (diff < 0) status = 'VENCIDO';
  else if (diff <= 1) status = 'URGENTE';
  else if (diff <= 5) status = 'ATENCAO';
  else status = 'OK';
  return { status_validade: status, dias_restantes: diff };
}

function mockResponse(status: number, data: unknown): AxiosResponse {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : status === 201 ? 'Created' : 'Error',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
}

function mockError(status: number, message: string): never {
  const err: any = new Error(message);
  err.response = mockResponse(status, { error: message });
  err.isAxiosError = true;
  throw err;
}

// --- Route types ---

type Handler = (ctx: RouteContext) => Promise<AxiosResponse>;

interface RouteContext {
  params: Record<string, string>;
  body: any;
  query: Record<string, string>;
}

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: Handler;
}

// --- Route handlers ---

const handlers = {
  async login(ctx: RouteContext): Promise<AxiosResponse> {
    const { email, senha } = ctx.body;
    if (email === MOCK_USER.email && senha === MOCK_USER.senha) {
      return mockResponse(200, {
        token: MOCK_TOKEN,
        usuario: { id: MOCK_USER.id, nome: MOCK_USER.nome, email: MOCK_USER.email },
      });
    }
    return mockError(401, 'Credenciais inválidas');
  },

  async register(ctx: RouteContext): Promise<AxiosResponse> {
    const { nome, email } = ctx.body;
    return mockResponse(201, { id: uuid(), nome, email });
  },

  async getEstoques(): Promise<AxiosResponse> {
    return mockResponse(200, MOCK_ESTOQUES);
  },

  async getEstoque(ctx: RouteContext): Promise<AxiosResponse> {
    const est = MOCK_ESTOQUES.find((e) => e.id === ctx.params.id);
    if (!est) return mockError(404, 'Estoque não encontrado');
    return mockResponse(200, est);
  },

  async getItens(ctx: RouteContext): Promise<AxiosResponse> {
    const estoqueId = ctx.params.estoqueId;
    let items: any[] = await getCollection('items');
    items = items.filter((i) => i.estoque_id === estoqueId);
    if (ctx.query.status) {
      const statuses = ctx.query.status.split(',');
      items = items.filter((i) => statuses.includes(i.status));
    }
    if (ctx.query.localizacao) {
      items = items.filter((i) => i.localizacao === ctx.query.localizacao);
    }
    if (ctx.query.vence_em) {
      const days = parseInt(ctx.query.vence_em, 10);
      items = items.filter((i) => i.dias_restantes != null && i.dias_restantes <= days);
    }
    // Recompute validade for freshness
    items = items.map((i) => ({ ...i, ...computeValidadeStatus(i.data_validade) }));
    return mockResponse(200, items);
  },

  async createItem(ctx: RouteContext): Promise<AxiosResponse> {
    const items: any[] = await getCollection('items');
    const now = new Date().toISOString();
    const validade = computeValidadeStatus(ctx.body.data_validade);
    const newItem = {
      id: `item-${uuid().slice(0, 8)}`,
      ...ctx.body,
      status: 'ATIVO',
      ...validade,
      version: 1,
      criado_em: now,
      atualizado_em: now,
    };
    items.push(newItem);
    await setCollection('items', items);

    // Record ENTRADA movimentacao
    const movs: any[] = await getCollection('movimentacoes');
    movs.push({
      id: `mov-${uuid().slice(0, 8)}`,
      item_id: newItem.id,
      tipo: 'ENTRADA',
      quantidade: newItem.quantidade,
      criado_em: now,
    });
    await setCollection('movimentacoes', movs);

    // Link QR code if provided
    if (ctx.body.qr_code_id) {
      const qrs: any[] = await getCollection('qr_codes');
      const qr = qrs.find((q) => q.id === ctx.body.qr_code_id);
      if (qr) {
        qr.item_id = newItem.id;
        qr.ativo = true;
        await setCollection('qr_codes', qrs);
      }
    }

    return mockResponse(201, newItem);
  },

  async getItem(ctx: RouteContext): Promise<AxiosResponse> {
    const items: any[] = await getCollection('items');
    const item = items.find((i) => i.id === ctx.params.id);
    if (!item) return mockError(404, 'Item não encontrado');
    return mockResponse(200, { ...item, ...computeValidadeStatus(item.data_validade) });
  },

  async updateItem(ctx: RouteContext): Promise<AxiosResponse> {
    const items: any[] = await getCollection('items');
    const idx = items.findIndex((i) => i.id === ctx.params.id);
    if (idx === -1) return mockError(404, 'Item não encontrado');

    const item = items[idx];
    if (ctx.body.version !== undefined && ctx.body.version !== item.version) {
      return mockError(409, 'Conflito de versão');
    }

    const { version: _v, ...updates } = ctx.body;
    Object.assign(item, updates);
    item.version += 1;
    item.atualizado_em = new Date().toISOString();
    Object.assign(item, computeValidadeStatus(item.data_validade));
    items[idx] = item;
    await setCollection('items', items);
    return mockResponse(200, item);
  },

  async consumeItem(ctx: RouteContext): Promise<AxiosResponse> {
    const items: any[] = await getCollection('items');
    const idx = items.findIndex((i) => i.id === ctx.params.id);
    if (idx === -1) return mockError(404, 'Item não encontrado');

    const item = items[idx];
    const qty = ctx.body.quantidade || 1;
    item.quantidade = Math.max(0, item.quantidade - qty);
    if (item.quantidade === 0) {
      item.status = 'CONSUMIDO';
      // Release QR code
      const qrs: any[] = await getCollection('qr_codes');
      const qr = qrs.find((q) => q.item_id === item.id);
      if (qr) {
        qr.item_id = null;
        await setCollection('qr_codes', qrs);
      }
    }
    item.version += 1;
    item.atualizado_em = new Date().toISOString();
    items[idx] = item;
    await setCollection('items', items);

    // Record CONSUMO movimentacao
    const movs: any[] = await getCollection('movimentacoes');
    movs.push({
      id: `mov-${uuid().slice(0, 8)}`,
      item_id: item.id,
      tipo: 'CONSUMO',
      quantidade: qty,
      criado_em: new Date().toISOString(),
    });
    await setCollection('movimentacoes', movs);

    return mockResponse(200, item);
  },

  async discardItem(ctx: RouteContext): Promise<AxiosResponse> {
    const items: any[] = await getCollection('items');
    const idx = items.findIndex((i) => i.id === ctx.params.id);
    if (idx === -1) return mockError(404, 'Item não encontrado');

    const item = items[idx];
    item.status = 'DESCARTADO';
    item.version += 1;
    item.atualizado_em = new Date().toISOString();
    items[idx] = item;
    await setCollection('items', items);

    // Release QR code
    const qrs: any[] = await getCollection('qr_codes');
    const qr = qrs.find((q) => q.item_id === item.id);
    if (qr) {
      qr.item_id = null;
      await setCollection('qr_codes', qrs);
    }

    // Record DESCARTE movimentacao
    const movs: any[] = await getCollection('movimentacoes');
    movs.push({
      id: `mov-${uuid().slice(0, 8)}`,
      item_id: item.id,
      tipo: 'DESCARTE',
      quantidade: item.quantidade,
      criado_em: new Date().toISOString(),
    });
    await setCollection('movimentacoes', movs);

    return mockResponse(200, undefined);
  },

  async getAlertas(): Promise<AxiosResponse> {
    let items: any[] = await getCollection('items');
    items = items
      .filter((i) => i.status === 'ATIVO')
      .map((i) => ({ ...i, ...computeValidadeStatus(i.data_validade) }))
      .filter((i) => i.dias_restantes != null && i.dias_restantes <= 5);
    const alertas = items.map((i) => ({
      id: i.id,
      nome: i.nome,
      dias_restantes: i.dias_restantes,
      status_validade: i.status_validade,
    }));
    return mockResponse(200, alertas);
  },

  async resolveQr(ctx: RouteContext): Promise<AxiosResponse> {
    const { codigo, estoque_id } = ctx.body;
    const qrs: any[] = await getCollection('qr_codes');
    let qr = qrs.find((q) => q.codigo === codigo);

    if (!qr) {
      // Create new QR code entry for unknown codes
      qr = { id: `qr-${uuid().slice(0, 8)}`, codigo, item_id: null, ativo: true };
      qrs.push(qr);
      await setCollection('qr_codes', qrs);
    }

    if (qr.item_id) {
      const items: any[] = await getCollection('items');
      const item = items.find(
        (i) => i.id === qr.item_id && i.estoque_id === estoque_id && i.status === 'ATIVO',
      );
      if (item) {
        const validade = computeValidadeStatus(item.data_validade);
        return mockResponse(200, {
          status: 'EXISTENTE',
          item: {
            id: item.id,
            nome: item.nome,
            quantidade: item.quantidade,
            unidade: item.unidade,
            data_validade: item.data_validade,
            status_validade: validade.status_validade,
            localizacao: item.localizacao,
          },
        });
      }
    }

    return mockResponse(200, { status: 'NOVO', qr_code_id: qr.id });
  },

  async getNotificacoes(ctx: RouteContext): Promise<AxiosResponse> {
    let notifs: any[] = await getCollection('notificacoes');
    if (ctx.query.lida === 'false') {
      notifs = notifs.filter((n) => !n.lida);
    }
    const naoLidas = notifs.filter((n) => !n.lida).length;
    return mockResponse(200, { notificacoes: notifs, total: notifs.length, naoLidas });
  },

  async markNotificacaoLida(ctx: RouteContext): Promise<AxiosResponse> {
    const notifs: any[] = await getCollection('notificacoes');
    const notif = notifs.find((n) => n.id === ctx.params.id);
    if (!notif) return mockError(404, 'Notificação não encontrada');
    notif.lida = true;
    await setCollection('notificacoes', notifs);
    return mockResponse(200, notif);
  },
};

// --- Route table ---

function buildRoutes(): Route[] {
  function route(method: string, path: string, handler: Handler): Route {
    const paramNames: string[] = [];
    const regexStr = path.replace(/:(\w+)/g, (_match, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    return { method, pattern: new RegExp(`^${regexStr}$`), paramNames, handler };
  }

  // IMPORTANT: /itens/alertas MUST be before /itens/:id to avoid regex conflict
  return [
    route('POST', '/auth/login', handlers.login),
    route('POST', '/auth/register', handlers.register),
    route('GET', '/estoques', handlers.getEstoques),
    route('GET', '/estoques/:estoqueId', handlers.getEstoque),
    route('GET', '/estoques/:estoqueId/itens', handlers.getItens),
    route('POST', '/itens', handlers.createItem),
    route('GET', '/itens/alertas', handlers.getAlertas),
    route('GET', '/itens/:id', handlers.getItem),
    route('PUT', '/itens/:id', handlers.updateItem),
    route('POST', '/itens/:id/consumir', handlers.consumeItem),
    route('POST', '/itens/:id/descartar', handlers.discardItem),
    route('POST', '/qr/resolve', handlers.resolveQr),
    route('GET', '/notificacoes', handlers.getNotificacoes),
    route('POST', '/notificacoes/:id/lida', handlers.markNotificacaoLida),
  ];
}

// --- Adapter installation ---

export function installMockAdapter(axiosInstance: AxiosInstance): void {
  const routes = buildRoutes();

  axiosInstance.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    await ensureSeeded();
    await delay();

    const baseURL = config.baseURL || '';
    const url = (config.url || '').replace(baseURL, '');
    const method = (config.method || 'GET').toUpperCase();

    // Parse query string
    const [path, queryString] = url.split('?');
    const query: Record<string, string> = {};
    if (queryString) {
      for (const pair of queryString.split('&')) {
        const [k, v] = pair.split('=');
        query[decodeURIComponent(k)] = decodeURIComponent(v || '');
      }
    }

    // Also merge params from config.params (axios adds these for GET requests)
    if (config.params) {
      for (const [k, v] of Object.entries(config.params)) {
        if (v !== undefined && v !== null) {
          query[k] = String(v);
        }
      }
    }

    // Match route
    for (const route of routes) {
      if (route.method !== method) continue;
      const match = path.match(route.pattern);
      if (!match) continue;

      const params: Record<string, string> = {};
      route.paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });

      const body =
        typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {};

      const ctx: RouteContext = { params, body, query };
      const response = await route.handler(ctx);
      response.config = config;
      return response;
    }

    // No matching route
    console.warn(`[MockAdapter] No route matched: ${method} ${path}`);
    return mockError(404, `Mock: rota não encontrada ${method} ${path}`);
  };

  console.log('[MockAdapter] Mock API adapter installed');
}
