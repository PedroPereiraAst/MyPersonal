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
- [ ] **Passo 3: Configuração do TypeScript e Primeiro Servidor**
  - Criar `tsconfig.json` no server.
  - Criar o primeiro endpoint HTTP `/health` em `src/server.ts`.
- [ ] **Passo 4: Contratos de Dados e Schemas do Gemini**
  - Configurar variáveis de ambiente (`.env`).
  - Definir interfaces TypeScript e JSON Schemas (`AvaliacaoSchema` e `TreinoSchema`).
- [ ] **Passo 5: Serviço de IA Multimodal (Gemini Service)**
  - Implementar Visão Computacional para fotos de anamnese.
  - Implementar Prescrição Estruturada de Treino.
- [ ] **Passo 6: Rotas da API Fastify**
  - Criar endpoints `/api/avaliar` e `/api/gerar-treino`.
- [ ] **Passo 7: Desenvolvimento da Interface Mobile (React Native)**
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

