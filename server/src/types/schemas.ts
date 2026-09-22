// ==========================================
// 1. INTERFACES TYPESCRIPT (TIPAGEM NO CÓDIGO)
// ==========================================

export interface ImagemInput {
  mimeType: string;
  base64Data: string;
}

export interface AnamneseInput {
  nome: string;
  idade: number;
  peso: number;
  altura: number;
  objetivo: string;
  nivel_experiencia: string;
  dias_disponiveis: number;
  limitacoes_lesoes?: string;
  observacoes_usuario?: string;
  passou_nutricionista: boolean;
  bf_informado?: number;
  autoriza_estimativa_bf?: boolean;
}

export interface ExercicioItem {
  nome: string;
  series_aquecimento: number;
  series_trabalho: number;
  reps: string;
  rir_alvo: number;
  descanso_segundos: number;
  foco_biomecanico: string;
}

export interface AvaliacaoFisica {
  fase: 'AVALIACAO';
  avaliacao: {
    bf_estimado: string;
    pontos_fortes: string[];
    pontos_fracos: string[];
    postura_observacoes: string;
    mensagem_validacao: string;
  };
}

export interface FichaTreino {
  fase: 'TREINO';
  treino: {
    divisao_nome: string;
    frequencia_semanal: number;
    volume_resumo: { grupo: string; series_semanais: number }[];
    sessoes: {
      nome: string;
      exercicios: ExercicioItem[];
    }[];
  };
}

export interface SubstituicaoResultado {
  exercicio_substituto: ExercicioItem;
  motivo_escolha: string;
}
