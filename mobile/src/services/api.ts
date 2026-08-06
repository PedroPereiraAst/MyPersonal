import type { AnamneseFormData, ImagemFoto, AvaliacaoFisica, FichaTreino } from '../types/index';

// No emulador Android, a máquina local (localhost) é acessada pelo IP 10.0.2.2 ou pelo seu IP na rede local.
// No emulador iOS ou Web, 'http://localhost:3333/api' funciona diretamente.
const API_URL = 'http://localhost:3333/api';

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
    throw new Error(errorData.error || 'Erro ao enviar avaliação para a API.');
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
    throw new Error(errorData.error || 'Erro ao gerar ficha de treino.');
  }

  return response.json();
}
