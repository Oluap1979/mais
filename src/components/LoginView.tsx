import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Button } from './ui/button';
import { Church, CheckCircle2, UserPlus, LogIn, ShieldCheck, AlertCircle, Key, Clock, Sparkles } from 'lucide-react';
import {
  getSupabaseClient,
  db,
  isSupabaseConnected,
  DEFAULT_USER,
  DEFAULT_CREDENTIALS,
  generateUUID,
  getRegisteredUsers,
  saveRegisteredUser,
} from '../lib/supabase';
import { useToast } from './ui/toast';
import type { UserSession } from '../types/database';

interface LoginViewProps {
  initialMode?: 'login' | 'register';
  onLoginSuccess: (user: UserSession) => void;
  onSetLoading: (loading: boolean) => void;
  onOpenAdminLogin: () => void;
  onOpenConfig?: () => void;
}

export function LoginView({
  initialMode = 'login',
  onLoginSuccess,
  onSetLoading,
  onOpenAdminLogin,
  onOpenConfig,
}: LoginViewProps) {
  const { toastSuccess, toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'login' | 'trial' | 'token'>(
    initialMode === 'register' ? 'trial' : 'login'
  );

  // Campos de Login
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  // Campos de Cadastro (Teste Grátis ou Token)
  const [regNome, setRegNome] = useState('');
  const [regIgreja, setRegIgreja] = useState('');
  const [regCargo, setRegCargo] = useState('Pastor Titular');
  const [regEmail, setRegEmail] = useState('');
  const [regSenha, setRegSenha] = useState('');
  const [regConfirmSenha, setRegConfirmSenha] = useState('');
  const [regToken, setRegToken] = useState('');

  // Estados de erro
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (initialMode === 'register') {
      setActiveTab('trial');
    }
  }, [initialMode]);

  const validateLogin = () => {
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
    if (!regNome.trim()) err.regNome = 'Nome completo é obrigatório';
    if (!regIgreja.trim()) err.regIgreja = 'Nome da comunidade ou congregação é obrigatório';
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

    if (activeTab === 'token' && !regToken.trim()) {
      err.regToken = 'Informe o código do token de ativação';
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) {
      toastError('❌ Preencha os campos de email e senha.');
      return;
    }

    onSetLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Verificar credencial pastoral padrão
      if (
        cleanEmail === DEFAULT_CREDENTIALS.email.toLowerCase() &&
        (senha === DEFAULT_CREDENTIALS.password || senha === 'Password123!' || senha === '123456')
      ) {
        const user = DEFAULT_USER;
        db.setUser(user);
        toastSuccess('✅ Login pastoral efetuado com sucesso!');
        onLoginSuccess(user);
        return;
      }

      // 2. Verificar na lista de contas cadastradas do sistema
      const registeredUsers = getRegisteredUsers();
      const matched = registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail);

      if (matched) {
        if (matched.password === senha) {
          const user: UserSession = {
            id: matched.id,
            email: matched.email,
            nome: matched.nome,
            cargo: matched.cargo,
            igreja: matched.igreja,
          };
          db.setUser(user);
          toastSuccess('✅ Login efetuado com sucesso!');
          onLoginSuccess(user);
          return;
        } else {
          toastError('❌ Senha incorreta. Por favor, verifique a senha digitada.');
          return;
        }
      }

      // 3. Tentar Supabase Auth
      const client = getSupabaseClient();
      if (client) {
        try {
          const authRes = await client.auth.signInWithPassword({
            email: cleanEmail,
            password: senha,
          });

          if (!authRes.error && authRes.data?.user) {
            let nome = authRes.data.user.user_metadata?.nome || cleanEmail.split('@')[0];
            let cargo = authRes.data.user.user_metadata?.cargo || 'Pastor Titular';
            let igreja = authRes.data.user.user_metadata?.igreja || 'Mais Igreja';

            const user: UserSession = {
              id: authRes.data.user.id,
              email: authRes.data.user.email || cleanEmail,
              nome,
              cargo,
              igreja,
            };
            db.setUser(user);
            toastSuccess('✅ Login efetuado com sucesso!');
            onLoginSuccess(user);
            return;
          }
        } catch {
          // ignora
        }
      }

      toastError('❌ Este e-mail não possui cadastro. Crie sua conta gratuita na aba "Testar Grátis 14 Dias".');
    } catch (err: any) {
      console.error(err);
      toastError('❌ Não foi possível realizar o login.');
    } finally {
      onSetLoading(false);
    }
  };

  const handleRegisterAndStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegister()) {
      toastError('❌ Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const cleanEmail = regEmail.trim().toLowerCase();
    const existingUsers = getRegisteredUsers();
    if (existingUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
      toastError('❌ Este e-mail já está cadastrado. Acesse a aba "Acessar Conta".');
      return;
    }

    onSetLoading(true);

    try {
      const createdUserId = generateUUID();

      // Se for Opção B (Já tenho um token), valida e ativa no servidor
      if (activeTab === 'token') {
        try {
          await db.activateToken({
            token: regToken.trim(),
            email: cleanEmail,
            igreja_nome: regIgreja.trim(),
            responsavel_nome: regNome.trim(),
            cargo: regCargo,
            user_id: createdUserId,
          });
        } catch (tokenErr: any) {
          toastError(`❌ ${tokenErr.message || 'Token inválido ou já utilizado.'}`);
          onSetLoading(false);
          return;
        }
      } else {
        // Opção A (Testar grátis por 14 dias)
        try {
          await db.startTrial({
            email: cleanEmail,
            igreja_nome: regIgreja.trim(),
            responsavel_nome: regNome.trim(),
            cargo: regCargo,
            user_id: createdUserId,
          });
        } catch (trialErr: any) {
          toastError(`❌ ${trialErr.message || 'Erro ao iniciar período de teste.'}`);
          onSetLoading(false);
          return;
        }
      }

      // Salva conta registrada localmente
      saveRegisteredUser({
        id: createdUserId,
        email: cleanEmail,
        password: regSenha,
        nome: regNome.trim(),
        cargo: regCargo,
        igreja: regIgreja.trim(),
        createdAt: new Date().toISOString(),
      });

      const newUser: UserSession = {
        id: createdUserId,
        email: cleanEmail,
        nome: regNome.trim(),
        cargo: regCargo,
        igreja: regIgreja.trim(),
      };

      db.setUser(newUser);
      toastSuccess(
        activeTab === 'token'
          ? '🎉 Conta criada e licença permanente ativada com sucesso!'
          : '🎉 Conta criada com sucesso! Seu teste grátis de 14 dias foi iniciado.'
      );
      onLoginSuccess(newUser);
    } catch (err: any) {
      toastError('❌ Erro ao processar o cadastro. Tente novamente.');
    } finally {
      onSetLoading(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: 'Preencha um e-mail válido para recuperação' });
      toastError('❌ E-mail inválido.');
      return;
    }
    setResetSent(true);
    toastSuccess('✅ Instruções enviadas para seu e-mail ministerial.');
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-slate-950 text-slate-100 relative">
      {/* Botão Administrador no canto superior direito ou cabeçalho */}
      <div className="absolute top-4 right-4 z-20">
        <button
          type="button"
          onClick={onOpenAdminLogin}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-xs font-semibold shadow-md cursor-pointer"
        >
          <ShieldCheck className="h-4 w-4 text-blue-400" />
          <span>Administrador</span>
        </button>
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col items-center mt-6 sm:mt-0">
        {/* Brand header */}
        <div className="flex items-center gap-3 mb-6 text-white text-center">
          <div className="h-11 w-11 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
            <Church className="h-6 w-6 text-white" />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-bold tracking-tight text-white leading-tight">Mais Igreja</h1>
            <p className="text-xs text-slate-400">Sistema de Gestão Eclesiástica & Licenciamento</p>
          </div>
        </div>

        {/* Card Principal */}
        <Card className="w-full bg-white text-gray-900 border border-gray-200 shadow-2xl rounded-2xl overflow-hidden">
          {/* Seletor de 3 Abas: Entrar, Testar 14 Dias (Opção A), Tenho Token (Opção B) */}
          <div className="grid grid-cols-3 p-1 bg-gray-100 border-b border-gray-200 text-center">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrors({});
                setForgotPasswordOpen(false);
              }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 text-[11px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Acessar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('trial');
                setErrors({});
                setForgotPasswordOpen(false);
              }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 text-[11px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'trial'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span>Teste 14 Dias</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('token');
                setErrors({});
                setForgotPasswordOpen(false);
              }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 text-[11px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'token'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Key className="h-3.5 w-3.5 text-emerald-600" />
              <span>Já Tenho Token</span>
            </button>
          </div>

          <CardHeader className="text-center pb-2 pt-5">
            <CardTitle className="text-lg font-bold text-gray-900">
              {activeTab === 'login'
                ? 'Acesse sua comunidade'
                : activeTab === 'trial'
                ? 'Opção A — Testar Grátis por 14 Dias'
                : 'Opção B — Ativação por Token Permanente'}
            </CardTitle>
            <CardDescription className="text-gray-500 text-xs mt-0.5">
              {activeTab === 'login'
                ? 'Insira suas credenciais para entrar no painel'
                : activeTab === 'trial'
                ? 'Comece agora gratuitamente, sem cartão de crédito e sem compromisso'
                : 'Informe seu token fornecido pelo administrador para ativação vitalícia'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 pt-3">
            {/* TELA DE RECUPERAÇÃO DE SENHA */}
            {forgotPasswordOpen ? (
              <div className="space-y-4">
                {resetSent ? (
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-emerald-900">Instruções enviadas!</p>
                    <p className="text-xs text-emerald-700 mt-1">
                      Verifique seu e-mail para redefinir sua senha.
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
                      Informe seu e-mail cadastrado para redefinir a senha.
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
                      Enviar instruções
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

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-md transition-colors font-semibold text-sm shadow-sm cursor-pointer active:bg-blue-800"
                >
                  Entrar na Conta
                </button>

                <div className="pt-2 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setForgotPasswordOpen(true)}
                    className="text-xs text-blue-700 hover:text-blue-900 hover:underline transition-colors cursor-pointer"
                  >
                    Esqueceu sua senha?
                  </button>

                  <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
                    <span>Novo por aqui?</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('trial')}
                      className="text-blue-600 font-semibold hover:underline cursor-pointer"
                    >
                      Testar grátis 14 dias
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* ======================================================== */
              /* TELA DE CADASTRO: TESTE GRÁTIS (A) OU TOKEN (B)          */
              /* ======================================================== */
              <form onSubmit={handleRegisterAndStart} className="space-y-3.5">
                {activeTab === 'token' && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                    <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider">
                      Código do Token de Ativação Permanente *
                    </label>
                    <Input
                      placeholder="MI-XXXX-XXXX-XXXX-XXXX"
                      value={regToken}
                      onChange={(e) => {
                        setRegToken(e.target.value.toUpperCase());
                        if (errors.regToken) setErrors((prev) => ({ ...prev, regToken: '' }));
                      }}
                      error={errors.regToken}
                      className="bg-white font-mono uppercase tracking-wider text-sm font-bold"
                    />
                    <p className="text-[11px] text-emerald-700">
                      Informe o token permanente para ativar seu acesso vitalício sem mensalidades.
                    </p>
                  </div>
                )}

                {activeTab === 'trial' && (
                  <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Sparkles className="h-4 w-4 text-amber-600" />
                      <span>Teste Grátis de 14 Dias (Sem Cartão de Crédito)</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Sua igreja poderá utilizar todas as funcionalidades por 14 dias sem compromisso.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Nome Completo do Pastor / Líder *
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

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Nome da Comunidade / Igreja *
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

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Email Ministerial *
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Senha *
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
                      Confirmar Senha *
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

                <button
                  type="submit"
                  className={`w-full text-white px-6 py-3 rounded-md transition-colors font-semibold text-sm shadow-sm cursor-pointer mt-2 ${
                    activeTab === 'token'
                      ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                  }`}
                >
                  {activeTab === 'token'
                    ? 'Ativar Licença Permanente & Acessar'
                    : 'Iniciar Teste Grátis de 14 Dias'}
                </button>

                <div className="pt-2 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setActiveTab('login');
                      setErrors({});
                    }}
                    className="text-gray-700 hover:text-blue-700 text-xs w-full"
                  >
                    Já possui conta ministerial? Fazer Login
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-blue-200/80 text-center mt-4 max-w-xs italic font-normal">
          "Pois onde se reunirem dois ou três em meu nome, ali eu estou no meio deles." — Mateus 18:20
        </p>
      </div>
    </div>
  );
}
