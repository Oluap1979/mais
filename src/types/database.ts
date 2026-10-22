export type MemberStatus = 'ativo' | 'inativo' | 'em_observacao';
export type FinancialType = 'receita' | 'despesa';

export interface Celula {
  id: string;
  nome: string;
  lider_id: string | null;
  lider_nome?: string;
  endereco: string;
  observacoes: string;
  membros_count?: number;
  user_id: string;
  created_at: string;
}

export interface Membro {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  telefone: string;
  data_nascimento: string;
  celula_id: string | null;
  celula_nome?: string;
  status: MemberStatus;
  created_at: string;
}

export interface RegistroFinanceiro {
  id: string;
  user_id: string;
  tipo: FinancialType;
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
  created_at: string;
}

export interface DocumentoSecretaria {
  id: string;
  user_id: string;
  titulo: string;
  conteudo: string;
  data_criacao: string;
  tipo: string;
}

export interface UserSession {
  id: string;
  email: string;
  nome: string;
  cargo: string;
  igreja: string;
}

// ----------------------------------------------------------------------
// NOVO MODELO DE ASSINATURAS MENSAIS RECORRENTES (KIWIFY SAAS)
// ----------------------------------------------------------------------
export type SubscriptionStatus =
  | 'pending'    // Pagamento ou assinatura ainda não confirmados
  | 'active'     // Assinatura válida e acesso liberado
  | 'past_due'   // Pagamento vencido ou pendente de regularização
  | 'canceled'   // Assinatura cancelada
  | 'expired'    // Assinatura expirada
  | 'suspended'; // Acesso suspenso por decisão administrativa

export type LicenseStatus = SubscriptionStatus;

export interface SubscriptionAuditEvent {
  id: string;
  event_type: string;
  description: string;
  kiwify_order_id?: string;
  kiwify_subscription_id?: string;
  data?: any;
  created_at: string;
}

export interface ChurchSubscription {
  id: string;
  igreja_id: string;
  igreja_nome: string;
  user_id?: string;
  user_email: string;
  responsavel_nome?: string;
  cargo?: string;
  kiwify_product_id?: string;
  kiwify_subscription_id?: string;
  kiwify_order_id?: string;
  status: SubscriptionStatus;
  start_date: string;
  last_payment_date?: string;
  next_due_date?: string;
  canceled_at?: string;
  last_webhook_at?: string;
  events_history?: SubscriptionAuditEvent[];
  created_at: string;
  updated_at: string;
}

// Compatibilidade de interface para componentes que exibem a assinatura da igreja
export interface ChurchLicense {
  status: 'active' | 'past_due' | 'canceled' | 'expired' | 'pending' | 'suspended';
  subscriptionId?: string;
  igrejaNome?: string;
  email?: string;
  nextDueDate?: string;
  lastPaymentDate?: string;
  kiwifySubscriptionId?: string;
  checkoutUrl?: string;
  daysRemaining?: number;
}

export interface AgendaItem {
  id: string;
  user_id?: string;
  titulo: string;
  dia_horario: string;
  descricao: string;
  local?: string;
  cor?: 'blue' | 'green' | 'indigo' | 'purple' | 'amber' | 'rose';
  created_at?: string;
}
