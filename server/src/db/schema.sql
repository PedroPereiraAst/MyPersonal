-- ==========================================
-- ESTRUTURA E PERMISSÕES DO BANCO DE DADOS SUPABASE (POSTGRESQL)
-- Cole este script no SQL Editor do Supabase Dashboard
-- ==========================================

-- 1. Tabela de Alunos (Preparada para vinculo de Login futuro via user_id)
CREATE TABLE IF NOT EXISTS public.alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  nome TEXT NOT NULL,
  idade INT NOT NULL,
  peso NUMERIC(5,2) NOT NULL,
  altura NUMERIC(5,2) NOT NULL,
  objetivo TEXT NOT NULL,
  nivel_experiencia TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Avaliações Físicas (Métricas e Diagnósticos)
CREATE TABLE IF NOT EXISTS public.avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID REFERENCES public.alunos(id) ON DELETE CASCADE,
  bf_estimado TEXT NOT NULL,
  pontos_fortes TEXT[] NOT NULL,
  pontos_fracos TEXT[] NOT NULL,
  postura_observacoes TEXT NOT NULL,
  mensagem_validacao TEXT NOT NULL,
  passou_nutricionista BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Fichas de Treino Prescritas
CREATE TABLE IF NOT EXISTS public.treinos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id UUID REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  aluno_id UUID REFERENCES public.alunos(id) ON DELETE CASCADE,
  divisao_nome TEXT NOT NULL,
  frequencia_semanal INT NOT NULL,
  treino_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Liberar permissões de acesso total (GRANT ALL) para gravação via API sem bloqueios de RLS
ALTER TABLE public.alunos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.treinos DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.alunos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.avaliacoes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.treinos TO anon, authenticated, service_role;
