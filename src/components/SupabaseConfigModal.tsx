import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Database,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  Link,
  AlertCircle,
  CheckCircle2,
  Table,
} from 'lucide-react';
import {
  getStoredSupabaseConfig,
  setCustomSupabaseCredentials,
  clearCustomSupabaseCredentials,
  testSupabaseConnection,
} from '../lib/supabase';
import { useToast } from './ui/toast';

interface SupabaseConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataUpdated?: () => void;
}

export function SupabaseConfigModal({ open, onOpenChange, onDataUpdated }: SupabaseConfigModalProps) {
  const { toastSuccess, toastError } = useToast();

  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [tableCounts, setTableCounts] = useState<{ celulas: number; membros: number; financeiro: number; secretaria: number } | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [activeTab, setActiveTab] = useState<'conectar' | 'sql_schema'>('conectar');

  useEffect(() => {
    if (open) {
      const cfg = getStoredSupabaseConfig();
      setUrl(cfg.url);
      setKey(cfg.key);
      if (cfg.url && cfg.key) {
        handleTestConnection(cfg.url, cfg.key);
      }
    }
  }, [open]);

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
        toastSuccess('✅ Sucesso! Operação realizada.');
        setStatusMsg({ type: 'success', text: 'Conectado ao Supabase! Tabelas reais sincronizadas.' });
        if (res.counts) setTableCounts(res.counts);
        if (onDataUpdated) onDataUpdated();
      } else {
        setStatusMsg({ type: 'error', text: `Aviso: ${res.message}` });
        toastError('❌ Erro. Tente novamente.');
      }
    } catch (err: any) {
      toastError('❌ Erro. Tente novamente.');
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

-- Habilitar RLS
ALTER TABLE public.celulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secretaria ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Usuários gerenciam suas próprias celulas" ON public.celulas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários gerenciam seus próprios membros" ON public.membros FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários gerenciam seus próprios registros financeiros" ON public.financeiro FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários gerenciam seus próprios documentos de secretaria" ON public.secretaria FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center gap-2 mb-1">
          <Database className="h-5 w-5 text-blue-600" />
          <DialogTitle>Conexão com Supabase (Dados Reais)</DialogTitle>
        </div>
        <DialogDescription>
          Gerencie a integração direta com suas tabelas reais no Supabase. Todos os dados são lidos e salvos diretamente no seu banco de dados.
        </DialogDescription>
      </DialogHeader>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('conectar')}
          className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'conectar'
              ? 'border-blue-600 text-blue-800'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Conexão & Sincronização
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sql_schema')}
          className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'sql_schema'
              ? 'border-blue-600 text-blue-800'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Schema SQL das Tabelas
        </button>
      </div>

      {activeTab === 'conectar' ? (
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
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Sincronizado
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 bg-white rounded-md border border-gray-200 shadow-2xs">
                  <span className="text-gray-500 block text-[10px]">Células</span>
                  <span className="font-bold text-gray-900 tabular-nums text-sm">{tableCounts.celulas}</span>
                </div>
                <div className="p-2 bg-white rounded-md border border-gray-200 shadow-2xs">
                  <span className="text-gray-500 block text-[10px]">Membros</span>
                  <span className="font-bold text-gray-900 tabular-nums text-sm">{tableCounts.membros}</span>
                </div>
                <div className="p-2 bg-white rounded-md border border-gray-200 shadow-2xs">
                  <span className="text-gray-500 block text-[10px]">Financeiro</span>
                  <span className="font-bold text-gray-900 tabular-nums text-sm">{tableCounts.financeiro}</span>
                </div>
                <div className="p-2 bg-white rounded-md border border-gray-200 shadow-2xs">
                  <span className="text-gray-500 block text-[10px]">Secretaria</span>
                  <span className="font-bold text-gray-900 tabular-nums text-sm">{tableCounts.secretaria}</span>
                </div>
              </div>
            </div>
          )}

          {/* Formulário de Conexão */}
          <form onSubmit={handleSaveConnection} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Project URL (Supabase)
              </label>
              <Input
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-white"
              />
              <span className="text-[11px] text-gray-400 block mt-1">
                Encontre no Supabase em: <strong>Project Settings &gt; API &gt; Project URL</strong> (ex: https://xyz.supabase.co).
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Anon Public Key
              </label>
              <Input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="bg-white font-mono text-xs"
              />
              <span className="text-[11px] text-gray-400 block mt-1">
                Encontre no Supabase em: <strong>Project Settings &gt; API &gt; Project API keys &gt; anon (public)</strong>.
              </span>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={connecting}
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5 rounded-md font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Link className="h-3.5 w-3.5" />
                <span>{connecting ? 'Conectando...' : 'Salvar & Sincronizar Supabase'}</span>
              </button>

              <Button
                type="button"
                variant="outline"
                disabled={connecting || !url || !key}
                onClick={() => handleTestConnection()}
                className="text-xs flex items-center gap-1.5"
                title="Atualizar dados agora"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${connecting ? 'animate-spin' : ''}`} />
                <span>Verificar</span>
              </Button>

              {url && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDisconnect}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  Desconectar
                </Button>
              )}
            </div>
          </form>

          {/* Dica de Segurança & Dados Reais */}
          <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 text-xs text-blue-900 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              O sistema utiliza exclusivamente os registros reais das tabelas <strong>membros</strong>, <strong>celulas</strong>, <strong>financeiro</strong> e <strong>secretaria</strong> criadas no seu banco de dados Supabase.
            </p>
          </div>
        </div>
      ) : (
        /* Aba Schema SQL */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">
              Estrutura DDL das tabelas no Supabase:
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(sqlSchemaCode);
                setCopiedSchema(true);
                toastSuccess('✅ Sucesso! Operação realizada.');
                setTimeout(() => setCopiedSchema(false), 2000);
              }}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              {copiedSchema ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedSchema ? 'Copiado!' : 'Copiar Schema SQL'}</span>
            </button>
          </div>
          <pre className="p-3 rounded-lg bg-gray-900 text-gray-200 text-[11px] font-mono h-64 overflow-y-auto leading-relaxed select-all">
            {sqlSchemaCode}
          </pre>
        </div>
      )}

      <DialogFooter>
        <Button variant="default" onClick={() => onOpenChange(false)}>
          Concluir
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
