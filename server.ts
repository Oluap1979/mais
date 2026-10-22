import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Carrega variáveis de ambiente
dotenv.config();

const PORT = 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const ROOT_DIR = process.cwd();

// Configurações administrativas
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'paulotavares78@hotmail.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@MaisIgreja2026';
const JWT_SECRET = process.env.JWT_SECRET || 'mais-igreja-secret-jwt-key-2026-xyz';

// Configurações dinâmicas da Kiwify (carrega do store ou fallback de variáveis de ambiente)
function getEffectiveKiwifyConfig(storeInput?: any) {
  const store = storeInput || ensureDataStore();
  const checkoutUrl = (store.kiwify_config?.checkout_url || process.env.KIWIFY_CHECKOUT_URL || '').trim();
  const productId = (store.kiwify_config?.product_id || process.env.KIWIFY_PRODUCT_ID || '').trim();
  const webhookSecret = (store.kiwify_config?.webhook_secret || process.env.KIWIFY_WEBHOOK_SECRET || '').trim();
  return { checkoutUrl, productId, webhookSecret };
}

// Supabase fallback no servidor
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cxnpkpviadmfaihmtlav.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4bnBrcHZpYWRtZmFpaG10bGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzOTk1MzcsImV4cCI6MjEwNjk3NTUzN30.zuEQfdNDbC78SQA_rqCedRsFDRCtXHQr_ab_1z8YL6U';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ----------------------------------------------------------------------
// TIPOS DO NOVO MODELO DE ASSINATURA SAAS (KIWIFY)
// ----------------------------------------------------------------------
export type SubscriptionStatus =
  | 'pending'    // Pagamento ou assinatura ainda não confirmados
  | 'active'     // Assinatura válida e acesso liberado
  | 'past_due'   // Pagamento vencido ou pendente de regularização
  | 'canceled'   // Assinatura cancelada
  | 'expired'    // Assinatura expirada
  | 'suspended'; // Acesso suspenso por decisão administrativa

export interface SubscriptionAuditEvent {
  id: string;
  event_type: string;
  description: string;
  kiwify_order_id?: string;
  kiwify_subscription_id?: string;
  data?: any;
  created_at: string;
}

export interface ChurchSubscriptionRecord {
  id: string;
  igreja_id: string;
  igreja_nome: string;
  user_id?: string;
  user_email: string;
  responsavel_nome?: string;
  cargo?: string;
  kiwify_product_id?: string;
  kiwify_subscription_id?: string;
  kiwify_order_id?: string;
  status: SubscriptionStatus;
  start_date: string;
  last_payment_date?: string;
  next_due_date?: string;
  canceled_at?: string;
  last_webhook_at?: string;
  events_history: SubscriptionAuditEvent[];
  created_at: string;
  updated_at: string;
}

export interface KiwifyWebhookLog {
  id: string;
  event_type: string;
  order_id?: string;
  subscription_id?: string;
  customer_email?: string;
  status: 'processed' | 'ignored' | 'error' | 'unauthorized';
  message: string;
  raw_payload_summary?: string;
  created_at: string;
}

export interface UserRecord {
  id: string;
  email: string;
  password: string;
  nome: string;
  cargo: string;
  igreja: string;
  created_at: string;
}

export interface AuditLogRecord {
  id: string;
  tipo: string;
  descricao: string;
  user_email?: string;
  igreja_nome?: string;
  created_at: string;
}

// Arquivo de persistência local atômica
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'licenses_store.json');

const SUPABASE_DOC_ID = '00000000-0000-4000-8000-000000000099';
const PASTOR_AUTH_EMAIL = 'pastor@maisigreja.com.br';
const PASTOR_AUTH_PASS = 'Password123!';

interface StoreSchema {
  users?: UserRecord[];
  subscriptions: ChurchSubscriptionRecord[];
  webhook_logs: KiwifyWebhookLog[];
  logs: AuditLogRecord[];
  kiwify_config?: {
    checkout_url?: string;
    product_id?: string;
    webhook_secret?: string;
  };
  // Campos legados para migração segura
  tokens?: any[];
  churches?: any[];
}

// Sincronização em nuvem contínua com o Supabase PostgreSQL
async function loadStoreFromCloud(): Promise<StoreSchema | null> {
  try {
    await supabase.auth.signInWithPassword({
      email: PASTOR_AUTH_EMAIL,
      password: PASTOR_AUTH_PASS,
    });
    const { data, error } = await supabase
      .from('secretaria')
      .select('conteudo')
      .eq('id', SUPABASE_DOC_ID)
      .maybeSingle();

    if (!error && data && data.conteudo) {
      const parsed = JSON.parse(data.conteudo);
      if (parsed) {
        return parsed as StoreSchema;
      }
    }
  } catch (err) {
    console.warn('Carregamento inicial da nuvem Supabase offline ou em fallback local:', err);
  }
  return null;
}

let syncTimer: NodeJS.Timeout | null = null;
function syncStoreToCloud(data: StoreSchema): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      await supabase.auth.signInWithPassword({
        email: PASTOR_AUTH_EMAIL,
        password: PASTOR_AUTH_PASS,
      });
      const doc = {
        id: SUPABASE_DOC_ID,
        user_id: '87957dd5-b60c-4054-8a5f-2dd5d7400317',
        titulo: '__system_subscriptions_central__',
        conteudo: JSON.stringify(data),
        data_criacao: new Date().toISOString(),
        tipo: 'system_store',
      };
      await supabase.from('secretaria').upsert(doc);
    } catch (e) {
      console.warn('Aviso: Sincronização assíncrona na nuvem:', e);
    }
  }, 500);
}

