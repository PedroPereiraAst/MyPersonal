# 🏋️‍♂️ Guia de Aprendizado & Diário de Bordo: Personal Trainer com IA

Este documento é o seu **guia de progresso pessoal**. Aqui registramos tudo o que já foi aprendido e construído na prática, além dos próximos passos do projeto.

---

## 📐 1. Arquitetura do Projeto (Monorepo)

```text
PersonalTrainer/
├── mobile/      # Frontend: React Native com Expo + TypeScript
└── server/      # Backend: API Node.js com Fastify + TypeScript + Gemini AI
```

---

## 📋 2. Checklist do Desenvolvedor

- [x] **Passo 1: Estruturação Base (Monorepo)**
  - Inicialização do app `mobile` com Expo (SDK 57 + TypeScript).
  - Criação do diretório `server` para a API.
- [x] **Passo 2: Configuração do Backend (Node.js + Fastify)**
  - Entrar no diretório `server/`.
  - Criar o `package.json`.
  - Instalar dependências (`fastify`, `dotenv`, `@google/genai`, `@supabase/supabase-js`, `typescript`, `tsx`).
- [x] **Passo 3: Configuração do TypeScript e Primeiro Servidor**
  - Criar `tsconfig.json` no server.
  - Criar o primeiro endpoint HTTP `/health` em `src/server.ts`.
- [x] **Passo 4: Contratos de Dados e Schemas do Gemini**
  - Configurar variáveis de ambiente (`.env`).
  - Definir interfaces TypeScript e JSON Schemas (`AvaliacaoSchema` e `TreinoSchema`).
- [x] **Passo 5: Serviço de IA Multimodal (Gemini Service)**
  - Implementar Visão Computacional para fotos de anamnese.
  - Implementar Prescrição Estruturada de Treino.
- [x] **Passo 6: Rotas da API Fastify**
  - Criar endpoints `/api/avaliar` e `/api/gerar-treino`.
- [x] **Passo 7: Desenvolvimento da Interface Mobile (React Native)**
  - Configurar NativeWind (Tailwind CSS) e Lucide Icons.
  - Criar telas de Anamnese, Upload de Fotos, Cards de Validação e Ficha de Treino.

---

## ✍️ 3. Diário de Aprendizado (O que já fizemos?)

### ✅ Passo 1: Inicialização da Estrutura Base
- **O que foi feito:**
  - Rodamos `npx create-expo-app@latest mobile --template blank-typescript` para criar o projeto React Native.
  - Rodamos `mkdir server` na raiz do projeto.
- **Conceitos Aprendidos:**
  - **Expo & TypeScript:** O Expo automatiza a configuração do ecossistema React Native, enquanto o TypeScript previne erros digitando e definindo contratos de dados desde o primeiro momento.
  - **Organização de Pastas:** Manter `mobile` e `server` na mesma raiz facilita a evolução do projeto como um Monorepo limpo.
  - **Navegação no Terminal:** Como usar `cd ..` e passar flags `--template` sem espaços no terminal do Windows/PowerShell.

### ✅ Passo 2: Configuração do Backend (Node.js + Fastify)
- **O que foi feito:**
  - Inicializamos o `package.json` dentro da pasta `server/`.
  - Instalamos as dependências de produção (`fastify`, `dotenv`, `@supabase/supabase-js`, `@google/genai`) e dev (`typescript`, `@types/node`, `tsx`).
- **Conceitos Aprendidos:**
  - **Dependências de Produção vs. Desenvolvimento:** Dependências de produção (`npm install`) vão para o ambiente final onde a aplicação roda. As de dev (`npm install -D`) servem apenas para auxílio durante a escrita e compilação do código (como tipos e compilador TS).
  - **`tsx`**: Permite rodar arquivos `.ts` diretamente no Node sem precisar compilar manualmente para JS em cada alteração.

