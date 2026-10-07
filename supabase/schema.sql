-- =========================================================
-- SISTEMA DE GESTÃO ECLESIÁSTICA "MAIS IGREJA"
-- Script SQL para Supabase (DDL, Tipos, RLS, Perfis e Permissões)
-- =========================================================

-- Habilitar extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. TABELA DE PERFIS / CADASTRO DE LÍDERES E IGREJAS
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    igreja TEXT NOT NULL,
    cargo TEXT DEFAULT 'Pastor Titular',
    telefone TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 1. TABELA DE CÉLULAS
CREATE TABLE IF NOT EXISTS public.celulas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    lider_id UUID, -- Referencia tabela membros (criada logo abaixo)
    endereco TEXT,
    observacoes TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. TABELA DE MEMBROS
CREATE TABLE IF NOT EXISTS public.membros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefone TEXT,
    data_nascimento DATE,
    celula_id UUID REFERENCES public.celulas(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'em_observacao')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Vincular foreign key de celulas para lider_id em membros
ALTER TABLE public.celulas 
    DROP CONSTRAINT IF EXISTS fk_celulas_lider,
    ADD CONSTRAINT fk_celulas_lider FOREIGN KEY (lider_id) REFERENCES public.membros(id) ON DELETE SET NULL;

-- 3. TABELA DE FINANCEIRO
CREATE TABLE IF NOT EXISTS public.financeiro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    descricao TEXT,
    valor NUMERIC(10, 2) NOT NULL,
    data DATE NOT NULL,
    categoria TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. TABELA DE SECRETARIA
CREATE TABLE IF NOT EXISTS public.secretaria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    titulo TEXT NOT NULL,
    conteudo TEXT,
    data_criacao TIMESTAMPTZ DEFAULT now() NOT NULL,
    tipo TEXT -- Ex: Ata de Reunião, Certificado de Batismo, Carta de Recomendação, Edital
);

-- =========================================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- Garante que cada igreja/usuário acesse apenas seus dados
-- =========================================================

ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.celulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secretaria ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para 'perfis'
DROP POLICY IF EXISTS "Usuários visualizam seu próprio perfil" ON public.perfis;
CREATE POLICY "Usuários visualizam seu próprio perfil"
    ON public.perfis
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários atualizam seu próprio perfil" ON public.perfis;
CREATE POLICY "Usuários atualizam seu próprio perfil"
    ON public.perfis
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários inserem seu próprio perfil" ON public.perfis;
CREATE POLICY "Usuários inserem seu próprio perfil"
    ON public.perfis
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Políticas de acesso para 'celulas'
DROP POLICY IF EXISTS "Usuários gerenciam suas próprias celulas" ON public.celulas;
CREATE POLICY "Usuários gerenciam suas próprias celulas"
    ON public.celulas
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas de acesso para 'membros'
DROP POLICY IF EXISTS "Usuários gerenciam seus próprios membros" ON public.membros;
CREATE POLICY "Usuários gerenciam seus próprios membros"
    ON public.membros
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas de acesso para 'financeiro'
DROP POLICY IF EXISTS "Usuários gerenciam seus próprios registros financeiros" ON public.financeiro;
CREATE POLICY "Usuários gerenciam seus próprios registros financeiros"
    ON public.financeiro
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas de acesso para 'secretaria'
DROP POLICY IF EXISTS "Usuários gerenciam seus próprios documentos de secretaria" ON public.secretaria;
CREATE POLICY "Usuários gerenciam seus próprios documentos de secretaria"
    ON public.secretaria
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Permissões para usuários autenticados
GRANT ALL ON TABLE public.perfis TO authenticated;
GRANT ALL ON TABLE public.celulas TO authenticated;
GRANT ALL ON TABLE public.membros TO authenticated;
GRANT ALL ON TABLE public.financeiro TO authenticated;
GRANT ALL ON TABLE public.secretaria TO authenticated;

-- =========================================================
-- TRIGGER AUTOMÁTICO DE CRIAÇÃO DE PERFIL VIA AUTH
-- Ao criar conta no Supabase Auth, preenche a tabela de perfis
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfis (id, email, nome, igreja, cargo)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'igreja', 'Minha Comunidade'),
    COALESCE(new.raw_user_meta_data->>'cargo', 'Pastor Titular')
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    igreja = EXCLUDED.igreja,
    cargo = EXCLUDED.cargo;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparador no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_perfis_email ON public.perfis(email);
CREATE INDEX IF NOT EXISTS idx_membros_user_id ON public.membros(user_id);
CREATE INDEX IF NOT EXISTS idx_membros_celula_id ON public.membros(celula_id);
CREATE INDEX IF NOT EXISTS idx_celulas_user_id ON public.celulas(user_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_user_id ON public.financeiro(user_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_data ON public.financeiro(data);
CREATE INDEX IF NOT EXISTS idx_secretaria_user_id ON public.secretaria(user_id);
