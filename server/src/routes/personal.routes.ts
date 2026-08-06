import type { FastifyInstance } from 'fastify';
import { GeminiService, type AnamneseInput, type ImagemInput } from '../services/gemini.service.js';
import type { AvaliacaoFisica } from '../types/schemas.js';

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

      // Chama a inteligência do GeminiService
      const avaliacao = await GeminiService.analisarAvaliacaoFisica(anamnese, fotos);

      return reply.status(200).send(avaliacao);
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
   * (Chamado APENAS após o clique "Concordo 100% / Gerar Treino")
   */
  fastify.post<{
    Body: {
      anamnese: AnamneseInput;
      avaliacao: AvaliacaoFisica['avaliacao'];
    };
  }>('/gerar-treino', async (request, reply) => {
    try {
      const { anamnese, avaliacao } = request.body;

      if (!anamnese || !avaliacao) {
        return reply.status(400).send({
          error: 'É necessário enviar a anamnese e a avaliação aprovada para gerar o treino.',
        });
      }

      // Chama a geração de treino no GeminiService
      const treino = await GeminiService.gerarTreinoPrescrito(anamnese, avaliacao);

      return reply.status(200).send(treino);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Erro ao prescrever a ficha de treino.',
        details: error.message,
      });
    }
  });
}
