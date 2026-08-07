import dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";
import cors from "@fastify/cors";
import { personalRoutes } from "./routes/personal.routes.js";

const app = Fastify({
    logger: true,
    bodyLimit: 30 * 1024 * 1024, // 30 MB para aceitar upload de fotos base64
});


// Habilita CORS para permitir conexões do aplicativo mobile no celular e web
await app.register(cors, {
    origin: true,
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
    try {
        const port = Number(process.env.PORT) || 3333;
        await app.listen({ port, host: '0.0.0.0' });
        console.log(`Server rodando em http://localhost:${port}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();