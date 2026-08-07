import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
console.log('🔑 Testando chave:', apiKey ? apiKey.substring(0, 10) + '...' : 'vazia');

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

async function testModel(modelName: string) {
  try {
    console.log(`\n⏳ Testando modelo: ${modelName}...`);
    const res = await ai.models.generateContent({
      model: modelName,
      contents: 'Olá! Responda apenas OK.',
    });
    console.log(`✅ SUCESSO com ${modelName}! Resposta:`, res.text);
    return true;
  } catch (err: any) {
    console.error(`❌ Erro no modelo ${modelName}:`, err.message);
    return false;
  }
}

async function run() {
  await testModel('gemini-2.0-flash');
  await testModel('gemini-1.5-flash');
}

run();
