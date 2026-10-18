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

// Supabase fallback no servidor
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cxnpkpviadmfaihmtlav.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4bnBrcHZpYWRtZmFpaG10bGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzOTk1MzcsImV4cCI6MjEwNjk3NTUzN30.zuEQfdNDbC78SQA_rqCedRsFDRCtXHQr_ab_1z8YL6U';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Estruturas de Dados
export interface TokenRecord {
  id: string;
  token_code: string;
  token_hash: string;
  status: 'disponivel' | 'utilizado' | 'revogado';
  created_at: string;
  created_by: string;
  activated_at?: string;
  activated_by_user_id?: string;
  activated_by_igreja?: string;
  activated_by_email?: string;
  observacoes?: string;
}

export interface ChurchLicenseRecord {
  id: string;
  user_id?: string;
  igreja_nome: string;
  email: string;
  responsavel_nome?: string;
  cargo?: string;
  status: 'trial' | 'trial_expired' | 'active' | 'revoked';
  trial_start: string; // ISO String
  trial_end: string;   // ISO String (14 dias após início)
  activated_at?: string;
  token_code?: string;
  token_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRecord {
  id: string;
  tipo: 'geracao_token' | 'ativacao_token' | 'inicio_trial' | 'expiracao_trial' | 'revogacao_licenca' | 'reativacao' | 'revogacao_token' | 'login_admin';
  descricao: string;
  user_email?: string;
  igreja_nome?: string;
  created_at: string;
}

// Arquivo de persistência local atômica segura
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'licenses_store.json');

interface StoreSchema {
  tokens: TokenRecord[];
  churches: ChurchLicenseRecord[];
  logs: AuditLogRecord[];
}

function ensureDataStore(): StoreSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const initial: StoreSchema = {
        tokens: [],
        churches: [],
        logs: [
          {
            id: crypto.randomUUID(),
            tipo: 'geracao_token',
            descricao: 'Sistema de Licenças Inicializado com sucesso.',
            created_at: new Date().toISOString(),
          },
        ],
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao acessar arquivo de licenças:', err);
    return { tokens: [], churches: [], logs: [] };
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
    console.error('Erro ao salvar arquivo de licenças:', err);
  }
}

// Helper: Hash SHA-256 seguro para tokens
function hashToken(code: string): string {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

// Helper: Formata token criptográfico único ex: MI-8A2F-9B1C-4D3E-7F80
function generateSecureTokenCode(): string {
  const bytes = crypto.randomBytes(8);
  const hex = bytes.toString('hex').toUpperCase();
  // 16 caracteres hexadecimais divididos em 4 blocos de 4
  const part1 = hex.slice(0, 4);
  const part2 = hex.slice(4, 8);
  const part3 = hex.slice(8, 12);
  const part4 = hex.slice(12, 16);
  return `MI-${part1}-${part2}-${part3}-${part4}`;
}

// Helper: Sessão do Administrador com HMAC assinado
function createAdminSessionToken(): string {
  const payload = {
    email: ADMIN_EMAIL,
    role: 'super_admin',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 horas
  };
  const str = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', JWT_SECRET).update(str).digest('base64url');
  return `${str}.${hmac}`;
}

function verifyAdminSession(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const [str, hmac] = token.split('.');
    if (!str || !hmac) return false;
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(str).digest('base64url');
    if (expected !== hmac) return false;
    const payload = JSON.parse(Buffer.from(str, 'base64url').toString('utf-8'));
    if (payload.email !== ADMIN_EMAIL) return false;
    if (Date.now() > payload.expiresAt) return false;
    return true;
  } catch {
    return false;
  }
}

// Middleware de verificação de admin
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (!verifyAdminSession(token)) {
    return res.status(401).json({ error: 'Acesso não autorizado. Faça login administrativo.' });
  }
  next();
}

