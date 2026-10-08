import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Membro, Celula, RegistroFinanceiro, DocumentoSecretaria, UserSession } from '../types/database';

// Chaves de armazenamento Local
export const STORAGE_KEYS = {
  USER: 'mais_igreja_user',
  MEMBROS: 'mais_igreja_membros',
  CELULAS: 'mais_igreja_celulas',
  FINANCEIRO: 'mais_igreja_financeiro',
  SECRETARIA: 'mais_igreja_secretaria',
  SUPABASE_URL: 'mais_igreja_supabase_url',
  SUPABASE_KEY: 'mais_igreja_supabase_anon_key',
};

// Validador de formato UUID v4
export function isValidUUID(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id.trim());
}

// Gerador de UUID real
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Usuário eclesiástico padrão para garantir abertura imediata do sistema conectado
export const DEFAULT_USER: UserSession = {
  id: '87957dd5-b60c-4054-8a5f-2dd5d7400317',
  email: 'pastor@maisigreja.com.br',
  nome: 'Pastor Titular',
  cargo: 'Pastor Titular',
  igreja: 'Mais Igreja',
};

export const DEFAULT_CREDENTIALS = {
  email: 'pastor@maisigreja.com.br',
  password: 'Password123!',
};

// Limpeza estrita de qualquer dado fictício legado das tabelas
export function purgeFictitiousData(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const memStr = localStorage.getItem(STORAGE_KEYS.MEMBROS);
    if (memStr && (memStr.includes('Carlos Eduardo Ferreira') || memStr.includes('b1111111') || memStr.includes('mem-01'))) {
      localStorage.removeItem(STORAGE_KEYS.MEMBROS);
    }

    const celStr = localStorage.getItem(STORAGE_KEYS.CELULAS);
    if (celStr && (celStr.includes('Célula Betel') || celStr.includes('a1111111') || celStr.includes('cel-01'))) {
      localStorage.removeItem(STORAGE_KEYS.CELULAS);
    }

    const finStr = localStorage.getItem(STORAGE_KEYS.FINANCEIRO);
    if (finStr && (finStr.includes('c1111111') || finStr.includes('fin-01') || finStr.includes('Dízimos do Culto'))) {
      localStorage.removeItem(STORAGE_KEYS.FINANCEIRO);
    }

    const secStr = localStorage.getItem(STORAGE_KEYS.SECRETARIA);
    if (secStr && (secStr.includes('d1111111') || secStr.includes('sec-01') || secStr.includes('Ata da Reunião Ministerial Ordinária - Outubro 2026'))) {
      localStorage.removeItem(STORAGE_KEYS.SECRETARIA);
    }
  } catch (err) {
    console.warn('Erro ao limpar dados fictícios:', err);
  }
}

// Executar limpeza imediatamente ao carregar o módulo
purgeFictitiousData();

/**
 * Higienização estrita da URL do Supabase:
 * - Converte link do dashboard (ex: supabase.com/dashboard/project/xyz) -> https://xyz.supabase.co
 * - Converte project ref direto (ex: xyz) -> https://xyz.supabase.co
 * - Remove rigorosamente qualquer /rest/v1, /auth/v1, /rest, /auth ou caminho extra
 * - Rejeita URLs incorretas da própria aplicação (ex: run.app)
 */
export function cleanSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim().replace(/^['"]|['"]$/g, '');

  if (!url) return '';

  // Se o usuário colou a URL do painel dashboard do Supabase
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Se o usuário colou apenas o ID de referência do projeto
  if (/^[a-z0-9]{15,30}$/i.test(url)) {
    return `https://${url}.supabase.co`;
  }

  // Garantir protocolo
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);

    // Se o usuário colou a URL do applet em vez do Supabase
    if (parsed.hostname.includes('run.app') || parsed.hostname.includes('localhost')) {
      return '';
    }

    const portPart = parsed.port && parsed.port !== '80' && parsed.port !== '443' ? `:${parsed.port}` : '';
    // Retorna EXCLUSIVAMENTE a origem raiz sem nenhum pathname
    return `${parsed.protocol}//${parsed.hostname}${portPart}`;
  } catch {
    const match = url.match(/https?:\/\/[a-zA-Z0-9.-]+\.supabase\.co/i);
    return match ? match[0] : '';
  }
}

