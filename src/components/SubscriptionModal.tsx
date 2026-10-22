import React, { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  RefreshCw,
  Church,
  Calendar,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useToast } from './ui/toast';
import { db } from '../lib/supabase';
import type { UserSession, ChurchLicense } from '../types/database';

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserSession | null;
  license: ChurchLicense | null;
  onRefreshed: () => void;
}

export function SubscriptionModal({
  open,
  onOpenChange,
  user,
  license,
  onRefreshed,
}: SubscriptionModalProps) {
  const { toastSuccess, toastError, toastInfo } = useToast();
  const [checking, setChecking] = useState(false);

  const status = license?.status || 'pending';
  const isActive = status === 'active';

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const fresh = await db.getLicense(user?.email, user?.id, user?.igreja);
      onRefreshed();
      if (fresh.status === 'active') {
        toastSuccess('✅ Assinatura ativa e confirmada pela Kiwify!');
      } else {
        toastInfo(`Status atual da assinatura: ${getStatusLabel(fresh.status)}`);
      }
    } catch {
      toastError('Erro ao consultar status no servidor.');
    } finally {
      setChecking(false);
    }
  };

  const getStatusLabel = (st: string) => {
    switch (st) {
      case 'active':
        return 'Ativa e Regular';
      case 'past_due':
        return 'Pagamento Pendente / Vencido';
      case 'canceled':
        return 'Assinatura Cancelada';
      case 'expired':
        return 'Expirada';
      case 'suspended':
        return 'Acesso Suspenso';
      default:
        return 'Aguardando Pagamento';
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Ativa (Recorrente Mensal)
          </span>
        );
      case 'past_due':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            Pagamento Pendente / Atrasado
          </span>
        );
      case 'canceled':
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
            Cancelada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="h-3.5 w-3.5 text-blue-600" />
            Aguardando Ativação Kiwify
          </span>
        );
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Não informado';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const checkoutUrl = license?.checkoutUrl;

  const handleOpenCheckout = () => {
    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    } else {
      toastInfo('O link oficial de checkout Kiwify será configurado pela administração.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="p-6 max-w-lg w-full">
        <DialogHeader className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900">
                  Assinatura Mensal da Congregação
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Gerenciamento financeiro processado via Kiwify
                </DialogDescription>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </DialogHeader>

        {/* Informações da Igreja */}
        <div className="space-y-4 my-4">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2.5 text-xs text-gray-700">
            <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-medium flex items-center gap-1.5">
                <Church className="h-4 w-4 text-gray-400" /> Congregação:
              </span>
              <strong className="text-gray-900 font-semibold">{user?.igreja || 'Mais Igreja'}</strong>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-medium">Responsável / Pastor:</span>
              <span className="text-gray-900 font-semibold">{user?.nome || 'Pastor Titular'}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-medium">E-mail Cadastrado:</span>
              <span className="text-gray-900 font-medium">{user?.email}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
              <span className="text-gray-500 font-medium flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-gray-400" /> Próximo Vencimento:
              </span>
              <strong className="text-gray-900 font-semibold">
                {license?.nextDueDate ? formatDate(license.nextDueDate) : 'Sob demanda mensal'}
              </strong>
            </div>

            {license?.lastPaymentDate && (
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-500 font-medium">Último Pagamento Confirmado:</span>
                <span className="text-gray-700">{formatDate(license.lastPaymentDate)}</span>
              </div>
            )}
          </div>

          {/* Banner explicativo de status */}
          {isActive ? (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900">
                <p className="font-bold">Acesso Total Liberado</p>
                <p className="text-emerald-700 mt-0.5 leading-relaxed">
                  Sua igreja possui acesso irrestrito a todos os módulos: Membros, Células, Secretaria e Finanças. As renovações mensais são processadas automaticamente pela Kiwify.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <p className="font-bold">Ação Necessária: Regularização de Assinatura</p>
                <p className="text-amber-700 mt-0.5 leading-relaxed">
                  Para continuar utilizando todos os recursos sem interrupções, realize ou regularize sua assinatura mensal através do checkout oficial da Kiwify.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          {!isActive && (
            <Button
              type="button"
              onClick={handleOpenCheckout}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <span>{status === 'past_due' ? 'Regularizar Assinatura' : 'Assinar Agora na Kiwify'}</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={handleCheckStatus}
            disabled={checking}
            className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 text-blue-600 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Verificando...' : 'Verificar Pagamento'}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-gray-500 hover:text-gray-700 font-medium py-2.5 rounded-xl cursor-pointer"
          >
            Fechar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
