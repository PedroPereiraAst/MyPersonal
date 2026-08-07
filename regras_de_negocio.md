# 📄 Regras de Negócio — MyPersonal (Personal AI Coach)

Este documento descreve as **Regras de Negócio**, os **Protocolos Éticos de Privacidade (LGPD)**, a arquitetura da Inteligência Artificial e o fluxo completo do sistema **MyPersonal**.

---

## 1. 📌 Visão Geral do Sistema
O **MyPersonal** é uma plataforma mobile e backend focada em avaliação física multimodal (visão computacional + anamnese) e prescrição de fichas de treino personalizadas utilizando o modelo **Google Gemini 3.6 Flash**.

---

## 2. 🛡️ Protocolo Ético e Privacidade de Imagens Corporais (LGPD)

Por razões éticas, de privacidade e conformidade com leis de proteção de dados (LGPD / GDPR):

1. **Processamento 100% Efêmero em Memória RAM**:
   - As fotos corporais (Frente, Costas, Perfil) enviadas pelo aplicativo mobile são transferidas de forma criptografada (HTTPS/TLS) diretamente para o backend.
   - O backend utiliza o buffer em memória RAM **exclusivamente durante a execução da análise visual do Gemini 3.6 Flash**.
   - **Nenhuma foto é salva em disco, banco de dados ou armazenamento na nuvem (Storage)**.

2. **Descarte Imediato**:
   - Assim que o modelo de visão computacional gera o JSON de diagnóstico, a referência da imagem na RAM é destruída (*garbage collection*).

3. **Escopo do Banco de Dados PostgreSQL**:
   - O banco de dados no Supabase armazena **exclusivamente**:
     - Dados biométricos e cadastrais do aluno (`alunos`).
     - Diagnósticos numéricos e textuais da avaliação (`avaliacoes`).
     - Fichas de treino prescritas (`treinos`).
   - A tabela `alunos` possui a coluna `user_id` pronta para ser vinculada com o sistema de **Autenticação / Login** futuro do Supabase Auth.

---

## 3. 📋 Fase 1: Anamnese Biométrica & Fotos Corporais

### 3.1. Coleta Biométrica Obrigatória
Para iniciar qualquer avaliação, o usuário deve preencher:
- **Nome Completo**
- **Idade** (anos)
- **Peso** (kg)
- **Altura** (cm)
- **Frequência Semanal** (quantidade de dias disponíveis para treinar na semana)

### 3.2. Seleção de Objetivos Pessoais
O aluno deve obrigatoriamente selecionar uma das modalidades:
- 🏋️ **Hipertrofia**: Foco em ganho de massa muscular com volume progressivo.
- ✂️ **Definição**: Foco em manutenção de massa magra e maior gasto calórico.
- 💥 **Powerlifting**: Foco em força máxima nos levantamentos básicos (Agachamento, Supino, Terra).
- 🏃 **Endurance**: Foco em resistência muscular localizada e capacidade cardiorrespiratória.
- 🤸 **Calistenia**: Foco em força relativa e controle corporal com peso do corpo.

### 3.3. Nível de Experiência / Tempo de Treino
- **Iniciante**: < 6 meses de treino consistente.
- **Intermediário**: 6 meses a 2 anos de treino consistente.
- **Avançado**: > 2 anos de treino consistente com boa técnica biomecânica.

### 3.4. Campo Livre de Observações & Ajustes
- O aluno pode informar preferências específicas, limitações ou exercícios que não gosta de realizar (ex: *"Quero focar em ombros e dorsais"*, *"Prefiro não fazer agachamento livre devido a dor no joelho"*).

---

## 4. 🩺 Regra de Ouro do Nutricionista & Estimativa de % de Gordura (BF)

1. **Caso o aluno JÁ TENHA passado por nutricionista (`passou_nutricionista = true`)**:
   - O aplicativo libera um campo para digitar o % de gordura (BF) oficial medido pelo profissional.
   - A IA do Gemini é **obrigada** a utilizar este valor exato no relatório de avaliação, sem alterá-lo.
   - As fotos corporais são analisadas exclusivamente para identificar assimetrias, pontos fortes/fracos e desvios posturais.

2. **Caso o aluno NUNCA TENHA ido ao nutricionista (`passou_nutricionista = false`)**:
   - O aplicativo solicita consentimento explícito (`autoriza_estimativa_bf = true`).
   - A IA aplica **Visão Computacional Multimodal** nas fotos de **Frente**, **Costas** e **Perfil** para estimar uma faixa realista de BF (ex: `"14-17%"`).

---

## 5. 📊 Fase 2: Diagnóstico Visual & Validação Humana

Antes de receber o treino, o aluno deve visualizar e aprovar o diagnóstico gerado pela IA:
- **BF Estimado ou Informado**
- **Pontos Fortes**: Grupos musculares bem desenvolvidos.
- **Pontos Fracos**: Grupos musculares prioritários que necessitam de maior volume de treino.
- **Análise Postural**: Observações sobre alinhamento de ombros, escápulas e coluna.
- **Mensagem Encorajadora do Personal**.

Ao clicar em **"Concordo 100% / Gerar Treino ⚡"**, a Fase 3 é desbloqueada.

---

## 6. 🏋️ Fase 3: Prescrição da Ficha de Treino Personalizada

### 6.1. Regra de Volume (Média de 6 Exercícios por Treino)
- Cada sessão diária de treino prescrita pela IA deve conter **em média 6 exercícios detalhados**, garantindo volume de estímulo suficiente para a sessão.

### 6.2. Detalhamento Técnico de Cada Exercício
Cada exercício prescreve:
- **Nome do Exercício** (ex: *Supino Inclinado com Halteres*)
- **Séries de Aquecimento** (ex: *2 séries*)
- **Séries de Trabalho** (ex: *3 séries*)
- **Faixa de Repetições** (ex: *8-10 reps*)
- **RIR Alvo** (Repetições de Reserva, ex: *1 ou 2*)
- **Tempo de Descanso** (em segundos, ex: *90s*)
- **Foco Biomecânico / Cadência** (ex: *Pausa de 1s na máxima extensão*)

---

## 7. 🔄 Recurso Exclusivo: Substituição Inteligente de Exercícios

Caso o aluno não possua um aparelho na sua academia ou sinta desconforto em determinado movimento:
1. Cada card de exercício possui um botão **`🔄 Trocar`**.
2. Ao clicar, o aluno pode informar opcionalmente o motivo (ex: *"Sem máquina de leg press na academia"*).
3. O **Gemini 3.6 Flash** gera em tempo real um **exercício substituto equivalente**:
   - Mantém o mesmo grupo muscular alvo e vetores de força.
   - Mantém as séries, reps e descanso compatíveis.
   - Fornece uma justificativa biomecânica para a escolha.
4. O exercício é atualizado **instantaneamente** na tela do aplicativo.

---

## 8. 🛡️ Arquitetura Técnica & Resiliência

- **Backend**: Fastify em Node.js / TypeScript com suporte a requisições de até 30MB (`bodyLimit: 30MB` para tráfego seguro de imagens em base64 via HTTPS).
- **Modelo de IA**: Exclusivo **`gemini-3.6-flash`** via SDK oficial `@google/genai`.
- **Resiliência HTTP 503**: Sistema de retry automático de até 3 tentativas com intervalo de 1,5s caso os servidores do Google estejam em pico de demanda.
- **Banco de Dados**: Supabase PostgreSQL (`alunos`, `avaliacoes`, `treinos`) preparado para vinculação com Supabase Auth (`user_id`).