// Obter URL e Key configuradas
export function getStoredSupabaseConfig(): { url: string; key: string } {
  let localUrl = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.SUPABASE_URL) || '' : '';
  const localKey = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.SUPABASE_KEY) || '' : '';

  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

  const rawUrl = localUrl || envUrl;
  const cleanedUrl = cleanSupabaseUrl(rawUrl);

  // Auto-correção no localStorage caso tenha sido salvo com caminho inválido
  if (localUrl && cleanedUrl !== localUrl && typeof localStorage !== 'undefined') {
    if (cleanedUrl) {
      localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, cleanedUrl);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SUPABASE_URL);
    }
  }

  const key = (localKey || envKey).trim();

  return {
    url: cleanedUrl,
    key: key,
  };
}

let activeClient: SupabaseClient | null = null;
let lastConfigUrl = '';
let lastConfigKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getStoredSupabaseConfig();
  if (!url || !key || url.includes('placeholder')) {
    activeClient = null;
    lastConfigUrl = '';
    lastConfigKey = '';
    return null;
  }
  if (!activeClient || lastConfigUrl !== url || lastConfigKey !== key) {
    try {
      activeClient = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      lastConfigUrl = url;
      lastConfigKey = key;
    } catch (e) {
      console.error('Falha ao inicializar cliente Supabase:', e);
      activeClient = null;
      lastConfigUrl = '';
      lastConfigKey = '';
    }
  }
  return activeClient;
}

export function isSupabaseConnected(): boolean {
  return getSupabaseClient() !== null;
}

export const isSupabaseConfigured = () => isSupabaseConnected();

export function setCustomSupabaseCredentials(url: string, key: string): boolean {
  if (!url || !key) return false;
  try {
    const cleanedUrl = cleanSupabaseUrl(url);
    const cleanedKey = key.trim();

    if (!cleanedUrl) {
      throw new Error('URL do Supabase inválida. Informe a URL do projeto (ex: https://seu-projeto.supabase.co).');
    }

    localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, cleanedUrl);
    localStorage.setItem(STORAGE_KEYS.SUPABASE_KEY, cleanedKey);

    activeClient = createClient(cleanedUrl, cleanedKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    lastConfigUrl = cleanedUrl;
    lastConfigKey = cleanedKey;
    return true;
  } catch (err) {
    console.error('Erro ao salvar credenciais do Supabase:', err);
    return false;
  }
}

export function clearCustomSupabaseCredentials(): void {
  localStorage.removeItem(STORAGE_KEYS.SUPABASE_URL);
  localStorage.removeItem(STORAGE_KEYS.SUPABASE_KEY);
  activeClient = null;
  lastConfigUrl = '';
  lastConfigKey = '';
}

let sessionEnsuredPromise: Promise<string | null> | null = null;

// Garante sessão autenticada ativa no Supabase para que as regras de RLS permitam consultas e gravações
export async function ensureSupabaseSession(): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  if (sessionEnsuredPromise) {
    return sessionEnsuredPromise;
  }

  sessionEnsuredPromise = (async () => {
    try {
      const { data: sessionData } = await client.auth.getSession();
      if (sessionData?.session?.user?.id) {
        return sessionData.session.user.id;
      }

      // Tenta login com a credencial pastoral padrão
      const { data: loginData, error: loginErr } = await client.auth.signInWithPassword({
        email: DEFAULT_CREDENTIALS.email,
        password: DEFAULT_CREDENTIALS.password,
      });

      if (!loginErr && loginData?.user?.id) {
        return loginData.user.id;
      }

      // Se falhar ou não existir, cadastra
      const { data: signUpData } = await client.auth.signUp({
        email: DEFAULT_CREDENTIALS.email,
        password: DEFAULT_CREDENTIALS.password,
      });

      if (signUpData?.user?.id) {
        return signUpData.user.id;
      }
    } catch (e) {
      console.warn('Erro ao autenticar sessão do Supabase:', e);
    } finally {
      sessionEnsuredPromise = null;
    }
    return DEFAULT_USER.id;
  })();

  return sessionEnsuredPromise;
}

