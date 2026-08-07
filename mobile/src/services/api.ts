import Constants from 'expo-constants';
import type { AnamneseFormData, ImagemFoto, AvaliacaoFisica, FichaTreino } from '../types/index';

// Detecta o IP da sua máquina automaticamente quando o app roda no celular físico via Expo Go (Wi-Fi)
const debuggerHost = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
const host = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
const API_URL = `http://${host}:3333/api`;

console.log('🔗 Conectando na API Backend:', API_URL);

export async function enviarAvaliacaoAnamnese(
  anamnese: AnamneseFormData,
  fotos: ImagemFoto[]
): Promise<AvaliacaoFisica> {
  const response = await fetch(`${API_URL}/avaliar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      anamnese,
      fotos: fotos.map((f) => ({
        mimeType: f.mimeType,
        base64Data: f.base64Data,
      })),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const mensagemErro = errorData.details || errorData.error || `Erro HTTP ${response.status}`;
    console.error('❌ Erro na resposta da API /avaliar:', mensagemErro);
    throw new Error(mensagemErro);
  }

  return response.json();
}

export async function solicitarGeracaoTreino(
  anamnese: AnamneseFormData,
  avaliacao: AvaliacaoFisica['avaliacao']
): Promise<FichaTreino> {
  const response = await fetch(`${API_URL}/gerar-treino`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      anamnese,
      avaliacao,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const mensagemErro = errorData.details || errorData.error || `Erro HTTP ${response.status}`;
    console.error('❌ Erro na resposta da API /gerar-treino:', mensagemErro);
    throw new Error(mensagemErro);
  }

  return response.json();
}
