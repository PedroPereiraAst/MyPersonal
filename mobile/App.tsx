import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './src/services/supabase';
import {
  enviarAvaliacaoAnamnese,
  solicitarGeracaoTreino,
  solicitarSubstituicaoExercicio,
  executarCadastroApi,
  executarLoginApi,
  buscarTreinoAtivo,
} from './src/services/api';
import type { AnamneseFormData, ImagemFoto, AvaliacaoFisica, FichaTreino } from './src/types';

export default function App() {
  // Controle de Sessão de Autenticação Supabase
  const [session, setSession] = useState<any>(null);
  const [abaAuth, setAbaAuth] = useState<'login' | 'cadastro'>('login');
  const [emailAuth, setEmailAuth] = useState('');
  const [senhaAuth, setSenhaAuth] = useState('');
  const [carregandoAuth, setCarregandoAuth] = useState(false);

  // Navegação Principal da Aplicação: 'novo' (Formulário + Ficha) vs 'historico' (Meu Treino Ativo)
  const [abaPrincipal, setAbaPrincipal] = useState<'novo' | 'historico'>('novo');

  // Controle de Fase da Aplicação: 1 (Anamnese/Fotos), 2 (Validação), 3 (Ficha de Treino)
  const [faseAtual, setFaseAtual] = useState<1 | 2 | 3>(1);
  const [carregando, setCarregando] = useState(false);

  // Estado para o Único Treino Ativo do Usuário no Supabase
  const [treinoAtivoSalvo, setTreinoAtivoSalvo] = useState<any | null>(null);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [sessaoAtivaIndex, setSessaoAtivaIndex] = useState<number>(0);

  // Estado do Formulário de Anamnese
  const [nome, setNome] = useState('');
  const [idade, setIdade] = useState('');
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [objetivo, setObjetivo] = useState('Hipertrofia');
  const [nivel, setNivel] = useState('Intermediário');
  const [dias, setDias] = useState('4');
  const [limitacoes, setLimitacoes] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Regra do Nutricionista
  const [passouNutricionista, setPassouNutricionista] = useState<boolean | null>(null);
  const [bfInformado, setBfInformado] = useState('');
  const [autorizaEstimativa, setAutorizaEstimativa] = useState<boolean>(true);

  // Fotos Corporais
  const [fotos, setFotos] = useState<{ frente?: ImagemFoto; costas?: ImagemFoto; perfil?: ImagemFoto }>({});

  // Respostas da IA
  const [resultadoAvaliacao, setResultadoAvaliacao] = useState<AvaliacaoFisica | null>(null);
  const [resultadoTreino, setResultadoTreino] = useState<FichaTreino | null>(null);

  // Estado para Modal de Substituição de Exercício
  const [modalSubstituicaoVisivel, setModalSubstituicaoVisivel] = useState(false);
  const [exercicioParaSubstituir, setExercicioParaSubstituir] = useState<{
    sessaoIndex: number;
    exercicioIndex: number;
    dados: any;
    isTreinoSalvo?: boolean;
  } | null>(null);
  const [motivoTroca, setMotivoTroca] = useState('');
  const [carregandoTroca, setCarregandoTroca] = useState(false);

  // Lista de Objetivos e Níveis
  const listaObjetivos = ['Hipertrofia', 'Definição', 'Powerlifting', 'Endurance', 'Calistenia'];
  const listaNiveis = ['Iniciante', 'Intermediário', 'Avançado'];

  // Escutar Estado de Autenticação Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setNome(session.user.user_metadata?.nome || session.user.email?.split('@')[0] || '');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setNome(session.user.user_metadata?.nome || session.user.email?.split('@')[0] || '');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Carregar o Treino Ativo do Supabase quando a aba 'historico' for aberta
  useEffect(() => {
    if (session?.user && abaPrincipal === 'historico') {
      carregarTreinoAtivo();
    }
  }, [session, abaPrincipal]);

  const carregarTreinoAtivo = async () => {
    if (!session?.user?.id) return;
    setCarregandoHistorico(true);
    try {
      const treino = await buscarTreinoAtivo(session.user.id);
      setTreinoAtivoSalvo(treino);
      setSessaoAtivaIndex(0);
    } catch (err: any) {
      console.warn('Alerta ao buscar treino ativo:', err.message);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  // Executar Login via Rota Backend Confiável
  const handleLogin = async () => {
    if (!emailAuth || !senhaAuth) {
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha seu Email e Senha.');
      return;
    }

    setCarregandoAuth(true);
    try {
      const data = await executarLoginApi(emailAuth, senhaAuth);
      if (data?.session) {
        await supabase.auth.setSession(data.session);
        setSession(data.session);
        setNome(data.user?.user_metadata?.nome || emailAuth.split('@')[0]);
      } else {
        setSession({ user: data.user || { email: emailAuth } });
        setNome(data.user?.user_metadata?.nome || emailAuth.split('@')[0]);
      }
    } catch (err: any) {
      Alert.alert('Erro ao Entrar', err.message || 'Email ou senha inválidos.');
    } finally {
      setCarregandoAuth(false);
    }
  };

  // Executar Cadastro via Rota Backend Confiável (com Auto-Confirmação)
  const handleCadastro = async () => {
    if (!emailAuth || !senhaAuth || !nome) {
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha Nome, Email e Senha.');
      return;
    }

    if (senhaAuth.length < 6) {
      Alert.alert('Senha Curta', 'A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setCarregandoAuth(true);
    try {
      const data = await executarCadastroApi(emailAuth, senhaAuth, nome);
      
      try {
        const loginData = await executarLoginApi(emailAuth, senhaAuth);
        if (loginData?.session) {
          await supabase.auth.setSession(loginData.session);
          setSession(loginData.session);
        } else {
          setSession({ user: data.user || { email: emailAuth } });
        }
      } catch {
        setSession({ user: data.user || { email: emailAuth } });
      }

      Alert.alert('Conta Criada com Sucesso!', 'Sua conta foi cadastrada e você já está logado!');
    } catch (err: any) {
      Alert.alert('Erro no Cadastro', err.message || 'Falha ao criar conta.');
    } finally {
      setCarregandoAuth(false);
    }
  };

  // Executar Logout / Sair
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setFaseAtual(1);
    setResultadoAvaliacao(null);
    setResultadoTreino(null);
    setTreinoAtivoSalvo(null);
  };

  // Função para tirar/selecionar foto
  const selecionarFoto = async (tipo: 'frente' | 'costas' | 'perfil') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const asset = result.assets[0];
      setFotos((prev) => ({
        ...prev,
        [tipo]: {
          uri: asset.uri,
          mimeType: asset.mimeType || 'image/jpeg',
          base64Data: asset.base64,
          tipo,
        },
      }));
    }
  };

  // Submeter Fase 1 (Anamnese + Fotos -> Backend Fastify -> Gemini)
  const handleSubmeterAnamnese = async () => {
    if (!nome || !idade || !peso || !altura) {
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha Nome, Idade, Peso e Altura.');
      return;
    }

    if (passouNutricionista === null) {
      Alert.alert('Pergunta Obrigatória', 'Por favor, responda se você já passou por uma consulta com nutricionista.');
      return;
    }

    const fotosArray = Object.values(fotos).filter((f): f is ImagemFoto => f !== undefined);

    if (fotosArray.length === 0) {
      Alert.alert('Fotos Obrigatórias', 'Por favor, selecione ao menos 1 foto corporal (frente, costas ou perfil).');
      return;
    }

    const anamneseData: AnamneseFormData = {
      nome,
      idade: Number(idade),
      peso: Number(peso),
      altura: Number(altura),
      objetivo,
      nivel_experiencia: nivel,
      dias_disponiveis: Number(dias),
      limitacoes_lesoes: limitacoes,
      observacoes_usuario: observacoes,
      passou_nutricionista: passouNutricionista,
      bf_informado: bfInformado ? Number(bfInformado) : undefined,
      autoriza_estimativa_bf: autorizaEstimativa,
    };

    setCarregando(true);
    try {
      const avaliacao = await enviarAvaliacaoAnamnese(anamneseData, fotosArray);
      setResultadoAvaliacao(avaliacao);
      setFaseAtual(2);
    } catch (err: any) {
      Alert.alert('Erro na Análise', err.message || 'Falha ao conectar com o servidor.');
    } finally {
      setCarregando(false);
    }
  };

  // Submeter Fase 2 -> Avançar para Fase 3 (Gerar Treino)
  const handleConfirmarEGerarTreino = async () => {
    if (!resultadoAvaliacao) return;

    const anamneseData: AnamneseFormData = {
      nome,
      idade: Number(idade),
      peso: Number(peso),
      altura: Number(altura),
      objetivo,
      nivel_experiencia: nivel,
      dias_disponiveis: Number(dias),
      limitacoes_lesoes: limitacoes,
      observacoes_usuario: observacoes,
      passou_nutricionista: passouNutricionista || false,
      bf_informado: bfInformado ? Number(bfInformado) : undefined,
    };

    setCarregando(true);
    try {
      const treino = await solicitarGeracaoTreino(
        anamneseData,
        resultadoAvaliacao.avaliacao,
        session?.user?.id || resultadoAvaliacao.persistencia?.alunoId,
        resultadoAvaliacao.persistencia?.avaliacaoId
      );
      setResultadoTreino(treino);
      setFaseAtual(3);
      setSessaoAtivaIndex(0);
    } catch (err: any) {
      Alert.alert('Erro ao Prescrever Treino', err.message || 'Falha ao gerar treino.');
    } finally {
      setCarregando(false);
    }
  };

  // Abrir Modal de Substituição de Exercício
  const handleAbrirModalSubstituicao = (sessaoIndex: number, exercicioIndex: number, dados: any, isTreinoSalvo = false) => {
    setExercicioParaSubstituir({ sessaoIndex, exercicioIndex, dados, isTreinoSalvo });
    setMotivoTroca('');
    setModalSubstituicaoVisivel(true);
  };

  // Executar a Substituição via IA (Gemini 3.6 Flash)
  const handleExecutarSubstituicao = async () => {
    if (!exercicioParaSubstituir) return;

    setCarregandoTroca(true);
    try {
      const resposta = await solicitarSubstituicaoExercicio(
        exercicioParaSubstituir.dados,
        objetivo,
        motivoTroca
      );

      if (exercicioParaSubstituir.isTreinoSalvo && treinoAtivoSalvo) {
        const novoTreinoObj = JSON.parse(JSON.stringify(treinoAtivoSalvo));
        novoTreinoObj.treino_json.treino.sessoes[exercicioParaSubstituir.sessaoIndex].exercicios[
          exercicioParaSubstituir.exercicioIndex
        ] = resposta.exercicio_substituto;
        setTreinoAtivoSalvo(novoTreinoObj);
      } else if (resultadoTreino) {
        const novoTreino = JSON.parse(JSON.stringify(resultadoTreino)) as FichaTreino;
        novoTreino.treino.sessoes[exercicioParaSubstituir.sessaoIndex].exercicios[
          exercicioParaSubstituir.exercicioIndex
        ] = resposta.exercicio_substituto;
        setResultadoTreino(novoTreino);
      }

      setModalSubstituicaoVisivel(false);

      Alert.alert(
        '🔄 Exercício Substituído com Sucesso!',
        `Novo Exercício: ${resposta.exercicio_substituto.nome}\n\nMotivo da Escolha: ${resposta.motivo_escolha}`
      );
    } catch (err: any) {
      Alert.alert('Erro ao Substituir', err.message || 'Não foi possível trocar o exercício.');
    } finally {
      setCarregandoTroca(false);
    }
  };

  // SE O USUÁRIO NÃO ESTIVER LOGADO -> EXIBIR TELA DE AUTENTICAÇÃO (FASE 0)
  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1, justifyContent: 'center' }}>
          <View style={styles.authCard}>
            <Text style={styles.authLogo}>🏋️ MyPersonal AI</Text>
            <Text style={styles.authSubtitle}>Seu Personal Trainer Inteligente com Visão Computacional</Text>

            <View style={styles.authTabContainer}>
              <TouchableOpacity
                style={[styles.authTab, abaAuth === 'login' && styles.authTabActive]}
                onPress={() => setAbaAuth('login')}
              >
                <Text style={[styles.authTabText, abaAuth === 'login' && styles.authTabTextActive]}>Entrar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authTab, abaAuth === 'cadastro' && styles.authTabActive]}
                onPress={() => setAbaAuth('cadastro')}
              >
                <Text style={[styles.authTabText, abaAuth === 'cadastro' && styles.authTabTextActive]}>Criar Conta</Text>
              </TouchableOpacity>
            </View>

            {abaAuth === 'cadastro' && (
              <View>
                <Text style={styles.label}>Nome Completo</Text>
                <TextInput
                  style={styles.input}
                  value={nome}
                  onChangeText={setNome}
                  placeholder="Ex: Pedro Pereira"
                  placeholderTextColor="#64748b"
                />
              </View>
            )}

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={emailAuth}
              onChangeText={setEmailAuth}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="seuemail@exemplo.com"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              value={senhaAuth}
              onChangeText={setSenhaAuth}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#64748b"
            />

            {carregandoAuth ? (
              <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 15 }} />
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={abaAuth === 'login' ? handleLogin : handleCadastro}
              >
                <Text style={styles.primaryButtonText}>
                  {abaAuth === 'login' ? 'Entrar no App ➔' : 'Criar Minha Conta ⚡'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // TELA PRINCIPAL (USUÁRIO AUTENTICADO COM BARRA DE NAVEGAÇÃO SUPERIOR)
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* HEADER DE SAUDAÇÃO COM BOTÃO LOGOUT */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.headerTitle}>🏋️ Personal AI Coach</Text>
            <Text style={styles.headerUserText}>Olá, {nome || session.user.email} 👋</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>Sair 🚪</Text>
          </TouchableOpacity>
        </View>

        {/* NAVEGAÇÃO DE ABAS PRINCIPAIS: NOVO TREINO vs MEU TREINO ATIVO */}
        <View style={styles.mainNavContainer}>
          <TouchableOpacity
            style={[styles.mainNavTab, abaPrincipal === 'novo' && styles.mainNavTabActive]}
            onPress={() => setAbaPrincipal('novo')}
          >
            <Text style={[styles.mainNavTabText, abaPrincipal === 'novo' && styles.mainNavTabTextActive]}>
              🏋️ Novo Treino
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mainNavTab, abaPrincipal === 'historico' && styles.mainNavTabActive]}
            onPress={() => setAbaPrincipal('historico')}
          >
            <Text style={[styles.mainNavTabText, abaPrincipal === 'historico' && styles.mainNavTabTextActive]}>
              💪 Meu Treino Ativo
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ABA 2: MEU TREINO ATIVO NO SUPABASE (ORGANIZADO POR DIAS A, B, C...) */}
      {abaPrincipal === 'historico' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.cardTitle}>💪 Sua Ficha de Treino Ativa</Text>
              <TouchableOpacity onPress={carregarTreinoAtivo}>
                <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: 'bold' }}>🔄 Atualizar</Text>
              </TouchableOpacity>
            </View>

            {carregandoHistorico ? (
              <ActivityIndicator size="large" color="#38bdf8" style={{ marginVertical: 30 }} />
            ) : !treinoAtivoSalvo ? (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <Text style={{ fontSize: 36, marginBottom: 10 }}>🏋️‍♂️</Text>
                <Text style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: 16 }}>Nenhum treino ativo encontrado</Text>
                <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: 20 }}>
                  Preencha sua anamnese na aba "Novo Treino" para gerar sua primeira ficha inteligente!
                </Text>
              </View>
            ) : (
              (() => {
                const tData = treinoAtivoSalvo.treino_json?.treino;
                const sessoes = tData?.sessoes || [];
                const sessaoAtual = sessoes[sessaoAtivaIndex] || sessoes[0];

                return (
                  <View>
                    <Text style={{ color: '#cbd5e1', fontSize: 13, marginBottom: 12 }}>
                      Divisão: <Text style={{ color: '#38bdf8', fontWeight: 'bold' }}>{tData?.divisao_nome}</Text> | {tData?.frequencia_semanal}x por semana
                    </Text>

                    {/* NAVEGAÇÃO DE DIAS DE TREINO (DIA A, DIA B, DIA C...) */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {sessoes.map((s: any, idx: number) => {
                          const letraDia = String.fromCharCode(65 + idx); // A, B, C...
                          const isSelected = sessaoAtivaIndex === idx;

                          return (
                            <TouchableOpacity
                              key={idx}
                              style={[
                                styles.dayChip,
                                isSelected && styles.dayChipActive,
                              ]}
                              onPress={() => setSessaoAtivaIndex(idx)}
                            >
                              <Text style={[styles.dayChipText, isSelected && styles.dayChipTextActive]}>
                                Treino {letraDia}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>

                    {/* SESSÃO DE TREINO SELECIONADA */}
                    {sessaoAtual && (
                      <View style={styles.sessionCard}>
                        <Text style={styles.sessionTitle}>{sessaoAtual.nome}</Text>

                        {sessaoAtual.exercicios?.map((ex: any, eIdx: number) => (
                          <View key={eIdx} style={styles.exerciseBox}>
                            <View style={styles.exerciseHeader}>
                              <Text style={styles.exerciseName}>{eIdx + 1}. {ex.nome}</Text>
                              <TouchableOpacity
                                style={styles.replaceBtn}
                                onPress={() => handleAbrirModalSubstituicao(sessaoAtivaIndex, eIdx, ex, true)}
                              >
                                <Text style={styles.replaceBtnText}>🔄 Trocar</Text>
                              </TouchableOpacity>
                            </View>

                            <Text style={styles.exerciseDetails}>
                              Séries: {ex.series_trabalho} (Aquecimento: {ex.series_aquecimento}) | Reps: {ex.reps} | RIR: {ex.rir_alvo}
                            </Text>
                            <Text style={styles.exerciseDetails}>
                              Descanso: {ex.descanso_segundos}s | Cadência: {ex.foco_biomecanico}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })()
            )}
          </View>
        </ScrollView>
      )}

      {/* ABA 1: GERAR NOVO TREINO (FLUXO 3 FASES) */}
      {abaPrincipal === 'novo' && (
        <>
          {carregando ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#38bdf8" />
              <Text style={styles.loadingText}>
                {faseAtual === 1 ? 'Analisando fotos e biotipo com Gemini AI...' : 'Prescrevendo sua ficha de treino...'}
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* FASE 1: FORMULÁRIO DE ANAMNESE E FOTOS */}
              {faseAtual === 1 && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>📋 Dados Biométricos</Text>

                  <Text style={styles.label}>Nome Completo</Text>
                  <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: Pedro Pereira" placeholderTextColor="#64748b" />

                  <View style={styles.row}>
                    <View style={styles.halfInput}>
                      <Text style={styles.label}>Idade</Text>
                      <TextInput style={styles.input} value={idade} onChangeText={setIdade} keyboardType="numeric" placeholder="24" placeholderTextColor="#64748b" />
                    </View>
                    <View style={styles.halfInput}>
                      <Text style={styles.label}>Peso (kg)</Text>
                      <TextInput style={styles.input} value={peso} onChangeText={setPeso} keyboardType="numeric" placeholder="78" placeholderTextColor="#64748b" />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={styles.halfInput}>
                      <Text style={styles.label}>Altura (cm)</Text>
                      <TextInput style={styles.input} value={altura} onChangeText={setAltura} keyboardType="numeric" placeholder="178" placeholderTextColor="#64748b" />
                    </View>
                    <View style={styles.halfInput}>
                      <Text style={styles.label}>Dias p/ semana</Text>
                      <TextInput style={styles.input} value={dias} onChangeText={setDias} keyboardType="numeric" placeholder="4" placeholderTextColor="#64748b" />
                    </View>
                  </View>

                  {/* SELEÇÃO DO OBJETIVO */}
                  <Text style={[styles.label, { marginTop: 12 }]}>Objetivo Principal:</Text>
                  <View style={styles.chipContainer}>
                    {listaObjetivos.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={[styles.chip, objetivo === item && styles.chipActive]}
                        onPress={() => setObjetivo(item)}
                      >
                        <Text style={[styles.chipText, objetivo === item && styles.chipTextActive]}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* SELEÇÃO DO NÍVEL / TEMPO DE TREINO */}
                  <Text style={[styles.label, { marginTop: 12 }]}>Nível / Tempo de Treino:</Text>
                  <View style={styles.chipContainer}>
                    {listaNiveis.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={[styles.chip, nivel === item && styles.chipActive]}
                        onPress={() => setNivel(item)}
                      >
                        <Text style={[styles.chipText, nivel === item && styles.chipTextActive]}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* OBSERVAÇÕES E PEDIDOS DE AJUSTE */}
                  <Text style={[styles.label, { marginTop: 12 }]}>Observações / Preferências</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    value={observacoes}
                    onChangeText={setObservacoes}
                    multiline
                    numberOfLines={3}
                    placeholder="Ex: Quero focar mais em glúteos e ombros. Não quero exercícios de braço na sexta-feira."
                    placeholderTextColor="#64748b"
                  />

                  {/* REGRA DO NUTRICIONISTA */}
                  <Text style={[styles.label, { marginTop: 15 }]}>Você já passou por consulta com nutricionista?</Text>
                  <View style={styles.rowButtons}>
                    <TouchableOpacity
                      style={[styles.toggleBtn, passouNutricionista === true && styles.toggleBtnActive]}
                      onPress={() => setPassouNutricionista(true)}
                    >
                      <Text style={styles.toggleBtnText}>Sim, já fui</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toggleBtn, passouNutricionista === false && styles.toggleBtnActive]}
                      onPress={() => setPassouNutricionista(false)}
                    >
                      <Text style={styles.toggleBtnText}>Não, nunca fui</Text>
                    </TouchableOpacity>
                  </View>

                  {passouNutricionista === true && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.label}>Digite seu % de Gordura (BF) do nutricionista:</Text>
                      <TextInput style={styles.input} value={bfInformado} onChangeText={setBfInformado} keyboardType="numeric" placeholder="Ex: 15" placeholderTextColor="#64748b" />
                    </View>
                  )}

                  {passouNutricionista === false && (
                    <Text style={styles.infoText}>
                      ℹ️ A IA do Gemini utilizará visão computacional nas suas fotos para estimar o seu % de gordura corporal.
                    </Text>
                  )}

                  {/* UPLOAD DE FOTOS */}
                  <Text style={[styles.cardTitle, { marginTop: 25 }]}>📸 Fotos Corporais</Text>

                  <View style={styles.photoContainer}>
                    {(['frente', 'costas', 'perfil'] as const).map((tipo) => (
                      <TouchableOpacity key={tipo} style={styles.photoBox} onPress={() => selecionarFoto(tipo)}>
                        {fotos[tipo] ? (
                          <Image source={{ uri: fotos[tipo]?.uri }} style={styles.photoPreview} />
                        ) : (
                          <Text style={styles.photoBoxText}>+ Foto {tipo.toUpperCase()}</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity style={styles.primaryButton} onPress={handleSubmeterAnamnese}>
                    <Text style={styles.primaryButtonText}>Analisar com IA Multimodal ➔</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* FASE 2: VALIDAÇÃO DO DIAGNÓSTICO DA IA */}
              {faseAtual === 2 && resultadoAvaliacao && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>📊 Diagnóstico Visual da IA</Text>

                  <View style={styles.highlightBadge}>
                    <Text style={styles.highlightText}>BF Estimado: {resultadoAvaliacao.avaliacao.bf_estimado}</Text>
                  </View>

                  <Text style={styles.sectionHeader}>💪 Pontos Fortes:</Text>
                  {resultadoAvaliacao.avaliacao.pontos_fortes.map((pf, idx) => (
                    <Text key={idx} style={styles.listItem}>• {pf}</Text>
                  ))}

                  <Text style={styles.sectionHeader}>🎯 Pontos Fracos (Prioridade de Treino):</Text>
                  {resultadoAvaliacao.avaliacao.pontos_fracos.map((pf, idx) => (
                    <Text key={idx} style={styles.listItem}>• {pf}</Text>
                  ))}

                  <Text style={styles.sectionHeader}>🔍 Observações Posturais:</Text>
                  <Text style={styles.bodyText}>{resultadoAvaliacao.avaliacao.postura_observacoes}</Text>

                  <Text style={styles.sectionHeader}>💬 Mensagem da IA:</Text>
                  <Text style={styles.bodyText}>{resultadoAvaliacao.avaliacao.mensagem_validacao}</Text>

                  <TouchableOpacity style={styles.primaryButton} onPress={handleConfirmarEGerarTreino}>
                    <Text style={styles.primaryButtonText}>Concordo 100% / Gerar Treino ⚡</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* FASE 3: FICHA DE TREINO PRESCRITA (VISUALIZAÇÃO POR DIAS A, B, C...) */}
              {faseAtual === 3 && resultadoTreino && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>🏋️ Ficha de Treino Prescrita</Text>
                  <Text style={styles.headerSubtitle}>
                    Divisão: {resultadoTreino.treino.divisao_nome} | {resultadoTreino.treino.frequencia_semanal}x por semana
                  </Text>

                  {/* NAVEGAÇÃO DE DIAS DE TREINO (DIA A, DIA B, DIA C...) */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 14 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {resultadoTreino.treino.sessoes.map((s, idx) => {
                        const letraDia = String.fromCharCode(65 + idx);
                        const isSelected = sessaoAtivaIndex === idx;

                        return (
                          <TouchableOpacity
                            key={idx}
                            style={[styles.dayChip, isSelected && styles.dayChipActive]}
                            onPress={() => setSessaoAtivaIndex(idx)}
                          >
                            <Text style={[styles.dayChipText, isSelected && styles.dayChipTextActive]}>
                              Treino {letraDia}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {/* SESSÃO ATIVA */}
                  {resultadoTreino.treino.sessoes[sessaoAtivaIndex] && (
                    <View style={styles.sessionCard}>
                      <Text style={styles.sessionTitle}>
                        {resultadoTreino.treino.sessoes[sessaoAtivaIndex].nome}
                      </Text>

                      {resultadoTreino.treino.sessoes[sessaoAtivaIndex].exercicios.map((ex, eIdx) => (
                        <View key={eIdx} style={styles.exerciseBox}>
                          <View style={styles.exerciseHeader}>
                            <Text style={styles.exerciseName}>{eIdx + 1}. {ex.nome}</Text>
                            <TouchableOpacity
                              style={styles.replaceBtn}
                              onPress={() => handleAbrirModalSubstituicao(sessaoAtivaIndex, eIdx, ex)}
                            >
                              <Text style={styles.replaceBtnText}>🔄 Trocar</Text>
                            </TouchableOpacity>
                          </View>

                          <Text style={styles.exerciseDetails}>
                            Séries: {ex.series_trabalho} (Aquecimento: {ex.series_aquecimento}) | Reps: {ex.reps} | RIR: {ex.rir_alvo}
                          </Text>
                          <Text style={styles.exerciseDetails}>
                            Descanso: {ex.descanso_segundos}s | Cadência: {ex.foco_biomecanico}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#475569' }]} onPress={() => setFaseAtual(1)}>
                    <Text style={styles.primaryButtonText}>↺ Fazer Nova Anamnese</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* MODAL DE SUBSTITUIÇÃO DE EXERCÍCIO */}
      <Modal visible={modalSubstituicaoVisivel} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>🔄 Substituir Exercício</Text>

            {exercicioParaSubstituir && (
              <Text style={styles.modalSubTitle}>
                Exercício Atual: <Text style={{ color: '#38bdf8', fontWeight: 'bold' }}>{exercicioParaSubstituir.dados.nome}</Text>
              </Text>
            )}

            <Text style={styles.label}>Motivo da Troca (Opcional):</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={motivoTroca}
              onChangeText={setMotivoTroca}
              multiline
              numberOfLines={3}
              placeholder="Ex: Não tenho essa máquina na academia / Sinto dor no ombro com este movimento"
              placeholderTextColor="#64748b"
            />

            {carregandoTroca ? (
              <ActivityIndicator size="small" color="#38bdf8" style={{ marginVertical: 10 }} />
            ) : (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: '#475569' }]}
                  onPress={() => setModalSubstituicaoVisivel(false)}
                >
                  <Text style={styles.modalBtnText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#0284c7' }]} onPress={handleExecutarSubstituicao}>
                  <Text style={styles.modalBtnText}>Trocar Exercício 🔄</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ESTILOS VISUAIS E AESTHETICS (DARK MODE MODERNO)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 16, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
  headerUserText: { fontSize: 13, color: '#38bdf8', fontWeight: '600' },
  headerSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  logoutBtn: { backgroundColor: '#334155', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  logoutBtnText: { color: '#f8fafc', fontSize: 12, fontWeight: 'bold' },
  mainNavContainer: { flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 8, padding: 4, marginTop: 12 },
  mainNavTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  mainNavTabActive: { backgroundColor: '#0284c7' },
  mainNavTabText: { color: '#94a3b8', fontSize: 13, fontWeight: 'bold' },
  mainNavTabTextActive: { color: '#ffffff' },
  dayChip: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#0f172a', borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  dayChipActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  dayChipText: { color: '#94a3b8', fontSize: 13, fontWeight: 'bold' },
  dayChipTextActive: { color: '#ffffff' },
  scrollContent: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#94a3b8', marginTop: 12, fontSize: 14 },
  authCard: { backgroundColor: '#1e293b', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  authLogo: { fontSize: 28, fontWeight: 'bold', color: '#38bdf8', textAlign: 'center', marginBottom: 6 },
  authSubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 20 },
  authTabContainer: { flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 8, padding: 4, marginBottom: 20 },
  authTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  authTabActive: { backgroundColor: '#0284c7' },
  authTabText: { color: '#94a3b8', fontSize: 14, fontWeight: 'bold' },
  authTabTextActive: { color: '#ffffff' },
  card: { backgroundColor: '#1e293b', padding: 18, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginBottom: 15 },
  label: { fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 6 },
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 12, color: '#f8fafc', marginBottom: 12 },
  multilineInput: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#0f172a', borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  chipText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#ffffff', fontWeight: 'bold' },
  rowButtons: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  toggleBtn: { flex: 1, padding: 12, backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  toggleBtnText: { color: '#f8fafc', fontSize: 13, fontWeight: 'bold' },
  infoText: { fontSize: 12, color: '#38bdf8', marginBottom: 12, fontStyle: 'italic' },
  photoContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  photoBox: { width: '31%', height: 90, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  photoBoxText: { color: '#94a3b8', fontSize: 11, textAlign: 'center' },
  photoPreview: { width: '100%', height: '100%', borderRadius: 8 },
  primaryButton: { backgroundColor: '#0284c7', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 15 },
  primaryButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  highlightBadge: { backgroundColor: '#0369a1', padding: 12, borderRadius: 8, marginBottom: 15, alignItems: 'center' },
  highlightText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
  sectionHeader: { color: '#38bdf8', fontWeight: 'bold', marginTop: 12, marginBottom: 4 },
  listItem: { color: '#e2e8f0', fontSize: 14, marginLeft: 6, marginBottom: 2 },
  bodyText: { color: '#cbd5e1', fontSize: 13, lineHeight: 18 },
  sessionCard: { backgroundColor: '#0f172a', padding: 14, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: '#334155' },
  sessionTitle: { color: '#38bdf8', fontWeight: 'bold', fontSize: 16, marginBottom: 10 },
  exerciseBox: { backgroundColor: '#1e293b', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  exerciseName: { color: '#f8fafc', fontWeight: 'bold', fontSize: 15, flex: 1 },
  replaceBtn: { backgroundColor: '#0284c7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  replaceBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  exerciseDetails: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#1e293b', padding: 20, borderRadius: 14, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginBottom: 8 },
  modalSubTitle: { fontSize: 14, color: '#cbd5e1', marginBottom: 15 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 15 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  modalBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
});
