export type SexoBiologico = 'masculino' | 'feminino';

export interface MetricaAntropometrica {
  imc: number;
  classificacao_imc: string;
  bf_deurenberg_referencia: number;
  densidade_muscular?: string;
}

export interface MarcadoresVisuais {
  abdome_e_tronco?: string;
  ombros_e_bracos?: string;
  flancos_e_cintura?: string;
  vascularizacao?: string;
}

export interface AnamneseFormData {
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
  
  // Regra do Nutricionista
  passou_nutricionista: boolean;
  bf_informado?: number;
  autoriza_estimativa_bf?: boolean;
}

export interface ImagemFoto {
  uri: string;
  mimeType: string;
  base64Data: string;
  tipo: 'frente' | 'costas' | 'perfil';
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
  persistencia?: {
    alunoId: string;
    avaliacaoId: string;
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
      exercicios: {
        nome: string;
        series_aquecimento: number;
        series_trabalho: number;
        reps: string;
        rir_alvo: number;
        descanso_segundos: number;
        foco_biomecanico: string;
      }[];
    }[];
  };
}
