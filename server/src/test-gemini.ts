import dotenv from 'dotenv';
dotenv.config();
import { GeminiService } from './services/gemini.service.js';

async function testFullService() {
  try {
    console.log('⏳ Testando GeminiService com o modelo:', process.env.GEMINI_MODEL);
    
    // Foto fictícia em base64 minimalista (pixel transparente 1x1 png) para teste
    const fotoMock = {
      mimeType: 'image/png',
      base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    };

    const anamneseMock = {
      nome: 'Pedro Teste',
      idade: 24,
      peso: 78,
      altura: 178,
      objetivo: 'Hipertrofia',
      nivel_experiencia: 'Intermediario',
      dias_disponiveis: 4,
      passou_nutricionista: false,
      autoriza_estimativa_bf: true,
    };

    console.log('🚀 Enviando requisição de teste para o Gemini...');
    const avaliacao = await GeminiService.analisarAvaliacaoFisica(anamneseMock, [fotoMock]);

    console.log('✅ SUCESSO ABSOLUTO! Resposta da IA com JSON Schema:');
    console.log(JSON.stringify(avaliacao, null, 2));

  } catch (err: any) {
    console.error('❌ Erro no GeminiService:', err.message);
  }
}

testFullService();
