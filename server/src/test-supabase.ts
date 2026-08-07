import dotenv from 'dotenv';
dotenv.config();
import { SupabaseService } from './services/supabase.service.js';

async function testSupabaseFull() {
  console.log('🔍 Testando conexão e salvamento de treino no Supabase...');

  // 1. Salva Aluno e Avaliação
  const resAvaliacao = await SupabaseService.salvarAvaliacao(
    {
      nome: 'Pedro Pereira (Teste Real)',
      idade: 24,
      peso: 78,
      altura: 178,
      objetivo: 'Hipertrofia',
      nivel_experiencia: 'Intermediário',
      passou_nutricionista: false,
    },
    {
      bf_estimado: '14-17%',
      pontos_fortes: ['Quadríceps', 'Ombros'],
      pontos_fracos: ['Dorsais', 'Peitoral Superior'],
      postura_observacoes: 'Alinhamento geral adequado',
      mensagem_validacao: 'Excelente base física para evolução!',
    }
  );

  console.log('✅ Aluno e Avaliação Salvos! ID Aluno:', resAvaliacao?.alunoId);

  // 2. Salva Ficha de Treino Prescrita pelo Gemini 3.6 Flash
  if (resAvaliacao) {
    const mockTreino = {
      fase: 'TREINO',
      treino: {
        divisao_nome: 'Push / Pull / Legs',
        frequencia_semanal: 4,
        volume_resumo: [{ grupo: 'Peitoral', series_semanais: 16 }],
        sessoes: [
          {
            nome: 'Treino A - Peito e Tríceps',
            exercicios: [
              {
                nome: 'Supino Inclinado com Halteres',
                series_aquecimento: 2,
                series_trabalho: 3,
                reps: '8-10',
                rir_alvo: 1,
                descanso_segundos: 90,
                foco_biomecanico: 'Pausa de 1s na extensão',
              },
            ],
          },
        ],
      },
    };

    const resTreino = await SupabaseService.salvarTreino(mockTreino, resAvaliacao.avaliacaoId, resAvaliacao.alunoId);
    console.log('✅ Ficha de Treino Salva no Supabase! ID Treino:', resTreino?.id);
  }
}

testSupabaseFull();
