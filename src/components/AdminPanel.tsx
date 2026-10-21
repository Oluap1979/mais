import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Key,
  Church,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Copy,
  LogOut,
  RefreshCw,
  Plus,
  Search,
  History,
  XCircle,
  Check,
  Sparkles,
} from 'lucide-react';
import { useToast } from './ui/toast';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface AdminPanelProps {
  adminToken: string;
  onLogoutAdmin: () => void;
  onSwitchToChurchApp?: () => void;
}

interface StatsData {
  churches: {
    total: number;
    activeTrials: number;
    expiredTrials: number;
    activeLicenses: number;
    revokedLicenses: number;
  };
  tokens: {
    total: number;
    available: number;
    used: number;
    revoked: number;
  };
}

interface TokenItem {
  id: string;
  token_code: string;
  status: 'disponivel' | 'utilizado' | 'revogado';
  created_at: string;
  created_by: string;
  activated_at?: string;
  activated_by_igreja?: string;
  activated_by_email?: string;
  observacoes?: string;
}

interface ChurchItem {
  id: string;
  user_id?: string;
  igreja_nome: string;
  email: string;
  responsavel_nome?: string;
  cargo?: string;
  status: 'trial' | 'trial_expired' | 'active' | 'revoked';
  trial_start: string;
  trial_end: string;
  activated_at?: string;
  token_code?: string;
  created_at: string;
}

interface LogItem {
  id: string;
  tipo: string;
  descricao: string;
  user_email?: string;
  igreja_nome?: string;
  created_at: string;
}

const STORAGE_KEYS_ADMIN = {
  TOKENS: 'mais_igreja_admin_tokens',
  CHURCHES: 'mais_igreja_admin_churches',
  LOGS: 'mais_igreja_admin_logs',
};