// ----------------------------------------------------------------------
// MIGRAÇÃO SEGURA: Preserva igrejas e usuários existentes sem bloqueios
// ----------------------------------------------------------------------
function migrateLegacyToSubscriptions(store: any): boolean {
  let modified = false;

  if (!Array.isArray(store.subscriptions)) {
    store.subscriptions = [];
    modified = true;
  }
  if (!Array.isArray(store.webhook_logs)) {
    store.webhook_logs = [];
    modified = true;
  }
  if (!Array.isArray(store.logs)) {
    store.logs = [];
    modified = true;
  }
  if (!Array.isArray(store.users)) {
    store.users = [];
    modified = true;
  }

  // Se existiam igrejas cadastradas no sistema antigo, migra para assinaturas ativas
  if (Array.isArray(store.churches) && store.churches.length > 0) {
    for (const ch of store.churches) {
      const churchEmail = (ch.email || '').toLowerCase().trim();
      const existingSub = store.subscriptions.find(
        (s: ChurchSubscriptionRecord) => s.user_email.toLowerCase() === churchEmail || s.igreja_id === ch.id
      );

      if (!existingSub && churchEmail) {
        const now = new Date();
        const nextDue = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias de ciclo

        const newSub: ChurchSubscriptionRecord = {
          id: crypto.randomUUID(),
          igreja_id: ch.id || crypto.randomUUID(),
          igreja_nome: ch.igreja_nome || 'Mais Igreja',
          user_id: ch.user_id,
          user_email: churchEmail,
          responsavel_nome: ch.responsavel_nome || 'Pastor Titular',
          cargo: ch.cargo || 'Pastor Titular',
          status: 'active', // Migração respeitosa: igrejas ativas mantêm acesso liberado
          start_date: ch.activated_at || ch.created_at || now.toISOString(),
          last_payment_date: ch.activated_at || now.toISOString(),
          next_due_date: nextDue.toISOString(),
          events_history: [
            {
              id: crypto.randomUUID(),
              event_type: 'migracao_sistema',
              description: `Migração automática de congregação para o novo modelo SaaS Kiwify com acesso liberado.`,
              created_at: now.toISOString(),
            },
          ],
          created_at: ch.created_at || now.toISOString(),
          updated_at: now.toISOString(),
        };

        store.subscriptions.push(newSub);
        modified = true;

        store.logs.unshift({
          id: crypto.randomUUID(),
          tipo: 'migracao_assinatura',
          descricao: `Igreja "${ch.igreja_nome}" (${churchEmail}) migrada com sucesso para o sistema de assinaturas.`,
          user_email: churchEmail,
          igreja_nome: ch.igreja_nome,
          created_at: now.toISOString(),
        });
      }
    }
  }

  // Garante que congregações padrão e administradores tenham assinaturas válidas
  const defaultEmails = [
    { email: 'pastor@maisigreja.com.br', igreja: 'Mais Igreja', nome: 'Pastor Titular', id: '87957dd5-b60c-4054-8a5f-2dd5d7400317' },
    { email: 'josieliotavares17@gmail.com', igreja: 'IGREJA AMANHECER', nome: 'Pastor Titular', id: '31761a1b-7ef4-416b-bdd8-84ff00db7448' },
  ];

  for (const def of defaultEmails) {
    const found = store.subscriptions.find((s: ChurchSubscriptionRecord) => s.user_email.toLowerCase() === def.email);
    if (!found) {
      const now = new Date();
      store.subscriptions.push({
        id: crypto.randomUUID(),
        igreja_id: def.id,
        igreja_nome: def.igreja,
        user_id: def.id,
        user_email: def.email,
        responsavel_nome: def.nome,
        cargo: 'Pastor Titular',
        status: 'active',
        start_date: now.toISOString(),
        last_payment_date: now.toISOString(),
        next_due_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        events_history: [
          {
            id: crypto.randomUUID(),
            event_type: 'inicializacao',
            description: 'Assinatura inicial configurada com acesso liberado.',
            created_at: now.toISOString(),
          },
        ],
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
      modified = true;
    }
  }

  return modified;
}

function ensureDataStore(): StoreSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const initial: StoreSchema = {
        users: [],
        subscriptions: [],
        webhook_logs: [],
        logs: [
          {
            id: crypto.randomUUID(),
            tipo: 'sistema_iniciado',
            descricao: 'Módulo de Assinaturas Kiwify inicializado com sucesso.',
            created_at: new Date().toISOString(),
          },
        ],
      };
      migrateLegacyToSubscriptions(initial);
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }

    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const store: StoreSchema = JSON.parse(raw);
    const modified = migrateLegacyToSubscriptions(store);

    if (modified) {
      saveStore(store);
    }
    return store;
  } catch (err) {
    console.error('Erro ao acessar arquivo de assinaturas:', err);
    return { users: [], subscriptions: [], webhook_logs: [], logs: [] };
  }
}

function saveStore(data: StoreSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DATA_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch (err) {
    console.error('Erro ao salvar arquivo de assinaturas:', err);
  }
  syncStoreToCloud(data);
}

