import { GoogleGenAI } from '@google/genai';
import { AvaliacaoSchema, TreinoSchema, type AvaliacaoFisica, type FichaTreino } from '../types/schemas.js';

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não foi encontrada nas variáveis de ambiente (.env)');
  }
  return new GoogleGenAI({ apiKey });
}


export interface ImagemInput {
  mimeType: string;
  base64Data: string;
}

export interface AnamneseInput {
  nome: string;
  idade: number;
  peso: number;             // Digitado pelo usuário (em kg)
  altura: number;           // Digitado pelo usuário (em cm)
  objetivo: string;         // ex: 'Hipertrofia', 'Emagrecimento'
  nivel_experiencia: string;// ex: 'Iniciante', 'Intermediario', 'Avancado'
  dias_disponiveis: number;
  limitacoes_lesoes?: string;
  
  // NOVOS CAMPOS INTELIGENTES:
  passou_nutricionista: boolean;
  bf_informado?: number;          // Se o usuário souber o BF oficial do nutricionista
  autoriza_estimativa_bf?: boolean; // Se autoriza a IA estimar pelas fotos
  circunferencias?: {
    cintura_cm?: number;
    quadril_cm?: number;
    braco_cm?: number;
  };
}

export class GeminiService {
  /**
   * FASE 1: Avaliação Física (Fotos + Anamnese com Regra do Nutricionista)
   */
  static async analisarAvaliacaoFisica(
    anamnese: AnamneseInput,
    fotos: ImagemInput[]
  ): Promise<AvaliacaoFisica> {
    
    // Constrói a regra de BF dinamicamente para o prompt
    const regraBF = anamnese.passou_nutricionista && anamnese.bf_informado
      ? `- O aluno JÁ POSSUI medição oficial de nutricionista. O BF REAL informado é de ${anamnese.bf_informado}%. Use este valor exato como referência primária.`
      : `- O aluno NÃO possui medição recente de nutricionista, mas AUTORIZOU a estimativa visual. Estime a faixa de % de gordura corporal (BF) pelas fotos.`;

    const medidasExtras = anamnese.circunferencias
      ? `- Medidas Informadas: Cintura: ${anamnese.circunferencias.cintura_cm || 'N/A'}cm, Quadril: ${anamnese.circunferencias.quadril_cm || 'N/A'}cm, Braço: ${anamnese.circunferencias.braco_cm || 'N/A'}cm`
      : '';

    const promptText = `
Você é um Personal Trainer especialista em biomecânica e avaliação física visual.
Analise os dados biométricos do aluno e as fotos corporais fornecidas (frente, costas, perfil).

Dados da Anamnese:
- Nome: ${anamnese.nome}
- Idade: ${anamnese.idade} anos
- Peso: ${anamnese.peso} kg
- Altura: ${anamnese.altura} cm
${medidasExtras}
${regraBF}
- Objetivo Principal: ${anamnese.objetivo}
- Nível de Experiência: ${anamnese.nivel_experiencia}
- Limitações/Lesões: ${anamnese.limitacoes_lesoes || 'Nenhuma'}

Instruções para a Avaliação:
1. Respeite as informações de % de gordura conforme a regra especificada acima.
2. Identifique os grupos musculares visualmente bem desenvolvidos (pontos fortes).
3. Identifique os grupos musculares que necessitam de mais volume/foco (pontos fracos).
4. Avalie aspectos posturais visíveis (ex: ombros caídos, alinhamento de escápulas).
5. Forneça uma mensagem encorajadora ao aluno explicando os achados.
`;

    const imageParts = fotos.map((foto) => ({
      inlineData: {
        mimeType: foto.mimeType,
        data: foto.base64Data,
      },
    }));

    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [promptText, ...imageParts],
      config: {
        responseMimeType: 'application/json',
        responseSchema: AvaliacaoSchema,
        temperature: 0.2,
      },
    });

    if (!response.text) {
      throw new Error('Falha ao obter resposta da API do Gemini para a Avaliação Física.');
    }

    return JSON.parse(response.text) as AvaliacaoFisica;
  }

  /**
   * FASE 3: Prescrição da Ficha de Treino Personalizada
   */
  static async gerarTreinoPrescrito(
    anamnese: AnamneseInput,
    avaliacao: AvaliacaoFisica['avaliacao']
  ): Promise<FichaTreino> {
    const promptText = `
Você é um Personal Trainer especialista em musculação de alta performance.
O aluno APROVOU 100% a avaliação física anterior. Agora você deve prescrever a ficha de treino ideal.

Dados do Aluno:
- Nome: ${anamnese.nome}
- Nível: ${anamnese.nivel_experiencia}
- Frequência Semanal: ${anamnese.dias_disponiveis} dias
- Objetivo: ${anamnese.objetivo}
- Limitações/Lesões: ${anamnese.limitacoes_lesoes || 'Nenhuma'}

Resultado da Avaliação Física Aprovada:
- BF Utilizado: ${avaliacao.bf_estimado}
- Pontos Fortes: ${avaliacao.pontos_fortes.join(', ')}
- Pontos Fracos (FOCO PRIORITÁRIO DE VOLUME): ${avaliacao.pontos_fracos.join(', ')}
- Postura/Observações: ${avaliacao.postura_observacoes}

Instruções para a Prescrição:
1. Monte uma divisão de treino coerente com a frequência semanal de ${anamnese.dias_disponiveis} dias.
2. Dê prioridade de volume aos pontos fracos identificados na avaliação.
3. Para cada exercício, defina séries de aquecimento, séries de trabalho, faixa de repetições, RIR (Repetições de Reserva), tempo de descanso em segundos e foco biomecânico.
`;

    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [promptText],
      config: {
        responseMimeType: 'application/json',
        responseSchema: TreinoSchema,
        temperature: 0.3,
      },
    });

    if (!response.text) {
      throw new Error('Falha ao obter resposta da API do Gemini para a Ficha de Treino.');
    }

    return JSON.parse(response.text) as FichaTreino;
  }
}