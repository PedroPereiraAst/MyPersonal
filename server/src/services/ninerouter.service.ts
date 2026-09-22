import type {
  AvaliacaoFisica,
  FichaTreino,
  SubstituicaoResultado,
  ExercicioItem,
  AnamneseInput,
  ImagemInput,
} from '../types/schemas.js';

export interface NineRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export class NineRouterService {
  private static getBaseUrl(): string {
    const raw = process.env.NINEROUTER_BASE_URL || 'http://127.0.0.1:20128/v1';
    return raw.replace(/\/+$/, '');
  }

  private static getApiKey(): string {
    return (process.env.NINEROUTER_API_KEY || '').trim();
  }

  public static isConfigured(): boolean {
    const enabled = process.env.NINEROUTER_ENABLED !== 'false';
    const baseUrl = this.getBaseUrl();
    return enabled && !!baseUrl;
  }

  private static cleanJsonText(text: string): string {
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }
    return cleaned.trim();
  }

  public static async callChatCompletions(
    messages: NineRouterMessage[],
    options?: {
      preferredModel?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<any> {
    const baseUrl = this.getBaseUrl();
    const apiKey = this.getApiKey();
    const preferred = options?.preferredModel || process.env.NINEROUTER_MODEL || 'ag/gemini-3.8-flash';

    const fallbackModels = [
      preferred,
      'ag/gemini-3.8-flash',
      'ag/gemini-3.7-flash-medium',
      'ag/claude-sonnet-4-6',
      'ag/gemini-3.6-flash-high',
    ];
    const modelsToTry = [...new Set(fallbackModels)].filter(Boolean);

    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        console.log(`🧭 [9Router] Solicitando geração ao modelo: ${model}...`);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const bodyPayload: any = {
          model,
          messages,
          response_format: { type: 'json_object' },
          stream: false,
          temperature: options?.temperature ?? 0.2,
        };

        if (options?.maxTokens) {
          bodyPayload.max_tokens = options.maxTokens;
        }

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyPayload),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        const data: any = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error('9Router retornou choices vazio ou sem conteúdo na mensagem.');
        }

        const cleaned = this.cleanJsonText(content);
        const parsed = JSON.parse(cleaned);
        console.log(`✨ [9Router] Sucesso com modelo ${model}!`);
        return parsed;
      } catch (err: any) {
        lastError = err;
        console.warn(`⚠️ [9Router] Falha no modelo ${model}: ${err.message}. Tentando próximo modelo...`);
      }
    }

    throw new Error(`9Router falhou em todos os modelos tentados. Último erro: ${lastError?.message}`);
  }

  /**
   * FASE 1: Avaliação Física via 9Router (Multimodal Vision)
   */
  public static async analisarAvaliacaoFisica(
    anamnese: AnamneseInput,
    fotos: ImagemInput[]
  ): Promise<AvaliacaoFisica> {
    let instrucaoNutricionista = '';
    if (anamnese.passou_nutricionista && anamnese.bf_informado) {
      instrucaoNutricionista = `O aluno JÁ PASSOU por nutricionista e informou seu % de gordura oficial (${anamnese.bf_informado}%). UTILIZE O VALOR DE ${anamnese.bf_informado}% EM 'bf_estimado'.`;
    } else {
      instrucaoNutricionista = `O aluno NÃO passou por nutricionista. UTILIZE A SUA CAPACIDADE DE VISÃO COMPUTACIONAL NAS FOTOS CORPORAIS ENVIADAS para estimar o % de gordura corporal (% BF).`;
    }

    const promptText = `
Você é um Personal Trainer especialista de alto nível, perito em avaliação física, biomecânica e composição corporal.
Analise a anamnese e as fotos corporais do aluno para gerar um diagnóstico completo.

Dados do Aluno:
- Nome: ${anamnese.nome}
- Idade: ${anamnese.idade} anos | Peso: ${anamnese.peso} kg | Altura: ${anamnese.altura} cm
- Objetivo Principal: ${anamnese.objetivo}
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
5. Forneça uma mensagem encorajadora e motivadora ao aluno explicando os achados.

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "fase": "AVALIACAO",
  "avaliacao": {
    "bf_estimado": "ex: 14-16%",
    "pontos_fortes": ["grupo1", "grupo2"],
    "pontos_fracos": ["grupo1", "grupo2"],
    "postura_observacoes": "análise postural detalhada",
    "mensagem_validacao": "mensagem encorajadora e explicação dos achados"
  }
}
`;

    const userContentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: 'text', text: promptText },
    ];

    for (const foto of fotos) {
      if (foto.base64Data) {
        const mime = foto.mimeType || 'image/jpeg';
        const url = foto.base64Data.startsWith('data:')
          ? foto.base64Data
          : `data:${mime};base64,${foto.base64Data}`;
        userContentParts.push({
          type: 'image_url',
          image_url: { url },
        });
      }
    }

    const messages: NineRouterMessage[] = [
      {
        role: 'system',
        content: 'Você é um assistente de inteligência artificial de alta precisão especializado em Personal Training e biomecânica. Retorne SEMPRE JSON válido e bem estruturado.',
      },
      {
        role: 'user',
        content: userContentParts,
      },
    ];

    const result = await this.callChatCompletions(messages, { temperature: 0.2 });

    if (!result.avaliacao || !result.avaliacao.bf_estimado) {
      throw new Error('JSON retornado pelo 9Router não contém o formato esperado de AvaliacaoFisica.');
    }

    return {
      fase: 'AVALIACAO',
      avaliacao: {
        bf_estimado: String(result.avaliacao.bf_estimado),
        pontos_fortes: Array.isArray(result.avaliacao.pontos_fortes) ? result.avaliacao.pontos_fortes : [],
        pontos_fracos: Array.isArray(result.avaliacao.pontos_fracos) ? result.avaliacao.pontos_fracos : [],
        postura_observacoes: String(result.avaliacao.postura_observacoes || ''),
        mensagem_validacao: String(result.avaliacao.mensagem_validacao || ''),
      },
    };
  }

  /**
   * FASE 3: Prescrição do Treino Personalizado via 9Router
   */
  public static async gerarTreinoPrescrito(
    anamnese: AnamneseInput,
    avaliacao: AvaliacaoFisica['avaliacao']
  ): Promise<FichaTreino> {
    const promptText = `
Você é um Personal Trainer especialista em musculação de alta performance e periodização.
O aluno APROVOU 100% a avaliação física anterior. Agora você deve prescrever a ficha de treino ideal.

Dados do Aluno:
- Nome: ${anamnese.nome}
- Nível: ${anamnese.nivel_experiencia}
- Frequência Semanal OBRIGATÓRIA: ${anamnese.dias_disponiveis} dias
- Objetivo Principal: ${anamnese.objetivo}
- Limitações/Lesões: ${anamnese.limitacoes_lesoes || 'Nenhuma'}
- Observações e Pedidos do Aluno: ${anamnese.observacoes_usuario || 'Nenhum'}

Resultado da Avaliação Física Aprovada:
- BF Utilizado: ${avaliacao.bf_estimado}
- Pontos Fortes: ${avaliacao.pontos_fortes.join(', ')}
- Pontos Fracos (FOCO PRIORITÁRIO DE VOLUME): ${avaliacao.pontos_fracos.join(', ')}
- Postura/Observações: ${avaliacao.postura_observacoes}

Instruções RIGOROSAS para a Prescrição:
1. O array "sessoes" DEVE CONTER EXATAMENTE ${anamnese.dias_disponiveis} SESSÕES DE TREINO (Ex: para ${anamnese.dias_disponiveis} dias, gere exatamente ${anamnese.dias_disponiveis} sessões: Treino A, Treino B, Treino C${anamnese.dias_disponiveis >= 4 ? ', Treino D...' : ''}).
2. Monte sessões completas prescrevendo EM MÉDIA 5 a 7 EXERCÍCIOS por sessão.
3. Dê prioridade de volume aos pontos fracos identificados (${avaliacao.pontos_fracos.join(', ')}).
4. Para cada exercício, defina séries de aquecimento, séries de trabalho, faixa de repetições, RIR, descanso em segundos e foco biomecânico.

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "fase": "TREINO",
  "treino": {
    "divisao_nome": "string (ex: Push / Pull / Legs / Upper ou ABC)",
    "frequencia_semanal": ${anamnese.dias_disponiveis},
    "volume_resumo": [
      { "grupo": "Peitoral", "series_semanais": 16 },
      { "grupo": "Dorsais", "series_semanais": 16 }
    ],
    "sessoes": [
      {
        "nome": "Treino A - Peitoral, Deltoides e Tríceps",
        "exercicios": [
          {
            "nome": "Supino Reto com Barra",
            "series_aquecimento": 2,
            "series_trabalho": 4,
            "reps": "8-10",
            "rir_alvo": 1,
            "descanso_segundos": 90,
            "foco_biomecanico": "Cadência controlada com contração máxima"
          }
        ]
      }
    ]
  }
}
`;

    const messages: NineRouterMessage[] = [
      {
        role: 'system',
        content: 'Você é um assistente especialista em periodização de treinos de musculação. Retorne SEMPRE JSON válido e estritamente aderente ao schema solicitado.',
      },
      {
        role: 'user',
        content: promptText,
      },
    ];

    const result = await this.callChatCompletions(messages, { temperature: 0.3 });

    if (!result.treino || !Array.isArray(result.treino.sessoes)) {
      throw new Error('JSON retornado pelo 9Router não contém a estrutura esperada de FichaTreino.');
    }

    return {
      fase: 'TREINO',
      treino: {
        divisao_nome: result.treino.divisao_nome || (anamnese.dias_disponiveis >= 4 ? 'Push / Pull / Legs / Upper' : 'Full Body / ABC'),
        frequencia_semanal: Number(result.treino.frequencia_semanal) || anamnese.dias_disponiveis,
        volume_resumo: Array.isArray(result.treino.volume_resumo) ? result.treino.volume_resumo : [],
        sessoes: result.treino.sessoes.map((s: any) => ({
          nome: String(s.nome || 'Sessão de Treino'),
          exercicios: (Array.isArray(s.exercicios) ? s.exercicios : []).map((e: any) => ({
            nome: String(e.nome || 'Exercício'),
            series_aquecimento: typeof e.series_aquecimento === 'number' ? e.series_aquecimento : 1,
            series_trabalho: typeof e.series_trabalho === 'number' ? e.series_trabalho : 3,
            reps: String(e.reps || '10-12'),
            rir_alvo: typeof e.rir_alvo === 'number' ? e.rir_alvo : 1,
            descanso_segundos: typeof e.descanso_segundos === 'number' ? e.descanso_segundos : 60,
            foco_biomecanico: String(e.foco_biomecanico || 'Execução controlada'),
          })),
        })),
      },
    };
  }

  /**
   * RECURSO EXCLUSIVO: Substituição de Exercício Individual via 9Router
   */
  public static async substituirExercicio(
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

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "exercicio_substituto": {
    "nome": "string",
    "series_aquecimento": number,
    "series_trabalho": number,
    "reps": "string",
    "rir_alvo": number,
    "descanso_segundos": number,
    "foco_biomecanico": "string"
  },
  "motivo_escolha": "string justificando biomecanicamente a troca"
}
`;

    const messages: NineRouterMessage[] = [
      {
        role: 'system',
        content: 'Você é um assistente especialista em cinesiologia e biomecânica. Retorne SEMPRE JSON válido.',
      },
      {
        role: 'user',
        content: promptText,
      },
    ];

    const result = await this.callChatCompletions(messages, { temperature: 0.3 });

    if (!result.exercicio_substituto || !result.exercicio_substituto.nome) {
      throw new Error('JSON retornado pelo 9Router não contém o objeto exercicio_substituto.');
    }

    const sub = result.exercicio_substituto;
    return {
      exercicio_substituto: {
        nome: String(sub.nome),
        series_aquecimento: typeof sub.series_aquecimento === 'number' ? sub.series_aquecimento : 1,
        series_trabalho: typeof sub.series_trabalho === 'number' ? sub.series_trabalho : 3,
        reps: String(sub.reps || '10-12'),
        rir_alvo: typeof sub.rir_alvo === 'number' ? sub.rir_alvo : 1,
        descanso_segundos: typeof sub.descanso_segundos === 'number' ? sub.descanso_segundos : 60,
        foco_biomecanico: String(sub.foco_biomecanico || 'Variação equivalente'),
      },
      motivo_escolha: String(result.motivo_escolha || 'Substituição biomecanicamente compatível.'),
    };
  }
}
