import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export class SupabaseService {
  /**
   * Salvar Aluno e Avaliação no PostgreSQL do Supabase
   * (IMPORTANTE: Fotos NÃO são salvas em lugar nenhum por razões éticas e de privacidade/LGPD)
   */
  static async salvarAvaliacao(anamnese: any, avaliacao: any) {
    try {
      if (!supabaseUrl || !supabaseKey) return null;

      // 1. Inserir Aluno
      const { data: aluno, error: errAluno } = await supabase
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
      const { data: registroAvaliacao, error: errAvaliacao } = await supabase
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
      if (!supabaseUrl || !supabaseKey) return null;

      const { data, error } = await supabase
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