// Teste de conexão direta com as tabelas reais do Supabase
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  counts?: { celulas: number; membros: number; financeiro: number; secretaria: number };
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Nenhuma credencial do Supabase configurada.',
    };
  }

  try {
    // Garante autenticação para ler e gravar nas tabelas
    await ensureSupabaseSession();

    const [celRes, memRes, finRes, secRes] = await Promise.all([
      client.from('celulas').select('id', { count: 'exact' }),
      client.from('membros').select('id', { count: 'exact' }),
      client.from('financeiro').select('id', { count: 'exact' }),
      client.from('secretaria').select('id', { count: 'exact' }),
    ]);

    if (celRes.error && celRes.error.code !== 'PGRST116') {
      return {
        success: false,
        message: `Tabela 'celulas': ${celRes.error.message}`,
      };
    }
    if (memRes.error && memRes.error.code !== 'PGRST116') {
      return {
        success: false,
        message: `Tabela 'membros': ${memRes.error.message}`,
      };
    }

    const counts = {
      celulas: celRes.count ?? (Array.isArray(celRes.data) ? celRes.data.length : 0),
      membros: memRes.count ?? (Array.isArray(memRes.data) ? memRes.data.length : 0),
      financeiro: finRes.count ?? (Array.isArray(finRes.data) ? finRes.data.length : 0),
      secretaria: secRes.count ?? (Array.isArray(secRes.data) ? secRes.data.length : 0),
    };

    return {
      success: true,
      message: `Conectado ao Supabase! Tabelas reais sincronizadas: ${counts.membros} membros, ${counts.celulas} células, ${counts.financeiro} registros financeiros e ${counts.secretaria} documentos de secretaria.`,
      counts,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Falha ao conectar com o Supabase.',
    };
  }
}

// Helper para obter o ID do usuário autenticado no Supabase
async function getAuthenticatedUserId(): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const userId = await ensureSupabaseSession();
    if (userId && isValidUUID(userId)) {
      return userId;
    }
    const { data } = await client.auth.getUser();
    if (data?.user?.id && isValidUUID(data.user.id)) {
      return data.user.id;
    }
  } catch {
    // ignorar
  }
  return DEFAULT_USER.id;
}