// Atualiza status de trials expirados dinamicamente
function refreshChurchStatuses(store: StoreSchema): boolean {
  let changed = false;
  const now = Date.now();
  for (const church of store.churches) {
    if (church.status === 'trial') {
      const end = new Date(church.trial_end).getTime();
      if (now > end) {
        church.status = 'trial_expired';
        church.updated_at = new Date().toISOString();
        store.logs.unshift({
          id: crypto.randomUUID(),
          tipo: 'expiracao_trial',
          descricao: `Período de teste de 14 dias da igreja "${church.igreja_nome}" (${church.email}) expirou.`,
          user_email: church.email,
          igreja_nome: church.igreja_nome,
          created_at: new Date().toISOString(),
        });
        changed = true;
      }
    }
  }
  return changed;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Rotas da API
  // -------------------------------------------------------------
  // 1. LOGIN ADMINISTRATIVO (paulotavares78@hotmail.com)
  // -------------------------------------------------------------
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Informe e-mail e senha administrativa.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (cleanEmail !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'E-mail não autorizado para acesso administrativo.' });
    }

    if (String(password) !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Senha administrativa incorreta.' });
    }

    const token = createAdminSessionToken();
    const store = ensureDataStore();
    store.logs.unshift({
      id: crypto.randomUUID(),
      tipo: 'login_admin',
      descricao: `Administrador (${ADMIN_EMAIL}) efetuou login no painel de gestão.`,
      user_email: ADMIN_EMAIL,
      created_at: new Date().toISOString(),
    });
    saveStore(store);

    return res.json({
      success: true,
      token,
      email: ADMIN_EMAIL,
      message: 'Login administrativo autenticado com sucesso.',
    });
  });

  // -------------------------------------------------------------
  // 2. VERIFICAÇÃO DE SESSÃO ADMIN
  // -------------------------------------------------------------
  app.get('/api/admin/verify', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (verifyAdminSession(token)) {
      return res.json({ valid: true, email: ADMIN_EMAIL });
    }
    return res.status(401).json({ valid: false });
  });

  // -------------------------------------------------------------
  // 3. DASHBOARD KPI DO ADMIN
  // -------------------------------------------------------------
  app.get('/api/admin/stats', requireAdmin, (req: Request, res: Response) => {
    const store = ensureDataStore();
    if (refreshChurchStatuses(store)) {
      saveStore(store);
    }

    const totalChurches = store.churches.length;
    const activeTrials = store.churches.filter((c) => c.status === 'trial').length;
    const expiredTrials = store.churches.filter((c) => c.status === 'trial_expired').length;
    const activeLicenses = store.churches.filter((c) => c.status === 'active').length;
    const revokedLicenses = store.churches.filter((c) => c.status === 'revoked').length;

    const totalTokens = store.tokens.length;
    const availableTokens = store.tokens.filter((t) => t.status === 'disponivel').length;
    const usedTokens = store.tokens.filter((t) => t.status === 'utilizado').length;
    const revokedTokens = store.tokens.filter((t) => t.status === 'revogado').length;

    return res.json({
      churches: {
        total: totalChurches,
        activeTrials,
        expiredTrials,
        activeLicenses,
        revokedLicenses,
      },
      tokens: {
        total: totalTokens,
        available: availableTokens,
        used: usedTokens,
        revoked: revokedTokens,
      },
    });
  });

  // -------------------------------------------------------------
  // 4. GERAÇÃO DE TOKENS (Único ou Lote)
  // -------------------------------------------------------------
  app.post('/api/admin/tokens/generate', requireAdmin, (req: Request, res: Response) => {
    const { count = 1, observacoes = '' } = req.body || {};
    const qty = Math.max(1, Math.min(Number(count) || 1, 20)); // entre 1 e 20 por vez

    const store = ensureDataStore();
    const newTokens: TokenRecord[] = [];

    for (let i = 0; i < qty; i++) {
      let code = generateSecureTokenCode();
      // Garante unicidade
      while (store.tokens.some((t) => t.token_code === code)) {
        code = generateSecureTokenCode();
      }
      const tokenRec: TokenRecord = {
        id: crypto.randomUUID(),
        token_code: code,
        token_hash: hashToken(code),
        status: 'disponivel',
        created_at: new Date().toISOString(),
        created_by: ADMIN_EMAIL,
        observacoes: observacoes ? String(observacoes).trim() : undefined,
      };
      store.tokens.unshift(tokenRec);
      newTokens.push(tokenRec);
    }

    store.logs.unshift({
      id: crypto.randomUUID(),
      tipo: 'geracao_token',
      descricao: `Administrador gerou ${qty} novo(s) token(s) de ativação permanente.`,
      user_email: ADMIN_EMAIL,
      created_at: new Date().toISOString(),
    });

    saveStore(store);

    return res.json({
      success: true,
      count: newTokens.length,
      tokens: newTokens,
    });
  });

  // -------------------------------------------------------------
  // 5. LISTAR TOKENS
  // -------------------------------------------------------------
  app.get('/api/admin/tokens', requireAdmin, (req: Request, res: Response) => {
    const store = ensureDataStore();
    return res.json({ tokens: store.tokens });
  });

  // -------------------------------------------------------------
  // 6. REVOGAR TOKEN (Antes de ser usado)
  // -------------------------------------------------------------
  app.post('/api/admin/tokens/revoke', requireAdmin, (req: Request, res: Response) => {
    const { tokenId } = req.body || {};
    if (!tokenId) return res.status(400).json({ error: 'ID do token obrigatório.' });

    const store = ensureDataStore();
    const token = store.tokens.find((t) => t.id === tokenId);
    if (!token) return res.status(404).json({ error: 'Token não encontrado.' });

    token.status = 'revogado';
    store.logs.unshift({
      id: crypto.randomUUID(),
      tipo: 'revogacao_token',
      descricao: `Token ${token.token_code} foi revogado pelo administrador.`,
      user_email: ADMIN_EMAIL,
      created_at: new Date().toISOString(),
    });

    saveStore(store);
    return res.json({ success: true, message: `Token ${token.token_code} revogado.` });
  });

  // -------------------------------------------------------------
  // 7. LISTAR IGREJAS CADASTRADAS E STATUS
  // -------------------------------------------------------------
  app.get('/api/admin/churches', requireAdmin, (req: Request, res: Response) => {
    const store = ensureDataStore();
    if (refreshChurchStatuses(store)) {
      saveStore(store);
    }
    return res.json({ churches: store.churches });
  });

  // -------------------------------------------------------------
  // 8. REVOGAR LICENÇA DE IGREJA
  // -------------------------------------------------------------
  app.post('/api/admin/churches/revoke', requireAdmin, (req: Request, res: Response) => {
    const { churchId } = req.body || {};
    if (!churchId) return res.status(400).json({ error: 'ID da igreja obrigatório.' });

    const store = ensureDataStore();
    const church = store.churches.find((c) => c.id === churchId);
    if (!church) return res.status(404).json({ error: 'Igreja não encontrada.' });

    church.status = 'revoked';
    church.updated_at = new Date().toISOString();

    store.logs.unshift({
      id: crypto.randomUUID(),
      tipo: 'revogacao_licenca',
      descricao: `Acesso da igreja "${church.igreja_nome}" (${church.email}) foi REVOGADO pelo administrador.`,
      user_email: church.email,
      igreja_nome: church.igreja_nome,
      created_at: new Date().toISOString(),
    });

    saveStore(store);
    return res.json({ success: true, message: `Licença da igreja ${church.igreja_nome} revogada.` });
  });

  // -------------------------------------------------------------
  // 9. ATIVAR LICENÇA MANUALMENTE PELO ADMIN
  // -------------------------------------------------------------
  app.post('/api/admin/churches/activate', requireAdmin, (req: Request, res: Response) => {
    const { churchId } = req.body || {};
    if (!churchId) return res.status(400).json({ error: 'ID da igreja obrigatório.' });

    const store = ensureDataStore();
    const church = store.churches.find((c) => c.id === churchId);
    if (!church) return res.status(404).json({ error: 'Igreja não encontrada.' });

    church.status = 'active';
    church.activated_at = new Date().toISOString();
    church.updated_at = new Date().toISOString();

    store.logs.unshift({
      id: crypto.randomUUID(),
      tipo: 'reativacao',
      descricao: `Licença permanente da igreja "${church.igreja_nome}" (${church.email}) ativada manualmente pelo administrador.`,
      user_email: church.email,
      igreja_nome: church.igreja_nome,
      created_at: new Date().toISOString(),
    });

    saveStore(store);
    return res.json({ success: true, message: `Licença permanente da igreja ${church.igreja_nome} ativada.` });
  });

  // -------------------------------------------------------------
  // 10. HISTÓRICO DE AUDITORIA
  // -------------------------------------------------------------
  app.get('/api/admin/logs', requireAdmin, (req: Request, res: Response) => {
    const store = ensureDataStore();
    return res.json({ logs: store.logs });
  });

  // =============================================================
  // ROTAS PÚBLICAS DE LICENÇAS E CONTROLE DE ACESSO
  // =============================================================

  // -------------------------------------------------------------
  // 11. INICIAR TESTE GRÁTIS DE 14 DIAS (OPÇÃO A)
  // -------------------------------------------------------------
  app.post('/api/license/start-trial', (req: Request, res: Response) => {
    const { email, igreja_nome, responsavel_nome, cargo, user_id } = req.body || {};
    if (!email || !igreja_nome) {
      return res.status(400).json({ error: 'E-mail e nome da congregação são obrigatórios.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanIgreja = String(igreja_nome).trim();
    const store = ensureDataStore();

    // Verificação estrita anti-duplicação de teste:
    // Não permitir que o mesmo email ou mesma igreja crie outro teste para reiniciar o prazo
    const existing = store.churches.find(
      (c) => c.email.toLowerCase() === cleanEmail || c.igreja_nome.toLowerCase() === cleanIgreja.toLowerCase()
    );

    if (existing) {
      if (existing.status === 'active') {
        return res.json({
          success: true,
          status: 'active',
          church: existing,
          message: 'Esta igreja já possui licença permanente ativa.',
        });
      }
      if (existing.status === 'trial_expired') {
        return res.status(403).json({
          error: 'O período experimental desta igreja já se esgotou. Adquira uma licença e utilize a Opção B para ativar com token.',
          code: 'TRIAL_ALREADY_EXPIRED',
        });
      }
      if (existing.status === 'revoked') {
        return res.status(403).json({
          error: 'O acesso desta congregação foi revogado pela administração.',
          code: 'ACCESS_REVOKED',
        });
      }
      // Se ainda está em trial, retorna o trial existente
      const now = Date.now();
      const end = new Date(existing.trial_end).getTime();
      const diffDays = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
      return res.json({
        success: true,
        status: 'trial',
        daysRemaining: diffDays,
        church: existing,
        message: `Teste grátis em andamento. Restam ${diffDays} dia(s).`,
      });
    }

    // Cria novo período experimental de exatamente 14 dias
    const trialStart = new Date();
    const trialEnd = new Date(trialStart.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 dias exatos

    const newChurch: ChurchLicenseRecord = {
      id: crypto.randomUUID(),
      user_id: user_id ? String(user_id) : undefined,
      igreja_nome: cleanIgreja,
      email: cleanEmail,
      responsavel_nome: responsavel_nome ? String(responsavel_nome).trim() : undefined,
      cargo: cargo ? String(cargo).trim() : 'Pastor Titular',
      status: 'trial',
      trial_start: trialStart.toISOString(),
      trial_end: trialEnd.toISOString(),
      created_at: trialStart.toISOString(),
      updated_at: trialStart.toISOString(),
    };

    store.churches.push(newChurch);
    store.logs.unshift({
      id: crypto.randomUUID(),
      tipo: 'inicio_trial',
      descricao: `Início do teste grátis de 14 dias para a igreja "${cleanIgreja}" (${cleanEmail}).`,
      user_email: cleanEmail,
      igreja_nome: cleanIgreja,
      created_at: trialStart.toISOString(),
    });

    saveStore(store);

    return res.json({
      success: true,
      status: 'trial',
      daysRemaining: 14,
      trial_start: newChurch.trial_start,
      trial_end: newChurch.trial_end,
      church: newChurch,
      message: 'Período experimental de 14 dias iniciado com sucesso!',
    });
  });

  // -------------------------------------------------------------
  // 12. ATIVAÇÃO DE LICENÇA PERMANENTE POR TOKEN (OPÇÃO B & DENTRO DO SISTEMA)
  // Operação Atômica no Servidor
  // -------------------------------------------------------------
  app.post('/api/license/activate', (req: Request, res: Response) => {
    const { token, email, igreja_nome, responsavel_nome, cargo, user_id } = req.body || {};
    if (!token) {
      return res.status(400).json({ error: 'Informe o código do token de ativação.' });
    }
    if (!email || !igreja_nome) {
      return res.status(400).json({ error: 'E-mail e nome da congregação são obrigatórios.' });
    }

    const cleanToken = String(token).trim().toUpperCase();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanIgreja = String(igreja_nome).trim();
    const incomingHash = hashToken(cleanToken);

    const store = ensureDataStore();

    // 1. Busca o token no banco de tokens
    const tokenRec = store.tokens.find(
      (t) => t.token_code === cleanToken || t.token_hash === incomingHash
    );

    if (!tokenRec) {
      return res.status(404).json({
        error: 'Token inválido. Verifique o código digitado e tente novamente.',
        code: 'TOKEN_NOT_FOUND',
      });
    }

    if (tokenRec.status === 'revogado') {
      return res.status(400).json({
        error: 'Este token foi revogado pela administração e não pode ser utilizado.',
        code: 'TOKEN_REVOKED',
      });
    }

    if (tokenRec.status === 'utilizado') {
      return res.status(400).json({
        error: `Este token já foi utilizado anteriormente${
          tokenRec.activated_by_igreja ? ` pela igreja "${tokenRec.activated_by_igreja}"` : ''
        }. Cada token é de uso único.`,
        code: 'TOKEN_ALREADY_USED',
      });
    }

    // 2. Operação atômica: queima o token e vincula à igreja
    const nowIso = new Date().toISOString();
    tokenRec.status = 'utilizado';
    tokenRec.activated_at = nowIso;
    tokenRec.activated_by_email = cleanEmail;
    tokenRec.activated_by_igreja = cleanIgreja;
    tokenRec.activated_by_user_id = user_id ? String(user_id) : undefined;

    // 3. Atualiza ou cria o registro da igreja como 'active' permanente
    let church = store.churches.find(
      (c) => c.email.toLowerCase() === cleanEmail || c.igreja_nome.toLowerCase() === cleanIgreja.toLowerCase()
    );

    if (church) {
      church.status = 'active';
      church.activated_at = nowIso;
      church.token_code = cleanToken;
      church.token_hash = incomingHash;
      church.updated_at = nowIso;
      if (user_id) church.user_id = String(user_id);
    } else {
      church = {
        id: crypto.randomUUID(),
        user_id: user_id ? String(user_id) : undefined,
        igreja_nome: cleanIgreja,
        email: cleanEmail,
        responsavel_nome: responsavel_nome ? String(responsavel_nome).trim() : undefined,
        cargo: cargo ? String(cargo).trim() : 'Pastor Titular',
        status: 'active',
        trial_start: nowIso,
        trial_end: nowIso,
        activated_at: nowIso,
        token_code: cleanToken,
        token_hash: incomingHash,
        created_at: nowIso,
        updated_at: nowIso,
      };
      store.churches.push(church);
    }

    // 4. Registro de auditoria
    store.logs.unshift({
      id: crypto.randomUUID(),
      tipo: 'ativacao_token',
      descricao: `Licença permanente ativada com sucesso para "${cleanIgreja}" (${cleanEmail}) com o token ${cleanToken}.`,
      user_email: cleanEmail,
      igreja_nome: cleanIgreja,
      created_at: nowIso,
    });

    saveStore(store);

    return res.json({
      success: true,
      status: 'active',
      church,
      message: 'Licença permanente ativada com sucesso! Seu acesso vitalício está liberado.',
    });
  });

  // -------------------------------------------------------------
  // 13. CONSULTAR STATUS DA LICENÇA
  // -------------------------------------------------------------
  app.get('/api/license/status', (req: Request, res: Response) => {
    const email = req.query.email ? String(req.query.email).trim().toLowerCase() : '';
    const userId = req.query.userId ? String(req.query.userId).trim() : '';

    if (!email && !userId) {
      return res.status(400).json({ error: 'Parâmetro email ou userId obrigatório.' });
    }

    const store = ensureDataStore();
    if (refreshChurchStatuses(store)) {
      saveStore(store);
    }

    const church = store.churches.find(
      (c) => (email && c.email.toLowerCase() === email) || (userId && c.user_id === userId)
    );

    if (!church) {
      return res.json({
        exists: false,
        status: 'not_found',
        message: 'Nenhum registro de licença encontrado para este usuário.',
      });
    }

    let daysRemaining = 0;
    if (church.status === 'trial') {
      const now = Date.now();
      const end = new Date(church.trial_end).getTime();
      daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    }

    return res.json({
      exists: true,
      status: church.status,
      daysRemaining,
      trialStart: church.trial_start,
      trialEnd: church.trial_end,
      activatedAt: church.activated_at,
      igrejaNome: church.igreja_nome,
      email: church.email,
    });
  });

  // -------------------------------------------------------------
  // 14. INICIALIZAÇÃO DE VITE EM DESENVOLVIMENTO OU ARQUIVOS ESTÁTICOS EM PRODUÇÃO
  // -------------------------------------------------------------
  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Mais Igreja rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Falha ao iniciar servidor:', err);
  process.exit(1);
});
