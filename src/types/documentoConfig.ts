export interface IgrejaHeaderConfig {
  nomeIgreja: string;
  subtitulo: string;
  denominacao: string;
  cnpj: string;
  endereco: string;
  bairro: string;
  cidadeEstado: string;
  cep: string;
  telefone: string;
  email: string;
  website: string;
  logoUrl: string;
  logoHeight: number; // 40 a 110
  nomePastor: string;
  cargoPastor: string;
  registroPastor: string;
  nomeSecretario: string;
  cargoSecretario: string;
  estiloCabecalho: 'moderno' | 'classico' | 'centralizado';
  temaCor: 'navy' | 'dourado' | 'borgonha' | 'monocromatico';
  marcaDagua: boolean;
  seloChancelaria: boolean;
}

export const STORAGE_KEY_CABECALHO = 'mais_igreja_config_cabecalho';

export const DEFAULT_HEADER_CONFIG: IgrejaHeaderConfig = {
  nomeIgreja: 'Igreja Evangélica Comunidade da Fé',
  subtitulo: 'Ministério Pastoral & Secretaria Geral Eclesiástica',
  denominacao: 'Filiada à Convenção Geral de Ministros Evangélicos',
  cnpj: '12.345.678/0001-90',
  endereco: 'Avenida das Nações, 1.250',
  bairro: 'Jardim Primavera',
  cidadeEstado: 'São Paulo - SP',
  cep: '01310-100',
  telefone: '(11) 3214-5678 / (11) 98765-4321',
  email: 'secretaria@comunidadedafe.org.br',
  website: 'www.comunidadedafe.org.br',
  logoUrl: '',
  logoHeight: 68,
  nomePastor: 'Pr. Carlos Eduardo da Silva',
  cargoPastor: 'Pastor Presidente Titular',
  registroPastor: 'CGADB / Reg. 42.189',
  nomeSecretario: 'Miss. Maria Aparecida Oliveira',
  cargoSecretario: 'Secretária Geral Eclesiástica',
  estiloCabecalho: 'moderno',
  temaCor: 'navy',
  marcaDagua: true,
  seloChancelaria: true,
};

export function getSavedHeaderConfig(userIgreja?: string, userNome?: string, userCargo?: string): IgrejaHeaderConfig {
  if (typeof window === 'undefined') return DEFAULT_HEADER_CONFIG;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CABECALHO);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_HEADER_CONFIG, ...parsed };
    }
  } catch {
    // fallback
  }

  return {
    ...DEFAULT_HEADER_CONFIG,
    nomeIgreja: userIgreja || DEFAULT_HEADER_CONFIG.nomeIgreja,
    nomePastor: userNome || DEFAULT_HEADER_CONFIG.nomePastor,
    cargoPastor: userCargo || DEFAULT_HEADER_CONFIG.cargoPastor,
  };
}

export function saveHeaderConfig(config: IgrejaHeaderConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CABECALHO, JSON.stringify(config));
  } catch (err) {
    console.error('Erro ao salvar configuração do cabeçalho:', err);
  }
}
