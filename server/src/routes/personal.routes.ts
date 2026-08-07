import type { FastifyInstance } from 'fastify';
import { GeminiService, type AnamneseInput, type ImagemInput } from '../services/gemini.service.js';
import { SupabaseService } from '../services/supabase.service.js';
import type { AvaliacaoFisica, ExercicioItem } from '../types/schemas.js';

export async function personalRoutes(fastify: FastifyInstance) {
  
  /**
   * ROTA 1: FASE 1 - Avaliação Física via Fotos + Anamnese
   * POST /api/avaliar
   */
  fastify.post<{
    Body: {
      anamnese: AnamneseInput;
      fotos: ImagemInput[];
    };
  }>('/avaliar', async (request, reply) => {
    try {
      const { anamnese, fotos } = request.body;

      if (!anamnese || !fotos || fotos.length === 0) {
        return reply.status(400).send({
          error: 'Dados de anamnese e fotos são obrigatórios.',
        });
      }

      // 1. Chama a inteligência do GeminiService para diagnóstico por visão computacional
      const avaliacao = await GeminiService.analisarAvaliacaoFisica(anamnese, fotos);

      // 2. Faz upload assíncrono das fotos para o Supabase Storage
      const fotosUrls: string[] = [];
      for (let i = 0; i < fotos.length; i++) {
        const url = await SupabaseService.uploadFoto(
          fotos[i].base64Data,
          fotos[i].mimeType,
          `foto_${i + 1}`
        );
        if (url) fotosUrls.push(url);
      }

      // 3. Persiste Aluno e Avaliação no PostgreSQL do Supabase
      const persistencia = await SupabaseService.salvarAvaliacao(
        anamnese,
        avaliacao.avaliacao,
        fotosUrls
      );

      return reply.status(200).send({
        ...avaliacao,
        persistencia: persistencia || undefined,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Erro ao processar avaliação física.',
        details: error.message,
      });
    }
  });

  /**
   * ROTA 2: FASE 3 - Prescrição da Ficha de Treino
   * POST /api/gerar-treino
   */
  fastify.post<{
    Body: {
      anamnese: AnamneseInput;
      avaliacao: AvaliacaoFisica['avaliacao'];
      alunoId?: string;
      avaliacaoId?: string;
    };
  }>('/gerar-treino', async (request, reply) => {
    try {
      const { anamnese, avaliacao, alunoId, avaliacaoId } = request.body;

      if (!anamnese || !avaliacao) {
        return reply.status(400).send({
          error: 'É necessário enviar a anamnese e a avaliação aprovada para gerar o treino.',
        });
      }

      // 1. Chama a geração de treino no GeminiService (Gemini 3.6 Flash)
      const treino = await GeminiService.gerarTreinoPrescrito(anamnese, avaliacao);

      // 2. Persiste a Ficha de Treino no Supabase PostgreSQL
      await SupabaseService.salvarTreino(treino, avaliacaoId, alunoId);

      return reply.status(200).send(treino);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Erro ao prescrever a ficha de treino.',
        details: error.message,
      });
    }
  });

  /**
   * ROTA 3: RECURSO EXCLUSIVO - Substituição Individual de Exercício
   * POST /api/substituir-exercicio
   */
  fastify.post<{
    Body: {
      exercicioOriginal: ExercicioItem;
      objetivo: string;
      motivoSubstituicao?: string;
    };
  }>('/substituir-exercicio', async (request, reply) => {
    try {
      const { exercicioOriginal, objetivo, motivoSubstituicao } = request.body;

      if (!exercicioOriginal || !objetivo) {
        return reply.status(400).send({
          error: 'É necessário enviar o exercício original e o objetivo para a substituição.',
        });
      }

      const resultado = await GeminiService.substituirExercicio(
        exercicioOriginal,
        objetivo,
        motivoSubstituicao
      );

      return reply.status(200).send(resultado);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Erro ao substituir exercício.',
        details: error.message,
      });
    }
  });
}
