import React, { useState, useEffect } from 'react';
import {
  Church,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Users,
  UserPlus,
  Group,
  Calendar,
  DollarSign,
  HeartHandshake,
  FileText,
  Lock,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  LogIn,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Building2,
  Database,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { useToast } from './ui/toast';
import type { SaaSPlanConfig } from '../types/database';

interface PlanosViewProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister?: () => void;
  isLoggedIn?: boolean;
  onReturnToDashboard?: () => void;
}

const FALLBACK_PLAN: SaaSPlanConfig = {
  id: 'plano-mensal-saas',
  name: 'Plano Mensal',
  price: 50.0,
  currency: 'BRL',
  period: 'mensal',
  description: 'Acesso completo a todos os módulos de gestão eclesiástica para sua igreja.',
  benefits: [
    'Gestão completa de membros e fichas ministeriais',
    'Cadastro e acompanhamento de visitantes e obreiros',
    'Gestão de células, congregações e departamentos',
    'Agenda eclesiástica e calendário de cultos e eventos',
    'Controle financeiro com livro-caixa e plano de contas',
    'Registro de dízimos, ofertas e emissão de comprovantes',
    'Emissão de relatórios administrativos e atas de secretaria',
    'Gestão de usuários, cargos e permissões de acesso',
    'Banco de dados em nuvem Supabase com segurança integrada',
  ],
  checkout_url: '',
  product_id: '',
  is_published: true,
  updated_at: new Date().toISOString(),
};

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_LIST: FAQItem[] = [
  {
    question: 'Como funciona a cobrança mensal recorrente?',
    answer:
      'A assinatura tem periodicidade mensal e o processamento é realizado de forma 100% segura através da plataforma Kiwify. A renovação acontece a cada 30 dias na data de contratação.',
  },
  {
    question: 'Como o acesso ao sistema é liberado após o pagamento?',
    answer:
      'A liberação é automática e imediata. Assim que a Kiwify confirma o pagamento via webhook oficial autenticado, o acesso da sua congregação é liberado em tempo real com todos os módulos disponíveis.',
  },
  {
    question: 'Quais formas de pagamento são aceitas na Kiwify?',
    answer:
      'O checkout oficial da Kiwify aceita Cartão de Crédito (com renovação mensal automática sem necessidade de intervenção manual) e PIX.',
  },
  {
    question: 'Posso cancelar a assinatura se necessário?',
    answer:
      'Sim, a qualquer momento sem fidelidade ou multas rescisórias. O cancelamento pode ser solicitado diretamente no painel da sua congregação ou via suporte Kiwify.',
  },
  {
    question: 'Onde ficam armazenados os dados da minha igreja?',
    answer:
      'Seus dados são armazenados na nuvem do Supabase com isolamento de registros por igreja, criptografia em trânsito e rotinas de backup para assegurar sigilo e confiabilidade dos dados da congregação.',
  },
];

