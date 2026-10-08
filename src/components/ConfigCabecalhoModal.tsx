import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import {
  Save,
  RotateCcw,
  Sparkles,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  ImageIcon,
  Church,
  Scroll,
  X,
} from 'lucide-react';
import {
  type IgrejaHeaderConfig,
  getSavedHeaderConfig,
  saveHeaderConfig,
  DEFAULT_HEADER_CONFIG,
} from '../types/documentoConfig';
import type { UserSession } from '../types/database';

interface ConfigCabecalhoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserSession | null;
  onSaveSuccess?: () => void;
}

export function ConfigCabecalhoModal({
  open,
  onOpenChange,
  user,
  onSaveSuccess,
}: ConfigCabecalhoModalProps) {
  const [config, setConfig] = useState<IgrejaHeaderConfig>(() =>
    getSavedHeaderConfig(user?.igreja, user?.nome, user?.cargo)
  );
  const [activeTab, setActiveTab] = useState<'igreja' | 'logo' | 'lideranca' | 'estilo'>('igreja');
  const [logoLoadStatus, setLogoLoadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setConfig(getSavedHeaderConfig(user?.igreja, user?.nome, user?.cargo));
      setSavedSuccess(false);
    }
  }, [open, user]);

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

  const handleSave = () => {
    saveHeaderConfig(config);
    setSavedSuccess(true);
    if (onSaveSuccess) onSaveSuccess();
    setTimeout(() => {
      setSavedSuccess(false);
      onOpenChange(false);
    }, 1200);
  };

  const handleReset = () => {
    const res = DEFAULT_HEADER_CONFIG;
    setConfig(res);
  };

  const renderBrasaoVetorial = (size: number = 60) => (
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <DialogTitle>Personalizar Cabeçalho & Logo da Igreja</DialogTitle>
        </div>
        <DialogDescription>
          Configure as informações institucionais e o link da Logo da sua igreja para todos os documentos e certificados gerados.
        </DialogDescription>
      </DialogHeader>

      {savedSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">Configuração salva com sucesso! Os novos documentos já utilizarão estes dados.</span>
        </div>
      )}

      {/* Abas */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-2 mb-3">
        <button
          type="button"
          onClick={() => setActiveTab('igreja')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'igreja' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          🏢 Dados da Igreja
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logo')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'logo' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          <span>Logo por Link</span>
          {config.logoUrl && <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('lideranca')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'lideranca' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          ✍️ Pastor & Secretaria
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('estilo')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'estilo' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          🎨 Estilo & Cores
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto pr-1">
        {/* Aba Igreja */}
        {activeTab === 'igreja' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block text-gray-700 font-semibold mb-1">Nome da Igreja / Ministério *</label>
              <input
                type="text"
                value={config.nomeIgreja}
                onChange={(e) => setConfig({ ...config, nomeIgreja: e.target.value })}
                placeholder="Ex: Igreja Evangélica Betel"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">CNPJ</label>
              <input
                type="text"
                value={config.cnpj}
                onChange={(e) => setConfig({ ...config, cnpj: e.target.value })}
                placeholder="00.000.000/0001-00"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Subtítulo / Ministério</label>
              <input
                type="text"
                value={config.subtitulo}
                onChange={(e) => setConfig({ ...config, subtitulo: e.target.value })}
                placeholder="Ex: Ministério Pastoral & Secretaria Geral"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-gray-700 font-semibold mb-1">Denominação / Convenção Filiada</label>
              <input
                type="text"
                value={config.denominacao}
                onChange={(e) => setConfig({ ...config, denominacao: e.target.value })}
                placeholder="Ex: Filiada à Convenção Geral de Ministros Evangélicos"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-gray-700 font-semibold mb-1">Endereço Completo</label>
              <input
                type="text"
                value={config.endereco}
                onChange={(e) => setConfig({ ...config, endereco: e.target.value })}
                placeholder="Ex: Av. Brasil, 1500 - Bairro Centro"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Cidade - UF</label>
              <input
                type="text"
                value={config.cidadeEstado}
                onChange={(e) => setConfig({ ...config, cidadeEstado: e.target.value })}
                placeholder="Ex: São Paulo - SP"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">CEP</label>
              <input
                type="text"
                value={config.cep}
                onChange={(e) => setConfig({ ...config, cep: e.target.value })}
                placeholder="00000-000"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={config.telefone}
                onChange={(e) => setConfig({ ...config, telefone: e.target.value })}
                placeholder="(11) 98765-4321"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">E-mail Oficial</label>
              <input
                type="text"
                value={config.email}
                onChange={(e) => setConfig({ ...config, email: e.target.value })}
                placeholder="secretaria@igreja.org.br"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Aba Logo */}
        {activeTab === 'logo' && (
          <div className="space-y-4 text-xs">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                  <LinkIcon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Link / URL Direto da Imagem da Logo</h4>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    Você pode usar o link da logo hospedada em qualquer serviço (Imgur, Cloudinary, AWS S3, site da igreja, etc.).
                  </p>
                </div>
              </div>

              <div className="mt-3 relative">
                <input
                  type="url"
                  value={config.logoUrl}
                  onChange={(e) => setConfig({ ...config, logoUrl: e.target.value })}
                  placeholder="https://sua-igreja.com/imagens/logo.png"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 font-mono text-xs pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {config.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, logoUrl: '' })}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-2.5 flex items-center justify-between">
                <div>
                  {config.logoUrl ? (
                    logoLoadStatus === 'success' ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Imagem carregada com sucesso!
                      </span>
                    ) : logoLoadStatus === 'error' ? (
                      <span className="text-amber-700 font-semibold flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-amber-600" /> Não foi possível carregar a imagem deste link. Usaremos o brasão padrão.
                      </span>
                    ) : (
                      <span className="text-blue-600 font-medium">Testando carregamento do link...</span>
                    )
                  ) : (
                    <span className="text-gray-500 italic">Sem link. O documento usará o Brasão Eclesiástico solene.</span>
                  )}
                </div>

                {config.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, logoUrl: '' })}
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    Remover Logo
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Altura da Logo no Documento: <span className="text-blue-600">{config.logoHeight}px</span>
                </label>
                <input
                  type="range"
                  min="40"
                  max="110"
                  step="4"
                  value={config.logoHeight}
                  onChange={(e) => setConfig({ ...config, logoHeight: Number(e.target.value) })}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span>Pequena (40px)</span>
                  <span>Média (68px)</span>
                  <span>Grande (110px)</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-gray-200 flex flex-col items-center justify-center min-h-[90px] shadow-xs">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">
                  Prévia no Cabeçalho
                </span>
                {config.logoUrl && logoLoadStatus === 'success' ? (
                  <img
                    src={config.logoUrl}
                    alt="Prévia"
                    style={{ height: `${config.logoHeight}px` }}
                    className="max-w-[160px] object-contain drop-shadow-xs"
                  />
                ) : (
                  renderBrasaoVetorial(config.logoHeight)
                )}
              </div>
            </div>
          </div>
        )}

        {/* Aba Liderança */}
        {activeTab === 'lideranca' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center gap-2 text-gray-900 font-bold">
                <Church className="h-4 w-4 text-blue-600" />
                <span>Pastor Titular / Presidente</span>
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={config.nomePastor}
                  onChange={(e) => setConfig({ ...config, nomePastor: e.target.value })}
                  placeholder="Pr. Nome Sobrenome"
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Cargo Eclesiástico</label>
                <input
                  type="text"
                  value={config.cargoPastor}
                  onChange={(e) => setConfig({ ...config, cargoPastor: e.target.value })}
                  placeholder="Pastor Presidente"
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Registro Ministerial</label>
                <input
                  type="text"
                  value={config.registroPastor}
                  onChange={(e) => setConfig({ ...config, registroPastor: e.target.value })}
                  placeholder="Ex: CGADB 24.120"
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-gray-900"
                />
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center gap-2 text-gray-900 font-bold">
                <Scroll className="h-4 w-4 text-indigo-600" />
                <span>Secretaria Geral</span>
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Nome do(a) Secretário(a)</label>
                <input
                  type="text"
                  value={config.nomeSecretario}
                  onChange={(e) => setConfig({ ...config, nomeSecretario: e.target.value })}
                  placeholder="Nome do Secretário(a)"
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Cargo</label>
                <input
                  type="text"
                  value={config.cargoSecretario}
                  onChange={(e) => setConfig({ ...config, cargoSecretario: e.target.value })}
                  placeholder="Secretária Geral"
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-gray-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* Aba Estilo */}
        {activeTab === 'estilo' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-3">
              <label className="block text-gray-800 font-bold">Disposição do Cabeçalho</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, estiloCabecalho: 'moderno' })}
                  className={`p-2 rounded border text-center cursor-pointer ${
                    config.estiloCabecalho === 'moderno'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Moderno
                </button>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, estiloCabecalho: 'centralizado' })}
                  className={`p-2 rounded border text-center cursor-pointer ${
                    config.estiloCabecalho === 'centralizado'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Central
                </button>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, estiloCabecalho: 'classico' })}
                  className={`p-2 rounded border text-center cursor-pointer ${
                    config.estiloCabecalho === 'classico'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Clássico
                </button>
              </div>

              <div className="pt-2">
                <label className="block text-gray-800 font-bold mb-2">Tema de Cores</label>
                <div className="grid grid-cols-2 gap-2">
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
                      className={`p-2 rounded border flex items-center gap-2 cursor-pointer ${
                        config.temaCor === t.id
                          ? 'border-blue-600 bg-blue-50 font-bold text-gray-900'
                          : 'border-gray-200 text-gray-700'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${t.bg}`} />
                      <span className="text-[11px]">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-3">
              <label className="block text-gray-800 font-bold">Elementos Visuais na Impressão</label>
              
              <label className="flex items-center gap-2.5 text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.marcaDagua}
                  onChange={(e) => setConfig({ ...config, marcaDagua: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <div>
                  <span className="font-semibold block">Marca d'Água Central</span>
                  <span className="text-gray-500 text-[11px]">Emblema suave no centro do A4</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.seloChancelaria}
                  onChange={(e) => setConfig({ ...config, seloChancelaria: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <div>
                  <span className="font-semibold block">Selo de Chancelaria Eclesiástica</span>
                  <span className="text-gray-500 text-[11px]">Carimbo de autenticidade no rodapé</span>
                </div>
              </label>
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="mt-4 pt-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Restaurar Valores Padrão</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Salvar Cabeçalho da Igreja</span>
          </button>
        </div>
      </DialogFooter>
    </Dialog>
  );
}
