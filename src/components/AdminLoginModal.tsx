import React, { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ShieldCheck, Lock, Mail, AlertCircle } from 'lucide-react';
import { useToast } from './ui/toast';
import { STORAGE_KEYS } from '../lib/supabase';

interface AdminLoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdminLoginSuccess: (token: string) => void;
}

export function AdminLoginModal({ open, onOpenChange, onAdminLoginSuccess }: AdminLoginModalProps) {
  const { toastSuccess, toastError } = useToast();

  const [adminEmail, setAdminEmail] = useState('paulotavares78@hotmail.com');
  const [adminPassword, setAdminPassword] = useState('Typescript1978*#');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!adminEmail.trim() || !adminPassword) {
      setErrorMsg('Informe o e-mail e a senha administrativa.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail.trim(), password: adminPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao autenticar administrador.');
      }

      localStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, data.token);
      toastSuccess('✅ Acesso administrativo autorizado!');
      onAdminLoginSuccess(data.token);
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Credenciais inválidas.');
      toastError(`❌ ${err.message || 'Falha no login administrativo.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <DialogTitle className="text-base font-bold text-gray-900">
            Acesso Restrito — Painel do Administrador
          </DialogTitle>
        </div>
        <DialogDescription className="text-xs text-gray-500">
          Área reservada para geração de tokens de ativação permanente e monitoramento de licenças.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleLogin} className="space-y-4 pt-2">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            E-mail Autorizado
          </label>
          <div className="relative">
            <Mail className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <Input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="pl-9 bg-white text-gray-900 text-xs"
              placeholder="paulotavares78@hotmail.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Senha Administrativa
          </label>
          <div className="relative">
            <Lock className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <Input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="pl-9 bg-white text-gray-900 text-xs"
              placeholder="••••••••"
              autoFocus
            />
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Senha configurada: <code className="bg-gray-100 px-1 py-0.5 rounded font-mono font-bold text-gray-800">Typescript1978*#</code>.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancelar
          </Button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {submitting ? 'Verificando...' : 'Entrar no Painel Admin'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