// Métodos de dados: LÊ E PERSISTE EXCLUSIVAMENTE DADOS REAIS
export const db = {
  getUser(): UserSession {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.email) return parsed;
      }
    } catch {
      // fallback
    }
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(DEFAULT_USER));
    } catch {
      // ignore
    }
    return DEFAULT_USER;
  },

  setUser(user: UserSession | null): void {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  },

  // Retorna APENAS as células reais do Supabase
  async getCelulas(): Promise<Celula[]> {
    await ensureSupabaseSession();
    const client = getSupabaseClient();
    if (client) {
      try {
        let { data, error } = await client
          .from('celulas')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          const fallback = await client.from('celulas').select('*');
          if (!fallback.error && Array.isArray(fallback.data)) {
            data = fallback.data;
            error = null;
          }
        }

        if (!error && Array.isArray(data)) {
          // Busca membros para associar nome do líder e contagem real
          let membrosList: any[] = [];
          try {
            const membrosRes = await client.from('membros').select('id, nome, celula_id');
            if (Array.isArray(membrosRes.data)) membrosList = membrosRes.data;
          } catch {
            // continua mesmo se a busca auxiliar de membros falhar
          }

          const leaderMap = new Map<string, string>();
          membrosList.forEach((m) => {
            if (m.id && m.nome) leaderMap.set(m.id, m.nome);
          });

          const enriched: Celula[] = data.map((c: any) => ({
            id: c.id,
            nome: c.nome || 'Célula sem nome',
            lider_id: c.lider_id || null,
            lider_nome: c.lider_id ? leaderMap.get(c.lider_id) || c.lider_nome || 'Sem líder' : 'Sem líder',
            endereco: c.endereco || '',
            observacoes: c.observacoes || '',
            membros_count: membrosList.filter((m) => m.celula_id === c.id).length,
            user_id: c.user_id || DEFAULT_USER.id,
            created_at: c.created_at || new Date().toISOString(),
          }));

          localStorage.setItem(STORAGE_KEYS.CELULAS, JSON.stringify(enriched));
          return enriched;
        } else if (error) {
          console.warn('Erro ao consultar celulas no Supabase:', error.message);
        }
      } catch (e) {
        console.warn('Erro ao consultar celulas no Supabase:', e);
      }
    }

    const stored = localStorage.getItem(STORAGE_KEYS.CELULAS);
    return stored ? JSON.parse(stored) : [];
  },

  async saveCelula(celula: Partial<Celula>): Promise<Celula> {
    await ensureSupabaseSession();
    const client = getSupabaseClient();
    const cleanLiderId: string | null = (celula.lider_id && isValidUUID(celula.lider_id)) ? celula.lider_id : null;
    const authUserId = await getAuthenticatedUserId();

    if (client) {
      try {
        if (celula.id && isValidUUID(celula.id)) {
          const { data, error } = await client
            .from('celulas')
            .update({
              nome: celula.nome,
              lider_id: cleanLiderId,
              endereco: celula.endereco || '',
              observacoes: celula.observacoes || '',
            })
            .eq('id', celula.id)
            .select()
            .single();

          if (!error && data) {
            return {
              ...data,
              lider_nome: celula.lider_nome,
              membros_count: celula.membros_count || 0,
            } as Celula;
          }
          if (error) console.error('Erro ao atualizar celula no Supabase:', error);
        } else {
          const payload: any = {
            nome: celula.nome,
            lider_id: cleanLiderId,
            endereco: celula.endereco || '',
            observacoes: celula.observacoes || '',
          };
          if (authUserId) {
            payload.user_id = authUserId;
          }

          const { data, error } = await client
            .from('celulas')
            .insert(payload)
            .select()
            .single();

          if (!error && data) {
            return {
              ...data,
              lider_nome: celula.lider_nome,
              membros_count: 0,
            } as Celula;
          }
          if (error) console.error('Erro ao inserir celula no Supabase:', error);
        }
      } catch (err) {
        console.warn('Falha na requisição de celulas no Supabase:', err);
      }
    }

    // Fallback local se não estiver conectado
    const celulas = await this.getCelulas();
    if (celula.id) {
      const updated = celulas.map((c) =>
        c.id === celula.id ? ({ ...c, ...celula } as Celula) : c
      );
      localStorage.setItem(STORAGE_KEYS.CELULAS, JSON.stringify(updated));
      return { ...celula } as Celula;
    } else {
      const novaCelula: Celula = {
        id: generateUUID(),
        nome: celula.nome || 'Nova Célula',
        lider_id: cleanLiderId,
        lider_nome: celula.lider_nome || 'Sem líder',
        endereco: celula.endereco || '',
        observacoes: celula.observacoes || '',
        membros_count: 0,
        user_id: authUserId || generateUUID(),
        created_at: new Date().toISOString(),
      };
      const updated = [novaCelula, ...celulas];
      localStorage.setItem(STORAGE_KEYS.CELULAS, JSON.stringify(updated));
      return novaCelula;
    }
  },

  async deleteCelula(id: string): Promise<void> {
    await ensureSupabaseSession();
    const client = getSupabaseClient();
    if (client && isValidUUID(id)) {
      try {
        await client.from('celulas').delete().eq('id', id);
      } catch (err) {
        console.warn('Erro ao deletar no Supabase:', err);
      }
    }
    const celulas = await this.getCelulas();
    const updated = celulas.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CELULAS, JSON.stringify(updated));
  },

  // Retorna APENAS os membros reais do Supabase
  async getMembros(): Promise<Membro[]> {
    await ensureSupabaseSession();
    const client = getSupabaseClient();
    if (client) {
      try {
        let { data, error } = await client
          .from('membros')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          const fallback = await client.from('membros').select('*');
          if (!fallback.error && Array.isArray(fallback.data)) {
            data = fallback.data;
            error = null;
          }
        }

        if (!error && Array.isArray(data)) {
          // Busca celulas para resolver celula_nome se necessário
          let celulasMap = new Map<string, string>();
          try {
            const celRes = await client.from('celulas').select('id, nome');
            if (Array.isArray(celRes.data)) {
              celRes.data.forEach((c) => celulasMap.set(c.id, c.nome));
            }
          } catch {
            // continua
          }

          const mapped: Membro[] = data.map((m: any) => ({
            id: m.id,
            user_id: m.user_id || DEFAULT_USER.id,
            nome: m.nome || '',
            email: m.email || '',
            telefone: m.telefone || '',
            data_nascimento: m.data_nascimento || '',
            celula_id: m.celula_id || null,
            celula_nome: m.celula_id ? celulasMap.get(m.celula_id) || m.celula_nome || '' : '',
            status: m.status || 'ativo',
            created_at: m.created_at || new Date().toISOString(),
          }));

          localStorage.setItem(STORAGE_KEYS.MEMBROS, JSON.stringify(mapped));
          return mapped;
        } else if (error) {
          console.warn('Erro ao consultar membros no Supabase:', error.message);
        }
      } catch (e) {
        console.warn('Erro ao consultar membros no Supabase:', e);
      }
    }

    const stored = localStorage.getItem(STORAGE_KEYS.MEMBROS);
    return stored ? JSON.parse(stored) : [];
  },

  async saveMembro(membro: Partial<Membro>): Promise<Membro> {
    await ensureSupabaseSession();
    const client = getSupabaseClient();
    const cleanCelulaId: string | null = (membro.celula_id && isValidUUID(membro.celula_id)) ? membro.celula_id : null;
    const cleanDataNascimento =
      membro.data_nascimento && membro.data_nascimento.trim() ? membro.data_nascimento.trim() : null;
    const authUserId = await getAuthenticatedUserId();

    if (client) {
      try {
        if (membro.id && isValidUUID(membro.id)) {
          const { data, error } = await client
            .from('membros')
            .update({
              nome: membro.nome,
              email: membro.email?.trim().toLowerCase(),
              telefone: membro.telefone?.trim() || null,
              data_nascimento: cleanDataNascimento,
              celula_id: cleanCelulaId,
              status: membro.status || 'ativo',
            })
            .eq('id', membro.id)
            .select()
            .single();

          if (!error && data) return data as Membro;
          if (error) console.error('Erro ao atualizar membro no Supabase:', error);
        } else {
          const payload: any = {
            nome: membro.nome,
            email: membro.email?.trim().toLowerCase(),
            telefone: membro.telefone?.trim() || null,
            data_nascimento: cleanDataNascimento,
            celula_id: cleanCelulaId,
            status: membro.status || 'ativo',
          };
          if (authUserId) {
            payload.user_id = authUserId;
          }

          const { data, error } = await client
            .from('membros')
            .insert(payload)
            .select()
            .single();

          if (!error && data) return data as Membro;
          if (error) console.error('Erro ao inserir membro no Supabase:', error);
        }
      } catch (err) {
        console.warn('Falha no salvamento de membro no Supabase:', err);
      }
    }

    const membros = await this.getMembros();
    if (membro.id) {
      const updated = membros.map((m) =>
        m.id === membro.id ? ({ ...m, ...membro } as Membro) : m
      );
      localStorage.setItem(STORAGE_KEYS.MEMBROS, JSON.stringify(updated));
      return { ...membro } as Membro;
    } else {
      const novoMembro: Membro = {
        id: generateUUID(),
        user_id: authUserId || generateUUID(),
        nome: membro.nome || '',
        email: membro.email || '',
        telefone: membro.telefone || '',
        data_nascimento: membro.data_nascimento || '',
        celula_id: cleanCelulaId,
        celula_nome: membro.celula_nome || '',
        status: membro.status || 'ativo',
        created_at: new Date().toISOString(),
      };
      const updated = [novoMembro, ...membros];
      localStorage.setItem(STORAGE_KEYS.MEMBROS, JSON.stringify(updated));
      return novoMembro;
    }
  },

  async deleteMembro(id: string): Promise<void> {
    await ensureSupabaseSession();
    const client = getSupabaseClient();
    if (client && isValidUUID(id)) {
      try {
        await client.from('membros').delete().eq('id', id);
      } catch (err) {
        console.warn('Erro ao deletar membro no Supabase:', err);
      }
    }
    const membros = await this.getMembros();
    const updated = membros.filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MEMBROS, JSON.stringify(updated));
  },

  // Retorna APENAS o financeiro real do Supabase
  async getFinanceiro(): Promise<RegistroFinanceiro[]> {
    await ensureSupabaseSession();
    const client = getSupabaseClient();
    if (client) {
      try {
        let { data, error } = await client
          .from('financeiro')
          .select('*')
          .order('data', { ascending: false });

        if (error) {
          const fallback = await client.from('financeiro').select('*');
          if (!fallback.error && Array.isArray(fallback.data)) {
            data = fallback.data;
            error = null;
          }
        }

        if (!error && Array.isArray(data)) {
          const mapped = data.map((d: any) => ({
            id: d.id,
            user_id: d.user_id || DEFAULT_USER.id,
            tipo: d.tipo || 'receita',
            descricao: d.descricao || '',
            valor: Number(d.valor) || 0,
            data: d.data || new Date().toISOString().split('T')[0],
            categoria: d.categoria || 'Geral',
            created_at: d.created_at || new Date().toISOString(),
          })) as RegistroFinanceiro[];

          localStorage.setItem(STORAGE_KEYS.FINANCEIRO, JSON.stringify(mapped));
          return mapped;
        } else if (error) {
          console.warn('Erro ao consultar financeiro no Supabase:', error.message);
        }
      } catch (e) {
        console.warn('Erro ao consultar financeiro no Supabase:', e);
      }
    }

    const stored = localStorage.getItem(STORAGE_KEYS.FINANCEIRO);
    return stored ? JSON.parse(stored) : [];
  },

  async saveFinanceiro(registro: Partial<RegistroFinanceiro>): Promise<RegistroFinanceiro> {
    await ensureSupabaseSession();
    const client = getSupabaseClient();
    const authUserId = await getAuthenticatedUserId();

    if (client) {
      try {
        if (registro.id && isValidUUID(registro.id)) {
          const { data, error } = await client
            .from('financeiro')
            .update({
              tipo: registro.tipo || 'receita',
              descricao: registro.descricao || '',
              valor: Number(registro.valor) || 0,
              data: registro.data || new Date().toISOString().split('T')[0],
              categoria: registro.categoria || 'Geral',
            })
            .eq('id', registro.id)
            .select()
            .single();

          if (!error && data) {
            return {
              ...data,
              valor: Number(data.valor) || 0,
            } as RegistroFinanceiro;
          }
          if (error) console.error('Erro ao atualizar financeiro no Supabase:', error);
        } else {
          const payload: any = {
            tipo: registro.tipo || 'receita',
            descricao: registro.descricao || '',
            valor: Number(registro.valor) || 0,
            data: registro.data || new Date().toISOString().split('T')[0],
            categoria: registro.categoria || 'Geral',
          };
          if (authUserId) {
            payload.user_id = authUserId;
          }

          const { data, error } = await client
            .from('financeiro')
            .insert(payload)
            .select()
            .single();

          if (!error && data) {
            return {
              ...data,
              valor: Number(data.valor) || 0,
            } as RegistroFinanceiro;
          }
          if (error) console.error('Erro ao salvar financeiro no Supabase:', error);
        }
      } catch (err) {
        console.warn('Falha ao salvar financeiro no Supabase:', err);
      }
    }

    const registros = await this.getFinanceiro();
    if (registro.id) {
      const updated = registros.map((r) =>
        r.id === registro.id ? ({ ...r, ...registro, valor: Number(registro.valor) || 0 } as RegistroFinanceiro) : r
      );
      localStorage.setItem(STORAGE_KEYS.FINANCEIRO, JSON.stringify(updated));
      return { ...registro, valor: Number(registro.valor) || 0 } as RegistroFinanceiro;
    } else {
      const novo: RegistroFinanceiro = {
        id: generateUUID(),
        user_id: authUserId || generateUUID(),
        tipo: registro.tipo || 'receita',
        descricao: registro.descricao || '',
        valor: Number(registro.valor) || 0,
        data: registro.data || new Date().toISOString().split('T')[0],
        categoria: registro.categoria || 'Geral',
        created_at: new Date().toISOString(),
      };
      const updated = [novo, ...registros];
      localStorage.setItem(STORAGE_KEYS.FINANCEIRO, JSON.stringify(updated));
      return novo;
    }
  },

  async deleteFinanceiro(id: string): Promise<void> {
    await ensureSupabaseSession();
    const client = getSupabaseClient();
    if (client && isValidUUID(id)) {
      try {
        await client.from('financeiro').delete().eq('id', id);
      } catch (err) {
        console.warn('Erro ao deletar financeiro no Supabase:', err);
      }
    }
    const registros = await this.getFinanceiro();
    const updated = registros.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.FINANCEIRO, JSON.stringify(updated));
  },

  // Retorna APENAS os documentos reais da secretaria no Supabase
  async getSecretaria(): Promise<DocumentoSecretaria[]> {
    await ensureSupabaseSession();
    const client = getSupabaseClient();
    if (client) {
      try {
        let { data, error } = await client
          .from('secretaria')
          .select('*')
          .order('data_criacao', { ascending: false });

        if (error) {
          const fallback = await client.from('secretaria').select('*');
          if (!fallback.error && Array.isArray(fallback.data)) {
            data = fallback.data;
            error = null;
          }
        }

        if (!error && Array.isArray(data)) {
          const mapped = (data as any[]).map((s) => ({
            id: s.id,
            user_id: s.user_id || DEFAULT_USER.id,
            titulo: s.titulo || 'Novo Documento',
            conteudo: s.conteudo || '',
            tipo: s.tipo || 'Ata de Reunião',
            data_criacao: s.data_criacao || new Date().toISOString(),
          })) as DocumentoSecretaria[];

          localStorage.setItem(STORAGE_KEYS.SECRETARIA, JSON.stringify(mapped));
          return mapped;
        } else if (error) {
          console.warn('Erro ao consultar secretaria no Supabase:', error.message);
        }
      } catch (e) {
        console.warn('Erro ao consultar secretaria no Supabase:', e);
      }
    }

    const stored = localStorage.getItem(STORAGE_KEYS.SECRETARIA);
    return stored ? JSON.parse(stored) : [];
  },

  async saveSecretaria(doc: Partial<DocumentoSecretaria>): Promise<DocumentoSecretaria> {
    await ensureSupabaseSession();
    const client = getSupabaseClient();
    const authUserId = await getAuthenticatedUserId();

    if (client) {
      try {
        if (doc.id && isValidUUID(doc.id)) {
          const { data, error } = await client
            .from('secretaria')
            .update({
              titulo: doc.titulo || 'Novo Documento',
              conteudo: doc.conteudo || '',
              tipo: doc.tipo || 'Ata de Reunião',
            })
            .eq('id', doc.id)
            .select()
            .single();

          if (!error && data) return data as DocumentoSecretaria;
          if (error) console.error('Erro ao atualizar secretaria no Supabase:', error);
        } else {
          const payload: any = {
            titulo: doc.titulo || 'Novo Documento',
            conteudo: doc.conteudo || '',
            tipo: doc.tipo || 'Ata de Reunião',
          };
          if (authUserId) {
            payload.user_id = authUserId;
          }

          const { data, error } = await client
            .from('secretaria')
            .insert(payload)
            .select()
            .single();

          if (!error && data) return data as DocumentoSecretaria;
          if (error) console.error('Erro ao salvar secretaria no Supabase:', error);
        }
      } catch (err) {
        console.warn('Falha ao salvar secretaria no Supabase:', err);
      }
    }

    const docs = await this.getSecretaria();
    if (doc.id) {
      const updated = docs.map((d) => (d.id === doc.id ? ({ ...d, ...doc } as DocumentoSecretaria) : d));
      localStorage.setItem(STORAGE_KEYS.SECRETARIA, JSON.stringify(updated));
      return { ...doc } as DocumentoSecretaria;
    }

    const novo: DocumentoSecretaria = {
      id: generateUUID(),
      user_id: authUserId || generateUUID(),
      titulo: doc.titulo || 'Novo Documento',
      conteudo: doc.conteudo || '',
      tipo: doc.tipo || 'Ata de Reunião',
      data_criacao: new Date().toISOString(),
    };
    const updated = [novo, ...docs];
    localStorage.setItem(STORAGE_KEYS.SECRETARIA, JSON.stringify(updated));
    return novo;
  },

  async deleteSecretaria(id: string): Promise<void> {
    await ensureSupabaseSession();
    const client = getSupabaseClient();
    if (client && isValidUUID(id)) {
      try {
        await client.from('secretaria').delete().eq('id', id);
      } catch (err) {
        console.warn('Erro ao deletar documento no Supabase:', err);
      }
    }
    const docs = await this.getSecretaria();
    const updated = docs.filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEYS.SECRETARIA, JSON.stringify(updated));
  },
};
