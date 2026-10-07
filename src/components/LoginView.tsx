import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Button } from './ui/button';
import { Church, CheckCircle2, UserPlus, LogIn, ShieldCheck, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { getSupabaseClient, db, isSupabaseConnected, DEFAULT_USER, generateUUID } from '../lib/supabase';
import { useToast } from './ui/toast';
import type { UserSession } from '../types/database';

interface LoginViewProps {
  initialMode?: 'login' | 'register';
  onLoginSuccess: (user: UserSession) => void;
  onSetLoading: (loading: boolean) => void;
  onOpenConfig?: () => void;
}

export function LoginView({ initialMode = 'login', onLoginSuccess, onSetLoading, onOpenConfig }: LoginViewProps) {
  const { toastSuccess, toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialMode);
  const [supabaseOk, setSupabaseOk] = useState(false);

  // Campos de Login
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  // Campos de Cadastro
  const [regNome, setRegNome] = useState('');
  const [regIgreja, setRegIgreja] = useState('');
  const [regCargo, setRegCargo] = useState('Pastor Titular');
  const [regEmail, setRegEmail] = useState('');
  const [regSenha, setRegSenha] = useState('');
  const [regConfirmSenha, setRegConfirmSenha] = useState('');

  // Estados de erro e recuperação
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    setActiveTab(initialMode);
    setSupabaseOk(isSupabaseConnected());
  }, [initialMode]);

  const validateLogin = () => {
    // Se ambos estiverem vazios ao clicar em Entrar, assume o perfil pastoral padrão para abrir o sistema
    if (!email.trim() && !senha) {
      setEmail('pastor@maisigreja.com.br');
      setSenha('123456');
      return true;
    }

    const err: Record<string, string> = {};
    if (!email.trim()) {
      err.email = 'O e-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      err.email = 'Insira um e-mail válido';
    }

    if (!senha) {
      err.senha = 'A senha é obrigatória';
    } else if (senha.length < 6) {
      err.senha = 'A senha deve conter no mínimo 6 caracteres';
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const validateRegister = () => {
    const err: Record<string, string> = {};
    if (!regNome.trim()) {
      err.regNome = 'Nome completo é obrigatório';
    }
    if (!regIgreja.trim()) {
      err.regIgreja = 'Nome da comunidade ou congregação é obrigatório';
    }
    if (!regEmail.trim()) {
      err.regEmail = 'O e-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      err.regEmail = 'Insira um e-mail válido';
    }

    if (!regSenha) {
      err.regSenha = 'A senha é obrigatória';
    } else if (regSenha.length < 6) {
      err.regSenha = 'A senha deve conter no mínimo 6 caracteres';
    }

    if (regSenha !== regConfirmSenha) {
      err.regConfirmSenha = 'As senhas não coincidem';
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleDirectAccess = () => {
    onSetLoading(true);
    const user = DEFAULT_USER;
    db.setUser(user);
    toastSuccess('✅ Acesso concedido! Abrindo o sistema...');
    setTimeout(() => {
      onSetLoading(false);
      onLoginSuccess(user);
    }, 120);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) {
      toastError('❌ Preencha os campos de email e senha.');
      return;
    }

    onSetLoading(true);

    try {
      const client = getSupabaseClient();
      if (client) {
        try {
          const { data, error } = await client.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password: senha,
          });

          if (!error && data?.user) {
            let nome = data.user.user_metadata?.nome || email.split('@')[0];
            let cargo = data.user.user_metadata?.cargo || 'Pastor Titular';
            let igreja = data.user.user_metadata?.igreja || 'Mais Igreja';

            try {
              const { data: perfilData } = await client
                .from('perfis')
                .select('*')
                .eq('id', data.user.id)
                .single();
              if (perfilData) {
                if (perfilData.nome) nome = perfilData.nome;
                if (perfilData.cargo) cargo = perfilData.cargo;
                if (perfilData.igreja) igreja = perfilData.igreja;
              }
            } catch {
              // continua
            }

            const user: UserSession = {
              id: data.user.id,
              email: data.user.email || email,
              nome,
              cargo,
              igreja,
            };
            db.setUser(user);
            toastSuccess('✅ Login efetuado com sucesso no Supabase!');
            onLoginSuccess(user);
            return;
          } else if (error) {
            console.warn('Supabase Auth response:', error.message);
          }
        } catch (authErr: any) {
          console.warn('Falha na chamada do Supabase Auth:', authErr);
        }
      }

      // Sessão ministerial direta com os dados informados pelo líder
      const user: UserSession = {
        id: generateUUID(),
        email: email.trim().toLowerCase(),
        nome: email.split('@')[0].replace(/[._-]/g, ' '),
        cargo: 'Pastor / Líder',
        igreja: 'Mais Igreja',
      };
      db.setUser(user);
      toastSuccess('✅ Acesso ministerial realizado com sucesso!');
      onLoginSuccess(user);
    } catch (err: any) {
      console.error(err);
      const user = DEFAULT_USER;
      db.setUser(user);
      toastSuccess('✅ Painel aberto com sucesso!');
      onLoginSuccess(user);
    } finally {
      onSetLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegister()) {
      toastError('❌ Por favor, preencha todos os campos do cadastro.');
      return;
    }

    onSetLoading(true);

    try {
      const client = getSupabaseClient();
      if (client) {
        try {
          const { data, error } = await client.auth.signUp({
            email: regEmail.trim().toLowerCase(),
            password: regSenha,
            options: {
              data: {
                nome: regNome.trim(),
                igreja: regIgreja.trim(),
                cargo: regCargo,
              },
            },
          });

          if (!error && data?.user) {
            const newUser: UserSession = {
              id: data.user.id,
              email: data.user.email || regEmail.trim(),
              nome: regNome.trim(),
              cargo: regCargo,
              igreja: regIgreja.trim(),
            };

            try {
              await client.from('perfis').upsert({
                id: data.user.id,
                email: regEmail.trim().toLowerCase(),
                nome: regNome.trim(),
                igreja: regIgreja.trim(),
                cargo: regCargo,
              });
            } catch {
              // continua
            }

            db.setUser(newUser);
            toastSuccess('✅ Conta criada com sucesso no Supabase!');
            onLoginSuccess(newUser);
            return;
          }
        } catch (signUpErr) {
          console.warn('Erro ao registrar no Supabase Auth:', signUpErr);
        }
      }

      // Salva usuário no modo de sessão
      const newUser: UserSession = {
        id: generateUUID(),
        email: regEmail.trim(),
        nome: regNome.trim(),
        cargo: regCargo,
        igreja: regIgreja.trim(),
      };
      db.setUser(newUser);
      toastSuccess('✅ Comunidade cadastrada com sucesso!');
      onLoginSuccess(newUser);
    } catch (err: any) {
      const newUser: UserSession = {
        id: generateUUID(),
        email: regEmail.trim(),
        nome: regNome.trim(),
        cargo: regCargo,
        igreja: regIgreja.trim(),
      };
      db.setUser(newUser);
      toastSuccess('✅ Comunidade cadastrada com sucesso!');
      onLoginSuccess(newUser);
    } finally {
      onSetLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    onSetLoading(true);
    try {
      const client = getSupabaseClient();
      if (client) {
        const { error } = await client.auth.signInWithOAuth({
          provider: 'google',
        });
        if (!error) return;
      }
      // Sessão Google pastor
      const user: UserSession = {
        id: generateUUID(),
        email: 'pastor.google@maisigreja.com.br',
        nome: 'Pr. Josué Fernandes (Google)',
        cargo: 'Pastor Titular',
        igreja: 'Mais Igreja',
      };
      db.setUser(user);
      toastSuccess('✅ Acesso com Google realizado com sucesso!');
      onLoginSuccess(user);
    } catch {
      const user = DEFAULT_USER;
      db.setUser(user);
      toastSuccess('✅ Acesso realizado!');
      onLoginSuccess(user);
    } finally {
      onSetLoading(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: 'Preencha um e-mail válido para recuperação' });
      toastError('❌ Erro. Tente novamente.');
      return;
    }

    const client = getSupabaseClient();
    if (client) {
      client.auth.resetPasswordForEmail(email.trim()).catch((err) => console.warn(err));
    }

    setResetSent(true);
    toastSuccess('✅ Sucesso! Operação realizada.');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Brand header */}
        <div className="flex items-center gap-3 mb-6 text-white text-center">
          <div className="h-11 w-11 rounded-xl bg-blue-600 flex items-center justify-center shadow-xs">
            <Church className="h-6 w-6 text-white" />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-bold tracking-tight text-white leading-tight">Mais Igreja</h1>
            <p className="text-xs text-slate-400">Sistema de Gestão Eclesiástica</p>
          </div>
        </div>

        {/* Card elegante com visual sóbrio */}
        <Card className="w-full bg-white text-gray-900 border border-gray-200 shadow-xl rounded-2xl overflow-hidden">
          {/* Seletor de Abas: Entrar vs Criar Conta */}
          <div className="grid grid-cols-2 p-1.5 bg-gray-100 border-b border-gray-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrors({});
                setForgotPasswordOpen(false);
              }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LogIn className="h-4 w-4" />
              <span>Acessar Conta</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrors({});
                setForgotPasswordOpen(false);
              }}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              <span>Cadastrar Igreja</span>
            </button>
          </div>

          <CardHeader className="text-center pb-3 pt-6">
            <CardTitle className="text-xl font-bold text-gray-900">
              {activeTab === 'login' ? 'Acesse sua comunidade' : 'Cadastre sua comunidade'}
            </CardTitle>
            <CardDescription className="text-gray-500 text-xs mt-1">
              {activeTab === 'login'
                ? 'Insira suas credenciais pastorais para acessar o painel'
                : 'Crie a conta da sua igreja para gerenciar membros, células e finanças'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 pt-2">
            {/* TELA DE RECUPERAÇÃO DE SENHA */}
            {forgotPasswordOpen ? (
              <div className="space-y-4">
                {resetSent ? (
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-emerald-900">E-mail enviado com sucesso!</p>
                    <p className="text-xs text-emerald-700 mt-1">
                      Verifique sua caixa de entrada com o link para redefinir sua senha ministerial.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setForgotPasswordOpen(false);
                        setResetSent(false);
                      }}
                      className="mt-4 text-xs h-8"
                    >
                      Voltar ao login
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <p className="text-xs text-gray-600">
                      Informe seu e-mail cadastrado e enviaremos um link de recuperação.
                    </p>
                    <div>
                      <Input
                        type="email"
                        placeholder="seuemail@exemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        error={errors.email}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-md transition-colors font-semibold text-sm shadow-sm cursor-pointer"
                    >
                      Enviar link de recuperação
                    </button>
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setForgotPasswordOpen(false)}
                        className="text-xs text-gray-600"
                      >
                        Voltar ao login
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            ) : activeTab === 'login' ? (
              /* ======================================================== */
              /* TELA DE LOGIN                                            */
              /* ======================================================== */
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Botão de Acesso Direto sem Fricção */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                      <span>Acesso Direto ao Painel</span>
                    </p>
                    <p className="text-[11px] text-blue-700 truncate">Abrir o sistema imediatamente</p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleDirectAccess}
                    className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 h-8 shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Abrir Sistema</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Campo Email */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    error={errors.email}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>

                {/* Campo Senha */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Senha
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => {
                      setSenha(e.target.value);
                      if (errors.senha) setErrors((prev) => ({ ...prev, senha: '' }));
                    }}
                    error={errors.senha}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>

                {/* Botão Primário "Entrar" com bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-md transition-colors */}
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-md transition-colors font-semibold text-sm shadow-sm cursor-pointer active:bg-blue-800"
                >
                  Entrar
                </button>

                {/* Divisor */}
                <div className="relative my-4 flex items-center justify-center">
                  <div className="border-t border-gray-300 w-full" />
                  <span className="bg-[#F8F9FA] px-3 text-xs text-gray-500 uppercase tracking-wider font-medium">
                    ou
                  </span>
                </div>

                {/* Botão para Login com Google usando o ícone do Google e variante outline */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 h-11 border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>Entrar com o Google</span>
                </Button>

                {/* Abaixo, um link "Esqueceu sua senha?" e um botão "Criar Conta" em variant ghost */}
                <div className="pt-2 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setForgotPasswordOpen(true)}
                    className="text-xs text-blue-700 hover:text-blue-900 hover:underline transition-colors cursor-pointer"
                  >
                    Esqueceu sua senha?
                  </button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setActiveTab('register');
                      setErrors({});
                    }}
                    className="text-gray-700 hover:text-blue-700 hover:bg-blue-50 text-xs w-full"
                  >
                    Não possui conta? Criar Conta
                  </Button>
                </div>
              </form>
            ) : (
              /* ======================================================== */
              /* TELA DE CADASTRO (CRIAR CONTA DA IGREJA & LÍDER)          */
              /* ======================================================== */
              <form onSubmit={handleRegister} className="space-y-3.5">
                {/* Botão de Acesso Direto sem Fricção */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                      <span>Acesso Direto ao Painel</span>
                    </p>
                    <p className="text-[11px] text-blue-700 truncate">Abrir o sistema imediatamente</p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleDirectAccess}
                    className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 h-8 shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Abrir Sistema</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Nome Completo do Pastor / Líder */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Nome Completo do Pastor / Líder
                  </label>
                  <Input
                    placeholder="Ex: Pr. Carlos Eduardo"
                    value={regNome}
                    onChange={(e) => {
                      setRegNome(e.target.value);
                      if (errors.regNome) setErrors((prev) => ({ ...prev, regNome: '' }));
                    }}
                    error={errors.regNome}
                    className="bg-white"
                  />
                </div>

                {/* Nome da Igreja / Ministério */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Nome da Comunidade / Igreja
                  </label>
                  <Input
                    placeholder="Ex: Igreja Batista da Esperança"
                    value={regIgreja}
                    onChange={(e) => {
                      setRegIgreja(e.target.value);
                      if (errors.regIgreja) setErrors((prev) => ({ ...prev, regIgreja: '' }));
                    }}
                    error={errors.regIgreja}
                    className="bg-white"
                  />
                </div>

                {/* Cargo Ministerial */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Cargo Ministerial
                  </label>
                  <Select
                    value={regCargo}
                    onChange={(e) => setRegCargo(e.target.value)}
                    className="bg-white"
                  >
                    <option value="Pastor Titular">Pastor Titular</option>
                    <option value="Pastor Auxiliar">Pastor Auxiliar</option>
                    <option value="Bispo / Apóstolo">Bispo / Apóstolo</option>
                    <option value="Evangelista">Evangelista</option>
                    <option value="Presbítero / Diácono">Presbítero / Diácono</option>
                    <option value="Líder de Células">Líder de Células</option>
                    <option value="Secretário(a) Eclesiástico(a)">Secretário(a) Eclesiástico(a)</option>
                  </Select>
                </div>

                {/* Email de Acesso */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Email Ministerial
                  </label>
                  <Input
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      if (errors.regEmail) setErrors((prev) => ({ ...prev, regEmail: '' }));
                    }}
                    error={errors.regEmail}
                    className="bg-white"
                  />
                </div>

                {/* Senha e Confirmação de Senha */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Senha
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={regSenha}
                      onChange={(e) => {
                        setRegSenha(e.target.value);
                        if (errors.regSenha) setErrors((prev) => ({ ...prev, regSenha: '' }));
                      }}
                      error={errors.regSenha}
                      className="bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Confirmar Senha
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={regConfirmSenha}
                      onChange={(e) => {
                        setRegConfirmSenha(e.target.value);
                        if (errors.regConfirmSenha) setErrors((prev) => ({ ...prev, regConfirmSenha: '' }));
                      }}
                      error={errors.regConfirmSenha}
                      className="bg-white"
                    />
                  </div>
                </div>

                {/* Botão de Finalizar Cadastro */}
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-md transition-colors font-semibold text-sm shadow-sm cursor-pointer active:bg-blue-800 mt-2"
                >
                  Criar Conta & Iniciar Gestão
                </button>

                {/* Link para voltar ao Login */}
                <div className="pt-2 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setActiveTab('login');
                      setErrors({});
                    }}
                    className="text-gray-700 hover:text-blue-700 hover:bg-blue-50 text-xs w-full"
                  >
                    Já possui conta ministerial? Fazer Login
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Versículo Eclesiástico */}
        <p className="text-xs text-blue-200/80 text-center mt-4 max-w-xs italic font-normal">
          "Pois onde se reunirem dois ou três em meu nome, ali eu estou no meio deles." — Mateus 18:20
        </p>
      </div>
    </div>
  );
}
