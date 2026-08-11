import Constants from 'expo-constants';
import { supabase } from './supabase';
import type { AnamneseFormData, ImagemFoto, AvaliacaoFisica, FichaTreino } from '../types/index';

// Detecta o IP da sua máquina automaticamente quando o app roda no celular físico via Expo Go (Wi-Fi)
const debuggerHost = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
const host = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
const API_URL = `http://${host}:3333/api`;

console.log('🔗 Conectando na API Backend:', API_URL);

// Função para obter cabeçalhos com Token JWT de Autenticação do Supabase
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

export async function executarCadastroApi(
  email: string,
  senha: string,
  nome: string
): Promise<any> {
  const response = await fetch(`${API_URL}/auth/cadastro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha, nome }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao realizar cadastro.');
  }

  return response.json();
}

export async function executarLoginApi(
  email: string,
  senha: string
): Promise<any> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Email ou senha inválidos.');
  }

  return response.json();
}

export async function buscarTreinoAtivo(userId: string): Promise<any | null> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/meus-treinos/${userId}`, {
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao buscar treino ativo.');
  }
  const data = await response.json();
  return data.treinoAtivo || null;
}

export async function enviarAvaliacaoAnamnese(
  anamnese: AnamneseFormData,
  fotos: ImagemFoto[],
  userId?: string
): Promise<AvaliacaoFisica> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/avaliar`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      anamnese,
      fotos: fotos.map((f) => ({
        mimeType: f.mimeType,
        base64Data: f.base64Data,
      })),
      userId,
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
  avaliacao: AvaliacaoFisica['avaliacao'],
  alunoId?: string,
  avaliacaoId?: string
): Promise<FichaTreino> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/gerar-treino`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      anamnese,
      avaliacao,
      alunoId,
      userId: alunoId,
      avaliacaoId,
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

export async function solicitarSubstituicaoExercicio(
  exercicioOriginal: any,
  objetivo: string,
  motivoSubstituicao?: string
): Promise<{ exercicio_substituto: any; motivo_escolha: string }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/substituir-exercicio`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      exercicioOriginal,
      objetivo,
      motivoSubstituicao,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const mensagemErro = errorData.details || errorData.error || `Erro HTTP ${response.status}`;
    console.error('❌ Erro na resposta da API /substituir-exercicio:', mensagemErro);
    throw new Error(mensagemErro);
  }

  return response.json();
}

export async function definirTreinoAtivoApi(
  treino: any,
  userId?: string,
  alunoId?: string,
  avaliacaoId?: string
): Promise<any> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/definir-treino-ativo`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      treino,
      userId,
      alunoId,
      avaliacaoId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao definir treino ativo.');
  }

  return response.json();
}
