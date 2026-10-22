import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  CreditCard,
  Church,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Copy,
  LogOut,
  RefreshCw,
  Search,
  History,
  XCircle,
  Check,
  ExternalLink,
  Sliders,
  Webhook,
  Activity,
  Calendar,
  Layers,
  Send,
} from 'lucide-react';
import { useToast } from './ui/toast';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

interface AdminPanelProps {
  adminToken: string;
  onLogoutAdmin: () => void;
  onSwitchToChurchApp?: () => void;
}

interface SubscriptionStats {
  total: number;
  active: number;
  past_due: number;
  canceled: number;
  expired: number;
  suspended: number;
  pending: number;
  totalWebhooks: number;
}

interface ChurchSubscriptionItem {
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
  status: 'active' | 'past_due' | 'canceled' | 'expired' | 'suspended' | 'pending';
  start_date: string;
  last_payment_date?: string;
  next_due_date?: string;
  canceled_at?: string;
  last_webhook_at?: string;
  events_history?: Array<{
    id: string;
    event_type: string;
    description: string;
    kiwify_order_id?: string;
    kiwify_subscription_id?: string;
    created_at: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface WebhookLogItem {
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

interface AuditLogItem {
  id: string;
  tipo: string;
  descricao: string;
  user_email?: string;
  igreja_nome?: string;
  created_at: string;
}

export function AdminPanel({ adminToken, onLogoutAdmin, onSwitchToChurchApp }: AdminPanelProps) {
  const { toastSuccess, toastError, toastInfo } = useToast();

  const [activeTab, setActiveTab] = useState<'subscriptions' | 'webhooks' | 'integration'>('subscriptions');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SubscriptionStats>({
    total: 0,
    active: 0,
    past_due: 0,
    canceled: 0,
    expired: 0,
    suspended: 0,
    pending: 0,
    totalWebhooks: 0,
  });

  const [subscriptions, setSubscriptions] = useState<ChurchSubscriptionItem[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLogItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [config, setConfig] = useState<{ checkoutUrl: string; productId: string; hasWebhookSecret: boolean }>({
    checkoutUrl: '',
    productId: '',
    hasWebhookSecret: false,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Modal de Histórico de Assinatura
  const [selectedSub, setSelectedSub] = useState<ChurchSubscriptionItem | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Modal de Alteração Manual de Status
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetSub, setTargetSub] = useState<ChurchSubscriptionItem | null>(null);
  const [newStatusChoice, setNewStatusChoice] = useState<'active' | 'past_due' | 'canceled' | 'suspended'>('active');
  const [statusMotivo, setStatusMotivo] = useState('');

  // Simulador de Webhook
  const [simEvent, setSimEvent] = useState<'order_approved' | 'subscription_late' | 'subscription_renewed' | 'subscription_canceled'>('order_approved');
  const [simEmail, setSimEmail] = useState('');
  const [simChurchName, setSimChurchName] = useState('');
  const [simulating, setSimulating] = useState(false);

  // Configurações da Kiwify editáveis no Painel
  const [formCheckoutUrl, setFormCheckoutUrl] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [formWebhookSecret, setFormWebhookSecret] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/subscriptions', {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'x-admin-token': adminToken,
        },
      });

      if (!res.ok) {
        throw new Error('Falha ao autenticar no painel administrativo.');
      }

      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setSubscriptions(data.subscriptions || []);
        setWebhookLogs(data.webhook_logs || []);
        setAuditLogs(data.audit_logs || []);
        if (data.config) {
          setConfig(data.config);
          setFormCheckoutUrl(data.config.checkoutUrl || '');
          setFormProductId(data.config.productId || '');
        }

        // Preenche email para simulação caso esteja vazio
        if (data.subscriptions && data.subscriptions.length > 0 && !simEmail) {
          setSimEmail(data.subscriptions[0].user_email);
          setSimChurchName(data.subscriptions[0].igreja_nome);
        }
      }
    } catch (err: any) {
      toastError(err.message || 'Erro ao carregar dados administrativos.');
    } finally {
      setLoading(false);
    }
  }, [adminToken, toastError, simEmail]);

  const handleSaveKiwifyConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch('/api/admin/kiwify-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          checkoutUrl: formCheckoutUrl.trim(),
          productId: formProductId.trim(),
          webhookSecret: formWebhookSecret.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar configurações.');

      toastSuccess('Configurações da Kiwify salvas com sucesso!');
      if (data.config) setConfig(data.config);
      setFormWebhookSecret('');
    } catch (err: any) {
      toastError(err.message || 'Falha ao salvar configurações.');
    } finally {
      setSavingConfig(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toastSuccess(`Copiado para a área de transferência: ${label}`);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSub) return;

    try {
      const res = await fetch(`/api/admin/subscriptions/${targetSub.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: newStatusChoice,
          motivo: statusMotivo.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar status.');

      toastSuccess(`Status da igreja "${targetSub.igreja_nome}" alterado para ${newStatusChoice}.`);
      setStatusModalOpen(false);
      setStatusMotivo('');
      fetchAdminData();
    } catch (err: any) {
      toastError(err.message || 'Falha ao alterar status.');
    }
  };

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simEmail.trim()) {
      toastError('Informe o e-mail da igreja para a simulação.');
      return;
    }

    setSimulating(true);
    try {
      const res = await fetch('/api/admin/simulate-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          event_type: simEvent,
          email: simEmail.trim(),
          church_name: simChurchName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha na simulação.');

      toastSuccess(`🎉 ${data.message}`);
      fetchAdminData();
    } catch (err: any) {
      toastError(err.message || 'Erro ao simular webhook.');
    } finally {
      setSimulating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Ativa
          </span>
        );
      case 'past_due':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="h-3 w-3 text-amber-600" /> Atrasada
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="h-3 w-3 text-rose-600" /> Cancelada
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <ShieldCheck className="h-3 w-3 text-purple-600" /> Suspensa
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200">
            <Clock className="h-3 w-3 text-gray-600" /> Expirada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="h-3 w-3 text-blue-600" /> Pendente
          </span>
        );
    }
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch =
      sub.igreja_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.responsavel_nome && sub.responsavel_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sub.kiwify_subscription_id && sub.kiwify_subscription_id.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const webhookEndpointUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/kiwify`
    : 'https://seu-dominio/api/webhooks/kiwify';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header Administrativo */}
      <header className="border-b border-slate-800 bg-slate-950/80 sticky top-0 z-30 px-6 py-4 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Painel Administrativo Mais Igreja
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  SaaS Kiwify
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Gerenciamento central de assinaturas recorrentes, webhooks e igrejas contratantes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAdminData}
              disabled={loading}
              className="border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 text-xs cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar Dados</span>
            </Button>

            {onSwitchToChurchApp && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSwitchToChurchApp}
                className="border-blue-500/40 bg-blue-950/40 text-blue-300 hover:bg-blue-900/60 text-xs cursor-pointer"
              >
                <Church className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
                <span>Visualizar como Igreja</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onLogoutAdmin}
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 text-xs cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              <span>Sair do Admin</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <Card className="bg-slate-800/80 border-slate-700/60">
            <CardContent className="p-4">
              <span className="text-xs font-medium text-slate-400">Total Assinaturas</span>
              <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="bg-emerald-950/30 border-emerald-800/40">
            <CardContent className="p-4">
              <span className="text-xs font-medium text-emerald-400">Assinaturas Ativas</span>
              <p className="text-2xl font-black text-emerald-300 mt-1">{stats.active}</p>
            </CardContent>
          </Card>

          <Card className="bg-amber-950/30 border-amber-800/40">
            <CardContent className="p-4">
              <span className="text-xs font-medium text-amber-400">Atrasadas / Pendentes</span>
              <p className="text-2xl font-black text-amber-300 mt-1">{stats.past_due + stats.pending}</p>
            </CardContent>
          </Card>

          <Card className="bg-rose-950/30 border-rose-800/40">
            <CardContent className="p-4">
              <span className="text-xs font-medium text-rose-400">Canceladas</span>
              <p className="text-2xl font-black text-rose-300 mt-1">{stats.canceled}</p>
            </CardContent>
          </Card>

          <Card className="bg-purple-950/30 border-purple-800/40">
            <CardContent className="p-4">
              <span className="text-xs font-medium text-purple-400">Suspensas</span>
              <p className="text-2xl font-black text-purple-300 mt-1">{stats.suspended}</p>
            </CardContent>
          </Card>

          <Card className="bg-blue-950/30 border-blue-800/40">
            <CardContent className="p-4">
              <span className="text-xs font-medium text-blue-400">Webhooks Kiwify</span>
              <p className="text-2xl font-black text-blue-300 mt-1">{stats.totalWebhooks}</p>
            </CardContent>
          </Card>
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-slate-800 space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('subscriptions')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 cursor-pointer transition-all ${
              activeTab === 'subscriptions'
                ? 'border-blue-500 text-blue-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Assinaturas das Igrejas ({subscriptions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('webhooks')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 cursor-pointer transition-all ${
              activeTab === 'webhooks'
                ? 'border-blue-500 text-blue-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Webhook className="h-4 w-4" />
            <span>Auditoria de Webhooks Kiwify ({webhookLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('integration')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 cursor-pointer transition-all ${
              activeTab === 'integration'
                ? 'border-blue-500 text-blue-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Integração Kiwify & Simulador</span>
          </button>
        </div>

        {/* TAB 1: LISTA DE ASSINATURAS DAS IGREJAS */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-4">
            {/* Filtros e Busca */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar por congregação, pastor, email ou ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-slate-800/90 border-slate-700 text-slate-100 placeholder:text-slate-500 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400 shrink-0">Filtrar status:</span>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-200 text-xs"
                >
                  <option value="all">Todos os Status</option>
                  <option value="active">Ativas</option>
                  <option value="past_due">Atrasadas</option>
                  <option value="canceled">Canceladas</option>
                  <option value="suspended">Suspensas</option>
                  <option value="pending">Pendentes</option>
                </Select>
              </div>
            </div>

            {/* Tabela de Assinaturas */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-800/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Igreja / Congregação</th>
                      <th className="py-3 px-4">Pastor / Responsável</th>
                      <th className="py-3 px-4">E-mail Kiwify</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Próximo Vencimento</th>
                      <th className="py-3 px-4">Kiwify Sub ID</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredSubscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          Nenhuma assinatura encontrada com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredSubscriptions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-800/80 transition-colors">
                          <td className="py-3 px-4 font-semibold text-white">
                            <div className="flex items-center gap-2">
                              <Church className="h-4 w-4 text-blue-400 shrink-0" />
                              <span>{sub.igreja_nome}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            <div>{sub.responsavel_nome || 'Pastor Titular'}</div>
                            <div className="text-[10px] text-slate-500">{sub.cargo || 'Liderança'}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">
                            {sub.user_email}
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(sub.status)}
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-mono">
                            {sub.next_due_date ? new Date(sub.next_due_date).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {sub.kiwify_subscription_id ? (
                              <span title={sub.kiwify_subscription_id}>
                                {sub.kiwify_subscription_id.slice(0, 10)}...
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedSub(sub);
                                  setHistoryModalOpen(true);
                                }}
                                className="h-7 px-2 text-[11px] text-blue-400 hover:text-white hover:bg-blue-900/40 cursor-pointer"
                                title="Ver histórico de eventos da Kiwify"
                              >
                                <History className="h-3 w-3 mr-1" />
                                <span>Eventos</span>
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setTargetSub(sub);
                                  setNewStatusChoice(sub.status as any);
                                  setStatusModalOpen(true);
                                }}
                                className="h-7 px-2 text-[11px] border-slate-700 text-slate-300 hover:bg-slate-700 cursor-pointer"
                                title="Ajustar status manualmente"
                              >
                                <Sliders className="h-3 w-3 mr-1 text-amber-400" />
                                <span>Ajustar</span>
                              </Button>
                            </div>
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

        {/* TAB 2: AUDITORIA DE WEBHOOKS KIWIFY */}
        {activeTab === 'webhooks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Histórico de Webhooks Recebidos da Kiwify</h3>
                <p className="text-xs text-slate-400">
                  Registros em tempo real das notificações enviadas pela Kiwify sobre compras, renovações e cancelamentos
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAdminData}
                className="border-slate-700 text-xs cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Atualizar Logs
              </Button>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-800/40">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Data / Hora</th>
                    <th className="py-3 px-4">Evento Kiwify</th>
                    <th className="py-3 px-4">Cliente / E-mail</th>
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Resultado</th>
                    <th className="py-3 px-4">Mensagem de Processamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {webhookLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Nenhum evento de webhook recebido ainda. Utilize a aba "Integração" para simular ou configure o webhook na Kiwify.
                      </td>
                    </tr>
                  ) : (
                    webhookLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/60 transition-colors">
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-400">
                          {log.event_type}
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono">
                          {log.customer_email || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {log.order_id ? log.order_id.slice(0, 12) : '—'}
                        </td>
                        <td className="py-3 px-4">
                          {log.status === 'processed' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                              <CheckCircle2 className="h-3 w-3" /> Processado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800/60">
                              <XCircle className="h-3 w-3" /> {log.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {log.message}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: INTEGRAÇÃO KIWIFY & SIMULADOR */}
        {activeTab === 'integration' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Painel de Configurações */}
            <Card className="bg-slate-800/60 border-slate-700">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-blue-400" />
                  URL do Webhook Oficial para Configurar na Kiwify
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium">URL de Notificação (Webhook Endpoint):</label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={webhookEndpointUrl}
                      className="bg-slate-900 border-slate-700 text-slate-200 font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(webhookEndpointUrl, 'URL do Webhook')}
                      className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shrink-0"
                    >
                      {copiedText === 'URL do Webhook' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Copie esta URL e cole na configuração de Webhooks do produto na plataforma Kiwify.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-700/60 space-y-2">
                  <h4 className="font-bold text-white text-xs">Variáveis de Ambiente no .env:</h4>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">KIWIFY_CHECKOUT_URL</span>
                      <span className="text-emerald-400 truncate max-w-xs">{config.checkoutUrl || 'Não configurada'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">KIWIFY_PRODUCT_ID</span>
                      <span className="text-blue-400">{config.productId || 'Não configurado'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">KIWIFY_WEBHOOK_SECRET</span>
                      <span className="text-purple-400">{config.hasWebhookSecret ? 'Protegido / Configurado' : 'Opcional (Livre)'}</span>
                    </div>
                  </div>
                </div>

                {/* Formulário de Configuração Dinâmica */}
                <form onSubmit={handleSaveKiwifyConfig} className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-700/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">Vincular Produto & Checkout da Kiwify:</span>
                    <span className="text-[10px] text-amber-400 font-semibold">Preencha quando criar o produto</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 text-[11px]">Link do Checkout Kiwify (URL):</label>
                    <Input
                      type="url"
                      placeholder="https://pay.kiwify.com.br/SEU_LINK"
                      value={formCheckoutUrl}
                      onChange={(e) => setFormCheckoutUrl(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-slate-100 text-xs font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-slate-400 text-[11px]">ID do Produto Kiwify:</label>
                      <Input
                        type="text"
                        placeholder="Ex: prod_12345"
                        value={formProductId}
                        onChange={(e) => setFormProductId(e.target.value)}
                        className="bg-slate-950 border-slate-700 text-slate-100 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-400 text-[11px]">Segredo do Webhook (Token):</label>
                      <Input
                        type="password"
                        placeholder="Opcional"
                        value={formWebhookSecret}
                        onChange={(e) => setFormWebhookSecret(e.target.value)}
                        className="bg-slate-950 border-slate-700 text-slate-100 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={savingConfig}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg cursor-pointer text-xs mt-1"
                  >
                    <span>{savingConfig ? 'Salvando...' : 'Salvar Dados da Kiwify'}</span>
                  </Button>
                </form>

                <div className="p-3 bg-blue-950/40 border border-blue-800/40 rounded-xl text-blue-300 text-xs leading-relaxed">
                  <strong>💡 Como funciona:</strong> Você pode deixar em branco agora e preencher assim que criar seu produto na Kiwify. Quando um pastor assinar, a Kiwify enviará uma notificação para a URL acima e o sistema liberará o acesso automaticamente.
                </div>
              </CardContent>
            </Card>

            {/* Simulador de Webhook */}
            <Card className="bg-slate-800/60 border-slate-700">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  Simulador de Eventos de Webhook Kiwify
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSimulateWebhook} className="space-y-3.5 text-xs">
                  <p className="text-slate-400 leading-relaxed">
                    Teste o fluxo completo de aprovação, renovação, atraso ou cancelamento simulando o disparo da Kiwify para qualquer congregação:
                  </p>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Tipo de Evento Kiwify:</label>
                    <Select
                      value={simEvent}
                      onChange={(e) => setSimEvent(e.target.value as any)}
                      className="bg-slate-900 border-slate-700 text-slate-100"
                    >
                      <option value="order_approved">order_approved — Pagamento Aprovado (Libera Acesso)</option>
                      <option value="subscription_renewed">subscription_renewed — Renovação Mensal Paga</option>
                      <option value="subscription_late">subscription_late — Pagamento Atrasado (Bloqueia Acesso)</option>
                      <option value="subscription_canceled">subscription_canceled — Assinatura Cancelada</option>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">E-mail do Cliente / Igreja:</label>
                    <Input
                      type="email"
                      placeholder="pastor@igreja.com"
                      value={simEmail}
                      onChange={(e) => setSimEmail(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Nome da Congregação (Opcional):</label>
                    <Input
                      type="text"
                      placeholder="Igreja Batista Exemplo"
                      value={simChurchName}
                      onChange={(e) => setSimChurchName(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-slate-100"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={simulating}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl cursor-pointer mt-2"
                  >
                    <Send className={`h-4 w-4 mr-2 ${simulating ? 'animate-bounce' : ''}`} />
                    <span>{simulating ? 'Disparando simulação...' : 'Executar Simulação de Webhook'}</span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* MODAL: HISTÓRICO DE EVENTOS KIWIFY */}
      {selectedSub && (
        <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
          <div className="p-6 max-w-xl w-full text-slate-100">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <History className="h-5 w-5 text-blue-400" />
                Histórico Kiwify: {selectedSub.igreja_nome}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Auditoria de pagamentos e alterações de status registradas
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {(!selectedSub.events_history || selectedSub.events_history.length === 0) ? (
                <p className="text-xs text-slate-400 py-4 text-center">Nenhum evento registrado ainda.</p>
              ) : (
                selectedSub.events_history.map((ev) => (
                  <div key={ev.id} className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-400 font-mono">{ev.event_type}</span>
                      <span className="text-[11px] text-slate-400">{new Date(ev.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-slate-200">{ev.description}</p>
                    {ev.kiwify_order_id && (
                      <p className="text-[10px] text-slate-400 font-mono">Order ID: {ev.kiwify_order_id}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryModalOpen(false)}
                className="border-slate-700 text-xs"
              >
                Fechar
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* MODAL: AJUSTE MANUAL DE STATUS */}
      {targetSub && (
        <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
          <form onSubmit={handleUpdateStatus} className="p-6 max-w-md w-full text-slate-100 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-amber-400" />
                Ajustar Status de Acesso
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                {targetSub.igreja_nome} ({targetSub.user_email})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 text-xs">
              <label className="text-slate-300 font-semibold">Novo Status:</label>
              <Select
                value={newStatusChoice}
                onChange={(e) => setNewStatusChoice(e.target.value as any)}
                className="bg-slate-900 border-slate-700 text-slate-100"
              >
                <option value="active">active — Ativa (Acesso Liberado)</option>
                <option value="past_due">past_due — Pagamento Pendente / Atrasado</option>
                <option value="canceled">canceled — Assinatura Cancelada</option>
                <option value="suspended">suspended — Acesso Suspenso Administrativamente</option>
              </Select>
            </div>

            <div className="space-y-2 text-xs">
              <label className="text-slate-300 font-semibold">Motivo do Ajuste:</label>
              <Input
                type="text"
                placeholder="Ex: Regularização manual solicitada pelo pastor"
                value={statusMotivo}
                onChange={(e) => setStatusMotivo(e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-100"
              />
            </div>

            <div className="pt-2 flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStatusModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                Salvar Alteração
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