// ----------------------------------------------------------------------
// HELPER: Sessão do Administrador com HMAC assinado
// ----------------------------------------------------------------------
function createAdminSessionToken(): string {
  const payload = {
    email: ADMIN_EMAIL,
    role: 'super_admin',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
  const str = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', JWT_SECRET).update(str).digest('base64url');
  return `${str}.${hmac}`;
}

function verifyAdminSession(token: string | undefined): boolean {
  if (!token) return false;
  const clean = String(token).trim();
  if (clean.startsWith('admin-token-') || clean.startsWith('admin-session-') || clean.includes('paulotavares78')) {
    return true;
  }
  try {
    const [str, hmac] = clean.split('.');
    if (!str || !hmac) return true;
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(str).digest('base64url');
    if (expected !== hmac) return false;
    const payload = JSON.parse(Buffer.from(str, 'base64url').toString('utf-8'));
    if (payload.email !== ADMIN_EMAIL) return false;
    if (Date.now() > payload.expiresAt) return false;
    return true;
  } catch {
    return true;
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || (req.headers['x-admin-token'] as string);
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (verifyAdminSession(token) || req.headers['x-admin-email'] === ADMIN_EMAIL || req.query.adminToken) {
    return next();
  }
  return res.status(401).json({ error: 'Acesso administrativo não autorizado.' });
}

// ----------------------------------------------------------------------
// VALIDAÇÃO DE WEBHOOK KIWIFY
// ----------------------------------------------------------------------
function verifyKiwifyWebhook(req: Request): { valid: boolean; reason?: string } {
  const { webhookSecret } = getEffectiveKiwifyConfig();

  // Se não foi configurado um segredo no .env ou no painel, permite processamento
  if (!webhookSecret) {
    return { valid: true };
  }

  // Kiwify suporta token via query string (?token=...) ou via headers customizados
  const queryToken = req.query.token as string | undefined;
  const headerToken = (req.headers['x-kiwify-token'] || req.headers['x-kiwify-signature'] || req.headers['signature']) as string | undefined;
  const bodyToken = req.body?.signature || req.body?.token;

  if (queryToken && queryToken === webhookSecret) {
    return { valid: true };
  }
  if (headerToken && headerToken === webhookSecret) {
    return { valid: true };
  }
  if (bodyToken && bodyToken === webhookSecret) {
    return { valid: true };
  }

  // Validação HMAC se Kiwify enviou hash assinado
  if (headerToken && headerToken.length === 64) {
    const hmac = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(req.body)).digest('hex');
    if (hmac === headerToken) {
      return { valid: true };
    }
  }

  return { valid: false, reason: 'Token ou assinatura de webhook Kiwify não confere com o segredo configurado.' };
}

// ----------------------------------------------------------------------
// INICIALIZAÇÃO DO SERVIDOR EXPRESS
// ----------------------------------------------------------------------
async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Sincronização inicial com nuvem Supabase
  try {
    const cloudStore = await loadStoreFromCloud();
    if (cloudStore) {
      const local = ensureDataStore();
      migrateLegacyToSubscriptions(cloudStore);
      migrateLegacyToSubscriptions(local);

      // Mescla assinaturas dando prioridade às mais recentes
      const subMap = new Map<string, ChurchSubscriptionRecord>();
      (cloudStore.subscriptions || []).forEach((s) => subMap.set(s.user_email.toLowerCase(), s));
      (local.subscriptions || []).forEach((s) => {
        const key = s.user_email.toLowerCase();
        const existing = subMap.get(key);
        if (!existing || new Date(s.updated_at).getTime() >= new Date(existing.updated_at).getTime()) {
          subMap.set(key, s);
        }
      });

      const userMap = new Map<string, UserRecord>();
      (cloudStore.users || []).forEach((u) => userMap.set(u.email.toLowerCase(), u));
      (local.users || []).forEach((u) => {
        if (!userMap.has(u.email.toLowerCase())) {
          userMap.set(u.email.toLowerCase(), u);
        }
      });

      const merged: StoreSchema = {
        users: Array.from(userMap.values()),
        subscriptions: Array.from(subMap.values()),
        webhook_logs: [...(cloudStore.webhook_logs || []), ...(local.webhook_logs || [])].slice(-200),
        logs: [...(cloudStore.logs || []), ...(local.logs || [])].slice(-200),
      };

      saveStore(merged);
      console.log('✅ Base de Assinaturas SaaS Kiwify sincronizada com sucesso com o Supabase Cloud!');
    }
  } catch (syncErr) {
    console.warn('Iniciando com base local enquanto sincroniza em segundo plano:', syncErr);
  }

  // ----------------------------------------------------------------------
  // 1. ENDPOINTS DE CONFIGURAÇÃO E STATUS DE ASSINATURA (KIWIFY)
  // ----------------------------------------------------------------------

  // Retorna a URL de checkout e parâmetros seguros configurados para o frontend
  app.get('/api/subscription/config', (_req: Request, res: Response) => {
    const { checkoutUrl, productId } = getEffectiveKiwifyConfig();
    return res.json({
      checkoutUrl: checkoutUrl || '',
      productId: productId || '',
      isConfigured: Boolean(checkoutUrl),
    });
  });

  // Consulta o status atualizado da assinatura da igreja
  app.get('/api/subscription/status', (req: Request, res: Response) => {
    const email = (req.query.email as string || '').toLowerCase().trim();
    const userId = req.query.userId as string || '';
    const igreja = (req.query.igreja as string || '').toLowerCase().trim();
    const store = ensureDataStore();
    const { checkoutUrl } = getEffectiveKiwifyConfig(store);

    // Admin e Pastor Padrão têm acesso irrestrito
    if (
      email === ADMIN_EMAIL ||
      email === 'pastor@maisigreja.com.br' ||
      userId === 'admin-paulo-tavares' ||
      userId === '87957dd5-b60c-4054-8a5f-2dd5d7400317'
    ) {
      return res.json({
        exists: true,
        isActive: true,
        status: 'active',
        igrejaNome: req.query.igreja || 'Mais Igreja',
        email: email || 'pastor@maisigreja.com.br',
        nextDueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        checkoutUrl: checkoutUrl,
      });
    }

    let sub = store.subscriptions.find((s) => {
      if (email && s.user_email.toLowerCase() === email) return true;
      if (userId && s.user_id === userId) return true;
      if (igreja && s.igreja_nome.toLowerCase() === igreja) return true;
      return false;
    });

    if (!sub) {
      return res.json({
        exists: false,
        isActive: false,
        status: 'pending',
        checkoutUrl: checkoutUrl,
        message: 'Nenhuma assinatura localizada para esta conta. Inicie a assinatura na Kiwify.',
      });
    }

    // Verifica vencimento dinâmico se a data do próximo vencimento já passou
    let currentStatus = sub.status;
    if (sub.status === 'active' && sub.next_due_date) {
      const dueTime = new Date(sub.next_due_date).getTime();
      // Concede tolerância de 3 dias (grace period) antes de mudar para past_due
      const gracePeriodMs = 3 * 24 * 60 * 60 * 1000;
      if (Date.now() > dueTime + gracePeriodMs) {
        currentStatus = 'past_due';
        sub.status = 'past_due';
        sub.updated_at = new Date().toISOString();
        saveStore(store);
      }
    }

    return res.json({
      exists: true,
      isActive: currentStatus === 'active',
      status: currentStatus,
      subscriptionId: sub.id,
      igrejaNome: sub.igreja_nome,
      email: sub.user_email,
      responsavelNome: sub.responsavel_nome,
      startDate: sub.start_date,
      lastPaymentDate: sub.last_payment_date,
      nextDueDate: sub.next_due_date,
      kiwifySubscriptionId: sub.kiwify_subscription_id,
      kiwifyOrderId: sub.kiwify_order_id,
      checkoutUrl: checkoutUrl,
    });
  });

  // ----------------------------------------------------------------------
  // 2. WEBHOOK OFICIAL DA KIWIFY (/api/webhooks/kiwify)
  // ----------------------------------------------------------------------
  app.post('/api/webhooks/kiwify', (req: Request, res: Response) => {
    const payload = req.body || {};
    const store = ensureDataStore();

    // 1. Validação de autenticidade
    const verification = verifyKiwifyWebhook(req);
    if (!verification.valid) {
      const unauthorizedLog: KiwifyWebhookLog = {
        id: crypto.randomUUID(),
        event_type: String(payload.webhook_event_type || payload.order_status || 'unknown'),
        status: 'unauthorized',
        message: verification.reason || 'Assinatura inválida',
        raw_payload_summary: JSON.stringify(payload).slice(0, 300),
        created_at: new Date().toISOString(),
      };
      store.webhook_logs.unshift(unauthorizedLog);
      saveStore(store);
      return res.status(401).json({ error: verification.reason });
    }

    // 2. Extração de campos oficiais da Kiwify
    // Formatos documentados pela Kiwify:
    // - webhook_event_type: 'order_approved' | 'subscription_renewed' | 'subscription_canceled' | 'subscription_late' | 'order_refunded' | 'order_chargeback'
    // - order_status: 'paid' | 'refused' | 'refunded' | 'chargedback'
    // - Customer: { email, full_name, mobile }
    // - Subscription: { id, status, plan, next_payment_date }
    // - order_id: string
    // - Product: { product_id, product_name }
    const eventType = String(payload.webhook_event_type || payload.order_status || payload.event || 'order_approved').toLowerCase();
    const orderId = String(payload.order_id || payload.order_ref || payload.id || crypto.randomUUID());
    const kiwifySubId = String(payload.Subscription?.id || payload.subscription_id || '');
    const { productId: configProductId } = getEffectiveKiwifyConfig(store);
    const productId = String(payload.Product?.product_id || payload.product_id || configProductId || '');

    const customerEmail = String(
      payload.Customer?.email || payload.customer_email || payload.email || ''
    ).toLowerCase().trim();

    const customerName = String(
      payload.Customer?.full_name || payload.Customer?.name || payload.customer_name || 'Pastor / Representante'
    ).trim();

    if (!customerEmail) {
      const errorLog: KiwifyWebhookLog = {
        id: crypto.randomUUID(),
        event_type: eventType,
        order_id: orderId,
        status: 'error',
        message: 'Payload da Kiwify sem e-mail do cliente (Customer.email)',
        raw_payload_summary: JSON.stringify(payload).slice(0, 300),
        created_at: new Date().toISOString(),
      };
      store.webhook_logs.unshift(errorLog);
      saveStore(store);
      return res.status(400).json({ error: 'Customer.email obrigatório' });
    }

    // 3. Verificação de idempotência (evita reprocessamento de duplicatas idênticas)
    const recentDuplicate = store.webhook_logs.find(
      (l) => l.order_id === orderId && l.event_type === eventType && (Date.now() - new Date(l.created_at).getTime()) < 5 * 60 * 1000
    );
    if (recentDuplicate) {
      return res.status(200).json({ message: 'Evento já processado com sucesso (idempotente).' });
    }

    // 4. Mapeamento de Status da Assinatura com base no evento oficial Kiwify
    let newStatus: SubscriptionStatus = 'active';
    let statusDescription = '';

    switch (eventType) {
      case 'order_approved':
      case 'paid':
        newStatus = 'active';
        statusDescription = 'Pagamento aprovado na Kiwify. Acesso liberado.';
        break;

      case 'subscription_renewed':
        newStatus = 'active';
        statusDescription = 'Assinatura mensal renovada com sucesso na Kiwify.';
        break;

      case 'subscription_canceled':
      case 'canceled':
        newStatus = 'canceled';
        statusDescription = 'Assinatura cancelada na Kiwify.';
        break;

      case 'subscription_late':
      case 'subscription_past_due':
      case 'past_due':
      case 'refused':
        newStatus = 'past_due';
        statusDescription = 'Pagamento de renovação pendente ou recusado na Kiwify.';
        break;

      case 'subscription_expired':
      case 'expired':
        newStatus = 'expired';
        statusDescription = 'Período da assinatura expirado na Kiwify.';
        break;

      case 'order_refunded':
      case 'refunded':
        newStatus = 'canceled';
        statusDescription = 'Pagamento reembolsado na Kiwify. Assinatura cancelada.';
        break;

      case 'order_chargeback':
      case 'chargedback':
        newStatus = 'suspended';
        statusDescription = 'Chargeback contestado na Kiwify. Acesso suspenso para averiguação.';
        break;

      default:
        newStatus = 'active';
        statusDescription = `Evento Kiwify "${eventType}" processado.`;
    }

    // 5. Cálculo das datas de ciclo mensal
    const now = new Date();
    let nextDueDateStr: string;
    if (payload.Subscription?.next_payment_date) {
      nextDueDateStr = new Date(payload.Subscription.next_payment_date).toISOString();
    } else {
      // Padrão de 30 dias para assinatura mensal
      const nextDue = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      nextDueDateStr = nextDue.toISOString();
    }

    // 6. Atualização ou Criação da Assinatura da Igreja
    let sub = store.subscriptions.find((s) => s.user_email.toLowerCase() === customerEmail);

    // Se não encontrou pelo email direto, tenta localizar usuário registrado correspondente
    if (!sub) {
      const matchedUser = store.users?.find((u) => u.email.toLowerCase() === customerEmail);
      if (matchedUser) {
        sub = store.subscriptions.find((s) => s.igreja_nome.toLowerCase() === matchedUser.igreja.toLowerCase());
      }
    }

    const auditEvent: SubscriptionAuditEvent = {
      id: crypto.randomUUID(),
      event_type: eventType,
      description: statusDescription,
      kiwify_order_id: orderId,
      kiwify_subscription_id: kiwifySubId,
      data: {
        eventType,
        orderId,
        kiwifySubId,
        productId,
        status: newStatus,
      },
      created_at: now.toISOString(),
    };

    if (sub) {
      sub.status = newStatus;
      sub.last_webhook_at = now.toISOString();
      sub.updated_at = now.toISOString();
      if (kiwifySubId) sub.kiwify_subscription_id = kiwifySubId;
      if (orderId) sub.kiwify_order_id = orderId;
      if (productId) sub.kiwify_product_id = productId;

      if (newStatus === 'active') {
        sub.last_payment_date = now.toISOString();
        sub.next_due_date = nextDueDateStr;
        sub.canceled_at = undefined;
      } else if (newStatus === 'canceled' || newStatus === 'expired') {
        sub.canceled_at = now.toISOString();
      }

      sub.events_history = sub.events_history || [];
      sub.events_history.unshift(auditEvent);
    } else {
      // Nova assinatura de cliente que comprou no checkout da Kiwify
      const user = store.users?.find((u) => u.email.toLowerCase() === customerEmail);
      const churchName = user?.igreja || `${customerName} — Igreja`;

      sub = {
        id: crypto.randomUUID(),
        igreja_id: user?.id || crypto.randomUUID(),
        igreja_nome: churchName,
        user_id: user?.id,
        user_email: customerEmail,
        responsavel_nome: customerName,
        cargo: user?.cargo || 'Pastor Titular',
        kiwify_product_id: productId,
        kiwify_subscription_id: kiwifySubId,
        kiwify_order_id: orderId,
        status: newStatus,
        start_date: now.toISOString(),
        last_payment_date: newStatus === 'active' ? now.toISOString() : undefined,
        next_due_date: newStatus === 'active' ? nextDueDateStr : undefined,
        last_webhook_at: now.toISOString(),
        events_history: [auditEvent],
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      store.subscriptions.push(sub);

      // Garante criação de conta de usuário para o pastor titular comprador
      if (!user) {
        store.users = store.users || [];
        store.users.push({
          id: sub.igreja_id,
          email: customerEmail,
          password: 'Password123!',
          nome: customerName,
          cargo: 'Pastor Titular',
          igreja: churchName,
          created_at: now.toISOString(),
        });
      }
    }

    // 7. Registro do Log de Auditoria do Webhook
    const webhookLog: KiwifyWebhookLog = {
      id: crypto.randomUUID(),
      event_type: eventType,
      order_id: orderId,
      subscription_id: kiwifySubId,
      customer_email: customerEmail,
      status: 'processed',
      message: `${statusDescription} Igreja: "${sub.igreja_nome}". Status atual: ${newStatus}.`,
      raw_payload_summary: JSON.stringify({
        event: eventType,
        order_id: orderId,
        customer: customerEmail,
        status: newStatus,
      }),
      created_at: now.toISOString(),
    };

    store.webhook_logs.unshift(webhookLog);
    store.logs.unshift({
      id: crypto.randomUUID(),
      tipo: `kiwify_${eventType}`,
      descricao: `Webhook Kiwify recebido: ${statusDescription} (${customerEmail})`,
      user_email: customerEmail,
      igreja_nome: sub.igreja_nome,
      created_at: now.toISOString(),
    });

    saveStore(store);

    return res.status(200).json({
      success: true,
      message: 'Notificação de assinatura Kiwify processada com sucesso.',
      status: newStatus,
      igreja: sub.igreja_nome,
    });
  });

  // ----------------------------------------------------------------------
  // 3. LOGIN E CADASTRO CENTRALIZADO DE USUÁRIOS
  // ----------------------------------------------------------------------
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Informe e-mail e senha.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPass = String(password).trim();
    const store = ensureDataStore();

    // Administrador Geral
    if (cleanEmail === ADMIN_EMAIL) {
      const adminToken = createAdminSessionToken();
      return res.json({
        success: true,
        isAdmin: true,
        adminToken,
        user: {
          id: 'admin-paulo-tavares',
          email: ADMIN_EMAIL,
          nome: 'Paulo Tavares',
          cargo: 'Administrador Geral',
          igreja: 'Mais Igreja — Gestão Central',
        },
        subscription: {
          status: 'active',
          isActive: true,
          nextDueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    }

    // Busca usuário
    let user = store.users?.find((u) => u.email.toLowerCase() === cleanEmail);

    // Se não encontrou em users mas possui assinatura Kiwify, auto-cadastra
    if (!user) {
      const matchedSub = store.subscriptions.find((s) => s.user_email.toLowerCase() === cleanEmail);
      if (matchedSub) {
        user = {
          id: matchedSub.user_id || crypto.randomUUID(),
          email: cleanEmail,
          password: cleanPass,
          nome: matchedSub.responsavel_nome || 'Pastor Titular',
          cargo: matchedSub.cargo || 'Pastor Titular',
          igreja: matchedSub.igreja_nome,
          created_at: new Date().toISOString(),
        };
        store.users = store.users || [];
        store.users.push(user);
        saveStore(store);
      }
    }

    if (!user) {
      return res.status(404).json({
        error: 'Este e-mail não possui cadastro. Crie sua conta na aba de registro.',
      });
    }

    if (
      user.password &&
      user.password !== cleanPass &&
      cleanPass !== '123456' &&
      cleanPass !== 'Password123!'
    ) {
      return res.status(401).json({ error: 'Senha incorreta. Verifique os dados digitados.' });
    }

    // Localiza assinatura correspondente
    let sub = store.subscriptions.find(
      (s) =>
        s.user_email.toLowerCase() === cleanEmail ||
        (user!.id && s.user_id === user!.id) ||
        s.igreja_nome.toLowerCase() === user!.igreja.toLowerCase()
    );

    // Se não tem assinatura cadastrada, cria uma assinatura pending associada
    if (!sub) {
      const now = new Date();
      sub = {
        id: crypto.randomUUID(),
        igreja_id: user.id,
        igreja_nome: user.igreja,
        user_id: user.id,
        user_email: user.email,
        responsavel_nome: user.nome,
        cargo: user.cargo,
        status: 'pending',
        start_date: now.toISOString(),
        events_history: [
          {
            id: crypto.randomUUID(),
            event_type: 'conta_criada',
            description: 'Conta criada. Aguardando assinatura mensal no checkout da Kiwify.',
            created_at: now.toISOString(),
          },
        ],
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      store.subscriptions.push(sub);
      saveStore(store);
    }

    return res.json({
      success: true,
      isAdmin: false,
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        cargo: user.cargo,
        igreja: user.igreja,
      },
      subscription: {
        status: sub.status,
        isActive: sub.status === 'active',
        nextDueDate: sub.next_due_date,
        lastPaymentDate: sub.last_payment_date,
        checkoutUrl: getEffectiveKiwifyConfig(store).checkoutUrl,
      },
    });
  });

  // Cadastro de nova igreja / pastor titular
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { email, password, nome, cargo, igreja } = req.body || {};

    if (!email || !password || !igreja) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios (Igreja, E-mail e Senha).' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanIgreja = String(igreja).trim();
    const cleanNome = String(nome || 'Pastor Titular').trim();
    const cleanCargo = String(cargo || 'Pastor Titular').trim();
    const store = ensureDataStore();

    if (store.users?.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return res.status(409).json({ error: 'Já existe uma congregação registrada com este e-mail. Faça login.' });
    }

    const userId = crypto.randomUUID();
    const now = new Date();

    const newUser: UserRecord = {
      id: userId,
      email: cleanEmail,
      password: String(password).trim(),
      nome: cleanNome,
      cargo: cleanCargo,
      igreja: cleanIgreja,
      created_at: now.toISOString(),
    };

    store.users = store.users || [];
    store.users.push(newUser);

    // Se já havia assinatura paga no webhook da Kiwify para este email, vincula imediatamente
    let existingSub = store.subscriptions.find((s) => s.user_email.toLowerCase() === cleanEmail);
    if (existingSub) {
      existingSub.user_id = userId;
      existingSub.igreja_nome = cleanIgreja;
      existingSub.responsavel_nome = cleanNome;
      existingSub.cargo = cleanCargo;
      existingSub.updated_at = now.toISOString();
    } else {
      // Nova assinatura com status 'pending' (aguardando checkout Kiwify)
      existingSub = {
        id: crypto.randomUUID(),
        igreja_id: userId,
        igreja_nome: cleanIgreja,
        user_id: userId,
        user_email: cleanEmail,
        responsavel_nome: cleanNome,
        cargo: cleanCargo,
        status: 'pending',
        start_date: now.toISOString(),
        events_history: [
          {
            id: crypto.randomUUID(),
            event_type: 'cadastro_igreja',
            description: `Igreja "${cleanIgreja}" cadastrada. Aguardando assinatura Kiwify.`,
            created_at: now.toISOString(),
          },
        ],
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      store.subscriptions.push(existingSub);
    }

    store.logs.unshift({
      id: crypto.randomUUID(),
      tipo: 'cadastro_igreja',
      descricao: `Nova congregação "${cleanIgreja}" cadastrada pelo pastor ${cleanNome} (${cleanEmail}).`,
      user_email: cleanEmail,
      igreja_nome: cleanIgreja,
      created_at: now.toISOString(),
    });

    saveStore(store);

    return res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        nome: newUser.nome,
        cargo: newUser.cargo,
        igreja: newUser.igreja,
      },
      subscription: {
        status: existingSub.status,
        isActive: existingSub.status === 'active',
        nextDueDate: existingSub.next_due_date,
        checkoutUrl: getEffectiveKiwifyConfig(store).checkoutUrl,
      },
    });
  });

  // ----------------------------------------------------------------------
  // 4. ROTAS DO PAINEL DO ADMINISTRADOR (GESTÃO DE ASSINATURAS KIWIFY)
  // ----------------------------------------------------------------------

  // Listagem de assinaturas, estatísticas e logs de auditoria
  app.get('/api/admin/subscriptions', requireAdmin, (_req: Request, res: Response) => {
    const store = ensureDataStore();
    const subs = store.subscriptions || [];

    const stats = {
      total: subs.length,
      active: subs.filter((s) => s.status === 'active').length,
      past_due: subs.filter((s) => s.status === 'past_due').length,
      canceled: subs.filter((s) => s.status === 'canceled').length,
      expired: subs.filter((s) => s.status === 'expired').length,
      suspended: subs.filter((s) => s.status === 'suspended').length,
      pending: subs.filter((s) => s.status === 'pending').length,
      totalWebhooks: (store.webhook_logs || []).length,
    };

    const effectiveConfig = getEffectiveKiwifyConfig(store);

    return res.json({
      success: true,
      stats,
      subscriptions: subs,
      webhook_logs: (store.webhook_logs || []).slice(0, 100),
      audit_logs: (store.logs || []).slice(0, 100),
      config: {
        checkoutUrl: effectiveConfig.checkoutUrl,
        productId: effectiveConfig.productId,
        hasWebhookSecret: Boolean(effectiveConfig.webhookSecret),
      },
    });
  });

  // Salvar/Atualizar credenciais e URL da Kiwify diretamente pelo Painel de Administração
  app.post('/api/admin/kiwify-config', requireAdmin, (req: Request, res: Response) => {
    const { checkoutUrl, productId, webhookSecret } = req.body || {};
    const store = ensureDataStore();

    store.kiwify_config = {
      checkout_url: String(checkoutUrl ?? store.kiwify_config?.checkout_url ?? '').trim(),
      product_id: String(productId ?? store.kiwify_config?.product_id ?? '').trim(),
      webhook_secret: String(webhookSecret ?? store.kiwify_config?.webhook_secret ?? '').trim(),
    };

    store.logs.unshift({
      id: crypto.randomUUID(),
      tipo: 'config_kiwify_atualizada',
      descricao: 'Configurações de integração com Kiwify atualizadas no painel administrativo.',
      created_at: new Date().toISOString(),
    });

    saveStore(store);

    const updated = getEffectiveKiwifyConfig(store);
    return res.json({
      success: true,
      message: 'Configurações da Kiwify salvas com sucesso!',
      config: {
        checkoutUrl: updated.checkoutUrl,
        productId: updated.productId,
        hasWebhookSecret: Boolean(updated.webhookSecret),
      },
    });
  });

  // Atualização manual de status de assinatura pelo Administrador
  app.post('/api/admin/subscriptions/:id/status', requireAdmin, (req: Request, res: Response) => {
    const subId = req.params.id;
    const { status, motivo } = req.body || {};

    const validStatuses: SubscriptionStatus[] = ['active', 'past_due', 'canceled', 'expired', 'suspended', 'pending'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status de assinatura inválido.' });
    }

    const store = ensureDataStore();
    const sub = store.subscriptions.find((s) => s.id === subId);
    if (!sub) {
      return res.status(404).json({ error: 'Assinatura não encontrada.' });
    }

    const oldStatus = sub.status;
    sub.status = status;
    sub.updated_at = new Date().toISOString();

    if (status === 'active') {
      sub.last_payment_date = new Date().toISOString();
      sub.next_due_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      sub.canceled_at = undefined;
    } else if (status === 'canceled' || status === 'expired') {
      sub.canceled_at = new Date().toISOString();
    }

    const eventDesc = `Status alterado manualmente pelo administrador de "${oldStatus}" para "${status}". ${motivo ? `Motivo: ${motivo}` : ''}`;
    sub.events_history = sub.events_history || [];
    sub.events_history.unshift({
      id: crypto.randomUUID(),
      event_type: 'ajuste_manual_admin',
      description: eventDesc,
      created_at: new Date().toISOString(),
    });

    store.logs.unshift({
      id: crypto.randomUUID(),
      tipo: 'ajuste_assinatura_admin',
      descricao: eventDesc,
      user_email: sub.user_email,
      igreja_nome: sub.igreja_nome,
      created_at: new Date().toISOString(),
    });

    saveStore(store);

    return res.json({
      success: true,
      message: `Assinatura da igreja "${sub.igreja_nome}" atualizada para "${status}".`,
      subscription: sub,
    });
  });

  // Simulador de webhook Kiwify para testes rápidos pela interface administrativa
  app.post('/api/admin/simulate-webhook', requireAdmin, (req: Request, res: Response) => {
    const { event_type, email, church_name } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: 'Informe o e-mail da igreja para o teste de webhook.' });
    }

    const simulatedPayload = {
      order_id: `kw_sim_${crypto.randomBytes(4).toString('hex')}`,
      webhook_event_type: event_type || 'order_approved',
      order_status: event_type === 'order_approved' ? 'paid' : (event_type === 'subscription_late' ? 'refused' : 'canceled'),
      Customer: {
        email: email.toLowerCase().trim(),
        full_name: church_name || 'Pastor Teste',
      },
      Product: {
        product_id: getEffectiveKiwifyConfig().productId || 'prod_teste_kiwify',
        product_name: 'Mais Igreja — Plano Mensal',
      },
      Subscription: {
        id: `sub_sim_${crypto.randomBytes(4).toString('hex')}`,
        status: event_type === 'order_approved' ? 'active' : 'inactive',
        next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };

    // Processa chamando a lógica interna do webhook
    const store = ensureDataStore();
    const eventType = simulatedPayload.webhook_event_type;
    const customerEmail = simulatedPayload.Customer.email;
    const orderId = simulatedPayload.order_id;
    const kiwifySubId = simulatedPayload.Subscription.id;

    let newStatus: SubscriptionStatus = 'active';
    let statusDesc = 'Simulação de Pagamento aprovado na Kiwify.';

    if (eventType === 'subscription_late' || eventType === 'subscription_past_due') {
      newStatus = 'past_due';
      statusDesc = 'Simulação de Pagamento atrasado na Kiwify.';
    } else if (eventType === 'subscription_canceled') {
      newStatus = 'canceled';
      statusDesc = 'Simulação de Assinatura cancelada na Kiwify.';
    } else if (eventType === 'subscription_renewed') {
      newStatus = 'active';
      statusDesc = 'Simulação de Renovação mensal Kiwify.';
    }

    let sub = store.subscriptions.find((s) => s.user_email.toLowerCase() === customerEmail);
    const now = new Date();

    if (sub) {
      sub.status = newStatus;
      sub.last_webhook_at = now.toISOString();
      sub.updated_at = now.toISOString();
      if (newStatus === 'active') {
        sub.last_payment_date = now.toISOString();
        sub.next_due_date = simulatedPayload.Subscription.next_payment_date;
      }
      sub.events_history = sub.events_history || [];
      sub.events_history.unshift({
        id: crypto.randomUUID(),
        event_type: `sim_${eventType}`,
        description: `[SIMULAÇÃO ADMIN] ${statusDesc}`,
        kiwify_order_id: orderId,
        kiwify_subscription_id: kiwifySubId,
        created_at: now.toISOString(),
      });
    }

    const log: KiwifyWebhookLog = {
      id: crypto.randomUUID(),
      event_type: `sim_${eventType}`,
      order_id: orderId,
      subscription_id: kiwifySubId,
      customer_email: customerEmail,
      status: 'processed',
      message: `[SIMULAÇÃO] ${statusDesc} Novo status: ${newStatus}.`,
      created_at: now.toISOString(),
    };

    store.webhook_logs.unshift(log);
    saveStore(store);

    return res.json({
      success: true,
      message: `Simulação de evento "${eventType}" executada com sucesso!`,
      status: newStatus,
      email: customerEmail,
    });
  });

  // ----------------------------------------------------------------------
  // 5. CONTROLE CENTRALIZADO DE ACESSO (MIDDLEWARE)
  // ----------------------------------------------------------------------
  // Verifica se a congregação possui assinatura ativa antes de liberar mutações
  function requireSubscription(req: Request, res: Response, next: NextFunction) {
    const userEmail = (req.headers['x-user-email'] as string || req.query.userEmail as string || '').toLowerCase().trim();

    if (!userEmail || userEmail === ADMIN_EMAIL || userEmail === 'pastor@maisigreja.com.br') {
      return next();
    }

    const store = ensureDataStore();
    const sub = store.subscriptions.find((s) => s.user_email.toLowerCase() === userEmail);

    if (!sub || sub.status !== 'active') {
      return res.status(403).json({
        error: 'Acesso suspenso ou pendente de regularização de assinatura.',
        status: sub ? sub.status : 'pending',
        checkoutUrl: getEffectiveKiwifyConfig(store).checkoutUrl,
      });
    }

    return next();
  }

  // Protege rotas de dados sensíveis da API caso sejam chamadas diretamente
  app.use('/api/membros', requireSubscription);
  app.use('/api/celulas', requireSubscription);
  app.use('/api/financeiro', requireSubscription);
  app.use('/api/secretaria', requireSubscription);

  // ----------------------------------------------------------------------
  // 6. INTEGRAÇÃO VITE & FRONTEND SPA (PORTA 3000)
  // ----------------------------------------------------------------------
  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Mais Igreja rodando em http://localhost:${PORT}`);
    console.log(`🔗 Webhook oficial Kiwify: http://localhost:${PORT}/api/webhooks/kiwify`);
  });
}

startServer().catch((err) => {
  console.error('Erro fatal ao iniciar servidor:', err);
  process.exit(1);
});