### ✅ Passo 3: Configuração do TypeScript & Servidor Fastify
- **O que foi feito:**
  - Ajustamos o `tsconfig.json` com `module: "NodeNext"` e `package.json` com `"type": "module"`.
  - Criamos o servidor Fastify em `src/server.ts` com a rota `/health`.
  - Testamos a execução em tempo real via `npm run dev`.
- **Conceitos Aprendidos:**
  - **ES Modules no Node.js**: `"type": "module"` permite o uso nativo de `import/export`.
  - **Health Check Routes**: Padrão de mercado para validar se a API está online e aceitando requisições.

### ✅ Passo 4: Contratos de Dados & JSON Schemas do Gemini
- **O que foi feito:**
  - Criamos o arquivo `.env` para proteger segredos de API.
  - Definimos as interfaces TypeScript (`AvaliacaoFisica`, `FichaTreino`) e os Schemas estritos do Gemini (`AvaliacaoSchema`, `TreinoSchema`).
- **Conceitos Aprendidos:**
  - **Structured Outputs / Schemas**: Como forçar IAs multimodais a devolver JSON estrito em vez de textos aleatórios, impedindo a quebra da interface do app mobile.
  - **Type-only Imports**: Uso de `import { Type, type Schema }` para separar símbolos JS de tipos TypeScript.

### ✅ Passo 5: Serviço da IA Gemini Multimodal (`gemini.service.ts`)
- **O que foi feito:**
  - Criamos a classe `GeminiService` com os métodos `analisarAvaliacaoFisica` e `gerarTreinoPrescrito`.
  - Adicionamos a inteligência de negócios: checar se o aluno já passou no nutricionista (usando BF oficial) ou se autoriza a IA estimar pelas fotos.
- **Conceitos Aprendidos:**
  - **Service Layer**: Isolar chamadas de terceiros (como a API do Gemini) fora das rotas HTTP do servidor.
  - **Prompts Dinâmicos**: Construção de prompts contextuais baseados no perfil e permissões do usuário.

### ✅ Passo 6: Rotas HTTP da API (`personal.routes.ts`)
- **O que foi feito:**
  - Criamos o plugin `personalRoutes` com as rotas `POST /api/avaliar` e `POST /api/gerar-treino`.
  - Registramos o plugin no `server.ts` sob o prefixo `/api`.
- **Conceitos Aprendidos:**
  - **Fastify Plugins & Prefixes**: Como organizar rotas em módulos assíncronos e prefixar caminhos globais.
  - **Validação de Payload**: Checagem de parâmetros obrigatórios (`anamnese`, `fotos`, `avaliacao`) antes de chamar a IA.

### ✅ Passo 7: Interface Mobile Nativas (React Native Expo)
- **O que foi feito:**
  - Instalamos o `expo-image-picker`, `lucide-react-native` e `react-native-svg`.
  - Criamos a máquina de estados em `App.tsx` orquestrando o fluxo das 3 Fases (Anamnese/Upload, Diagnóstico da IA e Ficha de Treino Prescrita).
- **Conceitos Aprendidos:**
  - **State Machine UI**: Controle estrito entre telas por etapas de fluxo.
  - **Image Picker & Base64**: Seleção e conversão de fotos locais para transmissão à API de Visão Computacional.





### ✅ Passo Extra: Versionamento Profissional com Git e GitHub
- **O que foi feito:**
  - Criamos o `.gitignore` para bloquear `node_modules/`, `.env` e pastas temporárias de build.
  - Inicializamos o repositório local (`git init`), corrigimos o atalho do Expo `mobile` e publicamos a branch `main` no GitHub (`PedroPereiraAst/MyPersonal`).
- **Conceitos Aprendidos:**
  - **`.gitignore`**: Essencial para não vazar senhas (`.env`) nem travar o terminal com milhares de arquivos do `node_modules`.
  - **Submódulos Git x Pastas Monorepo**: Como remover a pasta `.git` interna do Expo para manter todo o projeto sob o mesmo controle de versão.
  - **Repositório Local vs. Remoto**: `git init` cria o repositório no seu computador; `git remote` + `git push` publica na nuvem do GitHub.



