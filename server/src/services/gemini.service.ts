import { GoogleGenAI } from '@google/genai';
import {
  AvaliacaoSchema,
  TreinoSchema,
  SubstituicaoExercicioSchema,
  type AvaliacaoFisica,
  type FichaTreino,
  type ExercicioItem,
  type SubstituicaoResultado,
} from '../types/schemas.js';

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não foi encontrada nas variáveis de ambiente (.env)');
  }
  return new GoogleGenAI({ apiKey });
}

// Função de resiliência: Utiliza EXCLUSIVAMENTE o gemini-3.6-flash com até 3 retentativas em caso de 503 (alta demanda)
async function generateContentWithRetry(ai: any, params: any) {
  const model = params.model || 'gemini-3.6-flash';
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 [Tentativa ${attempt}/${maxRetries}] Solicitando geração ao modelo: ${model}...`);
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const isHighDemand =
        err.status === 503 ||
        err.statusCode === 503 ||
        String(err.message).includes('503') ||
        String(err.message).includes('high demand');

      if (isHighDemand && attempt < maxRetries) {
        console.warn(`⚠️ Modelo ${model} em alta demanda (503). Retentando em 1.5s (${attempt}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
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
  objetivo: string;         // ex: 'Hipertrofia', 'Definição', 'Powerlifting'
  nivel_experiencia: string;// ex: 'Iniciante', 'Intermediario', 'Avancado'
  dias_disponiveis: number;
  limitacoes_lesoes?: string;
  observacoes_usuario?: string; // Observações extras e pedidos de ajuste do aluno

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
    let instrucaoNutricionista = '';

    if (anamnese.passou_nutricionista && anamnese.bf_informado) {
      instrucaoNutricionista = `
NOTA TÉCNICA OBRIGATÓRIA: O aluno informou que JÁ PASSOU por consulta com Nutricionista e possui um % de Gordura (BF) oficial de ${anamnese.bf_informado}%.
Você DEVE utilizar exatamente o valor "${anamnese.bf_informado}% (Nutricionista)" no campo 'bf_estimado'. Não tente recalcular ou alterar esse valor.
Use a análise visual das fotos APENAS para identificar pontos fortes, pontos fracos e desvios posturais.
`;
    } else if (anamnese.autoriza_estimativa_bf) {
      instrucaoNutricionista = `
NOTA TÉCNICA OBRIGATÓRIA: O aluno NUNCA FOI ao nutricionista e AUTORIZOU expressamente a estimativa visual de BF pela IA.
Analise detalhadamente a definição muscular, vascularização, dobra abdominal e contorno corporal nas fotos para estimar uma faixa realista de BF (ex: "14-17%").
`;
    }

    const promptText = `
Você é um Personal Trainer e Fisioterapeuta especialista em avaliação física e biomecânica.
Analise os dados da anamnese e as fotos corporais fornecidas do aluno.

Dados da Anamnese:
- Nome: ${anamnese.nome}
- Idade: ${anamnese.idade} anos
- Peso: ${anamnese.peso} kg
- Altura: ${anamnese.altura} cm
- Objetivo: ${anamnese.objetivo}
- Nível de Experiência: ${anamnese.nivel_experiencia}
- Frequência Semanal: ${anamnese.dias_disponiveis} dias
- Limitações/Lesões: ${anamnese.limitacoes_lesoes || 'Nenhuma'}
- Observações e Pedidos do Aluno: ${anamnese.observacoes_usuario || 'Nenhum'}

${instrucaoNutricionista}

Instruções para o Diagnóstico:
1. Determine a faixa de BF estimada ou utilize a informada pelo nutricionista.
2. Identifique os Pontos Fortes do físico (grupos musculares bem desenvolvidos).
3. Identifique os Pontos Fracos do físico (grupos musculares que necessitam de maior volume de treino para simetria).
4. Avalie a postura visualmente (ex: rotação de ombros, inclinação pélvica ou simetria geral).
5. Forneça uma mensagem encorajadora ao aluno explicando os achados.
`;

    const imageParts = fotos.map((foto) => ({
      inlineData: {
        mimeType: foto.mimeType,
        data: foto.base64Data,
      },
    }));

    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const ai = getAIClient();

    const response = await generateContentWithRetry(ai, {
      model: modelName,
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
- Observações e Pedidos do Aluno: ${anamnese.observacoes_usuario || 'Nenhum'}

Resultado da Avaliação Física Aprovada:
- BF Utilizado: ${avaliacao.bf_estimado}
- Pontos Fortes: ${avaliacao.pontos_fortes.join(', ')}
- Pontos Fracos (FOCO PRIORITÁRIO DE VOLUME): ${avaliacao.pontos_fracos.join(', ')}
- Postura/Observações: ${avaliacao.postura_observacoes}

Instruções para a Prescrição:
1. Monte uma divisão de treino coerente com a frequência semanal de ${anamnese.dias_disponiveis} dias.
2. Monte sessões completas prescrevendo EM MÉDIA 6 EXERCÍCIOS por sessão de treino (ajustando a estrutura conforme o objetivo: ${anamnese.objetivo}).
3. Dê prioridade de volume aos pontos fracos identificados na avaliação e respeite estritamente os pedidos/observações do aluno.
4. Para cada exercício, defina séries de aquecimento, séries de trabalho, faixa de repetições, RIR (Repetições de Reserva), tempo de descanso em segundos e foco biomecânico.
`;

    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const ai = getAIClient();

    const response = await generateContentWithRetry(ai, {
      model: modelName,
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

  /**
   * RECURSO EXCLUSIVO: Substituir Exercício Específico na Ficha
   */
  static async substituirExercicio(
    exercicioOriginal: ExercicioItem,
    objetivo: string,
    motivoSubstituicao?: string
  ): Promise<SubstituicaoResultado> {
    const promptText = `
Você é um Personal Trainer especialista em biomecânica e musculação.
O aluno pediu para SUBSTITUIR um exercício específico da sua ficha de treino.

Exercício Original:
- Nome: ${exercicioOriginal.nome}
- Séries de Trabalho: ${exercicioOriginal.series_trabalho}
- Faixa de Repetições: ${exercicioOriginal.reps}
- Descanso: ${exercicioOriginal.descanso_segundos}s
- Foco Biomecânico: ${exercicioOriginal.foco_biomecanico}

Contexto do Aluno:
- Objetivo Principal: ${objetivo}
- Motivo da Solicitação de Troca: ${motivoSubstituicao || 'O aluno não possui o equipamento na academia ou prefere outra variação equivalente.'}

Instruções para a Substituição:
1. Encontre um EXERCÍCIO SUBSTITUTO EQUIVALENTE que trabalhe o mesmo grupo muscular com vetores de força semelhantes.
2. Mantenha ou ajuste sutilmente as séries de trabalho, repetições, RIR e tempo de descanso para ser 100% compatível.
3. Forneça uma explicação biomecânica em 'motivo_escolha' justificando a substituição.
`;

    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const ai = getAIClient();

    const response = await generateContentWithRetry(ai, {
      model: modelName,
      contents: [promptText],
      config: {
        responseMimeType: 'application/json',
        responseSchema: SubstituicaoExercicioSchema,
        temperature: 0.3,
      },
    });

    if (!response.text) {
      throw new Error('Falha ao obter resposta da API do Gemini para a Substituição do Exercício.');
    }

    return JSON.parse(response.text) as SubstituicaoResultado;
  }
}