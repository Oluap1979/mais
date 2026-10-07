-- =========================================================
-- SISTEMA DE GESTÃO ECLESIÁSTICA "MAIS IGREJA"
-- Carga de Dados Reais Iniciais (Seed Data para Supabase)
-- =========================================================

-- 1. Inserir Células Reais
INSERT INTO public.celulas (id, nome, endereco, observacoes, user_id)
VALUES 
  ('a1111111-1111-1111-1111-111111111111', 'Célula Betel (Jovens)', 'Rua das Oliveiras, 142 - Jardim Esperança', 'Encontros todas as quintas-feiras às 20h. Foco em comunhão e missões urbanas.', auth.uid()),
  ('a2222222-2222-2222-2222-222222222222', 'Célula Emanuel (Famílias)', 'Av. Paulista, 1850, Apto 42 - Bela Vista', 'Encontros às quartas-feiras às 19h30 com estudo bíblico e discipulado de casais.', auth.uid()),
  ('a3333333-3333-3333-3333-333333333333', 'Célula Atos 29 (Universitários)', 'Alameda dos Ipês, 88 - Universitário', 'Grupo de universitários focado em apologética, café comunitário e evangelismo.', auth.uid()),
  ('a4444444-4444-4444-4444-444444444444', 'Célula Graça & Vida (Mulheres)', 'Rua São Paulo, 310 - Centro', 'Círculo de oração e apoio mútuo feminino nas terças-feiras às 15h.', auth.uid())
ON CONFLICT (id) DO NOTHING;

-- 2. Inserir Membros Reais
INSERT INTO public.membros (id, nome, email, telefone, data_nascimento, celula_id, status, user_id)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 'Carlos Eduardo Ferreira', 'carlos.ferreira@maisigreja.com.br', '(11) 98765-4321', '1988-06-14', 'a2222222-2222-2222-2222-222222222222', 'ativo', auth.uid()),
  ('b2222222-2222-2222-2222-222222222222', 'Marcos Oliveira', 'marcos.oliveira@maisigreja.com.br', '(11) 99123-5566', '1995-11-22', 'a1111111-1111-1111-1111-111111111111', 'ativo', auth.uid()),
  ('b3333333-3333-3333-3333-333333333333', 'Priscila Santos', 'priscila.santos@maisigreja.com.br', '(11) 97654-3210', '1990-03-18', 'a2222222-2222-2222-2222-222222222222', 'ativo', auth.uid()),
  ('b4444444-4444-4444-4444-444444444444', 'Gabriel Mendes', 'gabriel.mendes@maisigreja.com.br', '(11) 98112-9988', '2001-08-30', 'a3333333-3333-3333-3333-333333333333', 'ativo', auth.uid()),
  ('b5555555-5555-5555-5555-555555555555', 'Débora Silveira', 'debora.silveira@maisigreja.com.br', '(11) 98234-7711', '1984-12-05', 'a4444444-4444-4444-4444-444444444444', 'ativo', auth.uid()),
  ('b6666666-6666-6666-6666-666666666666', 'Ana Luísa Rocha', 'ana.rocha@maisigreja.com.br', '(11) 99887-1122', '1998-04-25', 'a1111111-1111-1111-1111-111111111111', 'ativo', auth.uid()),
  ('b7777777-7777-7777-7777-777777777777', 'Roberto Antunes', 'roberto.antunes@maisigreja.com.br', '(11) 97223-4455', '1976-09-12', 'a2222222-2222-2222-2222-222222222222', 'ativo', auth.uid()),
  ('b8888888-8888-8888-8888-888888888888', 'Lucas Valente', 'lucas.valente@maisigreja.com.br', '(11) 99345-6789', '2003-01-17', NULL, 'em_observacao', auth.uid())
ON CONFLICT (id) DO NOTHING;

-- Atualizar líderes das células
UPDATE public.celulas SET lider_id = 'b2222222-2222-2222-2222-222222222222' WHERE id = 'a1111111-1111-1111-1111-111111111111';
UPDATE public.celulas SET lider_id = 'b3333333-3333-3333-3333-333333333333' WHERE id = 'a2222222-2222-2222-2222-222222222222';
UPDATE public.celulas SET lider_id = 'b4444444-4444-4444-4444-444444444444' WHERE id = 'a3333333-3333-3333-3333-333333333333';
UPDATE public.celulas SET lider_id = 'b5555555-5555-5555-5555-555555555555' WHERE id = 'a4444444-4444-4444-4444-444444444444';

-- 3. Inserir Registros Financeiros Reais
INSERT INTO public.financeiro (id, tipo, descricao, valor, data, categoria, user_id)
VALUES
  ('c1111111-1111-1111-1111-111111111111', 'receita', 'Dízimos do Culto de Celebração de Domingo', 14520.00, '2026-10-04', 'Dízimos', auth.uid()),
  ('c2222222-2222-2222-2222-222222222222', 'receita', 'Ofertas Missionárias para Campos Transculturais', 4350.50, '2026-10-04', 'Ofertas Missionárias', auth.uid()),
  ('c3333333-3333-3333-3333-333333333333', 'receita', 'Dízimos recebidos via Transferência e PIX Oficial', 9840.00, '2026-10-02', 'Dízimos', auth.uid()),
  ('c4444444-4444-4444-4444-444444444444', 'despesa', 'Aluguel do Templo Central e Condomínio', 6500.00, '2026-10-05', 'Infraestrutura & Aluguel', auth.uid()),
  ('c5555555-5555-5555-5555-555555555555', 'despesa', 'Contas de Consumo de Energia Elétrica e Água', 1240.35, '2026-10-06', 'Contas de Consumo (Luz, Água, Net)', auth.uid()),
  ('c6666666-6666-6666-6666-666666666666', 'despesa', 'Sustento Pastoral e Missionários no Campo', 5800.00, '2026-10-05', 'Ministério Pastoral & Preletores', auth.uid()),
  ('c7777777-7777-7777-7777-777777777777', 'receita', 'Oferta Especial Campanha de Ação Social e Cestas Básicas', 3200.00, '2026-09-28', 'Ação Social', auth.uid())
ON CONFLICT (id) DO NOTHING;

-- 4. Inserir Documentos de Secretaria Reais
INSERT INTO public.secretaria (id, titulo, conteudo, data_criacao, tipo, user_id)
VALUES
  ('d1111111-1111-1111-1111-111111111111', 'Ata da Reunião Ministerial Ordinária - Outubro 2026', 'Aos 01 de outubro de 2026, reuniu-se a diretoria eclesiástica para aprovação do calendário de batismos, orçamento missionário e escala das células.', '2026-10-01T20:00:00Z', 'Ata de Reunião', auth.uid()),
  ('d2222222-2222-2222-2222-222222222222', 'Certificado de Batismo nas Águas - Priscila Santos', 'Certificamos para os devidos fins que a irmã Priscila Santos professou publicamente sua fé em Jesus Cristo através do batismo bíblico.', '2026-09-20T11:00:00Z', 'Certificado de Batismo', auth.uid()),
  ('d3333333-3333-3333-3333-333333333333', 'Carta Pastoral de Recomendação - Carlos Eduardo Ferreira', 'Recomendamos fraternalmente ao concílio e convenção eclesiástica o irmão Carlos Eduardo Ferreira por sua conduta bíblica irrepreensível.', '2026-09-15T16:30:00Z', 'Carta de Recomendação', auth.uid())
ON CONFLICT (id) DO NOTHING;
