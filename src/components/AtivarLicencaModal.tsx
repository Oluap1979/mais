import React, { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Key, ShieldCheck, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { useToast } from './ui/toast';
import { db } from '../lib/supabase';
import type { UserSession } from '../types/database';

interface AtivarLicencaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserSession;
  onActivatedSuccess: () => void;
}

export function AtivarLicencaModal({
  open,
  onOpenChange,
  user,
  onActivatedSuccess,
}: AtivarLicencaModalProps) {
  const { toastSuccess, toastError } = useToast();
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!tokenInput.trim()) {
      setErrorMsg('Informe o token de ativação.');
      return;
    }

    setLoading(true);
    try {
      await db.activateToken({
        token: tokenInput.trim().toUpperCase(),
        email: user.email,
        igreja_nome: user.igreja,
        user_id: user.id,
        responsavel_nome: user.nome,
        cargo: user.cargo,
      });

      toastSuccess('🎉 Licença Permanente Vitalícia ativada com sucesso!');
      onActivatedSuccess();
      onOpenChange(false);
      setTokenInput('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Token inválido ou indisponível.');
      toastError(`❌ ${err.message || 'Falha ao ativar token.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <Key className="h-4 w-4 text-white" />
          </div>
          <DialogTitle className="text-base font-bold text-gray-900">
            Ativar Licença Permanente
          </DialogTitle>
        </div>
        <DialogDescription className="text-xs text-gray-500">
          Informe o token fornecido pela administração para liberar o acesso vitalício à sua congregação.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleActivate} className="space-y-4 pt-2">
        <div className="p-3.5 bg-linear-to-r from-blue-50 to-emerald-50 rounded-xl border border-blue-100 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span>Igreja: {user.igreja}</span>
          </div>
          <p className="text-[11px] text-gray-600 leading-relaxed">
            A ativação por token é de uso único e definitiva. Todos os membros, células, lançamentos financeiros e documentos cadastrados são 100% preservados.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Código do Token de Ativação
          </label>
          <Input
            type="text"
            placeholder="Ex: MI-8A2F-9B1C-4D3E-7F80"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
            className="font-mono text-sm uppercase bg-white text-gray-900 tracking-wider"
            autoFocus
          />
          <p className="text-[11px] text-gray-500 mt-1">
            Formato: MI-XXXX-XXXX-XXXX-XXXX
          </p>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Voltar
          </Button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-sm flex items-center gap-2"
          >
            {loading ? 'Validando...' : 'Ativar Licença Agora'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
