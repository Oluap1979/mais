import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Database,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Church,
  ImageIcon,
  Link as LinkIcon,
  Save,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  getStoredSupabaseConfig,
  setCustomSupabaseCredentials,
  clearCustomSupabaseCredentials,
  testSupabaseConnection,
  STORAGE_KEYS,
} from '../lib/supabase';
import { useToast } from './ui/toast';
import {
  type IgrejaHeaderConfig,
  getSavedHeaderConfig,
  saveHeaderConfig,
  DEFAULT_HEADER_CONFIG,
} from '../types/documentoConfig';

interface SupabaseConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataUpdated?: () => void;
}

export function SupabaseConfigModal({ open, onOpenChange, onDataUpdated }: SupabaseConfigModalProps) {
  const { toastSuccess, toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'igreja' | 'conectar' | 'sql_schema'>('igreja');

  // Supabase states
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [tableCounts, setTableCounts] = useState<{ celulas: number; membros: number; financeiro: number; secretaria: number } | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);

  // Church Configuration states
  const [churchConfig, setChurchConfig] = useState<IgrejaHeaderConfig>(() => getSavedHeaderConfig());
  const [logoStatus, setLogoStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [savingChurch, setSavingChurch] = useState(false);

  useEffect(() => {
    if (open) {
      // Load Supabase credentials
      const cfg = getStoredSupabaseConfig();
      setUrl(cfg.url);
      setKey(cfg.key);
      if (cfg.url && cfg.key) {
        handleTestConnection(cfg.url, cfg.key);
      }

      // Load Church Header config
      const church = getSavedHeaderConfig();
      setChurchConfig(church);
    }
  }, [open]);

  // Test logo loading
  useEffect(() => {
    if (!churchConfig.logoUrl) {
      setLogoStatus('idle');
      return;
    }
    setLogoStatus('loading');
    const img = new Image();
    img.src = churchConfig.logoUrl;
    img.onload = () => setLogoStatus('success');
    img.onerror = () => setLogoStatus('error');
  }, [churchConfig.logoUrl]);

  const handleTestConnection = async (testUrl = url, testKey = key) => {
    if (!testUrl || !testKey) return;
    setConnecting(true);
    setStatusMsg(null);
    try {
      setCustomSupabaseCredentials(testUrl, testKey);
      const res = await testSupabaseConnection();
      if (res.success) {
        setStatusMsg({ type: 'success', text: res.message });
        if (res.counts) setTableCounts(res.counts);
        if (onDataUpdated) onDataUpdated();
      } else {
        setStatusMsg({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Erro ao conectar' });
    } finally {
      setConnecting(false);
    }
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !key.trim()) {
      setStatusMsg({ type: 'error', text: 'Informe a URL do Projeto e a Chave Anon do Supabase.' });
      return;
    }

    setConnecting(true);
    try {
      const saved = setCustomSupabaseCredentials(url.trim(), key.trim());
      if (!saved) throw new Error('Não foi possível salvar as credenciais. Verifique a URL informada.');

      const res = await testSupabaseConnection();
      if (res.success) {
        toastSuccess('Conectado ao Supabase com sucesso!');
        setStatusMsg({ type: 'success', text: 'Conectado ao Supabase! Tabelas reais sincronizadas.' });
        if (res.counts) setTableCounts(res.counts);
        if (onDataUpdated) onDataUpdated();
      } else {
        setStatusMsg({ type: 'error', text: `Aviso: ${res.message}` });
        toastError('Não foi possível verificar as tabelas.');
      }
    } catch (err: any) {
      toastError('Erro ao conectar ao Supabase.');
      setStatusMsg({ type: 'error', text: err.message || 'Falha na conexão.' });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    clearCustomSupabaseCredentials();
    setUrl('');
    setKey('');
    setTableCounts(null);
    setStatusMsg({ type: 'info', text: 'Supabase desconectado.' });
    if (onDataUpdated) onDataUpdated();
  };

  const handleSaveChurchConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingChurch(true);
    try {
      saveHeaderConfig(churchConfig);

      // Sincroniza também o nome da igreja na sessão do usuário no localStorage
      try {
        const userStr = localStorage.getItem(STORAGE_KEYS.USER);
        if (userStr) {
          const u = JSON.parse(userStr);
          u.igreja = churchConfig.nomeIgreja;
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(u));
        }
      } catch {
        // ignora
      }

      toastSuccess('Dados da Igreja e cabeçalho A4 salvos com sucesso!');
      if (onDataUpdated) onDataUpdated();
    } catch {
      toastError('Erro ao salvar configurações da igreja.');
    } finally {
      setSavingChurch(false);
    }
  };

  const handleResetChurchConfig = () => {
    setChurchConfig(DEFAULT_HEADER_CONFIG);
  };

  const renderBrasaoVetorial = (size: number = 54) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="inline-block shrink-0 drop-shadow-xs"
    >
      <circle cx="50" cy="50" r="46" stroke="#1e3a8a" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="42" stroke="#2563eb" strokeWidth="1" strokeDasharray="3 2" />
      <path
        d="M20 50 C20 68 34 82 50 82 C66 82 80 68 80 50"
        stroke="#1e3a8a"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M32 64 C38 60 46 62 50 65 C54 62 62 60 68 64 L68 70 C62 66 54 68 50 71 C46 68 38 66 32 70 Z"
        fill="#1e3a8a"
      />
      <rect x="47" y="20" width="6" height="40" rx="1.5" fill="#1e3a8a" />
      <rect x="34" y="30" width="32" height="6" rx="1.5" fill="#1e3a8a" />
    </svg>
  );

  const sqlSchemaCode = `-- =========================================================
-- TABELAS OFICIAIS DO SISTEMA "MAIS IGREJA" NO SUPABASE
-- =========================================================

-- 1. Células
CREATE TABLE IF NOT EXISTS public.celulas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    lider_id UUID,
    endereco TEXT,
    observacoes TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Membros
CREATE TABLE IF NOT EXISTS public.membros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefone TEXT,
    data_nascimento DATE,
    celula_id UUID REFERENCES public.celulas(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'em_observacao')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Financeiro
CREATE TABLE IF NOT EXISTS public.financeiro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    descricao TEXT,
    valor NUMERIC(10, 2) NOT NULL,
    data DATE NOT NULL,
    categoria TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Secretaria
CREATE TABLE IF NOT EXISTS public.secretaria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    titulo TEXT NOT NULL,
    conteudo TEXT,
    data_criacao TIMESTAMPTZ DEFAULT now() NOT NULL,
    tipo TEXT
);

-- =========================================================
-- PERMISSÕES E ACESSO ÀS TABELAS (RECOMENDADO)
-- Se suas tabelas já foram criadas no banco, execute as linhas
-- abaixo para garantir leitura e escrita de todas as informações:
-- =========================================================
ALTER TABLE public.celulas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.secretaria DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.celulas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.membros TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.financeiro TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.secretaria TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center gap-2 mb-1">
          <Church className="h-5 w-5 text-blue-600" />
          <DialogTitle>Configurações do Sistema & da Igreja</DialogTitle>
        </div>
        <DialogDescription>
          Gerencie a identidade visual e dados da sua congregação para documentos A4 e a sincronização com o banco de dados.
        </DialogDescription>
      </DialogHeader>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('igreja')}
          className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'igreja'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Church className="h-3.5 w-3.5" />
          <span>Dados da Igreja & Logo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('conectar')}
          className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'conectar'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          <span>Banco de Dados Supabase</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sql_schema')}
          className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'sql_schema'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <span>Schema SQL</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: DADOS DA IGREJA, LOGO POR LINK & ENDEREÇO COMPLETO */}
      {/* ========================================================= */}
      {activeTab === 'igreja' && (
        <form onSubmit={handleSaveChurchConfig} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Banner de cabeçalho A4 */}
          <div className="p-3 bg-linear-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 text-xs">
            <div className="flex items-center gap-2 font-bold text-blue-900 mb-0.5">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span>Identidade Oficial para Documentos A4</span>
            </div>
            <p className="text-blue-800 text-[11px] leading-relaxed">
              O Nome, a Logo e o Endereço configurados aqui são utilizados dinamicamente em todos os cabeçalhos de certificados, cartas pastorais, atas e declarações emitidos na Secretaria.
            </p>
          </div>

          {/* Seção 1: Logo por Link */}
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-blue-600" />
                <span>Link da Logo da Igreja (URL)</span>
              </label>
              {churchConfig.logoUrl && (
                <button
                  type="button"
                  onClick={() => setChurchConfig({ ...churchConfig, logoUrl: '' })}
                  className="text-[11px] text-red-600 hover:underline cursor-pointer"
                >
                  Remover e usar Brasão
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="url"
                value={churchConfig.logoUrl}
                onChange={(e) => setChurchConfig({ ...churchConfig, logoUrl: e.target.value })}
                placeholder="https://exemplo.com/logo-da-igreja.png"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 font-mono pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {churchConfig.logoUrl && (
                <button
                  type="button"
                  onClick={() => setChurchConfig({ ...churchConfig, logoUrl: '' })}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Status e Preview da Logo */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
              <div className="text-[11px]">
                {churchConfig.logoUrl ? (
                  logoStatus === 'success' ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Imagem carregada e pronta para impressão!
                    </span>
                  ) : logoStatus === 'error' ? (
                    <span className="text-amber-700 font-semibold flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> Link inacessível. O documento usará o brasão eclesiástico.
                    </span>
                  ) : (
                    <span className="text-blue-600 font-medium">Testando imagem...</span>
                  )
                ) : (
                  <span className="text-gray-500 italic">Sem URL informada. Usando Brasão Eclesiástico vetorial de alta definição.</span>
                )}
              </div>

              {/* Mini Preview */}
              <div className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 flex items-center gap-2 shadow-2xs">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Prévia:</span>
                {churchConfig.logoUrl && logoStatus === 'success' ? (
                  <img
                    src={churchConfig.logoUrl}
                    alt="Prévia da Logo"
                    className="h-8 max-w-[90px] object-contain"
                  />
                ) : (
                  renderBrasaoVetorial(32)
                )}
              </div>
            </div>
          </div>

          {/* Seção 2: Dados Institucionais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block text-gray-700 font-bold mb-1">Nome Oficial da Igreja / Ministério *</label>
              <input
                type="text"
                required
                value={churchConfig.nomeIgreja}
                onChange={(e) => setChurchConfig({ ...churchConfig, nomeIgreja: e.target.value })}
                placeholder="Ex: Igreja Evangélica Assembleia de Deus"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-gray-700 font-bold mb-1">Endereço Completo (Rua, Número e Bairro) *</label>
              <input
                type="text"
                required
                value={churchConfig.endereco}
                onChange={(e) => setChurchConfig({ ...churchConfig, endereco: e.target.value })}
                placeholder="Ex: Av. Central, 1200 - Bairro das Palmeiras"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Cidade - UF *</label>
              <input
                type="text"
                required
                value={churchConfig.cidadeEstado}
                onChange={(e) => setChurchConfig({ ...churchConfig, cidadeEstado: e.target.value })}
                placeholder="Ex: São Paulo - SP"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">CEP</label>
              <input
                type="text"
                value={churchConfig.cep}
                onChange={(e) => setChurchConfig({ ...churchConfig, cep: e.target.value })}
                placeholder="00000-000"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">CNPJ</label>
              <input
                type="text"
                value={churchConfig.cnpj}
                onChange={(e) => setChurchConfig({ ...churchConfig, cnpj: e.target.value })}
                placeholder="00.000.000/0001-00"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={churchConfig.telefone}
                onChange={(e) => setChurchConfig({ ...churchConfig, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">E-mail da Secretaria</label>
              <input
                type="email"
                value={churchConfig.email}
                onChange={(e) => setChurchConfig({ ...churchConfig, email: e.target.value })}
                placeholder="secretaria@igreja.org.br"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Denominação / Convenção</label>
              <input
                type="text"
                value={churchConfig.denominacao}
                onChange={(e) => setChurchConfig({ ...churchConfig, denominacao: e.target.value })}
                placeholder="Ex: Convenção Geral dos Ministros"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Pastor Titular / Presidente</label>
              <input
                type="text"
                value={churchConfig.nomePastor}
                onChange={(e) => setChurchConfig({ ...churchConfig, nomePastor: e.target.value })}
                placeholder="Pr. Nome do Pastor"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Secretário(a) Geral</label>
              <input
                type="text"
                value={churchConfig.nomeSecretario}
                onChange={(e) => setChurchConfig({ ...churchConfig, nomeSecretario: e.target.value })}
                placeholder="Nome do Secretário(a)"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-gray-200">
            <button
              type="button"
              onClick={handleResetChurchConfig}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restaurar Valores Padrão</span>
            </button>

            <button
              type="submit"
              disabled={savingChurch}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Salvar Dados da Igreja</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* TAB 2: CONEXÃO SUPABASE                                   */}
      {/* ========================================================= */}
      {activeTab === 'conectar' && (
        <div className="space-y-4 text-sm">
          {/* Status Banner */}
          {statusMsg && (
            <div
              className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : statusMsg.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Contagem de registros reais no Supabase */}
          {tableCounts && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">
                  Registros Reais nas Tabelas do Supabase:
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Online
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded-lg border border-gray-200">
                  <span className="text-gray-500 block text-[10px]">Membros</span>
                  <strong className="text-gray-900 text-sm">{tableCounts.membros}</strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-200">
                  <span className="text-gray-500 block text-[10px]">Células</span>
                  <strong className="text-gray-900 text-sm">{tableCounts.celulas}</strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-200">
                  <span className="text-gray-500 block text-[10px]">Financeiro</span>
                  <strong className="text-gray-900 text-sm">{tableCounts.financeiro}</strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-200">
                  <span className="text-gray-500 block text-[10px]">Secretaria</span>
                  <strong className="text-gray-900 text-sm">{tableCounts.secretaria}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Formulário de Conexão */}
          <form onSubmit={handleSaveConnection} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                URL do Projeto Supabase
              </label>
              <Input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Chave Pública Anônima (anon public key)
              </label>
              <Input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                required
                className="font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {getStoredSupabaseConfig().url ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="text-xs text-rose-600 hover:text-rose-800 underline cursor-pointer"
                >
                  Desconectar Supabase
                </button>
              ) : (
                <span className="text-[11px] text-gray-400">Modo Local ativo se não configurado</span>
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  disabled={connecting}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  {connecting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Testando Conexão...
                    </>
                  ) : (
                    'Salvar e Conectar'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: SCHEMA SQL                                         */}
      {/* ========================================================= */}
      {activeTab === 'sql_schema' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">
              Copie e cole este script no <strong>SQL Editor</strong> do seu painel Supabase:
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(sqlSchemaCode);
                setCopiedSchema(true);
                setTimeout(() => setCopiedSchema(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              {copiedSchema ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedSchema ? 'Copiado!' : 'Copiar SQL'}</span>
            </button>
          </div>

          <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72 leading-relaxed">
            {sqlSchemaCode}
          </pre>
        </div>
      )}

      <DialogFooter className="mt-4 pt-3 border-t border-gray-200 flex justify-end">
        <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs">
          Fechar
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
