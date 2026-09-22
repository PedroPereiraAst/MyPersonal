// ==========================================
// 1. INTERFACES TYPESCRIPT (TIPAGEM NO CÓDIGO)
// ==========================================

export interface ImagemInput {
  mimeType: string;
  base64Data: string;
}

export type SexoBiologico = 'masculino' | 'feminino';

export interface AnamneseInput {
  nome: string;
  idade: number;
  peso: number;
  altura: number;
  sexo?: SexoBiologico;
  objetivo: string;
  nivel_experiencia: string;
  dias_disponiveis: number;
  limitacoes_lesoes?: string;
  observacoes_usuario?: string;
  passou_nutricionista: boolean;
  bf_informado?: number;
  autoriza_estimativa_bf?: boolean;
}

export interface MetricaAntropometrica {
  imc: number;
  classificacao_imc: string;
  bf_deurenberg_referencia: number;
  densidade_muscular?: 'Baixa' | 'Média' | 'Alta' | 'Muito Alta' | string;
}

export interface MarcadoresVisuais {
  abdome_e_tronco?: string;
  ombros_e_bracos?: string;
  flancos_e_cintura?: string;
  vascularizacao?: string;
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
    classificacao_bf?: string;
    metrica_antropometrica?: MetricaAntropometrica;
    marcadores_visuais?: MarcadoresVisuais;
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
