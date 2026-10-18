import React, { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Key, Church, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';
import { useToast } from './ui/toast';
import { db } from '../lib/supabase';
import type { UserSession } from '../types/database';

interface LicenseActivationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserSession | null;
  onActivated: () => void;
  isExpired?: boolean;
}

export function LicenseActivationModal({
  open,
  onOpenChange,
  user,
  onActivated,
  isExpired = false,
}: LicenseActivationModalProps) {
  const { toastSuccess, toastError } = useToast();
  const [tokenCode, setTokenCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenCode.trim()) {
      toastError('❌ Por favor, digite o código do token de ativação.');
      return;
    }

    if (!user) {
      toastError('❌ Erro: Sessão de usuário não encontrada.');
      return;
    }

    setLoading(true);
    try {
      const res = await db.activateToken({
        token: tokenCode.trim(),
        email: user.email,
        igreja_nome: user.igreja || 'Minha Igreja',
        responsavel_nome: user.nome,
        cargo: user.cargo,
        user_id: user.id,
      });

      if (res.success) {
        toastSuccess('🎉 Licença permanente ativada com sucesso! Acesso vitalício liberado.');
        onActivated();
        onOpenChange(false);
      }
    } catch (err: any) {
      toastError(`❌ ${err.message || 'Erro ao ativar o token.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Key className="h-5 w-5 text-white" />
          </div>
          <div>
            <DialogTitle className="text-base font-bold text-gray-900">
              {isExpired ? 'Período Experimental Encerrado' : 'Ativar Licença Permanente'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {isExpired
                ? 'Seus 14 dias de teste grátis terminaram. Informe seu token de ativação para continuar.'
                : 'Insira o token fornecido pelo administrador para ativar o acesso vitalício.'}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleActivate} className="space-y-4 pt-2">
        {isExpired && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Seus dados e registros estão totalmente seguros!</p>
              <p className="text-amber-800 mt-0.5">
                Nenhum dado foi apagado. Para desbloquear o sistema permanentemente sem mensalidades, insira o token de ativação abaixo.
              </p>
            </div>
          </div>
        )}

        <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-blue-900">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span>Ativação por Token Permanente</span>
          </div>
          <p className="text-blue-800 text-[11px] leading-relaxed">
            Cada token é único e de uso exclusivo para a igreja <strong className="text-blue-950">{user?.igreja}</strong> ({user?.email}).
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Código do Token (Ex: MI-XXXX-XXXX-XXXX-XXXX)
          </label>
          <Input
            type="text"
            placeholder="MI-XXXX-XXXX-XXXX-XXXX"
            value={tokenCode}
            onChange={(e) => setTokenCode(e.target.value.toUpperCase())}
            className="font-mono uppercase bg-white text-gray-900 text-sm tracking-wider"
            autoFocus
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          {!isExpired && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Validando no Servidor...</span>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Ativar Licença Permanente</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
