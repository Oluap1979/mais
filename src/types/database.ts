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
