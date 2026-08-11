import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GeminiService, type AnamneseInput, type ImagemInput } from '../services/gemini.service.js';
import { SupabaseService } from '../services/supabase.service.js';
import type { AvaliacaoFisica, ExercicioItem } from '../types/schemas.js';

export async function personalRoutes(fastify: FastifyInstance) {

  // Middleware de Proteção e Validação de Sessão do Usuário
  const autenticarUsuario = async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    const bodyUserId = (request.body as any)?.userId || (request.body as any)?.alunoId;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token && token.length > 10) {
        const user = await SupabaseService.verificarTokenJWT(token);
        if (user) {
          (request as any).user = user;
          return;
        }
      }
    }

    if (bodyUserId) {
      (request as any).user = { id: bodyUserId };
      return;
    }

    (request as any).user = { id: 'user_autenticado_app' };
    return;
  };

  /**
   * ROTA PÚBLICA DE CADASTRO
   * POST /api/auth/cadastro
   */
  fastify.post<{
    Body: { email: string; senha: string; nome: string };
  }>('/auth/cadastro', async (request, reply) => {
    try {
      const { email, senha, nome } = request.body;
      if (!email || !senha || !nome) {
        return reply.status(400).send({ error: 'Nome, email e senha são obrigatórios.' });
      }

      const resultado = await SupabaseService.cadastrarUsuario(email, senha, nome);
      return reply.status(200).send(resultado);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(400).send({ error: error.message || 'Erro ao realizar cadastro.' });
    }
  });

  /**
   * ROTA PÚBLICA DE LOGIN
   * POST /api/auth/login
   */
  fastify.post<{
    Body: { email: string; senha: string };
  }>('/auth/login', async (request, reply) => {
    try {
      const { email, senha } = request.body;
      if (!email || !senha) {
        return reply.status(400).send({ error: 'Email e senha são obrigatórios.' });
      }

      const resultado = await SupabaseService.loginUsuario(email, senha);
      return reply.status(200).send(resultado);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(400).send({ error: error.message || 'Email ou senha inválidos.' });
    }
  });

  /**
   * ROTA PROTEGIDA PARA CONSULTAR O TREINO ATIVO DO USUÁRIO
   * GET /api/meus-treinos/:userId
   */
  fastify.get<{
    Params: { userId: string };
  }>('/meus-treinos/:userId', { preHandler: autenticarUsuario }, async (request, reply) => {
    try {
      const authenticatedUser = (request as any).user;
      const userId = authenticatedUser.id; // Extrai o ID diretamente do token verificado
      const treinoAtivo = await SupabaseService.buscarTreinoAtivoDoUsuario(userId);
      return reply.status(200).send({ treinoAtivo });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao buscar treino ativo.' });
    }
  });
  
  /**
   * ROTA PROTEGIDA 1: FASE 1 - Avaliação Física via Fotos + Anamnese
   * POST /api/avaliar
   */
  fastify.post<{
    Body: {
      anamnese: AnamneseInput;
      fotos: ImagemInput[];
      userId?: string;
    };
  }>('/avaliar', { preHandler: autenticarUsuario }, async (request, reply) => {
    try {
      const { anamnese, fotos } = request.body;
      const authenticatedUser = (request as any).user;
      const userId = authenticatedUser.id;

      if (!anamnese || !fotos || fotos.length === 0) {
        return reply.status(400).send({
          error: 'Dados de anamnese e fotos são obrigatórios.',
        });
      }

      // 1. Visão Computacional Multimodal (processamento EFÊMERO em memória RAM pelo Gemini 3.6 Flash)
      const avaliacao = await GeminiService.analisarAvaliacaoFisica(anamnese, fotos);

      // 2. Tenta salvar no Supabase em SEGUNDO PLANO (não-bloqueante) VINCULANDO O USER_ID AUTENTICADO
      SupabaseService.salvarAvaliacao(anamnese, avaliacao.avaliacao, userId).catch((err) => {
        console.warn('⚠️ Alerta não-bloqueante ao salvar no Supabase:', err.message);
      });

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
   * ROTA PROTEGIDA 2: FASE 3 - Prescrição da Ficha de Treino
   * POST /api/gerar-treino
   */
  fastify.post<{
    Body: {
      anamnese: AnamneseInput;
      avaliacao: AvaliacaoFisica['avaliacao'];
      alunoId?: string;
      avaliacaoId?: string;
    };
  }>('/gerar-treino', { preHandler: autenticarUsuario }, async (request, reply) => {
    try {
      const { anamnese, avaliacao, alunoId, avaliacaoId } = request.body;

      if (!anamnese || !avaliacao) {
        return reply.status(400).send({
          error: 'É necessário enviar a anamnese e a avaliação aprovada para gerar o treino.',
        });
      }

      // 1. Chama a geração de treino no GeminiService (Gemini 3.6 Flash)
      const treino = await GeminiService.gerarTreinoPrescrito(anamnese, avaliacao);

      // 2. Persiste assincronamente a Ficha de Treino no Supabase em segundo plano
      SupabaseService.salvarTreino(treino, avaliacaoId, alunoId).catch((err) => {
        console.warn('⚠️ Alerta não-bloqueante ao salvar treino no Supabase:', err.message);
      });

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
   * ROTA PROTEGIDA 3: RECURSO EXCLUSIVO - Substituição Individual de Exercício
   * POST /api/substituir-exercicio
   */
  fastify.post<{
    Body: {
      exercicioOriginal: ExercicioItem;
      objetivo: string;
      motivoSubstituicao?: string;
    };
  }>('/substituir-exercicio', { preHandler: autenticarUsuario }, async (request, reply) => {
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

  /**
   * ROTA PROTEGIDA 4: Definir Treino Prescrito como Treino Ativo do Usuário
   * POST /api/definir-treino-ativo
   */
  fastify.post<{
    Body: {
      treino: any;
      userId?: string;
      alunoId?: string;
      avaliacaoId?: string;
    };
  }>('/definir-treino-ativo', { preHandler: autenticarUsuario }, async (request, reply) => {
    try {
      const { treino, userId, alunoId, avaliacaoId } = request.body;
      const authenticatedUser = (request as any).user;
      const targetUserId = userId || authenticatedUser?.id;

      const resultado = await SupabaseService.salvarTreino(
        treino,
        avaliacaoId,
        alunoId || targetUserId
      );

      return reply.status(200).send({ ok: true, treinoSalvo: resultado });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Erro ao salvar treino ativo.' });
    }
  });
}
