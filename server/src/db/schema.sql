-- ==========================================
-- ESTRUTURA DO BANCO DE DADOS SUPABASE (POSTGRESQL)
-- Cole este script no SQL Editor do Supabase Dashboard
-- ==========================================

-- 1. Tabela de Alunos (Preparada para vinculo de Login futuro via user_id)
CREATE TABLE IF NOT EXISTS public.alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- Chave para vincular com Supabase Auth (Login) no futuro
  nome TEXT NOT NULL,
  idade INT NOT NULL,
  peso NUMERIC(5,2) NOT NULL,
  altura NUMERIC(5,2) NOT NULL,
  objetivo TEXT NOT NULL,
  nivel_experiencia TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Avaliações Físicas (Sem armazenamento de imagens corporais por ética/LGPD)
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
  treino_json JSONB NOT NULL, -- Armazena a ficha completa de treino em JSONB (com sessões e exercícios)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS) para permitir acesso seguro via Service Role
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treinos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo para a Service Role" ON public.alunos FOR ALL USING (true);
CREATE POLICY "Permitir tudo para a Service Role" ON public.avaliacoes FOR ALL USING (true);
CREATE POLICY "Permitir tudo para a Service Role" ON public.treinos FOR ALL USING (true);
