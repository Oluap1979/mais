import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Button } from './ui/button';
import {
  Church,
  CheckCircle2,
  UserPlus,
  LogIn,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  CreditCard,
  Building,
} from 'lucide-react';
import {
  db,
  DEFAULT_USER,
  DEFAULT_CREDENTIALS,
  STORAGE_KEYS,
} from '../lib/supabase';
import { useToast } from './ui/toast';
import type { UserSession, ChurchLicense } from '../types/database';

interface LoginViewProps {
  initialMode?: 'login' | 'register';
  onLoginSuccess: (user: UserSession, license?: ChurchLicense) => void;
  onSetLoading: (loading: boolean) => void;
  onOpenAdminLogin: () => void;
  onAdminDirectLogin?: (token: string) => void;
  onOpenConfig?: () => void;
}

export function LoginView({
  initialMode = 'login',
  onLoginSuccess,
  onSetLoading,
  onOpenAdminLogin,
  onAdminDirectLogin,
  onOpenConfig,
}: LoginViewProps) {
  const { toastSuccess, toastError, toastInfo } = useToast();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(
    initialMode === 'register' ? 'register' : 'login'
  );

  // Campos de Login
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Campos de Cadastro de Igreja
  const [regNome, setRegNome] = useState('');
  const [regIgreja, setRegIgreja] = useState('');
  const [regCargo, setRegCargo] = useState('Pastor Titular');
  const [regEmail, setRegEmail] = useState('');
  const [regSenha, setRegSenha] = useState('');
  const [regConfirmSenha, setRegConfirmSenha] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Estados de erro
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialMode === 'register') {
      setActiveTab('register');
    }
  }, [initialMode]);

  // LOGIN
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const cleanEmail = email.trim().toLowerCase();
    const cleanSenha = senha.trim();

    if (!cleanEmail) {
      setErrors({ email: 'Informe o e-mail da sua igreja.' });
      return;
    }
    if (!cleanSenha) {
      setErrors({ senha: 'Digite sua senha de acesso.' });
      return;
    }

    setSubmitting(true);
    onSetLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanSenha }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao efetuar login.');
      }

      if (data.isAdmin && data.adminToken) {
        toastSuccess('👑 Autenticação de Administrador Geral bem-sucedida!');
        if (onAdminDirectLogin) {
          onAdminDirectLogin(data.adminToken);
        }
        return;
      }

      const loggedUser: UserSession = {
        id: data.user.id,
        email: data.user.email,
        nome: data.user.nome,
        cargo: data.user.cargo,
        igreja: data.user.igreja,
      };

      db.setUser(loggedUser);

      const licenseObj: ChurchLicense = {
        status: data.subscription?.status || 'active',
        nextDueDate: data.subscription?.nextDueDate,
        lastPaymentDate: data.subscription?.lastPaymentDate,
        checkoutUrl: data.subscription?.checkoutUrl,
        igrejaNome: loggedUser.igreja,
        email: loggedUser.email,
      };

      localStorage.setItem(STORAGE_KEYS.LICENSE, JSON.stringify(licenseObj));
      toastSuccess(`Bem-vindo de volta, ${loggedUser.nome.split(' ')[0]}!`);
      onLoginSuccess(loggedUser, licenseObj);
    } catch (err: any) {
      toastError(err.message || 'Erro ao realizar login.');
      setErrors({ global: err.message });
    } finally {
      setSubmitting(false);
      onSetLoading(false);
    }
  };

  // CADASTRO DE NOVA IGREJA
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!regIgreja.trim()) newErrors.regIgreja = 'Informe o nome da congregação.';
    if (!regNome.trim()) newErrors.regNome = 'Informe seu nome completo.';
    if (!regEmail.trim()) newErrors.regEmail = 'Informe o e-mail de contato.';
    if (!regSenha) newErrors.regSenha = 'Crie uma senha de acesso.';
    if (regSenha.length < 6) newErrors.regSenha = 'A senha deve conter no mínimo 6 dígitos.';
    if (regSenha !== regConfirmSenha) newErrors.regConfirmSenha = 'As senhas digitadas não coincidem.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    onSetLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: regNome.trim(),
          igreja: regIgreja.trim(),
          cargo: regCargo,
          email: regEmail.trim().toLowerCase(),
          password: regSenha.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar igreja.');
      }

      const newUser: UserSession = {
        id: data.user.id,
        email: data.user.email,
        nome: data.user.nome,
        cargo: data.user.cargo,
        igreja: data.user.igreja,
      };

      db.setUser(newUser);

      const licenseObj: ChurchLicense = {
        status: data.subscription?.status || 'pending',
        checkoutUrl: data.subscription?.checkoutUrl,
        igrejaNome: newUser.igreja,
        email: newUser.email,
      };

      localStorage.setItem(STORAGE_KEYS.LICENSE, JSON.stringify(licenseObj));
      toastSuccess('🎉 Congregação cadastrada com sucesso!');
      onLoginSuccess(newUser, licenseObj);
    } catch (err: any) {
      toastError(err.message || 'Falha no cadastro da congregação.');
      setErrors({ global: err.message });
    } finally {
      setSubmitting(false);
      onSetLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail(DEFAULT_CREDENTIALS.email);
    setSenha(DEFAULT_CREDENTIALS.password);
    toastInfo('Credenciais de demonstração preenchidas.');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative">
      <div className="absolute inset-0 bg-radial from-blue-900/20 via-slate-900/60 to-slate-900 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Logo e Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/20 mb-2">
            <Church className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Mais Igreja
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-xs mx-auto">
            Plataforma SaaS para gestão de membros, células, secretaria e finanças da igreja
          </p>
        </div>

        {/* Card Principal */}
        <Card className="bg-white/98 backdrop-blur-md border border-slate-700/30 shadow-2xl rounded-2xl overflow-hidden">
          {/* Tabs: Entrar ou Cadastrar */}
          <div className="flex border-b border-gray-200 bg-gray-50/80 p-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrors({});
              }}
              className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <LogIn className="h-4 w-4" />
              <span>Entrar no Sistema</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrors({});
              }}
              className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              <span>Cadastrar Igreja</span>
            </button>
          </div>

          <CardContent className="p-6 sm:p-8">
            {errors.global && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{errors.global}</span>
              </div>
            )}

            {/* ABA 1: LOGIN */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">E-mail da Conta</label>
                  <Input
                    type="email"
                    placeholder="pastor@suaigreja.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors.email ? 'border-rose-500' : ''}
                    autoComplete="email"
                  />
                  {errors.email && <p className="text-[11px] text-rose-500 font-medium">{errors.email}</p>}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-gray-700">Senha de Acesso</label>
                  </div>
                  <div className="relative">
                    <Input
                      type={showLoginPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className={errors.senha ? 'border-rose-500 pr-10' : 'pr-10'}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.senha && <p className="text-[11px] text-rose-500 font-medium">{errors.senha}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md cursor-pointer transition-all mt-2"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  <span>{submitting ? 'Acessando congregação...' : 'Entrar no Sistema'}</span>
                </Button>

                {/* Atalho Demo */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleFillDemo}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Usar conta de demonstração</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenAdminLogin}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Admin Central</span>
                  </button>
                </div>
              </form>
            )}

            {/* ABA 2: CADASTRO DE IGREJA */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Nome da Congregação / Igreja *</label>
                  <Input
                    type="text"
                    placeholder="Ex: Igreja Batista Renovada"
                    value={regIgreja}
                    onChange={(e) => setRegIgreja(e.target.value)}
                    className={errors.regIgreja ? 'border-rose-500' : ''}
                  />
                  {errors.regIgreja && <p className="text-[11px] text-rose-500 font-medium">{errors.regIgreja}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Pastor Titular / Líder *</label>
                    <Input
                      type="text"
                      placeholder="Ex: Pr. João Silva"
                      value={regNome}
                      onChange={(e) => setRegNome(e.target.value)}
                      className={errors.regNome ? 'border-rose-500' : ''}
                    />
                    {errors.regNome && <p className="text-[11px] text-rose-500 font-medium">{errors.regNome}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Função Eclesiástica</label>
                    <Select
                      value={regCargo}
                      onChange={(e) => setRegCargo(e.target.value)}
                    >
                      <option value="Pastor Titular">Pastor Titular</option>
                      <option value="Pastor Auxiliar">Pastor Auxiliar</option>
                      <option value="Secretário(a) Geral">Secretário(a) Geral</option>
                      <option value="Tesoureiro(a)">Tesoureiro(a)</option>
                      <option value="Líder de Ministério">Líder de Ministério</option>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">E-mail de Contato da Igreja *</label>
                  <Input
                    type="email"
                    placeholder="contato@suaigreja.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className={errors.regEmail ? 'border-rose-500' : ''}
                    autoComplete="email"
                  />
                  {errors.regEmail && <p className="text-[11px] text-rose-500 font-medium">{errors.regEmail}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Senha *</label>
                    <div className="relative">
                      <Input
                        type={showRegPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={regSenha}
                        onChange={(e) => setRegSenha(e.target.value)}
                        className={errors.regSenha ? 'border-rose-500 pr-10' : 'pr-10'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.regSenha && <p className="text-[11px] text-rose-500 font-medium">{errors.regSenha}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Confirmar Senha *</label>
                    <Input
                      type={showRegPassword ? 'text' : 'password'}
                      placeholder="Repita a senha"
                      value={regConfirmSenha}
                      onChange={(e) => setRegConfirmSenha(e.target.value)}
                      className={errors.regConfirmSenha ? 'border-rose-500' : ''}
                    />
                    {errors.regConfirmSenha && (
                      <p className="text-[11px] text-rose-500 font-medium">{errors.regConfirmSenha}</p>
                    )}
                  </div>
                </div>

                {/* Nota de Assinatura Kiwify */}
                <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Cobrança Mensal SaaS:</strong> A assinatura da sua igreja é processada com segurança pela Kiwify, com renovações automáticas e cancelamento quando desejar.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md cursor-pointer transition-all"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  <span>{submitting ? 'Criando conta...' : 'Concluir Cadastro da Igreja'}</span>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Rodapé institucional */}
        <p className="text-center text-xs text-slate-500">
          Mais Igreja &copy; {new Date().getFullYear()} — Plataforma de Gestão Eclesiástica
        </p>
      </div>
    </div>
  );
}
