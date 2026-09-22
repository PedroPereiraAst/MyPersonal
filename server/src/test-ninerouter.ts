import dotenv from 'dotenv';
dotenv.config();
import { NineRouterService } from './services/ninerouter.service.js';

async function runTest() {
  console.log('🧪 Testando integração do 9Router...');
  console.log('Configurado:', NineRouterService.isConfigured());

  try {
    // 1. Teste de Avaliação com Imagem Mock
    console.log('\n--- 1. Teste de Avaliação Física Multimodal ---');
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
    };

    const avaliacao = await NineRouterService.analisarAvaliacaoFisica(anamneseMock, [fotoMock]);
    console.log('✅ Avaliação retornada com sucesso:', {
      fase: avaliacao.fase,
      bf: avaliacao.avaliacao.bf_estimado,
      pontos_fortes: avaliacao.avaliacao.pontos_fortes,
      pontos_fracos: avaliacao.avaliacao.pontos_fracos,
    });

    // 2. Teste de Prescrição de Treino de 4 dias
    console.log('\n--- 2. Teste de Prescrição de Treino (4 Dias) ---');
    const treino = await NineRouterService.gerarTreinoPrescrito(anamneseMock, avaliacao.avaliacao);
    console.log('✅ Treino gerado:', {
      divisao: treino.treino.divisao_nome,
      frequencia: treino.treino.frequencia_semanal,
      quantidade_sessoes: treino.treino.sessoes.length,
      nomes_sessoes: treino.treino.sessoes.map((s) => s.nome),
    });

    console.log('\n🎉 TODOS OS TESTES DO 9ROUTER PASSARAM COM SUCESSO!');
  } catch (err: any) {
    console.error('❌ Erro no teste do 9Router:', err.message);
  }
}

runTest();
