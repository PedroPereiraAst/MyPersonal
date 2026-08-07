import { Type, type Schema } from '@google/genai';

// ==========================================
// 1. INTERFACES TYPESCRIPT (TIPAGEM NO CÓDIGO)
// ==========================================

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

// ==========================================
// 2. SCHEMAS JSON ESTRITOS (REGRAS DA IA)
// ==========================================

// Schema da Fase 1: Avaliação Visual
export const AvaliacaoSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    fase: { type: Type.STRING, enum: ['AVALIACAO'] },
    avaliacao: {
      type: Type.OBJECT,
      properties: {
        bf_estimado: { type: Type.STRING, description: 'Estimativa de % de gordura corporal, ex: 14-17%' },
        pontos_fortes: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Grupos musculares visualmente bem desenvolvidos'
        },
        pontos_fracos: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Grupos musculares que necessitam de mais volume/foco'
        },
        postura_observacoes: { type: Type.STRING, description: 'Análise postural detalhada' },
        mensagem_validacao: { type: Type.STRING, description: 'Resumo encorajador e convite para validar a avaliação' }
      },
      required: ['bf_estimado', 'pontos_fortes', 'pontos_fracos', 'postura_observacoes', 'mensagem_validacao']
    }
  },
  required: ['fase', 'avaliacao']
};

// Schema da Fase 3: Prescrição do Treino
export const TreinoSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    fase: { type: Type.STRING, enum: ['TREINO'] },
    treino: {
      type: Type.OBJECT,
      properties: {
        divisao_nome: { type: Type.STRING, description: 'Divisão de treino, ex: Push/Pull/Legs' },
        frequencia_semanal: { type: Type.NUMBER, description: 'Frequência de dias na semana' },
        volume_resumo: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              grupo: { type: Type.STRING },
              series_semanais: { type: Type.NUMBER }
            },
            required: ['grupo', 'series_semanais']
          }
        },
        sessoes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              nome: { type: Type.STRING, description: 'Ex: Treino A - Peito e Tríceps' },
              exercicios: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    nome: { type: Type.STRING },
                    series_aquecimento: { type: Type.NUMBER },
                    series_trabalho: { type: Type.NUMBER },
                    reps: { type: Type.STRING, description: 'Faixa de repetições, ex: 8-10' },
                    rir_alvo: { type: Type.NUMBER, description: 'Repetições de reserva, ex: 1 ou 2' },
                    descanso_segundos: { type: Type.NUMBER, description: 'Tempo de descanso em segundos, ex: 90' },
                    foco_biomecanico: { type: Type.STRING, description: 'Instrução técnica ou cadência' }
                  },
                  required: [
                    'nome',
                    'series_aquecimento',
                    'series_trabalho',
                    'reps',
                    'rir_alvo',
                    'descanso_segundos',
                    'foco_biomecanico'
                  ]
                }
              }
            },
            required: ['nome', 'exercicios']
          }
        }
      },
      required: ['divisao_nome', 'frequencia_semanal', 'volume_resumo', 'sessoes']
    }
  },
  required: ['fase', 'treino']
};

// Schema da Substituição Individual de Exercício
export const SubstituicaoExercicioSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    exercicio_substituto: {
      type: Type.OBJECT,
      properties: {
        nome: { type: Type.STRING, description: 'Nome do novo exercício substituto equivalente' },
        series_aquecimento: { type: Type.NUMBER },
        series_trabalho: { type: Type.NUMBER },
        reps: { type: Type.STRING },
        rir_alvo: { type: Type.NUMBER },
        descanso_segundos: { type: Type.NUMBER },
        foco_biomecanico: { type: Type.STRING }
      },
      required: [
        'nome',
        'series_aquecimento',
        'series_trabalho',
        'reps',
        'rir_alvo',
        'descanso_segundos',
        'foco_biomecanico'
      ]
    },
    motivo_escolha: { type: Type.STRING, description: 'Explicação biomecânica de por que este exercício substituto é ideal' }
  },
  required: ['exercicio_substituto', 'motivo_escolha']
};
