import dotenv from 'dotenv';
dotenv.config();
import { AIService } from './services/ai.service.js';

async function testFullService() {
  try {
    console.log('⏳ Testando AIService com integração 9Router...');

    // Foto fictícia em base64 minimalista (pixel transparente 1x1 png) para teste
    const fotoMock = {
      mimeType: 'image/png',
      base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    };

    const anamneseMock = {
      nome: 'Pedro Teste',
      idade: 22,
      peso: 96,
      altura: 193,
      objetivo: 'Hipertrofia',
      nivel_experiencia: 'Intermediario',
      dias_disponiveis: 4,
      passou_nutricionista: true,
      bf_informado: 5.6,
      autoriza_estimativa_bf: true,
    };

    console.log('\n--- 1. Testando Avaliação Física ---');
    const avaliacao = await AIService.analisarAvaliacaoFisica(anamneseMock, [fotoMock]);
    console.log('✅ Avaliação:', {
      fase: avaliacao.fase,
      bf: avaliacao.avaliacao.bf_estimado,
      pontos_fortes: avaliacao.avaliacao.pontos_fortes,
      pontos_fracos: avaliacao.avaliacao.pontos_fracos,
    });

    console.log('\n--- 2. Testando Prescrição do Treino de 4 Dias ---');
    const treino = await AIService.gerarTreinoPrescrito(anamneseMock, avaliacao.avaliacao);
    console.log('✅ Treino Prescrito:', {
      fase: treino.fase,
      divisao: treino.treino.divisao_nome,
      frequencia: treino.treino.frequencia_semanal,
      total_sessoes: treino.treino.sessoes.length,
    });

    treino.treino.sessoes.forEach((s, idx) => {
      console.log(`   [Dia ${idx + 1}] ${s.nome} -> ${s.exercicios.length} exercícios`);
    });

    console.log('\n--- 3. Testando Substituição de Exercício ---');
    const exOriginal = treino.treino.sessoes[0].exercicios[0];
    const substituicao = await AIService.substituirExercicio(exOriginal, anamneseMock.objetivo, 'Sem aparelho disponível');
    console.log('✅ Substituição:', {
      de: exOriginal.nome,
      para: substituicao.exercicio_substituto.nome,
      motivo: substituicao.motivo_escolha,
    });

    console.log('\n✨ TODAS AS ETAPAS FUNCIONANDO PERFEITAMENTE COM 9ROUTER E FALLBACKS!');
  } catch (err: any) {
    console.error('❌ Erro no AIService:', err.message);
  }
}

testFullService();
