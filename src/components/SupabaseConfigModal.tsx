import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import {
  Church,
  ImageIcon,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useToast } from './ui/toast';
import {
  type IgrejaHeaderConfig,
  getSavedHeaderConfig,
  saveHeaderConfig,
  DEFAULT_HEADER_CONFIG,
} from '../types/documentoConfig';
import { STORAGE_KEYS } from '../lib/supabase';

interface SupabaseConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataUpdated?: () => void;
}

export function SupabaseConfigModal({ open, onOpenChange, onDataUpdated }: SupabaseConfigModalProps) {
  const { toastSuccess, toastError } = useToast();

  // Church Configuration states
  const [churchConfig, setChurchConfig] = useState<IgrejaHeaderConfig>(() => getSavedHeaderConfig());
  const [logoStatus, setLogoStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [savingChurch, setSavingChurch] = useState(false);

  useEffect(() => {
    if (open) {
      // Carrega configurações salvas da igreja
      const church = getSavedHeaderConfig();
      setChurchConfig(church);
    }
  }, [open]);

  // Validação da imagem da logo em tempo real
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

  const handleSaveChurchConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingChurch(true);
    try {
      saveHeaderConfig(churchConfig);

      // Sincroniza também o nome da igreja na sessão do usuário
      try {
        const userStr = localStorage.getItem(STORAGE_KEYS.USER);
        if (userStr) {
          const u = JSON.parse(userStr);
          u.igreja = churchConfig.nomeIgreja;
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(u));
        }
      } catch {
        // ignora erro silencioso
      }

      toastSuccess('Dados da Igreja e cabeçalho A4 salvos com sucesso!');
      if (onDataUpdated) onDataUpdated();
      onOpenChange(false);
    } catch {
      toastError('Erro ao salvar configurações da igreja.');
    } finally {
      setSavingChurch(false);
    }
  };

  const handleResetChurchConfig = () => {
    setChurchConfig(DEFAULT_HEADER_CONFIG);
  };

  const renderBrasaoVetorial = (size: number = 36) => (
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
        <div className="flex items-center gap-2 mb-1">
          <Church className="h-5 w-5 text-blue-600" />
          <DialogTitle>Configurações da Igreja</DialogTitle>
        </div>
        <DialogDescription>
          Gerencie a identidade visual e dados oficiais da sua congregação para documentos A4, certificados e relatórios.
        </DialogDescription>
      </DialogHeader>

      {/* Formulário de Identidade & Dados da Igreja */}
      <form onSubmit={handleSaveChurchConfig} className="space-y-4 max-h-[65vh] overflow-y-auto pr-1 mt-2">
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

        {/* Seção: Logo por Link */}
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
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
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

        {/* Seção: Dados Institucionais */}
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

        <div className="pt-3 flex items-center justify-between border-t border-gray-200">
          <button
            type="button"
            onClick={handleResetChurchConfig}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restaurar Padrão</span>
          </button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <button
              type="submit"
              disabled={savingChurch}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{savingChurch ? 'Salvando...' : 'Salvar Dados da Igreja'}</span>
            </button>
          </div>
        </div>
      </form>

      <DialogFooter className="mt-2 pt-2 border-t border-gray-100 flex justify-end">
        <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs text-gray-500">
          Fechar
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// Alias de exportação para manter compatibilidade
export { SupabaseConfigModal as ChurchConfigModal };
