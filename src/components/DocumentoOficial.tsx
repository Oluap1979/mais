import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  SlidersHorizontal,
  Save,
  RotateCcw,
  Church,
  Award,
  Scroll,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
} from 'lucide-react';
import { formatDateLong } from '../lib/utils';
import type { DocumentoSecretaria, UserSession } from '../types/database';
import {
  type IgrejaHeaderConfig,
  getSavedHeaderConfig,
  saveHeaderConfig,
  DEFAULT_HEADER_CONFIG,
} from '../types/documentoConfig';

interface DocumentoOficialProps {
  documento: DocumentoSecretaria;
  user: UserSession | null;
  onClose: () => void;
  onUpdateConteudo?: (novoConteudo: string, novoTitulo?: string) => Promise<void>;
}

export function DocumentoOficial({
  documento,
  user,
  onClose,
  onUpdateConteudo,
}: DocumentoOficialProps) {
  // Carrega configuração salva ou valores padrão baseados no usuário
  const [config, setConfig] = useState<IgrejaHeaderConfig>(() =>
    getSavedHeaderConfig(user?.igreja, user?.nome, user?.cargo)
  );

  useEffect(() => {
    setConfig(getSavedHeaderConfig(user?.igreja, user?.nome, user?.cargo));
  }, [user, documento]);

  const [activeTab, setActiveTab] = useState<'igreja' | 'logo' | 'lideranca' | 'estilo' | 'conteudo'>('igreja');
  const [isEditingPanel, setIsEditingPanel] = useState(false);
  const [hasSavedSuccess, setHasSavedSuccess] = useState(false);

  // Estados para edição rápida do conteúdo do documento
  const [docTitulo, setDocTitulo] = useState(documento.titulo);
  const [docConteudo, setDocConteudo] = useState(documento.conteudo);
  const [isSavingDoc, setIsSavingDoc] = useState(false);

  // Verificação do status de carregamento da imagem da logo
  const [logoLoadStatus, setLogoLoadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!config.logoUrl) {
      setLogoLoadStatus('idle');
      return;
    }
    setLogoLoadStatus('loading');
    const img = new Image();
    img.src = config.logoUrl;
    img.onload = () => setLogoLoadStatus('success');
    img.onerror = () => setLogoLoadStatus('error');
  }, [config.logoUrl]);

  // Data formatada por extenso para documentos oficiais
  const dataFormatada = formatDateLong(documento.data_criacao);

  // Tipo do documento
  const tipoLower = documento.tipo.toLowerCase();
  const isBatismo = tipoLower.includes('batismo');
  const isRecomendacao = tipoLower.includes('recomenda');
  const isApresentacao = tipoLower.includes('apresenta');
  const isCertificado = isBatismo || isApresentacao || tipoLower.includes('certificado') || tipoLower.includes('consagra');

  // Gerador de protocolo oficial único
  const protocoloOficial = `SEC-${new Date(documento.data_criacao || Date.now()).getFullYear()}/${documento.id ? documento.id.slice(0, 6).toUpperCase() : '0019'}`;

  const handlePrint = () => {
    window.print();
  };

  const handleSaveDefault = () => {
    saveHeaderConfig(config);
    setHasSavedSuccess(true);
    setTimeout(() => setHasSavedSuccess(false), 3000);
  };

  const handleResetDefault = () => {
    const res = DEFAULT_HEADER_CONFIG;
    setConfig(res);
    saveHeaderConfig(res);
  };

  const handleSalvarConteudo = async () => {
    if (!onUpdateConteudo) return;
    setIsSavingDoc(true);
    try {
      await onUpdateConteudo(docConteudo, docTitulo);
      setHasSavedSuccess(true);
      setTimeout(() => setHasSavedSuccess(false), 3000);
    } finally {
      setIsSavingDoc(false);
    }
  };

  // Cores do tema selecionado
  const getThemeColors = () => {
    switch (config.temaCor) {
      case 'dourado':
        return {
          primary: '#92400e', // amber-800
          secondary: '#b45309',
          border: '#d97706',
          badgeBg: '#fef3c7',
          badgeText: '#92400e',
          accent: '#b45309',
          watermarkFill: '#b45309',
        };
      case 'borgonha':
        return {
          primary: '#831843', // pink-900 / wine
          secondary: '#9f1239',
          border: '#be123c',
          badgeBg: '#ffe4e6',
          badgeText: '#881337',
          accent: '#9f1239',
          watermarkFill: '#9f1239',
        };
      case 'monocromatico':
        return {
          primary: '#111827', // slate-900
          secondary: '#374151',
          border: '#1f2937',
          badgeBg: '#f3f4f6',
          badgeText: '#111827',
          accent: '#111827',
          watermarkFill: '#111827',
        };
      case 'navy':
      default:
        return {
          primary: '#1e3a8a', // blue-900
          secondary: '#1d4ed8',
          border: '#2563eb',
          badgeBg: '#eff6ff',
          badgeText: '#1e3a8a',
          accent: '#1e3a8a',
          watermarkFill: '#1e3a8a',
        };
    }
  };

  const colors = getThemeColors();

  // Brasão eclesiástico vetorial solene de alta definição (fallback se a igreja não tiver link de imagem)
  const renderBrasaoVetorial = (size: number = 70) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="inline-block shrink-0 drop-shadow-xs"
    >
      {/* Círculo externo com filete duplo */}
      <circle cx="50" cy="50" r="46" stroke={colors.primary} strokeWidth="2.5" />
      <circle cx="50" cy="50" r="42" stroke={colors.secondary} strokeWidth="1" strokeDasharray="3 2" />
      {/* Ramos de Oliveira / Louros */}
      <path
        d="M20 50 C20 68 34 82 50 82 C66 82 80 68 80 50"
        stroke={colors.primary}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Bíblia Sagrada Aberta na base */}
      <path
        d="M32 64 C38 60 46 62 50 65 C54 62 62 60 68 64 L68 70 C62 66 54 68 50 71 C46 68 38 66 32 70 Z"
        fill={colors.primary}
      />
      {/* Cruz Eclesiástica Imponente */}
      <rect x="47" y="20" width="6" height="40" rx="1.5" fill={colors.primary} />
      <rect x="34" y="30" width="32" height="6" rx="1.5" fill={colors.primary} />
      {/* Resplendor sutil */}
      <path d="M50 16 L50 12 M50 28 L50 32" stroke={colors.secondary} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M30 33 L26 33 M70 33 L74 33" stroke={colors.secondary} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-6 print:p-0 print:bg-white print:static print:overflow-visible">
      
      {/* ========================================================= */}
      {/* BARRA DE FERRAMENTAS SUPERIOR (NÃO APARECE NA IMPRESSÃO) */}
      {/* ========================================================= */}
      <aside aria-label="Ações do documento" className="no-print w-full max-w-4xl bg-slate-900/95 border border-slate-800 rounded-2xl px-4 sm:px-6 py-3.5 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3 text-white">
          <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            {isCertificado ? <Award className="h-5 w-5" /> : isRecomendacao ? <Scroll className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">{docTitulo}</h3>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {documento.tipo}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {config.nomeIgreja} &bull; Emissão A4 com Cabeçalho Eclesiástico
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditingPanel(!isEditingPanel)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isEditingPanel
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{isEditingPanel ? 'Ocultar Personalização' : 'Personalizar Cabeçalho & Logo'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-600/25 cursor-pointer active:scale-95"
            title="Imprimir ou Salvar em PDF"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir / Salvar PDF</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar Visualização"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* PAINEL DE PERSONALIZAÇÃO COMPLETO DO CABEÇALHO DA IGREJA */}
      {/* ========================================================= */}
      {isEditingPanel && (
        <section aria-label="Personalização do cabeçalho" className="no-print w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-5 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white">Configuração do Cabeçalho Oficial da Igreja</h4>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Edite os dados, cole o link da Logo da sua igreja e salve como padrão para todos os documentos.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveDefault}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/50 transition-colors cursor-pointer shadow-xs"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Salvar como Padrão da Igreja</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefault}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                title="Restaurar dados originais"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restaurar</span>
              </button>
            </div>
          </div>

          {hasSavedSuccess && (
            <div className="mb-4 p-2.5 rounded-lg bg-emerald-900/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Configuração salva com sucesso! Seu cabeçalho padrão foi atualizado.</span>
            </div>
          )}

          {/* Abas de Configuração */}
          <div className="flex flex-wrap gap-1 border-b border-slate-800 pb-2 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('igreja')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'igreja' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              🏢 1. Dados da Igreja
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('logo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'logo' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span>2. Logo por Link</span>
              {config.logoUrl && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('lideranca')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'lideranca' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              ✍️ 3. Pastor & Secretaria
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('estilo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'estilo' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              🎨 4. Layout & Estilo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('conteudo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'conteudo' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              📝 5. Texto do Documento
            </button>
          </div>

          {/* Conteúdo da Aba 1: Dados da Igreja */}
          {activeTab === 'igreja' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-medium mb-1">Nome da Igreja / Ministério</label>
                <input
                  type="text"
                  value={config.nomeIgreja}
                  onChange={(e) => setConfig({ ...config, nomeIgreja: e.target.value })}
                  placeholder="Ex: Igreja Evangélica Assembleia de Deus"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">CNPJ</label>
                <input
                  type="text"
                  value={config.cnpj}
                  onChange={(e) => setConfig({ ...config, cnpj: e.target.value })}
                  placeholder="00.000.000/0001-00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Subtítulo / Ministério Sede</label>
                <input
                  type="text"
                  value={config.subtitulo}
                  onChange={(e) => setConfig({ ...config, subtitulo: e.target.value })}
                  placeholder="Ex: Ministério Pastoral & Secretaria Geral"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-medium mb-1">Denominação / Convenção Filiada</label>
                <input
                  type="text"
                  value={config.denominacao}
                  onChange={(e) => setConfig({ ...config, denominacao: e.target.value })}
                  placeholder="Ex: Filiada à Convenção Geral das Assembleias de Deus - CGADB"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-medium mb-1">Endereço (Rua, Número e Bairro)</label>
                <input
                  type="text"
                  value={config.endereco}
                  onChange={(e) => setConfig({ ...config, endereco: e.target.value })}
                  placeholder="Ex: Rua das Flores, 500 - Bairro Central"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Cidade - UF</label>
                <input
                  type="text"
                  value={config.cidadeEstado}
                  onChange={(e) => setConfig({ ...config, cidadeEstado: e.target.value })}
                  placeholder="Ex: Belo Horizonte - MG"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={config.telefone}
                  onChange={(e) => setConfig({ ...config, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">E-mail Oficial</label>
                <input
                  type="text"
                  value={config.email}
                  onChange={(e) => setConfig({ ...config, email: e.target.value })}
                  placeholder="secretaria@igreja.com.br"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Website / Redes Sociais</label>
                <input
                  type="text"
                  value={config.website}
                  onChange={(e) => setConfig({ ...config, website: e.target.value })}
                  placeholder="www.igreja.org.br"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Conteúdo da Aba 2: Logo por Link */}
          {activeTab === 'logo' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                    <LinkIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-white text-sm">Link / URL da Logo da Igreja</h5>
                    <p className="text-slate-400 mt-1 leading-relaxed">
                      Cole o link direto da imagem da logo da sua congregação (PNG transparente, JPG, SVG ou WebP hospedado na internet, como Imgur, Cloudinary, site oficial da igreja, etc.).
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={config.logoUrl}
                      onChange={(e) => setConfig({ ...config, logoUrl: e.target.value })}
                      placeholder="https://exemplo.com/logo-da-minha-igreja.png"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500 pr-9 font-mono text-xs"
                    />
                    {config.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, logoUrl: '' })}
                        className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                        title="Limpar link"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Status do link da logo */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {config.logoUrl ? (
                      logoLoadStatus === 'success' ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                          <CheckCircle2 className="h-4 w-4" /> Imagem carregada com sucesso!
                        </span>
                      ) : logoLoadStatus === 'error' ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
                          <AlertCircle className="h-4 w-4" /> Imagem não pôde ser carregada pelo link. Usando brasão como alternativa.
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-blue-400">
                          Carregando pré-visualização...
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400 italic">
                        Nenhum link informado. O documento exibirá o Brasão Eclesiástico Solene padrão.
                      </span>
                    )}
                  </div>

                  {config.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, logoUrl: '' })}
                      className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
                    >
                      Remover e usar Brasão
                    </button>
                  )}
                </div>
              </div>

              {/* Ajuste de Tamanho e Pré-visualização da Logo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4">
                  <label className="block text-slate-300 font-semibold mb-2">
                    Altura da Logo no Documento: <span className="text-blue-400">{config.logoHeight}px</span>
                  </label>
                  <input
                    type="range"
                    min="40"
                    max="110"
                    step="4"
                    value={config.logoHeight}
                    onChange={(e) => setConfig({ ...config, logoHeight: Number(e.target.value) })}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Compacto (40px)</span>
                    <span>Padrão (68px)</span>
                    <span>Destaque (110px)</span>
                  </div>
                </div>

                {/* Pré-visualização ao vivo da Logo */}
                <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center min-h-[100px] border border-slate-200 shadow-inner">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
                    Pré-visualização no Cabeçalho
                  </span>
                  {config.logoUrl && logoLoadStatus === 'success' ? (
                    <img
                      src={config.logoUrl}
                      alt="Logo da Igreja"
                      style={{ height: `${config.logoHeight}px` }}
                      className="max-w-[200px] object-contain drop-shadow-xs"
                    />
                  ) : (
                    renderBrasaoVetorial(config.logoHeight)
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo da Aba 3: Liderança & Assinaturas */}
          {activeTab === 'lideranca' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Church className="h-4 w-4 text-blue-400" />
                  <span>Pastor Presidente / Titular</span>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={config.nomePastor}
                    onChange={(e) => setConfig({ ...config, nomePastor: e.target.value })}
                    placeholder="Pr. João Carlos"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Cargo / Título Ministerial</label>
                  <input
                    type="text"
                    value={config.cargoPastor}
                    onChange={(e) => setConfig({ ...config, cargoPastor: e.target.value })}
                    placeholder="Pastor Titular / Presidente"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Registro de Ministro (CGADB / OMEB / CBB)</label>
                  <input
                    type="text"
                    value={config.registroPastor}
                    onChange={(e) => setConfig({ ...config, registroPastor: e.target.value })}
                    placeholder="Reg. Nº 34.210"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Scroll className="h-4 w-4 text-indigo-400" />
                  <span>Secretaria Geral</span>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Nome do(a) Secretário(a)</label>
                  <input
                    type="text"
                    value={config.nomeSecretario}
                    onChange={(e) => setConfig({ ...config, nomeSecretario: e.target.value })}
                    placeholder="Irmã Ana Maria"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Cargo</label>
                  <input
                    type="text"
                    value={config.cargoSecretario}
                    onChange={(e) => setConfig({ ...config, cargoSecretario: e.target.value })}
                    placeholder="Secretária Geral Eclesiástica"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo da Aba 4: Layout & Estilo */}
          {activeTab === 'estilo' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
                <label className="block text-slate-300 font-semibold">Estilo do Cabeçalho Timbrado</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, estiloCabecalho: 'moderno' })}
                    className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                      config.estiloCabecalho === 'moderno'
                        ? 'border-blue-500 bg-blue-900/40 text-white font-semibold'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span>Moderno</span>
                    <span className="block text-[10px] text-slate-400 font-normal">Logo ao lado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, estiloCabecalho: 'centralizado' })}
                    className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                      config.estiloCabecalho === 'centralizado'
                        ? 'border-blue-500 bg-blue-900/40 text-white font-semibold'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span>Centralizado</span>
                    <span className="block text-[10px] text-slate-400 font-normal">Solenidade</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, estiloCabecalho: 'classico' })}
                    className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                      config.estiloCabecalho === 'classico'
                        ? 'border-blue-500 bg-blue-900/40 text-white font-semibold'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span>Tradicional</span>
                    <span className="block text-[10px] text-slate-400 font-normal">Filete duplo</span>
                  </button>
                </div>

                <div className="pt-2">
                  <label className="block text-slate-300 font-semibold mb-2">Tema de Cores Eclesiásticas</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'navy', label: 'Azul Nobre', bg: 'bg-blue-900' },
                      { id: 'dourado', label: 'Ouro Imperial', bg: 'bg-amber-800' },
                      { id: 'borgonha', label: 'Vinho Real', bg: 'bg-rose-950' },
                      { id: 'monocromatico', label: 'Preto Clássico', bg: 'bg-slate-900' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setConfig({ ...config, temaCor: t.id as any })}
                        className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer ${
                          config.temaCor === t.id
                            ? 'border-white text-white font-semibold bg-slate-800'
                            : 'border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${t.bg} border border-slate-600`} />
                        <span className="text-[11px]">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-4">
                <label className="block text-slate-300 font-semibold">Elementos de Segurança Eclesiástica</label>
                
                <label className="flex items-center gap-3 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.marcaDagua}
                    onChange={(e) => setConfig({ ...config, marcaDagua: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                  />
                  <div>
                    <span className="font-semibold block">Marca d'Água Centralizada</span>
                    <span className="text-slate-400 text-[11px]">Emblema translúcido suave ao fundo da página A4</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.seloChancelaria}
                    onChange={(e) => setConfig({ ...config, seloChancelaria: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                  />
                  <div>
                    <span className="font-semibold block">Selo de Chancelaria & Registro</span>
                    <span className="text-slate-400 text-[11px]">Chancela formal no rodapé com número de protocolo e carimbo</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Conteúdo da Aba 5: Texto do Documento */}
          {activeTab === 'conteudo' && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Título do Documento</label>
                <input
                  type="text"
                  value={docTitulo}
                  onChange={(e) => setDocTitulo(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Teor do Documento (Corpo do Texto)</label>
                <textarea
                  value={docConteudo}
                  onChange={(e) => setDocConteudo(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-blue-500 font-sans leading-relaxed text-xs"
                />
              </div>

              {onUpdateConteudo && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSalvarConteudo}
                    disabled={isSavingDoc}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{isSavingDoc ? 'Salvando...' : 'Salvar Alterações no Documento'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* FOLHA OFICIAL A4 PARA IMPRESSÃO (PERFEITA VISUALIZAÇÃO E PADRÃO GRÁFICO)  */}
      {/* ========================================================================= */}
      <main
        className="documento-oficial-print w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-2xl rounded-xs p-10 sm:p-14 relative flex flex-col justify-between select-text print:shadow-none print:m-0 print:p-8 print:w-full print:max-w-none print:min-h-0 overflow-hidden"
        style={{ fontFamily: "'Cinzel', 'Times New Roman', 'Georgia', serif" }}
      >
        {/* Marca d'Água Central translúcida de segurança */}
        {config.marcaDagua && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.035]">
            {config.logoUrl && logoLoadStatus === 'success' ? (
              <img
                src={config.logoUrl}
                alt="Marca d'água"
                className="w-96 h-96 object-contain grayscale"
              />
            ) : (
              <svg width="420" height="420" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="45" stroke="#000" strokeWidth="2" />
                <rect x="47" y="15" width="6" height="70" fill="#000" />
                <rect x="25" y="35" width="50" height="6" fill="#000" />
              </svg>
            )}
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* CASO A: CERTIFICADO DE BATISMO / APRESENTAÇÃO / HONRA (ESTILO DIPLOMA) */}
        {/* ----------------------------------------------------------------------- */}
        {isCertificado ? (
          <div className="relative z-10 h-full border-[8px] border-double p-8 sm:p-12 flex flex-col justify-between bg-gradient-to-b from-amber-50/20 via-white to-amber-50/20"
            style={{ borderColor: colors.primary }}
          >
            {/* Cantoneiras Eclesiásticas Ornamentais em SVG */}
            <div className="absolute top-2 left-2 w-8 h-8 pointer-events-none" style={{ color: colors.primary }}>
              <svg viewBox="0 0 40 40" fill="currentColor">
                <path d="M0 0 L40 0 L40 6 L6 6 L6 40 L0 40 Z M12 12 L30 12 L30 16 L16 16 L16 30 L12 30 Z" />
              </svg>
            </div>
            <div className="absolute top-2 right-2 w-8 h-8 pointer-events-none" style={{ color: colors.primary }}>
              <svg viewBox="0 0 40 40" fill="currentColor" className="rotate-90">
                <path d="M0 0 L40 0 L40 6 L6 6 L6 40 L0 40 Z M12 12 L30 12 L30 16 L16 16 L16 30 L12 30 Z" />
              </svg>
            </div>
            <div className="absolute bottom-2 left-2 w-8 h-8 pointer-events-none" style={{ color: colors.primary }}>
              <svg viewBox="0 0 40 40" fill="currentColor" className="-rotate-90">
                <path d="M0 0 L40 0 L40 6 L6 6 L6 40 L0 40 Z M12 12 L30 12 L30 16 L16 16 L16 30 L12 30 Z" />
              </svg>
            </div>
            <div className="absolute bottom-2 right-2 w-8 h-8 pointer-events-none" style={{ color: colors.primary }}>
              <svg viewBox="0 0 40 40" fill="currentColor" className="rotate-180">
                <path d="M0 0 L40 0 L40 6 L6 6 L6 40 L0 40 Z M12 12 L30 12 L30 16 L16 16 L16 30 L12 30 Z" />
              </svg>
            </div>

            {/* Cabeçalho do Certificado Solene */}
            <div className="text-center pt-2">
              <div className="flex justify-center mb-3">
                {config.logoUrl && logoLoadStatus === 'success' ? (
                  <img
                    src={config.logoUrl}
                    alt={`Logo Oficial - ${config.nomeIgreja}`}
                    style={{ height: `${config.logoHeight}px` }}
                    className="max-w-[220px] object-contain drop-shadow-sm"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    loading="eager"
                  />
                ) : (
                  renderBrasaoVetorial(config.logoHeight)
                )}
              </div>

              <h1
                className="text-xl sm:text-2xl font-bold uppercase tracking-[0.18em]"
                style={{ color: colors.primary }}
              >
                {config.nomeIgreja}
              </h1>

              {config.denominacao && (
                <p className="text-[10px] tracking-widest uppercase text-slate-600 font-medium mt-1">
                  {config.denominacao}
                </p>
              )}

              <p className="text-[10px] tracking-widest uppercase text-slate-600 font-medium mt-0.5">
                {config.subtitulo}
              </p>

              {config.endereco && (
                <p className="text-[9.5px] tracking-wide text-slate-500 font-medium mt-0.5">
                  {config.endereco}
                  {config.bairro ? ` • ${config.bairro}` : ''}
                  {config.cidadeEstado ? ` • ${config.cidadeEstado}` : ''}
                  {config.cep ? ` • CEP: ${config.cep}` : ''}
                </p>
              )}

              {/* Filete ornamental com losango central */}
              <div className="flex items-center justify-center gap-3 my-4">
                <div className="h-[1.5px] w-20" style={{ backgroundColor: colors.border }} />
                <span style={{ color: colors.primary }} className="text-sm">❖</span>
                <div className="h-[1.5px] w-20" style={{ backgroundColor: colors.border }} />
              </div>

              {/* Título do Certificado em Destaque Monumental */}
              <h2
                className="text-2xl sm:text-3xl font-black uppercase tracking-wider my-2"
                style={{ color: colors.primary }}
              >
                {docTitulo}
              </h2>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">
                REGISTRO OFICIAL: {protocoloOficial}
              </span>
            </div>

            {/* Corpo do Certificado */}
            <div className="my-8 text-center max-w-xl mx-auto px-4">
              <p className="text-base sm:text-lg leading-relaxed text-slate-800 text-justify sm:text-center font-normal">
                {docConteudo}
              </p>

              {/* Versículo bíblico solene de bênção */}
              <div className="mt-8 pt-5 border-t border-slate-200">
                <p className="text-xs sm:text-sm italic text-slate-600 leading-relaxed font-serif">
                  {isBatismo ? (
                    <>
                      &ldquo;Portanto ide, fazei discípulos de todas as nações, batizando-os em nome do Pai, e do Filho, e do Espírito Santo; ensinando-os a guardar todas as coisas que eu vos tenho mandado.&rdquo;
                      <span className="block mt-1 font-bold not-italic tracking-wider text-slate-800 text-xs">
                        — MATEUS 28:19-20
                      </span>
                    </>
                  ) : isApresentacao ? (
                    <>
                      &ldquo;Ensina a criança no caminho em que deve andar, e, ainda quando for velho, não se desviará dele.&rdquo;
                      <span className="block mt-1 font-bold not-italic tracking-wider text-slate-800 text-xs">
                        — PROVÉRBIOS 22:6
                      </span>
                    </>
                  ) : (
                    <>
                      &ldquo;O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti e tenha misericórdia de ti; o Senhor sobre ti levante o seu rosto e te dê a paz.&rdquo;
                      <span className="block mt-1 font-bold not-italic tracking-wider text-slate-800 text-xs">
                        — NÚMEROS 6:24-26
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Rodapé: Local, Data e Assinaturas Formais */}
            <div className="pt-4">
              <p className="text-center text-xs text-slate-700 mb-8">
                Dado e passado em <span className="font-semibold">{config.cidadeEstado}</span>, aos{' '}
                <span className="font-semibold">{dataFormatada}</span>.
              </p>

              <div className="grid grid-cols-2 gap-8 max-w-lg mx-auto text-center items-end">
                <div>
                  <div className="border-b border-slate-900 w-full mb-1.5" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-900">{config.nomePastor}</p>
                  <p className="text-[10px] uppercase text-slate-600">{config.cargoPastor}</p>
                  {config.registroPastor && (
                    <p className="text-[9px] text-slate-500 font-mono">{config.registroPastor}</p>
                  )}
                </div>

                <div>
                  <div className="border-b border-slate-900 w-full mb-1.5" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-900">{config.nomeSecretario}</p>
                  <p className="text-[10px] uppercase text-slate-600">{config.cargoSecretario}</p>
                  <p className="text-[9px] text-slate-500 font-mono">Secretaria Geral</p>
                </div>
              </div>

              {/* Selo de Chancelaria e Autenticação */}
              {config.seloChancelaria && (
                <div className="mt-8 flex items-center justify-between border-t border-slate-200/80 pt-3 text-[9px] text-slate-500 font-mono uppercase tracking-wider">
                  <span>{config.nomeIgreja} &bull; Documento Oficial Registrado</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }} />
                    <span>Chancela Eclesiástica Válida</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ----------------------------------------------------------------------- */
          /* CASO B: PAPEL TIMBRADO EXECUTIVO (RECOMENDAÇÃO, ATA, OFÍCIO, DECLARAÇÃO)*/
          /* ----------------------------------------------------------------------- */
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              {/* Cabeçalho Timbrado de Acordo com o Estilo Selecionado */}
              {config.estiloCabecalho === 'centralizado' ? (
                /* Estilo Centralizado Clássico */
                <header className="text-center border-b-2 pb-5 mb-8" style={{ borderColor: colors.primary }}>
                  <div className="flex justify-center mb-2.5">
                    {config.logoUrl && logoLoadStatus === 'success' ? (
                      <img
                        src={config.logoUrl}
                        alt={`Logo Oficial - ${config.nomeIgreja}`}
                        style={{ height: `${config.logoHeight}px` }}
                        className="max-w-[240px] object-contain drop-shadow-xs"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        loading="eager"
                      />
                    ) : (
                      renderBrasaoVetorial(config.logoHeight)
                    )}
                  </div>

                  <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-slate-950" style={{ color: colors.primary }}>
                    {config.nomeIgreja}
                  </h1>

                  {config.subtitulo && (
                    <p className="text-xs uppercase tracking-wider text-slate-700 font-semibold mt-0.5">
                      {config.subtitulo}
                    </p>
                  )}

                  {config.denominacao && (
                    <p className="text-[10.5px] uppercase tracking-widest text-slate-600 font-medium mt-0.5">
                      {config.denominacao}
                    </p>
                  )}

                  <p className="text-[10px] uppercase tracking-wider text-slate-600 mt-1 font-medium">
                    {config.endereco}
                    {config.bairro ? ` • ${config.bairro}` : ''}
                    {config.cidadeEstado ? ` • ${config.cidadeEstado}` : ''}
                    {config.cep ? ` • CEP ${config.cep}` : ''}
                  </p>

                  <p className="text-[9.5px] text-slate-500 mt-0.5">
                    {config.cnpj ? `CNPJ: ${config.cnpj} • ` : ''}Tel: {config.telefone} &bull; {config.email}
                  </p>
                </header>
              ) : (
                /* Estilo Moderno Executivo (Padrão) */
                <header className="border-b-2 pb-5 mb-8" style={{ borderColor: colors.primary }}>
                  <div className="flex items-start justify-between gap-4">
                    {/* Lado Esquerdo: Logo + Identificação da Igreja */}
                    <div className="flex items-center gap-4">
                      {config.logoUrl && logoLoadStatus === 'success' ? (
                        <img
                          src={config.logoUrl}
                          alt={`Logo - ${config.nomeIgreja}`}
                          style={{ height: `${config.logoHeight}px`, maxHeight: '85px' }}
                          className="max-w-[180px] object-contain shrink-0 drop-shadow-xs"
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                          loading="eager"
                        />
                      ) : (
                        renderBrasaoVetorial(config.logoHeight)
                      )}

                      <div className="flex flex-col justify-center">
                        <h1 className="text-lg sm:text-xl font-bold uppercase tracking-wider leading-tight text-slate-950" style={{ color: colors.primary }}>
                          {config.nomeIgreja}
                        </h1>
                        <p className="text-[11px] uppercase tracking-wider text-slate-700 font-semibold mt-0.5">
                          {config.subtitulo}
                        </p>
                        {config.denominacao && (
                          <p className="text-[10px] text-slate-500 italic mt-0.5">
                            {config.denominacao}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-600 font-medium mt-1 leading-snug">
                          {config.endereco}
                          {config.bairro ? ` • ${config.bairro}` : ''}
                          {config.cidadeEstado ? ` • ${config.cidadeEstado}` : ''}
                          {config.cep ? ` • CEP: ${config.cep}` : ''}
                        </p>
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          {config.cnpj ? `CNPJ: ${config.cnpj} • ` : ''}Contato: {config.telefone} &bull; {config.email}
                        </p>
                      </div>
                    </div>

                    {/* Lado Direito: Caixa de Protocolo e Referência */}
                    <div className="text-right shrink-0">
                      <div
                        className="inline-block px-3 py-1 rounded text-[10px] font-bold tracking-wider uppercase border"
                        style={{
                          backgroundColor: colors.badgeBg,
                          color: colors.badgeText,
                          borderColor: colors.border,
                        }}
                      >
                        {documento.tipo}
                      </div>
                      <p className="text-[10px] text-slate-600 font-mono mt-1 font-semibold">
                        Nº {protocoloOficial}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        Emissão: {new Date(documento.data_criacao || Date.now()).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </header>
              )}

              {/* Título Principal do Documento */}
              <div className="text-center my-6">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-950 uppercase tracking-wide" style={{ color: colors.primary }}>
                  {docTitulo}
                </h2>
                <div className="w-16 h-[2px] mx-auto mt-2" style={{ backgroundColor: colors.border }} />
              </div>

              {/* Vocativo / Saudação Pastoral solene para cartas de recomendação e ofícios */}
              {isRecomendacao && (
                <div className="mb-6 text-sm text-slate-800 leading-relaxed font-serif">
                  <p className="font-bold text-slate-950 mb-1">
                    À Amada Igreja do Senhor Jesus Cristo e ao seu Mui Digno Ministério Pastoral,
                  </p>
                  <p className="italic text-slate-700">
                    &ldquo;A graça e a paz de nosso Senhor e Salvador Jesus Cristo sejam convosco.&rdquo;
                  </p>
                </div>
              )}

              {/* Corpo do Documento com Diagramação Tipográfica de Cartório / Eclesiástica */}
              <div className="text-sm sm:text-base leading-relaxed text-slate-800 text-justify whitespace-pre-wrap space-y-4 indent-8 font-normal">
                {docConteudo}
              </div>

              {/* Encerramento Fraterno */}
              {isRecomendacao && (
                <div className="mt-8 text-sm text-slate-800 font-serif">
                  <p>Sem mais para o momento, renovamos nossos protestos de fraterna estima cristã e apreço no Senhor.</p>
                  <p className="mt-2 font-bold italic text-slate-900">Fraternalmente em Cristo Jesus,</p>
                </div>
              )}
            </div>

            {/* Rodapé Oficial com Datação e Bloco de Assinaturas */}
            <div className="pt-8 mt-10 border-t border-slate-200">
              <p className="text-center text-xs text-slate-700 mb-10">
                Dado e passado na Secretaria Geral em <span className="font-semibold">{config.cidadeEstado}</span>, aos{' '}
                <span className="font-semibold">{dataFormatada}</span>.
              </p>

              <div className="grid grid-cols-2 gap-10 max-w-lg mx-auto text-center items-end">
                <div>
                  <div className="border-b border-slate-900 w-full mb-1.5" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-900">{config.nomePastor}</p>
                  <p className="text-[10px] uppercase text-slate-600">{config.cargoPastor}</p>
                  {config.registroPastor && (
                    <p className="text-[9px] text-slate-500 font-mono">{config.registroPastor}</p>
                  )}
                </div>

                <div>
                  <div className="border-b border-slate-900 w-full mb-1.5" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-900">{config.nomeSecretario}</p>
                  <p className="text-[10px] uppercase text-slate-600">{config.cargoSecretario}</p>
                  <p className="text-[9px] text-slate-500 font-mono">Secretaria Eclesiástica</p>
                </div>
              </div>

              {/* Linha de Autenticidade e Rodapé */}
              <div className="mt-10 pt-3 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400 uppercase tracking-widest font-mono">
                <span>{config.nomeIgreja} &bull; {protocoloOficial}</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.primary }} />
                  <span>Documento Chancelado e Autêntico</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