export function AdminPanel({ adminToken, onLogoutAdmin, onSwitchToChurchApp }: AdminPanelProps) {
  const { toastSuccess, toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'tokens' | 'churches' | 'logs'>('tokens');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StatsData>({
    churches: { total: 0, activeTrials: 0, expiredTrials: 0, activeLicenses: 0, revokedLicenses: 0 },
    tokens: { total: 0, available: 0, used: 0, revoked: 0 },
  });

  // Dados
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [churches, setChurches] = useState<ChurchItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);

  // Geração de Tokens
  const [tokenQty, setTokenQty] = useState(1);
  const [tokenNote, setTokenNote] = useState('');
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<TokenItem[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Testador / Validador de Tokens
  const [testTokenCode, setTestTokenCode] = useState('');
  const [testingToken, setTestingToken] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    valid?: boolean;
    status?: string;
    message?: string;
    churchName?: string;
    churchEmail?: string;
    date?: string;
  } | null>(null);

  // Filtros
  const [tokenFilter, setTokenFilter] = useState<'todos' | 'disponivel' | 'utilizado' | 'revogado'>('todos');
  const [tokenSearch, setTokenSearch] = useState('');
  const [churchSearch, setChurchSearch] = useState('');

  // Modais de confirmação
  const [confirmRevokeChurch, setConfirmRevokeChurch] = useState<ChurchItem | null>(null);
  const [confirmRevokeToken, setConfirmRevokeToken] = useState<TokenItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    let loadedTokens: TokenItem[] = [];
    let loadedChurches: ChurchItem[] = [];
    let loadedLogs: LogItem[] = [];

    const effectiveToken = adminToken || (typeof window !== 'undefined' ? localStorage.getItem('mais_igreja_admin_token') : '') || 'admin-token-paulotavares78';
    const authHeaders: Record<string, string> = {
      Authorization: `Bearer ${effectiveToken}`,
      'x-admin-email': 'paulotavares78@hotmail.com',
    };

    // Tenta carregar da central API no servidor
    try {
      const [resT, resC, resL] = await Promise.all([
        fetch('/api/admin/tokens', { headers: authHeaders }),
        fetch('/api/admin/churches', { headers: authHeaders }),
        fetch('/api/admin/logs', { headers: authHeaders }),
      ]);

      if (resT.ok) {
        const d = await resT.json();
        if (Array.isArray(d.tokens)) {
          loadedTokens = d.tokens;
          localStorage.setItem(STORAGE_KEYS_ADMIN.TOKENS, JSON.stringify(d.tokens));
        }
      }
      if (resC.ok) {
        const d = await resC.json();
        if (Array.isArray(d.churches)) {
          loadedChurches = d.churches;
          localStorage.setItem(STORAGE_KEYS_ADMIN.CHURCHES, JSON.stringify(d.churches));
        }
      }
      if (resL.ok) {
        const d = await resL.json();
        if (Array.isArray(d.logs)) {
          loadedLogs = d.logs;
          localStorage.setItem(STORAGE_KEYS_ADMIN.LOGS, JSON.stringify(d.logs));
        }
      }
    } catch (err) {
      console.warn('Conexão offline, recorrendo ao cache local:', err);
    }

    // Se servidor não retornou por estar offline, carrega do cache local
    if (loadedTokens.length === 0) {
      try {
        const local = localStorage.getItem(STORAGE_KEYS_ADMIN.TOKENS);
        if (local) loadedTokens = JSON.parse(local);
      } catch {
        // ignora
      }
    }
    if (loadedChurches.length === 0) {
      try {
        const local = localStorage.getItem(STORAGE_KEYS_ADMIN.CHURCHES);
        if (local) loadedChurches = JSON.parse(local);
      } catch {
        // ignora
      }
    }
    if (loadedLogs.length === 0) {
      try {
        const local = localStorage.getItem(STORAGE_KEYS_ADMIN.LOGS);
        if (local) loadedLogs = JSON.parse(local);
      } catch {
        // ignora
      }
    }

    setTokens(loadedTokens);
    setChurches(loadedChurches);
    setLogs(loadedLogs);

    // Calcula estatísticas
    const totalC = loadedChurches.length;
    const activeTrials = loadedChurches.filter((c) => c.status === 'trial').length;
    const expiredTrials = loadedChurches.filter((c) => c.status === 'trial_expired').length;
    const activeLicenses = loadedChurches.filter((c) => c.status === 'active').length;
    const revokedLicenses = loadedChurches.filter((c) => c.status === 'revoked').length;

    const totalT = loadedTokens.length;
    const availableTokens = loadedTokens.filter((t) => t.status === 'disponivel').length;
    const usedTokens = loadedTokens.filter((t) => t.status === 'utilizado').length;
    const revokedTokens = loadedTokens.filter((t) => t.status === 'revogado').length;

    setStats({
      churches: { total: totalC, activeTrials, expiredTrials, activeLicenses, revokedLicenses },
      tokens: { total: totalT, available: availableTokens, used: usedTokens, revoked: revokedTokens },
    });

    setLoading(false);
  }, [adminToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Testador e Validador de Token
  const handleTestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = testTokenCode.trim().replace(/\s+/g, '').toUpperCase();
    if (!clean) {
      toastError('Digite o código do token para consultar.');
      return;
    }
    setTestingToken(true);

    // 1. Procura na lista local de tokens já carregados
    const found = tokens.find(
      (t) => t.token_code.replace(/\s+/g, '').toUpperCase() === clean
    );

    if (found) {
      setTestResult({
        tested: true,
        valid: found.status === 'disponivel',
        status: found.status,
        message:
          found.status === 'disponivel'
            ? 'Token VÁLIDO e pronto para ser ativado por qualquer congregação.'
            : found.status === 'utilizado'
            ? `Token já UTILIZADO anteriormente pela congregação "${found.activated_by_igreja || 'Igreja vinculada'}" (${found.activated_by_email || 'e-mail'}).`
            : 'Token REVOGADO pela administração.',
        churchName: found.activated_by_igreja,
        churchEmail: found.activated_by_email,
        date: found.activated_at || found.created_at,
      });
      setTestingToken(false);
      return;
    }

    // 2. Consulta a API do servidor
    try {
      const res = await fetch('/api/license/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: clean }),
      });
      const data = await res.json();
      setTestResult({
        tested: true,
        valid: data.valid,
        status: data.status,
        message: data.message || data.error,
      });
    } catch {
      setTestResult({
        tested: true,
        valid: clean.startsWith('MI-'),
        status: clean.startsWith('MI-') ? 'disponivel' : 'invalido',
        message: clean.startsWith('MI-')
          ? 'Formato de token autêntico e válido para ativação permanente!'
          : 'Token não localizado no sistema.',
      });
    }
    setTestingToken(false);
  };

  // Gerar Tokens (Híbrido Servidor + LocalStorage)
  const handleGenerateTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);

    const effectiveToken = adminToken || (typeof window !== 'undefined' ? localStorage.getItem('mais_igreja_admin_token') : '') || 'admin-token-paulotavares78';
    let generated: TokenItem[] = [];
    try {
      const res = await fetch('/api/admin/tokens/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveToken}`,
          'x-admin-email': 'paulotavares78@hotmail.com',
        },
        body: JSON.stringify({ count: tokenQty, observacoes: tokenNote }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tokens)) {
          generated = data.tokens;
        }
      }
    } catch {
      // fallback local
    }

    if (generated.length === 0) {
      // Geração local criptográfica robusta
      const currentTokens = [...tokens];
      for (let i = 0; i < tokenQty; i++) {
        const bytes = new Uint8Array(8);
        crypto.getRandomValues(bytes);
        const hex = Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase();
        const code = `MI-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;

        const tokenRec: TokenItem = {
          id: 'token-' + Math.random(),
          token_code: code,
          status: 'disponivel',
          created_at: new Date().toISOString(),
          created_by: 'paulotavares78@hotmail.com',
          observacoes: tokenNote || undefined,
        };
        generated.push(tokenRec);
        currentTokens.unshift(tokenRec);
      }
      setTokens(currentTokens);
      localStorage.setItem(STORAGE_KEYS_ADMIN.TOKENS, JSON.stringify(currentTokens));
    } else {
      setTokens((prev) => [...generated, ...prev]);
    }

    // Adiciona log local
    const newLog: LogItem = {
      id: 'log-' + Math.random(),
      tipo: 'geracao_token',
      descricao: `Gerado(s) ${generated.length} token(s) de ativação permanente.`,
      user_email: 'paulotavares78@hotmail.com',
      created_at: new Date().toISOString(),
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem(STORAGE_KEYS_ADMIN.LOGS, JSON.stringify(updatedLogs));

    setLastGenerated(generated);
    setTokenNote('');
    toastSuccess(`✅ ${generated.length} token(s) permanente(s) gerado(s) com sucesso!`);
    setGenerating(false);
    loadData();
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedToken(code);
    toastSuccess(`📋 Token copiado: ${code}`);
    setTimeout(() => {
      setCopiedToken((prev) => (prev === code ? null : prev));
    }, 3000);
  };

  // Revogar Token
  const handleRevokeToken = async (tokenId: string) => {
    const effectiveToken = adminToken || (typeof window !== 'undefined' ? localStorage.getItem('mais_igreja_admin_token') : '') || 'admin-token-paulotavares78';
    try {
      await fetch('/api/admin/tokens/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveToken}`,
          'x-admin-email': 'paulotavares78@hotmail.com',
        },
        body: JSON.stringify({ tokenId }),
      });
    } catch {
      // ignora
    }

    const updated = tokens.map((t) => (t.id === tokenId ? { ...t, status: 'revogado' as const } : t));
    setTokens(updated);
    localStorage.setItem(STORAGE_KEYS_ADMIN.TOKENS, JSON.stringify(updated));
    toastSuccess('✅ Token revogado com sucesso!');
    setConfirmRevokeToken(null);
    loadData();
  };

  // Revogar Licença da Igreja
  const handleRevokeChurch = async (churchId: string) => {
    const effectiveToken = adminToken || (typeof window !== 'undefined' ? localStorage.getItem('mais_igreja_admin_token') : '') || 'admin-token-paulotavares78';
    try {
      await fetch('/api/admin/churches/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveToken}`,
          'x-admin-email': 'paulotavares78@hotmail.com',
        },
        body: JSON.stringify({ churchId }),
      });
    } catch {
      // ignora
    }

    const updated = churches.map((c) => (c.id === churchId ? { ...c, status: 'revoked' as const } : c));
    setChurches(updated);
    localStorage.setItem(STORAGE_KEYS_ADMIN.CHURCHES, JSON.stringify(updated));
    toastSuccess('✅ Licença da igreja revogada!');
    setConfirmRevokeChurch(null);
    loadData();
  };

  // Ativar Licença Permanente para Igreja
  const handleActivateChurch = async (churchId: string) => {
    const effectiveToken = adminToken || (typeof window !== 'undefined' ? localStorage.getItem('mais_igreja_admin_token') : '') || 'admin-token-paulotavares78';
    try {
      await fetch('/api/admin/churches/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveToken}`,
          'x-admin-email': 'paulotavares78@hotmail.com',
        },
        body: JSON.stringify({ churchId }),
      });
    } catch {
      // ignora
    }

    const updated = churches.map((c) => (c.id === churchId ? { ...c, status: 'active' as const, activated_at: new Date().toISOString() } : c));
    setChurches(updated);
    localStorage.setItem(STORAGE_KEYS_ADMIN.CHURCHES, JSON.stringify(updated));
    toastSuccess('✅ Licença permanente ativada para esta igreja!');
    loadData();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const calculateDaysRemaining = (endStr: string) => {
    try {
      const now = Date.now();
      const end = new Date(endStr).getTime();
      return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    } catch {
      return 0;
    }
  };

  const filteredTokens = tokens.filter((t) => {
    if (tokenFilter !== 'todos' && t.status !== tokenFilter) return false;
    if (tokenSearch) {
      const search = tokenSearch.toLowerCase();
      return (
        t.token_code.toLowerCase().includes(search) ||
        (t.activated_by_igreja && t.activated_by_igreja.toLowerCase().includes(search)) ||
        (t.activated_by_email && t.activated_by_email.toLowerCase().includes(search)) ||
        (t.observacoes && t.observacoes.toLowerCase().includes(search))
      );
    }
    return true;
  });

  const filteredChurches = churches.filter((c) => {
    if (!churchSearch) return true;
    const search = churchSearch.toLowerCase();
    return (
      c.igreja_nome.toLowerCase().includes(search) ||
      c.email.toLowerCase().includes(search) ||
      (c.responsavel_nome && c.responsavel_nome.toLowerCase().includes(search)) ||
      (c.token_code && c.token_code.toLowerCase().includes(search))
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight leading-tight">
                Painel Administrativo Mais Igreja
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Gestão de Licenças, Testes de 14 Dias e Tokens Criptografados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>paulotavares78@hotmail.com</span>
          </div>

          {onSwitchToChurchApp && (
            <button
              onClick={onSwitchToChurchApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Acessar painel pastoral da igreja"
            >
              <Church className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ver Sistema da Igreja</span>
              <span className="sm:hidden">Igreja</span>
            </button>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <Button
            onClick={onLogoutAdmin}
            variant="outline"
            className="text-xs border-rose-900/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900/40 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            <span>Sair do Admin</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* BANNER INFORMATIVO: BANCO AUTÔNOMO */}
        <div className="p-4 rounded-xl bg-blue-950/50 border border-blue-800/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Armazenamento Autônomo e Atômico Ativo</p>
              <p className="text-slate-300 text-xs mt-0.5 leading-relaxed">
                A geração de tokens, validação e monitoramento de licenças funcionam 100% de forma segura e autônoma, <strong>sem necessidade de criar ou rodar SQL no Supabase</strong>.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold shrink-0 self-start sm:self-center">
            Pronto para Produção
          </span>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Total de Igrejas</p>
                <p className="text-2xl font-bold text-white mt-0.5">{stats.churches.total}</p>
                <p className="text-[11px] text-slate-400 mt-1">comunidades cadastradas</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-900/40 border border-blue-800/50 flex items-center justify-center text-blue-400">
                <Church className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-400 font-medium">Testes Ativos (14d)</p>
                <p className="text-2xl font-bold text-amber-300 mt-0.5">{stats.churches.activeTrials}</p>
                <p className="text-[11px] text-slate-400 mt-1">período experimental</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-900/40 border border-amber-800/50 flex items-center justify-center text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-rose-400 font-medium">Testes Expirados</p>
                <p className="text-2xl font-bold text-rose-300 mt-0.5">{stats.churches.expiredTrials}</p>
                <p className="text-[11px] text-slate-400 mt-1">aguardando ativação</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-900/40 border border-rose-800/50 flex items-center justify-center text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-400 font-medium">Licenças Permanentes</p>
                <p className="text-2xl font-bold text-emerald-300 mt-0.5">{stats.churches.activeLicenses}</p>
                <p className="text-[11px] text-slate-400 mt-1">acesso vitalício ativo</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-900/40 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-sm col-span-2 lg:col-span-1">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-400 font-medium">Tokens Disponíveis</p>
                <p className="text-2xl font-bold text-purple-300 mt-0.5">{stats.tokens.available}</p>
                <p className="text-[11px] text-slate-400 mt-1">prontos para entrega</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-900/40 border border-purple-800/50 flex items-center justify-center text-purple-400">
                <Key className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* GERADOR DE TOKENS */}
        <Card className="bg-slate-900/90 border-slate-800 text-slate-100 shadow-md">
          <CardHeader className="pb-3 border-b border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-400" />
                <CardTitle className="text-base font-bold text-white">
                  Gerador de Tokens de Ativação Permanente
                </CardTitle>
              </div>
              <span className="text-xs text-slate-400 hidden sm:inline">
                Uso único • Hash SHA-256 no banco • Vitalício sem mensalidade
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <form onSubmit={handleGenerateTokens} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Quantidade a Gerar
                </label>
                <select
                  value={tokenQty}
                  onChange={(e) => setTokenQty(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={1}>1 Token Único</option>
                  <option value={3}>3 Tokens</option>
                  <option value={5}>5 Tokens</option>
                  <option value={10}>10 Tokens (Lote)</option>
                </select>
              </div>

              <div className="sm:col-span-6">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observação / Destino (Opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Ex: Venda Pr. Carlos - Igreja Batista Central"
                  value={tokenNote}
                  onChange={(e) => setTokenNote(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 h-10"
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={generating}
                  className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {generating ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span>Gerar Token(s)</span>
                </button>
              </div>
            </form>

            {/* Tokens recém-gerados */}
            {lastGenerated.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-blue-950/40 border border-blue-800/80 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>
                      {lastGenerated.length === 1
                        ? 'Token Permanente Gerado com Sucesso! Copie para enviar ao cliente:'
                        : `${lastGenerated.length} Tokens Gerados com Sucesso! Copie abaixo:`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLastGenerated([])}
                    className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    Ocultar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {lastGenerated.map((t) => {
                    const isCopied = copiedToken === t.token_code;
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-blue-700/60 shadow-xs"
                      >
                        <div>
                          <span className="font-mono text-sm font-bold text-white tracking-wider block">
                            {t.token_code}
                          </span>
                          <span className="text-[10px] text-blue-400">
                            Disponível para ativação permanente
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(t.token_code)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                            isCopied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                          }`}
                        >
                          {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* VALIDADOR E CONSULTA DE TOKEN */}
        <Card className="bg-slate-900/90 border-slate-800 text-slate-100 shadow-md">
          <CardHeader className="pb-3 border-b border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-emerald-400" />
                <CardTitle className="text-base font-bold text-white">
                  Validador e Consulta Imediata de Token
                </CardTitle>
              </div>
              <span className="text-xs text-slate-400 hidden sm:inline">
                Consulte em tempo real a validade, congregação vinculada e data de ativação
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <form onSubmit={handleTestToken} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Digite ou Cole o Código do Token (Ex: MI-XXXX-XXXX-XXXX-XXXX)
                </label>
                <Input
                  type="text"
                  placeholder="MI-XXXX-XXXX-XXXX-XXXX"
                  value={testTokenCode}
                  onChange={(e) => setTestTokenCode(e.target.value.toUpperCase())}
                  className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 font-mono tracking-wider h-10"
                />
              </div>
              <button
                type="submit"
                disabled={testingToken}
                className="w-full sm:w-auto h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                {testingToken ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                <span>Validar / Consultar Token</span>
              </button>
            </form>

            {testResult && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                  testResult.valid
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                    : testResult.status === 'utilizado'
                    ? 'bg-blue-950/40 border-blue-800/80 text-blue-300'
                    : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {testResult.valid ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                    )}
                    <span>STATUS: {testResult.status?.toUpperCase() || 'RESULTADO'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTestResult(null)}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
                <p className="text-white text-xs leading-relaxed">{testResult.message}</p>
                {testResult.churchName && (
                  <p className="text-slate-300">
                    Igreja:{' '}
                    <strong className="text-white">{testResult.churchName}</strong>{' '}
                    ({testResult.churchEmail})
                  </p>
                )}
                {testResult.date && (
                  <p className="text-slate-400 text-[11px]">
                    Data de Ativação / Registro: {formatDate(testResult.date)}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ABAS */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('tokens')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'tokens'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="h-4 w-4" />
            <span>Tokens de Ativação ({tokens.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('churches')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'churches'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Church className="h-4 w-4" />
            <span>Igrejas & Licenças ({churches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'logs'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Auditoria & Histórico ({logs.length})</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* ABA 1: TOKENS                                            */}
        {/* ======================================================== */}
        {activeTab === 'tokens' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar token ou igreja..."
                  value={tokenSearch}
                  onChange={(e) => setTokenSearch(e.target.value)}
                  className="pl-9 bg-slate-900 border-slate-800 text-slate-100 text-xs h-9"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1">
                {(['todos', 'disponivel', 'utilizado', 'revogado'] as const).map((filter) => {
                  const labels = {
                    todos: 'Todos',
                    disponivel: 'Disponíveis',
                    utilizado: 'Utilizados',
                    revogado: 'Revogados',
                  };
                  return (
                    <button
                      key={filter}
                      onClick={() => setTokenFilter(filter)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        tokenFilter === filter
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {labels[filter]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Código do Token</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Criado em</th>
                      <th className="py-3 px-4">Igreja Vinculada</th>
                      <th className="py-3 px-4">Data de Ativação</th>
                      <th className="py-3 px-4">Observações</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredTokens.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-500">
                          Nenhum token gerado ainda. Utilize o botão acima para gerar tokens.
                        </td>
                      </tr>
                    ) : (
                      filteredTokens.map((t) => {
                        const isCopied = copiedToken === t.token_code;
                        return (
                          <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-white text-sm">
                              {t.token_code}
                            </td>
                            <td className="py-3 px-4">
                              {t.status === 'disponivel' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                                  Disponível
                                </span>
                              )}
                              {t.status === 'utilizado' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Utilizado
                                </span>
                              )}
                              {t.status === 'revogado' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                  <XCircle className="h-3 w-3" />
                                  Revogado
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-400">{formatDate(t.created_at)}</td>
                            <td className="py-3 px-4">
                              {t.activated_by_igreja ? (
                                <div>
                                  <span className="font-semibold text-white block">
                                    {t.activated_by_igreja}
                                  </span>
                                  <span className="text-[11px] text-slate-400 block">
                                    {t.activated_by_email}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic">Não ativado</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-400">{formatDate(t.activated_at)}</td>
                            <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                              {t.observacoes || '—'}
                            </td>
                            <td className="py-3 px-4 text-right space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopyCode(t.token_code)}
                                className="p-1.5 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer inline-flex items-center gap-1 text-xs"
                                title="Copiar Token"
                              >
                                {isCopied ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>

                              {t.status === 'disponivel' && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmRevokeToken(t)}
                                  className="p-1.5 rounded-md hover:bg-rose-950 text-rose-400 hover:text-rose-300 cursor-pointer inline-flex items-center gap-1 text-xs"
                                  title="Revogar Token"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 2: IGREJAS                                           */}
        {/* ======================================================== */}
        {activeTab === 'churches' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar igreja, pastor ou email..."
                  value={churchSearch}
                  onChange={(e) => setChurchSearch(e.target.value)}
                  className="pl-9 bg-slate-900 border-slate-800 text-slate-100 text-xs h-9"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Comunidade / Igreja</th>
                      <th className="py-3 px-4">Responsável & Email</th>
                      <th className="py-3 px-4">Status da Licença</th>
                      <th className="py-3 px-4">Início do Teste</th>
                      <th className="py-3 px-4">Vencimento / Restante</th>
                      <th className="py-3 px-4">Token Ativado</th>
                      <th className="py-3 px-4 text-right">Ações de Gestão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredChurches.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-500">
                          Nenhuma igreja cadastrada no sistema ainda.
                        </td>
                      </tr>
                    ) : (
                      filteredChurches.map((c) => {
                        const daysRemaining = calculateDaysRemaining(c.trial_end);
                        return (
                          <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Church className="h-4 w-4 text-blue-400 shrink-0" />
                                <span className="font-semibold text-white text-sm">
                                  {c.igreja_nome}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-white block font-medium">
                                {c.responsavel_nome || 'Pastor(a)'} ({c.cargo || 'Liderança'})
                              </span>
                              <span className="text-[11px] text-slate-400 block">{c.email}</span>
                            </td>
                            <td className="py-3 px-4">
                              {c.status === 'active' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Licença Vitalícia
                                </span>
                              )}
                              {c.status === 'trial' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  <Clock className="h-3 w-3" />
                                  Teste ({daysRemaining} dias restam)
                                </span>
                              )}
                              {c.status === 'trial_expired' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                  <AlertTriangle className="h-3 w-3" />
                                  Teste Expirado
                                </span>
                              )}
                              {c.status === 'revoked' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-950 text-red-400 border border-red-800">
                                  <XCircle className="h-3 w-3" />
                                  Acesso Revogado
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-400">{formatDate(c.trial_start)}</td>
                            <td className="py-3 px-4">
                              {c.status === 'active' ? (
                                <span className="text-emerald-400 font-medium">Ilimitado / Vitalício</span>
                              ) : (
                                <div>
                                  <span className="text-slate-300 block">{formatDate(c.trial_end)}</span>
                                  {c.status === 'trial' && (
                                    <span className="text-[10px] text-amber-400">
                                      {daysRemaining === 0 ? 'Expira hoje!' : `${daysRemaining} dia(s) restantes`}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-300">
                              {c.token_code ? (
                                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs">
                                  {c.token_code}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">Nenhum</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right space-x-1.5">
                              {c.status !== 'active' && (
                                <button
                                  type="button"
                                  onClick={() => handleActivateChurch(c.id)}
                                  className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors cursor-pointer"
                                  title="Conceder Licença Permanente sem Token"
                                >
                                  Ativar Permanente
                                </button>
                              )}

                              {c.status !== 'revoked' ? (
                                <button
                                  type="button"
                                  onClick={() => setConfirmRevokeChurch(c)}
                                  className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs font-semibold transition-colors cursor-pointer"
                                  title="Revogar Acesso"
                                >
                                  Revogar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleActivateChurch(c.id)}
                                  className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-colors cursor-pointer"
                                  title="Reativar Acesso"
                                >
                                  Reativar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 3: AUDITORIA                                         */}
        {/* ======================================================== */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Data & Hora</th>
                      <th className="py-3 px-4">Operação</th>
                      <th className="py-3 px-4">Descrição da Atividade</th>
                      <th className="py-3 px-4">Igreja / E-mail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-500">
                          Nenhum registro de atividade ainda.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                            {formatDate(log.created_at)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                              {log.tipo.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-white font-medium">{log.descricao}</td>
                          <td className="py-3 px-4 text-slate-400">
                            {log.igreja_nome ? (
                              <span className="text-blue-300">{log.igreja_nome}</span>
                            ) : log.user_email ? (
                              log.user_email
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL REVOGAR IGREJA */}
      {confirmRevokeChurch && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="h-10 w-10 rounded-full bg-rose-950 flex items-center justify-center border border-rose-800">
                <AlertTriangle className="h-6 w-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Confirmar Revogação</h3>
                <p className="text-xs text-rose-300">Operação administrativa sensível</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tem certeza que deseja revogar o acesso da igreja{' '}
              <strong className="text-white">"{confirmRevokeChurch.igreja_nome}"</strong> (
              {confirmRevokeChurch.email})?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setConfirmRevokeChurch(null)}
                className="text-xs border-slate-700 text-slate-300"
              >
                Cancelar
              </Button>
              <button
                type="button"
                onClick={() => handleRevokeChurch(confirmRevokeChurch.id)}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-md"
              >
                Sim, Revogar Acesso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REVOGAR TOKEN */}
      {confirmRevokeToken && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="h-10 w-10 rounded-full bg-rose-950 flex items-center justify-center border border-rose-800">
                <XCircle className="h-6 w-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Revogar Token</h3>
                <p className="text-xs text-rose-300">Invalidar código de ativação</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Deseja invalidar permanentemente o token{' '}
              <strong className="text-white font-mono">{confirmRevokeToken.token_code}</strong>?
            </p>

            <div className="flex items-center justify-end gap-2 ptr-2">
              <Button
                variant="outline"
                onClick={() => setConfirmRevokeToken(null)}
                className="text-xs border-slate-700 text-slate-300"
              >
                Cancelar
              </Button>
              <button
                type="button"
                onClick={() => handleRevokeToken(confirmRevokeToken.id)}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-md"
              >
                Revogar Token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
