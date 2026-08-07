import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('sua_url')) {
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseKey);
  } catch {
    return null;
  }
}

export class SupabaseService {
  /**
   * Salvar Aluno e Avaliação no PostgreSQL do Supabase
   * (IMPORTANTE: Fotos NÃO são salvas em lugar nenhum por razões éticas e de privacidade/LGPD)
   */
  static async salvarAvaliacao(anamnese: any, avaliacao: any) {
    try {
      const client = getSupabaseClient();
      if (!client) {
        console.log('ℹ️ Supabase não configurado. Pulando gravação no banco.');
        return null;
      }

      // 1. Inserir Aluno
      const { data: aluno, error: errAluno } = await client
        .from('alunos')
        .insert({
          nome: anamnese.nome,
          idade: anamnese.idade,
          peso: anamnese.peso,
          altura: anamnese.altura,
          objetivo: anamnese.objetivo,
          nivel_experiencia: anamnese.nivel_experiencia,
        })
        .select()
        .single();

      if (errAluno) {
        console.warn('⚠️ Alerta ao salvar aluno no Supabase:', errAluno.message);
        return null;
      }

      // 2. Inserir Avaliação (Apenas métricas numéricas e diagnósticos textuais)
      const { data: registroAvaliacao, error: errAvaliacao } = await client
        .from('avaliacoes')
        .insert({
          aluno_id: aluno.id,
          bf_estimado: avaliacao.bf_estimado,
          pontos_fortes: avaliacao.pontos_fortes,
          pontos_fracos: avaliacao.pontos_fracos,
          postura_observacoes: avaliacao.postura_observacoes,
          mensagem_validacao: avaliacao.mensagem_validacao,
          passou_nutricionista: anamnese.passou_nutricionista || false,
        })
        .select()
        .single();

      if (errAvaliacao) {
        console.warn('⚠️ Alerta ao salvar avaliação no Supabase:', errAvaliacao.message);
        return null;
      }

      return { alunoId: aluno.id, avaliacaoId: registroAvaliacao.id };
    } catch (err: any) {
      console.warn('⚠️ Alerta ao salvar no Supabase:', err.message);
      return null;
    }
  }

  /**
   * Salvar Treino Prescrito no PostgreSQL do Supabase
   */
  static async salvarTreino(treino: any, avaliacaoId?: string, alunoId?: string) {
    try {
      const client = getSupabaseClient();
      if (!client) {
        console.log('ℹ️ Supabase não configurado. Pulando gravação do treino.');
        return null;
      }

      const { data, error } = await client
        .from('treinos')
        .insert({
          avaliacao_id: avaliacaoId || null,
          aluno_id: alunoId || null,
          divisao_nome: treino.treino.divisao_nome,
          frequencia_semanal: treino.treino.frequencia_semanal,
          treino_json: treino,
        })
        .select()
        .single();

      if (error) {
        console.warn('⚠️ Alerta ao salvar treino no Supabase:', error.message);
        return null;
      }

      console.log('✅ Treino salvo com sucesso no Supabase! ID:', data.id);
      return data;
    } catch (err: any) {
      console.warn('⚠️ Alerta ao salvar treino no Supabase:', err.message);
      return null;
    }
  }
}
