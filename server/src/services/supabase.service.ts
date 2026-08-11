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
   * Verificar Token JWT do Usuário Autenticado no Supabase Auth
   */
  static async verificarTokenJWT(token: string) {
    try {
      const client = getSupabaseClient();
      if (!client) return null;

      const { data: { user }, error } = await client.auth.getUser(token);
      if (error || !user) return null;

      return user;
    } catch {
      return null;
    }
  }

  /**
   * Buscar Ficha de Treino Ativa Única do Usuário no PostgreSQL do Supabase
   */
  static async buscarTreinoAtivoDoUsuario(userId: string) {
    try {
      const client = getSupabaseClient();
      if (!client) return null;

      const { data: alunos } = await client
        .from('alunos')
        .select('id')
        .eq('user_id', userId);

      const alunoIds = alunos ? alunos.map((a) => a.id) : [];

      let query = client.from('treinos').select('*').order('created_at', { ascending: false }).limit(1);

      if (alunoIds.length > 0) {
        query = query.in('aluno_id', alunoIds);
      }

      const { data: treinos, error } = await query;

      if (error || !treinos || treinos.length === 0) {
        const { data: todosTreinos } = await client
          .from('treinos')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        return todosTreinos && todosTreinos.length > 0 ? todosTreinos[0] : null;
      }

      return treinos[0];
    } catch (err: any) {
      console.warn('⚠️ Alerta ao buscar treino ativo:', err.message);
      return null;
    }
  }

  /**
   * Salvar Aluno e Avaliação no PostgreSQL do Supabase (VINCULANDO user_id)
   */
  static async salvarAvaliacao(anamnese: any, avaliacao: any, userId?: string) {
    try {
      const client = getSupabaseClient();
      if (!client) return null;

      const { data: aluno, error: errAluno } = await client
        .from('alunos')
        .insert({
          user_id: userId || null,
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
  static async salvarTreino(treino: any, avaliacaoId?: string, alunoId?: string, userId?: string) {
    try {
      const client = getSupabaseClient();
      if (!client) return null;

      let targetAlunoId = alunoId;

      if (!targetAlunoId && userId) {
        const { data: alunoExistente } = await client
          .from('alunos')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (alunoExistente) {
          targetAlunoId = alunoExistente.id;
        } else {
          const { data: novoAluno } = await client
            .from('alunos')
            .insert({
              user_id: userId,
              nome: treino?.treino?.divisao_nome || 'Aluno',
            })
            .select('id')
            .single();

          if (novoAluno) {
            targetAlunoId = novoAluno.id;
          }
        }
      }

      const divisaoNome = treino?.treino?.divisao_nome || treino?.divisao_nome || 'Ficha Prescrita';
      const frequenciaSemanal = treino?.treino?.frequencia_semanal || treino?.frequencia_semanal || 4;

      const { data, error } = await client
        .from('treinos')
        .insert({
          avaliacao_id: avaliacaoId || null,
          aluno_id: targetAlunoId || null,
          divisao_nome: divisaoNome,
          frequencia_semanal: frequenciaSemanal,
          treino_json: treino.treino ? treino : { treino },
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
