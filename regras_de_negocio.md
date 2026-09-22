# 📄 Regras de Negócio — MyPersonal (Personal AI Coach)

Este documento descreve as **Regras de Negócio**, os **Protocolos Éticos de Privacidade (LGPD)**, a arquitetura da Inteligência Artificial e o fluxo completo do sistema **MyPersonal**.

---

## 1. 📌 Visão Geral do Sistema
O **MyPersonal** é uma plataforma mobile e backend focada em avaliação física multimodal (visão computacional + anamnese) e prescrição de fichas de treino personalizadas utilizando inteligência artificial integrada via **9Router Gateway**.

---

## 2. 🛡️ Protocolo Ético e Privacidade de Imagens Corporais (LGPD)

Por razões éticas, de privacidade e conformidade com leis de proteção de dados (LGPD / GDPR):

1. **Processamento 100% Efêmero em Memória RAM**:
   - As fotos corporais (Frente, Costas, Perfil) enviadas pelo aplicativo mobile são transferidas de forma criptografada (HTTPS/TLS) diretamente para o backend.
   - O backend utiliza o buffer em memória RAM **exclusivamente durante a execução da análise visual da IA**.
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

## 4. 🩺 Regra de Ouro do Nutricionista & Estimativa de % de Gordura (BF) em 3 Camadas

O sistema aplica um protocolo de avaliação antropométrica e visual de alta precisão estruturado em 3 camadas:

1. **Camada 1 — Regra de Ouro do Nutricionista (Prevalência Clínica)**:
   - Caso o aluno JÁ TENHA passado por nutricionista (`passou_nutricionista = true`):
     - O aplicativo libera o campo para digitar o % de gordura (BF) oficial.
     - A IA é **estritamente obrigada** a utilizar este valor exato em `bf_estimado`, sem alterá-lo.
     - As fotos corporais são analisadas para identificar assimetrias, tônus, pontos fortes/fracos e desvios posturais.

2. **Camada 2 — Ancoragem Biomecânica Matemática (Fórmulas Antropométricas)**:
   - O backend (`AntropometriaService`) calcula previamente:
     - **IMC** e classificação segundo a OMS.
     - **Fórmula de Deurenberg**: `%BF = (1.20 × IMC) + (0.23 × Idade) - (10.8 × Sexo) - 5.4` (considerando sexo biológico: 1 masculino, 0 feminino).
     - **Fórmula de Gallagher**: `%BF = (1.46 × IMC) + (0.14 × Idade) - (11.6 × Sexo) - 10.0`.
     - **Calibração de Biotipo Muscular**: Praticantes de musculação intermediários/avançados possuem IMC elevado devido a massa muscular magra, não obesidade. O sistema calcula a janela biológica real esperada.

3. **Camada 3 — Rubrica Anatômica Visual Multimodal (IA Multimodal 9Router)**:
   - Caso o aluno NÃO tenha passado por nutricionista (`passou_nutricionista = false`), a IA analisa 4 quadrantes anatômicos objetivos nas fotos:
     - **Tronco e Abdômen**: Linha alba, definição de gomos do reto abdominal (em repouso vs contração), serrátil anterior e oblíquos externos.
     - **Cintura Escapular e Braços**: Separação deltoide/bíceps, densidade do peitoral e vascularização periférica.
     - **Flancos e Costas**: Acúmulo de gordura sobre as cristas ilíacas e proporção em V (V-taper).
     - **Conclusão Calibrada**: Cruze das evidências visuais com a âncora biométrica, gerando `bf_estimado`, `classificacao_bf`, `metrica_antropometrica` e resumo dos `marcadores_visuais`.

---

## 5. 📊 Fase 2: Diagnóstico Visual & Validação Humana

Antes de receber o treino, o aluno visualiza e valida o diagnóstico completo gerado:
- **BF Estimado ou Oficial** + **Classificação do Físico** (ex: *Atlético / Definido*).
- **Âncoras Antropométricas & Biotipo**: IMC calculado, BF de referência Deurenberg e densidade muscular observada.
- **Marcadores Anatômicos Visuais**: Descrição da leitura da IA no abdômen, ombros/braços, flancos e vascularização.
- **Pontos Fortes Musculares**: Grupos musculares bem desenvolvidos.
- **Prioridades Biomecânicas (Pontos Fracos)**: Grupos que receberão maior volume de séries.
- **Observações Posturais & Mensagem do Especialista**.

Ao clicar em **"Concordo 100% • Prescrever Treino ⚡"**, a Fase 3 é desbloqueada.

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
3. O **motor de IA (9Router)** gera em tempo real um **exercício substituto equivalente**:
   - Mantém o mesmo grupo muscular alvo e vetores de força.
   - Mantém as séries, reps e descanso compatíveis.
   - Fornece uma justificativa biomecânica para a escolha.
4. O exercício é atualizado **instantaneamente** na tela do aplicativo.

---

## 8. 🛡️ Arquitetura Técnica & Resiliência

- **Backend**: Fastify em Node.js / TypeScript com suporte a requisições de até 30MB (`bodyLimit: 30MB` para tráfego seguro de imagens em base64 via HTTPS).
- **Modelo de IA**: Gateway **`9Router`** local via interface compatível OpenAI com visão multimodal.
- **Resiliência e Fallback**: Fallback estruturado automático garantindo disponibilidade e treino de 4 dias completo mesmo em contingência.
- **Banco de Dados**: Supabase PostgreSQL (`alunos`, `avaliacoes`, `treinos`) preparado para vinculação com Supabase Auth (`user_id`).
