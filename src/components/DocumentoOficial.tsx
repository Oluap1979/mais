import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  FileDown,
  LayoutTemplate,
  Maximize2,
  Minimize2,
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
  autoPrint?: boolean;
}

export function DocumentoOficial({
  documento,
  user,
  onClose,
  onUpdateConteudo,
  autoPrint = false,
}: DocumentoOficialProps) {
  // Carrega configuração salva da igreja
  const [config, setConfig] = useState<IgrejaHeaderConfig>(() =>
    getSavedHeaderConfig(user?.igreja, user?.nome, user?.cargo)
  );

  useEffect(() => {
    setConfig(getSavedHeaderConfig(user?.igreja, user?.nome, user?.cargo));
  }, [user, documento]);

  // Bloqueia rolagem do fundo e adiciona classe para isolamento total de impressão
  useEffect(() => {
    document.body.classList.add('documento-modal-aberto');
    return () => {
      document.body.classList.remove('documento-modal-aberto');
    };
  }, []);

  const [activeTab, setActiveTab] = useState<'igreja' | 'logo' | 'lideranca' | 'estilo' | 'conteudo'>('igreja');
  const [isEditingPanel, setIsEditingPanel] = useState(false);
  const [hasSavedSuccess, setHasSavedSuccess] = useState(false);

  // Estados para edição rápida do conteúdo do documento
  const [docTitulo, setDocTitulo] = useState(documento.titulo);
  const [docConteudo, setDocConteudo] = useState(documento.conteudo);
  const [isSavingDoc, setIsSavingDoc] = useState(false);

  // Tipo do documento
  const tipoLower = documento.tipo.toLowerCase();
  const isBatismo = tipoLower.includes('batismo');
  const isRecomendacao = tipoLower.includes('recomenda');
  const isApresentacao = tipoLower.includes('apresenta');
  const isCertificado = isBatismo || isApresentacao || tipoLower.includes('certificado') || tipoLower.includes('consagra');

  // Ajuste de Orientação (Retrato ou Paisagem)
  // Certificados iniciam preferencialmente em Paisagem (diploma) ou Retrato
  const [orientacao, setOrientacao] = useState<'retrato' | 'paisagem'>(() =>
    isCertificado ? 'paisagem' : 'retrato'
  );

  // Ajuste de Escala / Densidade de Texto (Compacto, Padrão, Ampliado) para caber perfeitamente em 1 página
  const [escala, setEscala] = useState<'compacto' | 'padrao' | 'ampliado'>('padrao');

  // Verificação de carregamento da imagem da logo
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

  // Se solicitado autoPrint (ex: clique no ícone rápido da listagem)
  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  // Data formatada por extenso para documentos oficiais
  const dataFormatada = formatDateLong(documento.data_criacao);

  // Gerador de protocolo oficial único
  const anoDoc = new Date(documento.data_criacao || Date.now()).getFullYear();
  const codDoc = documento.id ? documento.id.slice(0, 6).toUpperCase() : '0019';
  const protocoloOficial = `SEC-${anoDoc}/${codDoc}`;

  const handlePrint = () => {
    window.scrollTo(0, 0);
    setTimeout(() => {
      window.print();
    }, 120);
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
          primary: '#854d0e', // amber-800
          secondary: '#b45309',
          border: '#d97706',
          badgeBg: '#fef3c7',
          badgeText: '#78350f',
          accent: '#b45309',
        };
      case 'borgonha':
        return {
          primary: '#831843', // pink-900 / wine
          secondary: '#9f1239',
          border: '#be123c',
          badgeBg: '#ffe4e6',
          badgeText: '#881337',
          accent: '#9f1239',
        };
      case 'monocromatico':
        return {
          primary: '#0f172a', // slate-900
          secondary: '#334155',
          border: '#1e293b',
          badgeBg: '#f1f5f9',
          badgeText: '#0f172a',
          accent: '#0f172a',
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
        };
    }
  };

  const colors = getThemeColors();

  // Brasão eclesiástico vetorial solene em alta definição (fallback se a igreja não tiver link de imagem)
  const renderBrasaoVetorial = (size: number = 70) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="inline-block shrink-0 drop-shadow-xs"
    >
      <circle cx="50" cy="50" r="46" stroke={colors.primary} strokeWidth="2.5" />
      <circle cx="50" cy="50" r="42" stroke={colors.secondary} strokeWidth="1" strokeDasharray="3 2" />
      <path
        d="M20 50 C20 68 34 82 50 82 C66 82 80 68 80 50"
        stroke={colors.primary}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M32 64 C38 60 46 62 50 65 C54 62 62 60 68 64 L68 70 C62 66 54 68 50 71 C46 68 38 66 32 70 Z"
        fill={colors.primary}
      />
      <rect x="47" y="20" width="6" height="40" rx="1.5" fill={colors.primary} />
      <rect x="34" y="30" width="32" height="6" rx="1.5" fill={colors.primary} />
      <path d="M50 16 L50 12 M50 28 L50 32" stroke={colors.secondary} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M30 33 L26 33 M70 33 L74 33" stroke={colors.secondary} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );

  // Divide o texto do documento em parágrafos formatados canonicamente
  const paragrafosConteudo = docConteudo
    ? docConteudo
        .split('\n')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    : [];

  const modalContent = (
    <div className="documento-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-6 print:p-0 print:bg-white print:static print:overflow-visible">
      
      {/* ========================================================= */}
      {/* BARRA DE FERRAMENTAS SUPERIOR (NUNCA SAI NA IMPRESSÃO)    */}
      {/* ========================================================= */}
      <aside
        aria-label="Ações do documento"
        className="no-print w-full max-w-5xl bg-slate-900/95 border border-slate-800 rounded-2xl px-4 sm:px-6 py-3 mb-3 flex flex-wrap items-center justify-between gap-3 shadow-2xl backdrop-blur-md"
      >
        <div className="flex items-center gap-3 text-white">
          <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
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
              {config.nomeIgreja} &bull; Folha Oficial A4 ({orientacao === 'paisagem' ? 'Paisagem' : 'Retrato'})
            </p>
          </div>
        </div>

        {/* Controles de Formatação & Ações */}
        <div className="flex items-center flex-wrap gap-2">
          
          {/* Seletor de Orientação (Retrato / Paisagem) */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => setOrientacao('retrato')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                orientacao === 'retrato'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="A4 Retrato (Vertical - padrão para cartas e ofícios)"
            >
              Retrato
            </button>
            <button
              type="button"
              onClick={() => setOrientacao('paisagem')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                orientacao === 'paisagem'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="A4 Paisagem (Horizontal - ideal para certificados e diplomas)"
            >
              Paisagem
            </button>
          </div>

          {/* Ajuste de Escala / Tamanho do Texto para caber perfeitamente em 1 página */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1 text-xs">
            <span className="text-[10px] text-slate-400 px-2 font-medium">Tamanho:</span>
            <button
              type="button"
              onClick={() => setEscala('compacto')}
              className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                escala === 'compacto'
                  ? 'bg-slate-700 text-blue-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Compacto (para textos longos caberem em 1 página)"
            >
              Compacto
            </button>
            <button
              type="button"
              onClick={() => setEscala('padrao')}
              className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                escala === 'padrao'
                  ? 'bg-slate-700 text-blue-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Padrão"
            >
              Padrão
            </button>
            <button
              type="button"
              onClick={() => setEscala('ampliado')}
              className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                escala === 'ampliado'
                  ? 'bg-slate-700 text-blue-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Ampliado (para certificados preencherem bem a página)"
            >
              Ampliado
            </button>
          </div>

          {/* Botão Personalizar Cabeçalho */}
          <button
            type="button"
            onClick={() => setIsEditingPanel(!isEditingPanel)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isEditingPanel
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isEditingPanel ? 'Fechar Painel' : 'Personalizar'}</span>
          </button>

          {/* Botão Imprimir / Salvar PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-600/30 cursor-pointer active:scale-95"
            title="Imprimir ou Salvar em PDF oficial"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir / Salvar PDF</span>
          </button>

          {/* Fechar Visualização */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </aside>

      {/* Dica amigável de impressão / geração de PDF */}
      <div className="no-print w-full max-w-5xl mb-3 px-4 py-2 rounded-xl bg-blue-950/60 border border-blue-800/50 text-[11px] text-blue-200 flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-blue-400 shrink-0" />
          <span>
            <strong>Dica para o PDF perfeito:</strong> Na janela de impressão do seu navegador, escolha a impressora <strong>&ldquo;Salvar como PDF&rdquo;</strong> e certifique-se de marcar a opção <strong>&ldquo;Gráficos de segundo plano&rdquo;</strong> para manter brasões e molduras em alta fidelidade.
          </span>
        </div>
        <span className="text-[10px] text-blue-300/80 font-mono hidden md:inline shrink-0">
          A4 Oficial (210×297mm)
        </span>
      </div>

      {/* ========================================================= */}
      {/* PAINEL DE PERSONALIZAÇÃO DO CABEÇALHO DA IGREJA           */}
      {/* ========================================================= */}
      {isEditingPanel && (
        <section
          aria-label="Personalização do cabeçalho"
          className="no-print w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-5 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white">Configuração da Identidade da Igreja</h4>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Altere nome, logotipo, endereço, liderança e cores oficiais. Tudo é salvo para os próximos documentos.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveDefault}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/50 transition-colors cursor-pointer shadow-xs"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Salvar como Padrão</span>
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
              <span>Configuração salva com sucesso! Os próximos documentos usarão esse cabeçalho.</span>
            </div>
          )}

          {/* Abas */}
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
              <span>2. Logotipo da Igreja</span>
              {config.logoUrl && <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />}
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
              🎨 4. Estilo & Cores
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('conteudo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'conteudo' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              📝 5. Editar Texto
            </button>
          </div>

          {/* Aba 1: Dados da Igreja */}
          {activeTab === 'igreja' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-medium mb-1">Nome da Igreja / Ministério</label>
                <input
                  type="text"
                  value={config.nomeIgreja}
                  onChange={(e) => setConfig({ ...config, nomeIgreja: e.target.value })}
                  placeholder="Ex: Igreja Evangélica Comunidade da Fé"
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
                <label className="block text-slate-300 font-medium mb-1">Subtítulo / Ministério</label>
                <input
                  type="text"
                  value={config.subtitulo}
                  onChange={(e) => setConfig({ ...config, subtitulo: e.target.value })}
                  placeholder="Ex: Ministério Pastoral & Secretaria Geral"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-medium mb-1">Denominação / Convenção</label>
                <input
                  type="text"
                  value={config.denominacao}
                  onChange={(e) => setConfig({ ...config, denominacao: e.target.value })}
                  placeholder="Ex: Filiada à Convenção Geral"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-medium mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={config.endereco}
                  onChange={(e) => setConfig({ ...config, endereco: e.target.value })}
                  placeholder="Ex: Av. Central, 1000 - Centro"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Cidade - UF</label>
                <input
                  type="text"
                  value={config.cidadeEstado}
                  onChange={(e) => setConfig({ ...config, cidadeEstado: e.target.value })}
                  placeholder="Ex: São Paulo - SP"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={config.telefone}
                  onChange={(e) => setConfig({ ...config, telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">E-mail Oficial</label>
                <input
                  type="text"
                  value={config.email}
                  onChange={(e) => setConfig({ ...config, email: e.target.value })}
                  placeholder="secretaria@igreja.org"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Aba 2: Logo */}
          {activeTab === 'logo' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                    <LinkIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-white text-sm">Link / URL da Imagem da Logo</h5>
                    <p className="text-slate-400 mt-1 leading-relaxed">
                      Insira o link direto de imagem (PNG transparente, JPG, SVG ou WebP) hospedada na web.
                    </p>
                  </div>
                </div>

                <div className="mt-4 relative">
                  <input
                    type="url"
                    value={config.logoUrl}
                    onChange={(e) => setConfig({ ...config, logoUrl: e.target.value })}
                    placeholder="https://exemplo.com/logo-igreja.png"
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

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {config.logoUrl ? (
                      logoLoadStatus === 'success' ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                          <CheckCircle2 className="h-4 w-4" /> Imagem carregada perfeitamente!
                        </span>
                      ) : logoLoadStatus === 'error' ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
                          <AlertCircle className="h-4 w-4" /> Link inválido ou bloqueado. Usando Brasão Vetorial.
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-blue-400">
                          Testando imagem...
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400 italic">
                        Sem URL informada. Usando o Brasão Eclesiástico Solene padrão.
                      </span>
                    )}
                  </div>

                  {config.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, logoUrl: '' })}
                      className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
                    >
                      Usar Brasão Padrão
                    </button>
                  )}
                </div>
              </div>

              {/* Altura da Logo e Pré-visualização */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4">
                  <label className="block text-slate-300 font-semibold mb-2">
                    Altura da Imagem: <span className="text-blue-400">{config.logoHeight}px</span>
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

                <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center min-h-[90px] border border-slate-200">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
                    Prévia do Cabeçalho
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

          {/* Aba 3: Liderança */}
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
                  <label className="block text-slate-400 mb-1">Cargo / Ministério</label>
                  <input
                    type="text"
                    value={config.cargoPastor}
                    onChange={(e) => setConfig({ ...config, cargoPastor: e.target.value })}
                    placeholder="Pastor Presidente Titular"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Registro Pastoral</label>
                  <input
                    type="text"
                    value={config.registroPastor}
                    onChange={(e) => setConfig({ ...config, registroPastor: e.target.value })}
                    placeholder="Reg. Nº 12.345"
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
                    placeholder="Secretária Eclesiástica"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Cargo / Título</label>
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

          {/* Aba 4: Estilo & Cores */}
          {activeTab === 'estilo' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
                <label className="block text-slate-300 font-semibold">Estilo do Cabeçalho</label>
                <div className="grid grid-cols-2 gap-2">
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
                    <span className="block text-[10px] text-slate-400 font-normal">Logo e protocolo</span>
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
                    <span className="block text-[10px] text-slate-400 font-normal">Solenidade Clássica</span>
                  </button>
                </div>

                <div className="pt-2">
                  <label className="block text-slate-300 font-semibold mb-2">Tema de Cores</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'navy', label: 'Azul Nobre', bg: 'bg-blue-900' },
                      { id: 'dourado', label: 'Ouro Real', bg: 'bg-amber-800' },
                      { id: 'borgonha', label: 'Vinho Ecl.', bg: 'bg-rose-950' },
                      { id: 'monocromatico', label: 'Preto Formal', bg: 'bg-slate-900' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setConfig({ ...config, temaCor: t.id as any })}
                        className={`p-2 rounded-lg border flex items-center gap-1.5 cursor-pointer ${
                          config.temaCor === t.id
                            ? 'border-white text-white font-semibold bg-slate-800'
                            : 'border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full ${t.bg} border border-slate-600 shrink-0`} />
                        <span className="text-[11px] truncate">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-4">
                <label className="block text-slate-300 font-semibold">Segurança & Elementos Gráficos</label>
                
                <label className="flex items-center gap-3 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.marcaDagua}
                    onChange={(e) => setConfig({ ...config, marcaDagua: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                  />
                  <div>
                    <span className="font-semibold block">Marca d'Água Centralizada</span>
                    <span className="text-slate-400 text-[11px]">Emblema translúcido no fundo do A4</span>
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
                    <span className="font-semibold block">Selo de Chancelaria e Autenticidade</span>
                    <span className="text-slate-400 text-[11px]">Chancela formal no rodapé com número de protocolo</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Aba 5: Editar Texto */}
          {activeTab === 'conteudo' && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Título do Documento</label>
                <input
                  type="text"
                  value={docTitulo}
                  onChange={(e) => setDocTitulo(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Corpo do Texto</label>
                <textarea
                  value={docConteudo}
                  onChange={(e) => setDocConteudo(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-blue-500 font-serif leading-relaxed text-xs"
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
                    <span>{isSavingDoc ? 'Salvando...' : 'Salvar Alterações'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* FOLHA OFICIAL A4 PARA IMPRESSÃO (NUNCA DEFORMA, 100% PROPORCIONAL E NÍTIDO) */}
      {/* ========================================================================= */}
      <main
        className={`documento-oficial-print ${orientacao === 'paisagem' ? 'modo-paisagem' : ''} bg-white text-slate-900 shadow-2xl rounded-xs relative flex flex-col justify-between select-text`}
        style={{
          fontFamily: "'Merriweather', 'Cinzel', 'Georgia', serif",
          width: orientacao === 'paisagem' ? '297mm' : '210mm',
          minHeight: orientacao === 'paisagem' ? '209mm' : '296mm',
          padding: orientacao === 'paisagem' ? '12mm 16mm 12mm 16mm' : '16mm 20mm 15mm 20mm',
          boxSizing: 'border-box',
        }}
      >
        {/* Marca d'Água Central translúcida oficial */}
        {config.marcaDagua && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.04] overflow-hidden">
            {config.logoUrl && logoLoadStatus === 'success' ? (
              <img
                src={config.logoUrl}
                alt="Marca d'água"
                className="w-80 h-80 object-contain grayscale"
              />
            ) : (
              <svg width="380" height="380" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="45" stroke="#000" strokeWidth="2" />
                <rect x="47" y="15" width="6" height="70" fill="#000" />
                <rect x="25" y="35" width="50" height="6" fill="#000" />
              </svg>
            )}
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* CASO A: CERTIFICADO DE BATISMO / APRESENTAÇÃO / HONRA (MOLDURA DUPLA) */}
        {/* ----------------------------------------------------------------------- */}
        {isCertificado ? (
          <div
            className={`relative z-10 flex-1 flex flex-col justify-between border-[6px] border-double bg-gradient-to-b from-amber-50/15 via-white to-amber-50/15 ${
              orientacao === 'paisagem' ? 'p-6 sm:p-8' : 'p-8 sm:p-10'
            }`}
            style={{ borderColor: colors.primary }}
          >
            {/* Cantoneiras Eclesiásticas Ornamentais em SVG */}
            <div className="absolute top-1.5 left-1.5 w-7 h-7 pointer-events-none" style={{ color: colors.primary }}>
              <svg viewBox="0 0 40 40" fill="currentColor">
                <path d="M0 0 L40 0 L40 6 L6 6 L6 40 L0 40 Z M12 12 L30 12 L30 16 L16 16 L16 30 L12 30 Z" />
              </svg>
            </div>
            <div className="absolute top-1.5 right-1.5 w-7 h-7 pointer-events-none" style={{ color: colors.primary }}>
              <svg viewBox="0 0 40 40" fill="currentColor" className="rotate-90">
                <path d="M0 0 L40 0 L40 6 L6 6 L6 40 L0 40 Z M12 12 L30 12 L30 16 L16 16 L16 30 L12 30 Z" />
              </svg>
            </div>
            <div className="absolute bottom-1.5 left-1.5 w-7 h-7 pointer-events-none" style={{ color: colors.primary }}>
              <svg viewBox="0 0 40 40" fill="currentColor" className="-rotate-90">
                <path d="M0 0 L40 0 L40 6 L6 6 L6 40 L0 40 Z M12 12 L30 12 L30 16 L16 16 L16 30 L12 30 Z" />
              </svg>
            </div>
            <div className="absolute bottom-1.5 right-1.5 w-7 h-7 pointer-events-none" style={{ color: colors.primary }}>
              <svg viewBox="0 0 40 40" fill="currentColor" className="rotate-180">
                <path d="M0 0 L40 0 L40 6 L6 6 L6 40 L0 40 Z M12 12 L30 12 L30 16 L16 16 L16 30 L12 30 Z" />
              </svg>
            </div>

            {/* Cabeçalho do Certificado */}
            <div className="documento-cabecalho text-center pt-1">
              <div className="flex justify-center mb-2">
                {config.logoUrl && logoLoadStatus === 'success' ? (
                  <img
                    src={config.logoUrl}
                    alt={`Logo - ${config.nomeIgreja}`}
                    style={{ height: `${orientacao === 'paisagem' ? Math.min(config.logoHeight, 64) : config.logoHeight}px` }}
                    className="max-w-[200px] object-contain drop-shadow-xs"
                    crossOrigin="anonymous"
                    loading="eager"
                  />
                ) : (
                  renderBrasaoVetorial(orientacao === 'paisagem' ? Math.min(config.logoHeight, 64) : config.logoHeight)
                )}
              </div>

              <h1
                className="text-lg sm:text-2xl font-black uppercase tracking-[0.14em]"
                style={{ color: colors.primary, fontFamily: "'Cinzel', 'Playfair Display', serif" }}
              >
                {config.nomeIgreja}
              </h1>

              {config.denominacao && (
                <p className="text-[10px] tracking-widest uppercase text-slate-600 font-medium mt-0.5">
                  {config.denominacao}
                </p>
              )}

              <p className="text-[9.5px] tracking-wider uppercase text-slate-500 font-medium">
                {config.subtitulo}
              </p>

              {config.endereco && (
                <p className="text-[9px] text-slate-500 mt-0.5">
                  {config.endereco}
                  {config.cidadeEstado ? ` • ${config.cidadeEstado}` : ''}
                  {config.cnpj ? ` • CNPJ: ${config.cnpj}` : ''}
                </p>
              )}

              {/* Divisor ornamental */}
              <div className="flex items-center justify-center gap-3 my-2.5">
                <div className="h-[1.5px] w-16" style={{ backgroundColor: colors.border }} />
                <span style={{ color: colors.primary }} className="text-xs">❖</span>
                <div className="h-[1.5px] w-16" style={{ backgroundColor: colors.border }} />
              </div>

              {/* Título do Certificado em Destaque Monumental */}
              <h2
                className={`font-black uppercase tracking-wider text-center ${
                  orientacao === 'paisagem' ? 'text-xl sm:text-2xl my-1' : 'text-2xl sm:text-3xl my-2'
                }`}
                style={{ color: colors.primary, fontFamily: "'Cinzel', 'Playfair Display', serif" }}
              >
                {docTitulo}
              </h2>
              <span className="text-[9.5px] uppercase tracking-widest text-slate-500 font-mono">
                REGISTRO OFICIAL Nº {protocoloOficial}
              </span>
            </div>

            {/* Corpo do Certificado */}
            <div className={`text-center max-w-2xl mx-auto px-4 ${orientacao === 'paisagem' ? 'my-3' : 'my-6'}`}>
              <p
                className={`leading-relaxed text-slate-800 text-center font-normal ${
                  escala === 'compacto'
                    ? 'text-sm sm:text-base leading-normal'
                    : escala === 'ampliado'
                    ? 'text-base sm:text-xl leading-loose'
                    : 'text-base sm:text-lg leading-relaxed'
                }`}
              >
                {docConteudo}
              </p>

              {/* Versículo bíblico solene de bênção */}
              <div className="mt-4 pt-3 border-t border-slate-200/90 max-w-xl mx-auto">
                <p className="text-[11px] sm:text-xs italic text-slate-600 leading-relaxed font-serif">
                  {isBatismo ? (
                    <>
                      &ldquo;Portanto ide, fazei discípulos de todas as nações, batizando-os em nome do Pai, e do Filho, e do Espírito Santo; ensinando-os a guardar todas as coisas que vos tenho mandado.&rdquo;
                      <span className="block mt-0.5 font-bold not-italic tracking-wider text-slate-800 text-[10px]">
                        — MATEUS 28:19-20
                      </span>
                    </>
                  ) : isApresentacao ? (
                    <>
                      &ldquo;Ensina a criança no caminho em que deve andar, e, ainda quando for velho, não se desviará dele.&rdquo;
                      <span className="block mt-0.5 font-bold not-italic tracking-wider text-slate-800 text-[10px]">
                        — PROVÉRBIOS 22:6
                      </span>
                    </>
                  ) : (
                    <>
                      &ldquo;O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti e tenha misericórdia de ti; o Senhor sobre ti levante o seu rosto e te dê a paz.&rdquo;
                      <span className="block mt-0.5 font-bold not-italic tracking-wider text-slate-800 text-[10px]">
                        — NÚMEROS 6:24-26
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Rodapé: Local, Data e Assinaturas Formais */}
            <div className="documento-assinaturas pt-2">
              <p className="text-center text-xs text-slate-700 mb-6">
                Dado e passado em <span className="font-semibold">{config.cidadeEstado}</span>, aos{' '}
                <span className="font-semibold">{dataFormatada}</span>.
              </p>

              <div className="grid grid-cols-2 gap-8 max-w-lg mx-auto text-center items-end">
                <div>
                  <div className="border-b-[1.5px] border-slate-900 w-full mb-1" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-900">{config.nomePastor}</p>
                  <p className="text-[9.5px] uppercase text-slate-600">{config.cargoPastor}</p>
                  {config.registroPastor && (
                    <p className="text-[8.5px] text-slate-500 font-mono">{config.registroPastor}</p>
                  )}
                </div>

                <div>
                  <div className="border-b-[1.5px] border-slate-900 w-full mb-1" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-900">{config.nomeSecretario}</p>
                  <p className="text-[9.5px] uppercase text-slate-600">{config.cargoSecretario}</p>
                  <p className="text-[8.5px] text-slate-500 font-mono">Secretaria Eclesiástica</p>
                </div>
              </div>

              {/* Selo de Chancelaria e Autenticação */}
              {config.seloChancelaria && (
                <div className="documento-selo mt-5 flex items-center justify-between border-t border-slate-200 pt-2 text-[8.5px] text-slate-500 font-mono uppercase tracking-wider">
                  <span>{config.nomeIgreja} &bull; Documento Oficial Eclesiástico</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.primary }} />
                    <span>Chancela Canônica Válida &bull; {protocoloOficial}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ----------------------------------------------------------------------- */
          /* CASO B: PAPEL TIMBRADO EXECUTIVO (RECOMENDAÇÃO, DECLARAÇÃO, ATA, OFÍCIO)*/
          /* ----------------------------------------------------------------------- */
          <div className="relative z-10 flex-1 flex flex-col justify-between">
            <div>
              {/* Cabeçalho Timbrado */}
              {config.estiloCabecalho === 'centralizado' ? (
                /* Cabeçalho Centralizado Solene */
                <div className="documento-cabecalho print-header text-center border-b-2 pb-4 mb-6" style={{ borderColor: colors.primary }}>
                  <div className="flex justify-center mb-2">
                    {config.logoUrl && logoLoadStatus === 'success' ? (
                      <img
                        src={config.logoUrl}
                        alt={`Logo - ${config.nomeIgreja}`}
                        style={{ height: `${config.logoHeight}px` }}
                        className="max-w-[220px] object-contain drop-shadow-xs"
                        crossOrigin="anonymous"
                        loading="eager"
                      />
                    ) : (
                      renderBrasaoVetorial(config.logoHeight)
                    )}
                  </div>

                  <h1
                    className="text-xl sm:text-2xl font-bold uppercase tracking-wider"
                    style={{ color: colors.primary, fontFamily: "'Cinzel', 'Playfair Display', serif" }}
                  >
                    {config.nomeIgreja}
                  </h1>

                  {config.subtitulo && (
                    <p className="text-xs uppercase tracking-wider text-slate-700 font-semibold mt-0.5">
                      {config.subtitulo}
                    </p>
                  )}

                  {config.denominacao && (
                    <p className="text-[10px] uppercase tracking-widest text-slate-600 font-medium mt-0.5">
                      {config.denominacao}
                    </p>
                  )}

                  <p className="text-[9.5px] uppercase tracking-wider text-slate-600 mt-1 font-medium">
                    {config.endereco}
                    {config.cidadeEstado ? ` • ${config.cidadeEstado}` : ''}
                    {config.cep ? ` • CEP: ${config.cep}` : ''}
                  </p>

                  <p className="text-[9px] text-slate-500 mt-0.5">
                    {config.cnpj ? `CNPJ: ${config.cnpj} • ` : ''}Tel: {config.telefone} &bull; {config.email}
                  </p>
                </div>
              ) : (
                /* Cabeçalho Moderno Executivo */
                <div className="documento-cabecalho print-header border-b-2 pb-4 mb-6" style={{ borderColor: colors.primary }}>
                  <div className="flex items-start justify-between gap-4">
                    {/* Esquerda: Logo + Dados da Congregação */}
                    <div className="flex items-center gap-3.5">
                      {config.logoUrl && logoLoadStatus === 'success' ? (
                        <img
                          src={config.logoUrl}
                          alt={`Logo - ${config.nomeIgreja}`}
                          style={{ height: `${config.logoHeight}px`, maxHeight: '80px' }}
                          className="max-w-[160px] object-contain shrink-0 drop-shadow-xs"
                          crossOrigin="anonymous"
                          loading="eager"
                        />
                      ) : (
                        renderBrasaoVetorial(config.logoHeight)
                      )}

                      <div className="flex flex-col justify-center">
                        <h1
                          className="text-lg sm:text-xl font-bold uppercase tracking-wider leading-tight"
                          style={{ color: colors.primary, fontFamily: "'Cinzel', 'Playfair Display', serif" }}
                        >
                          {config.nomeIgreja}
                        </h1>
                        <p className="text-[11px] uppercase tracking-wider text-slate-700 font-semibold mt-0.5">
                          {config.subtitulo}
                        </p>
                        {config.denominacao && (
                          <p className="text-[9.5px] text-slate-500 italic mt-0.5">
                            {config.denominacao}
                          </p>
                        )}
                        <p className="text-[9.5px] text-slate-600 font-medium mt-0.5 leading-snug">
                          {config.endereco}
                          {config.cidadeEstado ? ` • ${config.cidadeEstado}` : ''}
                          {config.cep ? ` • CEP: ${config.cep}` : ''}
                        </p>
                        <p className="text-[8.5px] text-slate-500 mt-0.5">
                          {config.cnpj ? `CNPJ: ${config.cnpj} • ` : ''}Contato: {config.telefone} &bull; {config.email}
                        </p>
                      </div>
                    </div>

                    {/* Direita: Protocolo Oficial e Emissão */}
                    <div className="text-right shrink-0">
                      <div
                        className="inline-block px-2.5 py-0.5 rounded text-[9.5px] font-bold tracking-wider uppercase border"
                        style={{
                          backgroundColor: colors.badgeBg,
                          color: colors.badgeText,
                          borderColor: colors.border,
                        }}
                      >
                        {documento.tipo}
                      </div>
                      <p className="text-[9.5px] text-slate-700 font-mono mt-1 font-semibold">
                        Nº {protocoloOficial}
                      </p>
                      <p className="text-[8.5px] text-slate-500 mt-0.5">
                        Emissão: {new Date(documento.data_criacao || Date.now()).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Título Principal do Documento */}
              <div className="text-center my-5">
                <h2
                  className="text-lg sm:text-xl font-bold text-slate-950 uppercase tracking-wide"
                  style={{ color: colors.primary, fontFamily: "'Cinzel', 'Playfair Display', serif" }}
                >
                  {docTitulo}
                </h2>
                <div className="w-16 h-[2px] mx-auto mt-1.5" style={{ backgroundColor: colors.border }} />
              </div>

              {/* Vocativo / Saudação Pastoral para cartas */}
              {isRecomendacao && (
                <div className="mb-5 text-sm text-slate-800 leading-relaxed font-serif">
                  <p className="font-bold text-slate-950 mb-1">
                    À Amada Igreja do Senhor Jesus Cristo e ao seu Mui Digno Ministério Pastoral,
                  </p>
                  <p className="italic text-slate-700 text-xs">
                    &ldquo;A graça e a paz de nosso Senhor e Salvador Jesus Cristo sejam convosco.&rdquo;
                  </p>
                </div>
              )}

              {/* Corpo do Documento com Parágrafos Canônicos Indentados */}
              <div
                className={`text-slate-800 space-y-3 font-serif ${
                  escala === 'compacto'
                    ? 'text-[13px] leading-snug space-y-2.5'
                    : escala === 'ampliado'
                    ? 'text-[15.5px] leading-relaxed space-y-4'
                    : 'text-[14px] leading-relaxed space-y-3.5'
                }`}
              >
                {paragrafosConteudo.map((paragrafo, idx) => (
                  <p
                    key={idx}
                    className="text-justify indent-8 text-slate-800 leading-relaxed"
                    style={{ textJustify: 'inter-word' }}
                  >
                    {paragrafo}
                  </p>
                ))}
              </div>

              {/* Encerramento Fraterno */}
              {isRecomendacao && (
                <div className="mt-6 text-xs text-slate-800 font-serif">
                  <p>Sem mais para o momento, renovamos nossos protestos de fraterna estima cristã e apreço no Senhor.</p>
                  <p className="mt-1.5 font-bold italic text-slate-900">Fraternalmente em Cristo Jesus,</p>
                </div>
              )}
            </div>

            {/* Rodapé Oficial com Datação e Bloco de Assinaturas */}
            <div className="documento-assinaturas pt-4 mt-6 border-t border-slate-200">
              <p className="text-center text-xs text-slate-700 mb-8">
                Dado e passado na Secretaria Geral em <span className="font-semibold">{config.cidadeEstado}</span>, aos{' '}
                <span className="font-semibold">{dataFormatada}</span>.
              </p>

              <div className="grid grid-cols-2 gap-8 max-w-lg mx-auto text-center items-end">
                <div>
                  <div className="border-b-[1.5px] border-slate-900 w-full mb-1" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-900">{config.nomePastor}</p>
                  <p className="text-[9.5px] uppercase text-slate-600">{config.cargoPastor}</p>
                  {config.registroPastor && (
                    <p className="text-[8.5px] text-slate-500 font-mono">{config.registroPastor}</p>
                  )}
                </div>

                <div>
                  <div className="border-b-[1.5px] border-slate-900 w-full mb-1" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-900">{config.nomeSecretario}</p>
                  <p className="text-[9.5px] uppercase text-slate-600">{config.cargoSecretario}</p>
                  <p className="text-[8.5px] text-slate-500 font-mono">Secretaria Eclesiástica</p>
                </div>
              </div>

              {/* Linha de Autenticidade e Protocolo */}
              <div className="documento-selo mt-6 pt-2 border-t border-slate-200 flex items-center justify-between text-[8.5px] text-slate-400 uppercase tracking-widest font-mono">
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

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
