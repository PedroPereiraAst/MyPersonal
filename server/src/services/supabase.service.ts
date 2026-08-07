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
   * Cadastrar Usuário com Auto-Confirmação de Email no Supabase Auth
   */
  static async cadastrarUsuario(email: string, senha: string, nome: string) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase não configurado no servidor.');

    const { data, error } = await client.auth.admin.createUser({
      email,
      password: senha,
      user_metadata: { nome },
      email_confirm: true,
    });

    if (error) {
      const { data: signUpData, error: signUpError } = await client.auth.signUp({
        email,
        password: senha,
        options: { data: { nome } },
      });

      if (signUpError) throw signUpError;
      return signUpData;
    }

    return data;
  }

  /**
   * Fazer Login de Usuário no Supabase Auth
   */
  static async loginUsuario(email: string, senha: string) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase não configurado no servidor.');

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) throw error;
    return data;
  }

  /**
   * Buscar Histórico de Treinos do Usuário no PostgreSQL do Supabase
   */
  static async buscarTreinosDoUsuario(userId: string) {
    try {
      const client = getSupabaseClient();
      if (!client) return [];

      const { data: treinos, error } = await client
        .from('treinos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('⚠️ Alerta ao buscar treinos do usuário:', error.message);
        return [];
      }

      return treinos || [];
    } catch (err: any) {
      console.warn('⚠️ Alerta ao buscar treinos:', err.message);
      return [];
    }
  }

  /**
   * Salvar Aluno e Avaliação no PostgreSQL do Supabase
   */
  static async salvarAvaliacao(anamnese: any, avaliacao: any) {
    try {
      const client = getSupabaseClient();
      if (!client) return null;

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
      if (!client) return null;

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
