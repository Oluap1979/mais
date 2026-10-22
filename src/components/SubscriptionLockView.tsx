import React, { useState } from 'react';
import {
  ShieldAlert,
  CreditCard,
  RefreshCw,
  ExternalLink,
  Lock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from './ui/toast';
import { db } from '../lib/supabase';
import type { UserSession, ChurchLicense } from '../types/database';

interface SubscriptionLockViewProps {
  user: UserSession;
  license: ChurchLicense | null;
  onRefresh: () => Promise<void> | void;
  onLogout: () => void;
}

export function SubscriptionLockView({
  user,
  license,
  onRefresh,
  onLogout,
}: SubscriptionLockViewProps) {
  const { toastSuccess, toastInfo, toastError } = useToast();
  const [checking, setChecking] = useState(false);

  const status = license?.status || 'pending';
  const checkoutUrl = license?.checkoutUrl;

  const handleVerify = async () => {
    setChecking(true);
    try {
      const fresh = await db.getLicense(user.email, user.id, user.igreja);
      await onRefresh();
      if (fresh.status === 'active') {
        toastSuccess('🎉 Pagamento confirmado pela Kiwify! Acesso totalmente liberado.');
      } else {
        toastInfo(`Aguardando confirmação do pagamento. Status atual: ${fresh.status}`);
      }
    } catch {
      toastError('Não foi possível conectar ao servidor de assinaturas.');
    } finally {
      setChecking(false);
    }
  };

  const handleCheckout = () => {
    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    } else {
      toastInfo('O link oficial de checkout Kiwify será configurado pela administração.');
    }
  };

  const getStatusContent = () => {
    switch (status) {
      case 'past_due':
        return {
          title: 'Renovação de Assinatura Pendente',
          subtitle: 'O pagamento mensal da assinatura da sua congregação precisa ser regularizado.',
          buttonText: 'Regularizar Assinatura na Kiwify',
          color: 'amber',
        };
      case 'canceled':
        return {
          title: 'Assinatura Cancelada',
          subtitle: 'A assinatura mensal desta congregação foi cancelada na Kiwify.',
          buttonText: 'Reativar Assinatura na Kiwify',
          color: 'rose',
        };
      case 'expired':
        return {
          title: 'Ciclo de Assinatura Expirado',
          subtitle: 'O período da assinatura contratada expirou.',
          buttonText: 'Renovar Assinatura Mensal',
          color: 'rose',
        };
      case 'suspended':
        return {
          title: 'Acesso Administrativo Suspenso',
          subtitle: 'O acesso foi suspenso temporariamente por decisão administrativa ou contestação.',
          buttonText: 'Contatar Suporte / Administração',
          color: 'rose',
        };
      default:
        return {
          title: 'Ativação de Assinatura Necessária',
          subtitle: 'Para acessar o sistema de gestão da sua igreja, contrate a assinatura mensal recorrente.',
          buttonText: 'Assinar Agora na Kiwify',
          color: 'blue',
        };
    }
  };

  const content = getStatusContent();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-xl w-full bg-white rounded-3xl border border-gray-200/90 shadow-xl overflow-hidden text-center p-8 sm:p-10 space-y-6">
        {/* Ícone de Destaque */}
        <div className="relative mx-auto w-20 h-20 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
          <Lock className="w-10 h-10" />
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
            <CreditCard className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Textos */}
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 tracking-wide uppercase">
            Acesso Restrito
          </span>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            {content.title}
          </h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
            {content.subtitle}
          </p>
        </div>

        {/* Resumo da Igreja */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left text-xs space-y-2">
          <div className="flex justify-between items-center text-gray-600">
            <span>Congregação:</span>
            <strong className="text-gray-900 font-semibold">{user.igreja}</strong>
          </div>
          <div className="flex justify-between items-center text-gray-600">
            <span>Pastor / Usuário:</span>
            <span className="text-gray-900 font-medium">{user.nome} ({user.email})</span>
          </div>
          <div className="flex justify-between items-center text-gray-600">
            <span>Processamento:</span>
            <span className="text-blue-600 font-semibold">Kiwify Pagamentos Recorrentes</span>
          </div>
        </div>

        {/* Garantia de preservação de dados */}
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3.5 text-xs text-emerald-800 flex items-start gap-2.5 text-left">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Seus dados continuam 100% seguros:</strong> Todos os membros, dízimos, células, atas e documentos da sua igreja permanecem preservados em nosso banco de dados.
          </p>
        </div>

        {/* Ações */}
        <div className="space-y-3 pt-2">
          <Button
            type="button"
            onClick={handleCheckout}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md text-sm flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-98"
          >
            <span>{content.buttonText}</span>
            <ExternalLink className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleVerify}
            disabled={checking}
            className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold py-3 px-6 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Consultando Kiwify...' : 'Já realizei o pagamento / Verificar agora'}</span>
          </Button>
        </div>

        {/* Rodapé / Trocar de conta */}
        <div className="pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" /> Dúvidas com sua assinatura?
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair desta conta</span>
          </button>
        </div>
      </div>
    </div>
  );
}
