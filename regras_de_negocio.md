# 📄 Regras de Negócio — MyPersonal (Personal AI Coach)

Este documento descreve as **Regras de Negócio**, a arquitetura de decisões da Inteligência Artificial e o fluxo completo do sistema **MyPersonal**.

---

## 1. 📌 Visão Geral do Sistema
O **MyPersonal** é uma plataforma mobile e backend focada em avaliação física multimodal (visão computacional + anamnese) e prescrição de fichas de treino personalizadas utilizando o modelo **Google Gemini 3.6 Flash**.

---

## 2. 📋 Fase 1: Anamnese Biométrica & Fotos Corporais

### 2.1. Coleta Biométrica Obrigatória
Para iniciar qualquer avaliação, o usuário deve preencher:
- **Nome Completo**
- **Idade** (anos)
- **Peso** (kg)
- **Altura** (cm)
- **Frequência Semanal** (quantidade de dias disponíveis para treinar na semana)

### 2.2. Seleção de Objetivos Pessoais
O aluno deve obrigatoriamente selecionar uma das modalidades:
- 🏋️ **Hipertrofia**: Foco em ganho de massa muscular com volume progressivo.
- ✂️ **Definição**: Foco em manutenção de massa magra e maior gasto calórico.
- 💥 **Powerlifting**: Foco em força máxima nos levantamentos básicos (Agachamento, Supino, Terra).
- 🏃 **Endurance**: Foco em resistência muscular localizada e capacidade cardiorrespiratória.
- 🤸 **Calistenia**: Foco em força relativa e controle corporal com peso do corpo.

### 2.3. Nível de Experiência / Tempo de Treino
- **Iniciante**: < 6 meses de treino consistente.
- **Intermediário**: 6 meses a 2 anos de treino consistente.
- **Avançado**: > 2 anos de treino consistente com boa técnica biomecânica.

### 2.4. Campo Livre de Observações & Ajustes
- O aluno pode informar preferências específicas, limitações ou exercícios que não gosta de realizar (ex: *"Quero focar em ombros e dorsais"*, *"Prefiro não fazer agachamento livre devido a dor no joelho"*).

---

## 3. 🩺 Regra de Ouro do Nutricionista & Estimativa de % de Gordura (BF)

Para garantir segurança ética e precisão técnica:

1. **Caso o aluno JÁ TENHA passado por nutricionista (`passou_nutricionista = true`)**:
   - O aplicativo libera um campo para digitar o % de gordura (BF) oficial medido pelo profissional.
   - A IA do Gemini é **obrigada** a utilizar este valor exato no relatório de avaliação, sem alterá-lo.
   - As fotos corporais são analisadas exclusivamente para identificar assimetrias, pontos fortes/fracos e desvios posturais.

2. **Caso o aluno NUNCA TENHA ido ao nutricionista (`passou_nutricionista = false`)**:
   - O aplicativo solicita consentimento explícito (`autoriza_estimativa_bf = true`).
   - A IA aplica **Visão Computacional Multimodal** nas fotos de **Frente**, **Costas** e **Perfil** para estimar uma faixa realista de BF (ex: `"14-17%"`).

---

## 4. 📊 Fase 2: Diagnóstico Visual & Validação Humana

Antes de receber o treino, o aluno deve visualizar e aprovar o diagnóstico gerado pela IA:
- **BF Estimado ou Informado**
- **Pontos Fortes**: Grupos musculares bem desenvolvidos.
- **Pontos Fracos**: Grupos musculares prioritários que necessitam de maior volume de treino.
- **Análise Postural**: Observações sobre alinhamento de ombros, escápulas e coluna.
- **Mensagem Encorajadora do Personal**.

Ao clicar em **"Concordo 100% / Gerar Treino ⚡"**, a Fase 3 é desbloqueada.

---

## 5. 🏋️ Fase 3: Prescrição da Ficha de Treino Personalizada

### 5.1. Regra de Volume (Média de 6 Exercícios por Treino)
- Cada sessão diária de treino prescrita pela IA deve conter **em média 6 exercícios detalhados**, garantindo volume de estímulo suficiente para a sessão.

### 5.2. Detalhamento Técnico de Cada Exercício
Cada exercício prescreve:
- **Nome do Exercício** (ex: *Supino Inclinado com Halteres*)
- **Séries de Aquecimento** (ex: *2 séries*)
- **Séries de Trabalho** (ex: *3 séries*)
- **Faixa de Repetições** (ex: *8-10 reps*)
- **RIR Alvo** (Repetições de Reserva, ex: *1 ou 2*)
- **Tempo de Descanso** (em segundos, ex: *90s*)
- **Foco Biomecânico / Cadência** (ex: *Pausa de 1s na máxima extensão*)

---

## 6. 🔄 Recurso Exclusivo: Substituição Inteligente de Exercícios

Caso o aluno não possua um aparelho na sua academia ou sinta desconforto em determinado movimento:
1. Cada card de exercício possui um botão **`🔄 Trocar`**.
2. Ao clicar, o aluno pode informar opcionalmente o motivo (ex: *"Sem máquina de leg press na academia"*).
3. O **Gemini 3.6 Flash** gera em tempo real um **exercício substituto equivalente**:
   - Mantém o mesmo grupo muscular alvo e vetores de força.
   - Mantém as séries, reps e descanso compatíveis.
   - Fornece uma justificativa biomecânica para a escolha.
4. O exercício é atualizado **instantaneamente** na tela do aplicativo.

---

## 7. 🛡️ Arquitetura Técnica & Resiliência

- **Backend**: Fastify em Node.js / TypeScript com suporte a requisições de até 30MB (`bodyLimit: 30MB` para upload de fotos em base64).
- **Modelo de IA**: Exclusivo **`gemini-3.6-flash`** via SDK oficial `@google/genai`.
- **Resiliência HTTP 503**: Sistema de retry automático de até 3 tentativas com intervalo de 1,5s caso os servidores do Google estejam em pico de demanda.
- **Segurança**: Variáveis de ambiente sensíveis (`GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) isoladas no servidor local `.env`.