export function PlanosView({
  onNavigateToLogin,
  onNavigateToRegister,
  isLoggedIn = false,
  onReturnToDashboard,
}: PlanosViewProps) {
  const { toastInfo } = useToast();
  const [plan, setPlan] = useState<SaaSPlanConfig>(FALLBACK_PLAN);
  const [loading, setLoading] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchPlan() {
      try {
        const res = await fetch('/api/plans/current');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.plan) {
            setPlan(data.plan);
          }
        }
      } catch (err) {
        console.warn('Usando configuração padrão de plano:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchPlan();
    return () => {
      isMounted = false;
    };
  }, []);

  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: plan.currency || 'BRL',
  }).format(plan.price);

  const handleAssinarAgora = () => {
    if (plan.checkout_url && plan.checkout_url.trim().length > 0) {
      setRedirecting(true);
      window.location.href = plan.checkout_url.trim();
      return;
    }

    // Se o checkout da Kiwify ainda não foi inserido no painel de administração
    toastInfo(
      'O link oficial de checkout Kiwify está sendo configurado pelo administrador. Você pode criar o cadastro da sua congregação agora mesmo!'
    );
    if (onNavigateToRegister) {
      onNavigateToRegister();
    } else {
      onNavigateToLogin();
    }
  };

  const benefitIcons = [
    Users,
    UserPlus,
    Group,
    Calendar,
    DollarSign,
    HeartHandshake,
    FileText,
    ShieldCheck,
    Database,
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-900/30">
              <Church className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-white leading-tight">
                Mais Igreja
              </span>
              <span className="hidden sm:inline-block text-xs text-slate-400 font-medium ml-2 border-l border-slate-700 pl-2">
                Gestão Eclesiástica SaaS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isLoggedIn && onReturnToDashboard ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onReturnToDashboard}
                className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs cursor-pointer"
              >
                <Church className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
                <span>Voltar ao Sistema</span>
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNavigateToLogin}
                  className="text-slate-300 hover:text-white hover:bg-slate-800 text-xs cursor-pointer"
                >
                  <LogIn className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
                  <span>Entrar no Sistema</span>
                </Button>
                {onNavigateToRegister && (
                  <Button
                    size="sm"
                    onClick={onNavigateToRegister}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                  >
                    <span>Cadastrar Igreja</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        {/* Subtle glow background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/50 text-blue-300 text-xs font-semibold mb-6">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          <span>Assinatura Mensal Recorrente com Processamento Kiwify</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl mx-auto">
          Gestão completa para sua igreja
        </h1>

        <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Centralize membros, departamentos, secretaria, atas e o controle financeiro da sua
          congregação em uma plataforma moderna, segura e acessível de qualquer dispositivo.
        </p>

        {/* Informações rápidas de conformidade */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Sem taxa de adesão</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Cancelamento a qualquer momento</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Liberação imediata via Kiwify</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Dados em nuvem no Supabase</span>
          </div>
        </div>
      </section>

      {/* Featured Plan Card Section */}
      <section className="px-4 sm:px-6 pb-20 max-w-4xl mx-auto w-full">
        <div className="relative">
          {/* Card Border Highlight */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur-xs opacity-75" />

          <Card className="relative bg-slate-900 border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-10 text-slate-100">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Plan Info & Price */}
              <div className="lg:col-span-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 pb-8 lg:pb-0 lg:pr-8">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                    <Building2 className="h-4 w-4" />
                    <span>Plano Oficial</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                    {plan.name || 'Plano Mensal'}
                  </h2>

                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {plan.description ||
                      'Acesso completo a todos os módulos de gestão eclesiástica para sua igreja.'}
                  </p>
                </div>

                <div className="my-8">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Investimento
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                      {formattedPrice}
                    </span>
                    <span className="text-sm font-medium text-slate-400">
                      / {plan.period || 'mês'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-blue-400" />
                    <span>Cobrança mensal recorrente via Kiwify</span>
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleAssinarAgora}
                    disabled={redirecting}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 text-base rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{redirecting ? 'Conectando à Kiwify...' : 'Assinar agora'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  <p className="text-[11px] text-center text-slate-400 leading-tight">
                    Pagamento processado em ambiente criptografado e seguro da Kiwify.
                  </p>
                </div>
              </div>

              {/* Right Column: Real Modules & Benefits */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    O que está incluído na sua assinatura:
                  </h3>
                  <span className="text-xs font-bold text-blue-400 bg-blue-950/80 border border-blue-800/60 px-2.5 py-1 rounded-full">
                    Acesso Ilimitado
                  </span>
                </div>

                <ul className="space-y-3 pt-2">
                  {plan.benefits.map((benefit, idx) => {
                    const IconComponent = benefitIcons[idx % benefitIcons.length];
                    return (
                      <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-200">
                        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-600/20 text-blue-400 shrink-0 mt-0.5 border border-blue-500/30">
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                        </div>
                        <span className="leading-snug">{benefit}</span>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-6 pt-4 border-t border-slate-800/80 bg-slate-950/40 rounded-xl p-3.5 flex items-center gap-3 text-xs text-slate-300">
                  <Lock className="h-4 w-4 text-emerald-400 shrink-0" />
                  <p className="leading-relaxed">
                    <strong>Garantia de Continuidade:</strong> Seus dados ficam protegidos e salvos na nuvem mesmo em eventuais trocas de aparelho ou computador.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Perguntas Frequentes (FAQ) */}
      <section className="px-4 sm:px-6 pb-20 max-w-3xl mx-auto w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
            <HelpCircle className="h-4 w-4" />
            <span>Dúvidas Frequentes</span>
          </div>
          <h2 className="text-2xl font-black text-white">Orientações sobre a Assinatura</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Tudo o que você precisa saber sobre o modelo de contratação e pagamento.
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_LIST.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="border border-slate-800 rounded-xl bg-slate-900/60 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left font-semibold text-sm text-white hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <span>{faq.question}</span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-blue-400 shrink-0 ml-3" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-3" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-slate-300 border-t border-slate-800/60 leading-relaxed bg-slate-950/30">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Call to action de rodapé */}
      <section className="border-t border-slate-800/80 bg-slate-900/40 py-12 px-4 text-center">
        <div className="max-w-xl mx-auto space-y-4">
          <h3 className="text-xl font-black text-white">Pronto para organizar a gestão da sua igreja?</h3>
          <p className="text-xs sm:text-sm text-slate-400">
            Comece hoje mesmo com o Plano Mensal de {formattedPrice} e tenha controle total sobre membros, finanças e ministérios.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={handleAssinarAgora}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer"
            >
              <span>Assinar agora</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
            <Button
              variant="outline"
              onClick={onNavigateToLogin}
              className="w-full sm:w-auto border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer text-xs"
            >
              <LogIn className="h-3.5 w-3.5 mr-1.5" />
              <span>Já possui uma conta? Entrar</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 px-4 text-center text-xs text-slate-500">
        <p>
          Mais Igreja &copy; {new Date().getFullYear()} — Plataforma de Gestão Eclesiástica SaaS.
          Processamento financeiro operado via Kiwify.
        </p>
      </footer>
    </div>
  );
}
