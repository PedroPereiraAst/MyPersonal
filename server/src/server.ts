import Fastify from "fastify";
import dotenv from "dotenv";
import { personalRoutes } from "./routes/personal.routes.js";

// Carrega as variáveis do arquivo .env
dotenv.config();

// Criação da instância do servidor Fastify com logger ativado
const app = Fastify({
    logger: true,
});

// Registrar o plugin de rotas com o prefixo /api
app.register(personalRoutes, { prefix: '/api' });

// Rota de teste para verificar se a API está rodando
app.get('/health', async (request, reply) => {
    return {
        status: 'ok',
        message: 'API rodando'
    };
});

// Inicia o servidor
const start = async () => {
    try{
        const port = Number(process.env.PORT) || 3333;
        // Configura a API para escutar requisições na porta definida
        await app.listen({ port, host: '0.0.0.0' });
        console.log(`Server rodando em http://localhost:${port}`);
    }
    catch(err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();