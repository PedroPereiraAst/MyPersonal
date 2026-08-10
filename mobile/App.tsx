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

// PROVEDOR DE TEMA SAMSUNG ONE UI 8.5 COM EFEITO LIQUID GLASS TRANSLÚCIDO
const THEMES = {
  dark: {
    bg: '#090d16',
    card: 'rgba(22, 30, 49, 0.85)',
    cardBorder: 'rgba(255, 255, 255, 0.12)',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    inputBg: 'rgba(15, 23, 42, 0.75)',
    inputBorder: 'rgba(255, 255, 255, 0.12)',
    accentGreen: '#00e676',
    accentGreenDark: '#00c853',
    glassButtonBg: 'rgba(0, 230, 118, 0.20)',
    glassButtonBorder: 'rgba(0, 230, 118, 0.45)',
    glassButtonText: '#00e676',
    accentCyan: '#00b0ff',
    pillBg: 'rgba(15, 23, 42, 0.75)',
    pillActiveBg: 'rgba(0, 230, 118, 0.25)',
    pillActiveBorder: '#00e676',
    pillActiveText: '#ffffff',
    modalBg: '#161e31',
    overlayBg: 'rgba(5, 9, 17, 0.85)',
    headerBg: 'rgba(22, 30, 49, 0.92)',
    drawerBg: '#111827',
    statusBar: 'light-content' as const,
  },
  light: {
    bg: '#f4f6f9',
    card: 'rgba(255, 255, 255, 0.90)',
    cardBorder: 'rgba(0, 0, 0, 0.08)',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    inputBg: 'rgba(248, 250, 252, 0.90)',
    inputBorder: 'rgba(203, 213, 225, 0.8)',
    accentGreen: '#00c853',
    accentGreenDark: '#00a843',
    glassButtonBg: 'rgba(0, 200, 83, 0.15)',
    glassButtonBorder: 'rgba(0, 200, 83, 0.45)',
    glassButtonText: '#00a843',
    accentCyan: '#0284c7',
    pillBg: 'rgba(226, 232, 240, 0.80)',
    pillActiveBg: '#00c853',
    pillActiveBorder: '#00c853',
    pillActiveText: '#ffffff',
    modalBg: '#ffffff',
    overlayBg: 'rgba(15, 23, 42, 0.65)',
    headerBg: 'rgba(255, 255, 255, 0.95)',
    drawerBg: '#ffffff',
    statusBar: 'dark-content' as const,
  },
};

export default function App() {
  // Estado do Tema (Modo Claro vs Modo Escuro)
  const [temaAtual, setTemaAtual] = useState<'dark' | 'light'>('dark');
  const t = THEMES[temaAtual];

  // Estado para controlar a exibição do Menu Lateral (Drawer Modal)
  const [menuLateralVisivel, setMenuLateralVisivel] = useState(false);

  // Controle de Sessão de Autenticação Supabase
  const [session, setSession] = useState<any>(null);
  const [abaAuth, setAbaAuth] = useState<'login' | 'cadastro'>('login');
  const [emailAuth, setEmailAuth] = useState('');
  const [senhaAuth, setSenhaAuth] = useState('');
  const [carregandoAuth, setCarregandoAuth] = useState(false);

  // Navegação Principal controlada EXCLUSIVAMENTE pelo Menu Lateral: 'novo' vs 'historico'
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
      <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
        <StatusBar barStyle={t.statusBar} backgroundColor={t.headerBg} />
        <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1, justifyContent: 'center' }}>
          <View style={[styles.authCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
            <Text style={[styles.authLogo, { color: t.accentGreen }]}>🏋️ MyPersonal</Text>
            <Text style={[styles.authSubtitle, { color: t.textSecondary }]}>
              Samsung One UI 8.5 Liquid Glass • Personal AI Coach
            </Text>

            <View style={[styles.authTabContainer, { backgroundColor: t.inputBg }]}>
              <TouchableOpacity
                style={[
                  styles.authTab,
                  abaAuth === 'login' && {
                    backgroundColor: t.glassButtonBg,
                    borderColor: t.glassButtonBorder,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => setAbaAuth('login')}
              >
                <Text
                  style={[
                    styles.authTabText,
                    abaAuth === 'login' ? { color: t.glassButtonText } : { color: t.textSecondary },
                  ]}
                >
                  Entrar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.authTab,
                  abaAuth === 'cadastro' && {
                    backgroundColor: t.glassButtonBg,
                    borderColor: t.glassButtonBorder,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => setAbaAuth('cadastro')}
              >
                <Text
                  style={[
                    styles.authTabText,
                    abaAuth === 'cadastro' ? { color: t.glassButtonText } : { color: t.textSecondary },
                  ]}
                >
                  Criar Conta
                </Text>
              </TouchableOpacity>
            </View>

            {abaAuth === 'cadastro' && (
              <View>
                <Text style={[styles.label, { color: t.textSecondary }]}>Nome Completo</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.textPrimary }]}
                  value={nome}
                  onChangeText={setNome}
                  placeholder="Ex: Pedro Pereira"
                  placeholderTextColor={t.textSecondary}
                />
              </View>
            )}

            <Text style={[styles.label, { color: t.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.textPrimary }]}
              value={emailAuth}
              onChangeText={setEmailAuth}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="seuemail@exemplo.com"
              placeholderTextColor={t.textSecondary}
            />

            <Text style={[styles.label, { color: t.textSecondary }]}>Senha</Text>
            <TextInput
              style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.textPrimary }]}
              value={senhaAuth}
              onChangeText={setSenhaAuth}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={t.textSecondary}
            />

            {carregandoAuth ? (
              <ActivityIndicator size="large" color={t.accentGreen} style={{ marginTop: 15 }} />
            ) : (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: t.glassButtonBg,
                    borderColor: t.glassButtonBorder,
                    borderWidth: 1,
                  },
                ]}
                onPress={abaAuth === 'login' ? handleLogin : handleCadastro}
              >
                <Text style={[styles.primaryButtonText, { color: t.glassButtonText }]}>
                  {abaAuth === 'login' ? 'Entrar no App ➔' : 'Criar Minha Conta ⚡'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // TELA PRINCIPAL (USUÁRIO AUTENTICADO COM SAMSUNG ONE UI 8.5 & CLEAN HEADER)
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.statusBar} backgroundColor={t.headerBg} />

      {/* HEADER LIMPO COM TÍTULO, SAUDAÇÃO E BOTÃO DE MENU LIQUID GLASS (☰ MENU) */}
      <View style={[styles.header, { backgroundColor: t.headerBg, borderColor: t.cardBorder }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={[styles.headerTitle, { color: t.textPrimary }]}>🏋️ MyPersonal</Text>
            <Text style={[styles.headerUserText, { color: t.accentGreen }]}>Olá, {nome || session.user.email} 👋</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.menuBtn,
              {
                backgroundColor: t.glassButtonBg,
                borderColor: t.glassButtonBorder,
                borderWidth: 1,
              },
            ]}
            onPress={() => setMenuLateralVisivel(true)}
          >
            <Text style={[styles.menuBtnText, { color: t.glassButtonText }]}>☰ Menu</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ABA 2: MEU TREINO ATIVO NO SUPABASE (SAMSUNG ONE UI 8.5 CAPSULES) */}
      {abaPrincipal === 'historico' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.cardCapsule, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={[styles.cardTitle, { color: t.textPrimary }]}>💪 Ficha de Treino Ativa</Text>
              <TouchableOpacity onPress={carregarTreinoAtivo}>
                <Text style={{ color: t.accentGreen, fontSize: 13, fontWeight: 'bold' }}>🔄 Atualizar</Text>
              </TouchableOpacity>
            </View>

            {carregandoHistorico ? (
              <ActivityIndicator size="large" color={t.accentGreen} style={{ marginVertical: 30 }} />
            ) : !treinoAtivoSalvo ? (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <Text style={{ fontSize: 36, marginBottom: 10 }}>🏋️‍♂️</Text>
                <Text style={{ color: t.textPrimary, fontWeight: 'bold', fontSize: 16 }}>Nenhum treino ativo encontrado</Text>
                <Text style={{ color: t.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: 20 }}>
                  Abra o Menu ☰ no topo e selecione "Gerar Novo Treino" para prescrever sua primeira ficha inteligente!
                </Text>
              </View>
            ) : (
              (() => {
                const tData = treinoAtivoSalvo.treino_json?.treino;
                const sessoes = tData?.sessoes || [];
                const sessaoAtual = sessoes[sessaoAtivaIndex] || sessoes[0];

                return (
                  <View>
                    <Text style={{ color: t.textSecondary, fontSize: 13, marginBottom: 14 }}>
                      Divisão: <Text style={{ color: t.accentGreen, fontWeight: 'bold' }}>{tData?.divisao_nome}</Text> | {tData?.frequencia_semanal}x por semana
                    </Text>

                    {/* SELEÇÃO DE DIAS DE TREINO (TREINO A, B, C...) EM CÁPSULAS LIQUID GLASS */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {sessoes.map((s: any, idx: number) => {
                          const letraDia = String.fromCharCode(65 + idx);
                          const isSelected = sessaoAtivaIndex === idx;

                          return (
                            <TouchableOpacity
                              key={idx}
                              style={[
                                styles.dayChip,
                                {
                                  backgroundColor: isSelected ? t.glassButtonBg : t.inputBg,
                                  borderColor: isSelected ? t.glassButtonBorder : t.cardBorder,
                                },
                              ]}
                              onPress={() => setSessaoAtivaIndex(idx)}
                            >
                              <Text
                                style={[
                                  styles.dayChipText,
                                  { color: isSelected ? t.glassButtonText : t.textSecondary },
                                ]}
                              >
                                Treino {letraDia}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>

                    {/* SESSÃO DE TREINO SELECIONADA */}
                    {sessaoAtual && (
                      <View style={[styles.sessionCard, { backgroundColor: t.inputBg, borderColor: t.cardBorder }]}>
                        <Text style={[styles.sessionTitle, { color: t.accentGreen }]}>{sessaoAtual.nome}</Text>

                        {sessaoAtual.exercicios?.map((ex: any, eIdx: number) => (
                          <View key={eIdx} style={[styles.exerciseCapsule, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
                            <View style={styles.exerciseHeader}>
                              <Text style={[styles.exerciseName, { color: t.textPrimary }]}>{eIdx + 1}. {ex.nome}</Text>
                              <TouchableOpacity
                                style={[
                                  styles.replaceBtn,
                                  {
                                    backgroundColor: t.glassButtonBg,
                                    borderColor: t.glassButtonBorder,
                                    borderWidth: 1,
                                  },
                                ]}
                                onPress={() => handleAbrirModalSubstituicao(sessaoAtivaIndex, eIdx, ex, true)}
                              >
                                <Text style={[styles.replaceBtnText, { color: t.glassButtonText }]}>🔄 Trocar</Text>
                              </TouchableOpacity>
                            </View>

                            {/* PÍLULAS DE ESTATÍSTICAS ONE UI */}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                              <View style={[styles.metricPill, { backgroundColor: t.inputBg }]}>
                                <Text style={[styles.metricPillText, { color: t.textSecondary }]}>Séries: <Text style={{ color: t.textPrimary, fontWeight: 'bold' }}>{ex.series_trabalho}</Text></Text>
                              </View>
                              <View style={[styles.metricPill, { backgroundColor: t.inputBg }]}>
                                <Text style={[styles.metricPillText, { color: t.textSecondary }]}>Reps: <Text style={{ color: t.textPrimary, fontWeight: 'bold' }}>{ex.reps}</Text></Text>
                              </View>
                              <View style={[styles.metricPill, { backgroundColor: t.inputBg }]}>
                                <Text style={[styles.metricPillText, { color: t.textSecondary }]}>RIR: <Text style={{ color: t.textPrimary, fontWeight: 'bold' }}>{ex.rir_alvo}</Text></Text>
                              </View>
                              <View style={[styles.metricPill, { backgroundColor: t.inputBg }]}>
                                <Text style={[styles.metricPillText, { color: t.textSecondary }]}>Descanso: <Text style={{ color: t.accentCyan, fontWeight: 'bold' }}>{ex.descanso_segundos}s</Text></Text>
                              </View>
                            </View>
                            <Text style={[styles.exerciseCadence, { color: t.textSecondary }]}>💡 Cadência: {ex.foco_biomecanico}</Text>
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

      {/* ABA 1: GERAR NOVO TREINO (FLUXO 3 FASES ONE UI) */}
      {abaPrincipal === 'novo' && (
        <>
          {carregando ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={t.accentGreen} />
              <Text style={[styles.loadingText, { color: t.textSecondary }]}>
                {faseAtual === 1 ? 'Analisando fotos e biotipo com Gemini AI...' : 'Prescrevendo sua ficha de treino...'}
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* FASE 1: FORMULÁRIO DE ANAMNESE E FOTOS */}
              {faseAtual === 1 && (
                <View style={[styles.cardCapsule, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
                  <Text style={[styles.cardTitle, { color: t.textPrimary }]}>📋 Dados Biométricos</Text>

                  <Text style={[styles.label, { color: t.textSecondary }]}>Nome Completo</Text>
                  <TextInput style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.textPrimary }]} value={nome} onChangeText={setNome} placeholder="Ex: Pedro Pereira" placeholderTextColor={t.textSecondary} />

                  <View style={styles.row}>
                    <View style={styles.halfInput}>
                      <Text style={[styles.label, { color: t.textSecondary }]}>Idade</Text>
                      <TextInput style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.textPrimary }]} value={idade} onChangeText={setIdade} keyboardType="numeric" placeholder="24" placeholderTextColor={t.textSecondary} />
                    </View>
                    <View style={styles.halfInput}>
                      <Text style={[styles.label, { color: t.textSecondary }]}>Peso (kg)</Text>
                      <TextInput style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.textPrimary }]} value={peso} onChangeText={setPeso} keyboardType="numeric" placeholder="78" placeholderTextColor={t.textSecondary} />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={styles.halfInput}>
                      <Text style={[styles.label, { color: t.textSecondary }]}>Altura (cm)</Text>
                      <TextInput style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.textPrimary }]} value={altura} onChangeText={setAltura} keyboardType="numeric" placeholder="178" placeholderTextColor={t.textSecondary} />
                    </View>
                    <View style={styles.halfInput}>
                      <Text style={[styles.label, { color: t.textSecondary }]}>Dias p/ semana</Text>
                      <TextInput style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.textPrimary }]} value={dias} onChangeText={setDias} keyboardType="numeric" placeholder="4" placeholderTextColor={t.textSecondary} />
                    </View>
                  </View>

                  {/* SELEÇÃO DO OBJETIVO */}
                  <Text style={[styles.label, { marginTop: 12, color: t.textSecondary }]}>Objetivo Principal:</Text>
                  <View style={styles.chipContainer}>
                    {listaObjetivos.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: objetivo === item ? t.glassButtonBg : t.inputBg,
                            borderColor: objetivo === item ? t.glassButtonBorder : t.cardBorder,
                          },
                        ]}
                        onPress={() => setObjetivo(item)}
                      >
                        <Text style={[styles.chipText, { color: objetivo === item ? t.glassButtonText : t.textSecondary }]}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* SELEÇÃO DO NÍVEL / TEMPO DE TREINO */}
                  <Text style={[styles.label, { marginTop: 12, color: t.textSecondary }]}>Nível / Tempo de Treino:</Text>
                  <View style={styles.chipContainer}>
                    {listaNiveis.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: nivel === item ? t.glassButtonBg : t.inputBg,
                            borderColor: nivel === item ? t.glassButtonBorder : t.cardBorder,
                          },
                        ]}
                        onPress={() => setNivel(item)}
                      >
                        <Text style={[styles.chipText, { color: nivel === item ? t.glassButtonText : t.textSecondary }]}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* OBSERVAÇÕES E PEDIDOS DE AJUSTE */}
                  <Text style={[styles.label, { marginTop: 12, color: t.textSecondary }]}>Observações / Preferências</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.textPrimary }]}
                    value={observacoes}
                    onChangeText={setObservacoes}
                    multiline
                    numberOfLines={3}
                    placeholder="Ex: Quero focar mais em glúteos e ombros. Não quero exercícios de braço na sexta-feira."
                    placeholderTextColor={t.textSecondary}
                  />

                  {/* REGRA DO NUTRICIONISTA */}
                  <Text style={[styles.label, { marginTop: 15, color: t.textSecondary }]}>Você já passou por consulta com nutricionista?</Text>
                  <View style={styles.rowButtons}>
                    <TouchableOpacity
                      style={[
                        styles.toggleBtn,
                        {
                          backgroundColor: passouNutricionista === true ? t.glassButtonBg : t.inputBg,
                          borderColor: passouNutricionista === true ? t.glassButtonBorder : t.cardBorder,
                        },
                      ]}
                      onPress={() => setPassouNutricionista(true)}
                    >
                      <Text style={[styles.toggleBtnText, { color: passouNutricionista === true ? t.glassButtonText : t.textPrimary }]}>Sim, já fui</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.toggleBtn,
                        {
                          backgroundColor: passouNutricionista === false ? t.glassButtonBg : t.inputBg,
                          borderColor: passouNutricionista === false ? t.glassButtonBorder : t.cardBorder,
                        },
                      ]}
                      onPress={() => setPassouNutricionista(false)}
                    >
                      <Text style={[styles.toggleBtnText, { color: passouNutricionista === false ? t.glassButtonText : t.textPrimary }]}>Não, nunca fui</Text>
                    </TouchableOpacity>
                  </View>

                  {passouNutricionista === true && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={[styles.label, { color: t.textSecondary }]}>Digite seu % de Gordura (BF) do nutricionista:</Text>
                      <TextInput style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.textPrimary }]} value={bfInformado} onChangeText={setBfInformado} keyboardType="numeric" placeholder="Ex: 15" placeholderTextColor={t.textSecondary} />
                    </View>
                  )}

                  {passouNutricionista === false && (
                    <Text style={[styles.infoText, { color: t.accentCyan }]}>
                      ℹ️ A IA do Gemini utilizará visão computacional nas suas fotos para estimar o seu % de gordura corporal.
                    </Text>
                  )}

                  {/* UPLOAD DE FOTOS */}
                  <Text style={[styles.cardTitle, { marginTop: 25, color: t.textPrimary }]}>📸 Fotos Corporais</Text>

                  <View style={styles.photoContainer}>
                    {(['frente', 'costas', 'perfil'] as const).map((tipo) => (
                      <TouchableOpacity key={tipo} style={[styles.photoBox, { backgroundColor: t.inputBg, borderColor: t.cardBorder }]} onPress={() => selecionarFoto(tipo)}>
                        {fotos[tipo] ? (
                          <Image source={{ uri: fotos[tipo]?.uri }} style={styles.photoPreview} />
                        ) : (
                          <Text style={[styles.photoBoxText, { color: t.textSecondary }]}>+ Foto {tipo.toUpperCase()}</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      {
                        backgroundColor: t.glassButtonBg,
                        borderColor: t.glassButtonBorder,
                        borderWidth: 1,
                      },
                    ]}
                    onPress={handleSubmeterAnamnese}
                  >
                    <Text style={[styles.primaryButtonText, { color: t.glassButtonText }]}>Analisar com IA Multimodal ➔</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* FASE 2: VALIDAÇÃO DO DIAGNÓSTICO DA IA */}
              {faseAtual === 2 && resultadoAvaliacao && (
                <View style={[styles.cardCapsule, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
                  <Text style={[styles.cardTitle, { color: t.textPrimary }]}>📊 Diagnóstico Visual da IA</Text>

                  <View style={[styles.highlightBadge, { backgroundColor: t.glassButtonBg, borderColor: t.glassButtonBorder, borderWidth: 1 }]}>
                    <Text style={[styles.highlightText, { color: t.glassButtonText }]}>BF Estimado: {resultadoAvaliacao.avaliacao.bf_estimado}</Text>
                  </View>

                  <Text style={[styles.sectionHeader, { color: t.accentGreen }]}>💪 Pontos Fortes:</Text>
                  {resultadoAvaliacao.avaliacao.pontos_fortes.map((pf, idx) => (
                    <Text key={idx} style={[styles.listItem, { color: t.textPrimary }]}>• {pf}</Text>
                  ))}

                  <Text style={[styles.sectionHeader, { color: t.accentGreen }]}>🎯 Pontos Fracos (Prioridade de Treino):</Text>
                  {resultadoAvaliacao.avaliacao.pontos_fracos.map((pf, idx) => (
                    <Text key={idx} style={[styles.listItem, { color: t.textPrimary }]}>• {pf}</Text>
                  ))}

                  <Text style={[styles.sectionHeader, { color: t.accentGreen }]}>🔍 Observações Posturais:</Text>
                  <Text style={[styles.bodyText, { color: t.textSecondary }]}>{resultadoAvaliacao.avaliacao.postura_observacoes}</Text>

                  <Text style={[styles.sectionHeader, { color: t.accentGreen }]}>💬 Mensagem da IA:</Text>
                  <Text style={[styles.bodyText, { color: t.textSecondary }]}>{resultadoAvaliacao.avaliacao.mensagem_validacao}</Text>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      {
                        backgroundColor: t.glassButtonBg,
                        borderColor: t.glassButtonBorder,
                        borderWidth: 1,
                      },
                    ]}
                    onPress={handleConfirmarEGerarTreino}
                  >
                    <Text style={[styles.primaryButtonText, { color: t.glassButtonText }]}>Concordo 100% / Gerar Treino ⚡</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* FASE 3: FICHA DE TREINO PRESCRITA (VISUALIZAÇÃO POR DIAS A, B, C...) */}
              {faseAtual === 3 && resultadoTreino && (
                <View style={[styles.cardCapsule, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
                  <Text style={[styles.cardTitle, { color: t.textPrimary }]}>🏋️ Ficha de Treino Prescrita</Text>
                  <Text style={[styles.headerSubtitle, { color: t.textSecondary }]}>
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
                            style={[
                              styles.dayChip,
                              {
                                backgroundColor: isSelected ? t.glassButtonBg : t.inputBg,
                                borderColor: isSelected ? t.glassButtonBorder : t.cardBorder,
                              },
                            ]}
                            onPress={() => setSessaoAtivaIndex(idx)}
                          >
                            <Text
                              style={[
                                styles.dayChipText,
                                { color: isSelected ? t.glassButtonText : t.textSecondary },
                              ]}
                            >
                              Treino {letraDia}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {/* SESSÃO ATIVA */}
                  {resultadoTreino.treino.sessoes[sessaoAtivaIndex] && (
                    <View style={[styles.sessionCard, { backgroundColor: t.inputBg, borderColor: t.cardBorder }]}>
                      <Text style={[styles.sessionTitle, { color: t.accentGreen }]}>
                        {resultadoTreino.treino.sessoes[sessaoAtivaIndex].nome}
                      </Text>

                      {resultadoTreino.treino.sessoes[sessaoAtivaIndex].exercicios.map((ex, eIdx) => (
                        <View key={eIdx} style={[styles.exerciseCapsule, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
                          <View style={styles.exerciseHeader}>
                            <Text style={[styles.exerciseName, { color: t.textPrimary }]}>{eIdx + 1}. {ex.nome}</Text>
                            <TouchableOpacity
                              style={[
                                styles.replaceBtn,
                                {
                                  backgroundColor: t.glassButtonBg,
                                  borderColor: t.glassButtonBorder,
                                  borderWidth: 1,
                                },
                              ]}
                              onPress={() => handleAbrirModalSubstituicao(sessaoAtivaIndex, eIdx, ex)}
                            >
                              <Text style={[styles.replaceBtnText, { color: t.glassButtonText }]}>🔄 Trocar</Text>
                            </TouchableOpacity>
                          </View>

                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                            <View style={[styles.metricPill, { backgroundColor: t.inputBg }]}>
                              <Text style={[styles.metricPillText, { color: t.textSecondary }]}>Séries: <Text style={{ color: t.textPrimary, fontWeight: 'bold' }}>{ex.series_trabalho}</Text></Text>
                            </View>
                            <View style={[styles.metricPill, { backgroundColor: t.inputBg }]}>
                              <Text style={[styles.metricPillText, { color: t.textSecondary }]}>Reps: <Text style={{ color: t.textPrimary, fontWeight: 'bold' }}>{ex.reps}</Text></Text>
                            </View>
                            <View style={[styles.metricPill, { backgroundColor: t.inputBg }]}>
                              <Text style={[styles.metricPillText, { color: t.textSecondary }]}>RIR: <Text style={{ color: t.textPrimary, fontWeight: 'bold' }}>{ex.rir_alvo}</Text></Text>
                            </View>
                            <View style={[styles.metricPill, { backgroundColor: t.inputBg }]}>
                              <Text style={[styles.metricPillText, { color: t.textSecondary }]}>Descanso: <Text style={{ color: t.accentCyan, fontWeight: 'bold' }}>{ex.descanso_segundos}s</Text></Text>
                            </View>
                          </View>
                          <Text style={[styles.exerciseCadence, { color: t.textSecondary }]}>💡 Cadência: {ex.foco_biomecanico}</Text>
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

      {/* MENU LATERAL SLIDE DRAWER MODAL */}
      <Modal visible={menuLateralVisivel} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: t.overlayBg, flexDirection: 'row' }}
          activeOpacity={1}
          onPress={() => setMenuLateralVisivel(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              width: '80%',
              backgroundColor: t.drawerBg,
              height: '100%',
              padding: 22,
              paddingTop: 50,
              borderTopRightRadius: 28,
              borderBottomRightRadius: 28,
            }}
          >
            <View style={{ marginBottom: 25 }}>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: t.textPrimary }}>
                🏋️ MyPersonal
              </Text>
              <Text style={{ fontSize: 12, color: t.accentGreen, fontWeight: 'bold', marginTop: 2 }}>
                Samsung One UI 8.5 • Liquid Glass
              </Text>
              <Text style={{ fontSize: 13, color: t.textSecondary, marginTop: 10 }}>
                {nome || session?.user?.email}
              </Text>
            </View>

            {/* SEÇÃO ALTERNADOR DE TEMA (LIGHT MODE vs DARK MODE) */}
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: t.textSecondary, marginBottom: 10, letterSpacing: 0.5 }}>
              ⚙️ TEMA DO APLICATIVO
            </Text>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 25 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 16,
                  backgroundColor: temaAtual === 'light' ? t.glassButtonBg : t.inputBg,
                  borderColor: temaAtual === 'light' ? t.glassButtonBorder : t.inputBorder,
                  borderWidth: 1,
                  alignItems: 'center',
                }}
                onPress={() => setTemaAtual('light')}
              >
                <Text style={{ fontWeight: 'bold', color: temaAtual === 'light' ? t.glassButtonText : t.textSecondary }}>
                  ☀️ Claro
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 16,
                  backgroundColor: temaAtual === 'dark' ? t.glassButtonBg : t.inputBg,
                  borderColor: temaAtual === 'dark' ? t.glassButtonBorder : t.inputBorder,
                  borderWidth: 1,
                  alignItems: 'center',
                }}
                onPress={() => setTemaAtual('dark')}
              >
                <Text style={{ fontWeight: 'bold', color: temaAtual === 'dark' ? t.glassButtonText : t.textSecondary }}>
                  🌙 Escuro
                </Text>
              </TouchableOpacity>
            </View>

            {/* SEÇÃO NAVEGAÇÃO PRINCIPAL */}
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: t.textSecondary, marginBottom: 10, letterSpacing: 0.5 }}>
              📌 NAVEGAÇÃO PRINCIPAL
            </Text>

            <TouchableOpacity
              style={{
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 16,
                backgroundColor: abaPrincipal === 'novo' ? t.glassButtonBg : t.inputBg,
                borderColor: abaPrincipal === 'novo' ? t.glassButtonBorder : 'transparent',
                borderWidth: 1,
                marginBottom: 8,
              }}
              onPress={() => {
                setAbaPrincipal('novo');
                setMenuLateralVisivel(false);
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: abaPrincipal === 'novo' ? t.glassButtonText : t.textPrimary }}>
                🏋️ Gerar Novo Treino
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 16,
                backgroundColor: abaPrincipal === 'historico' ? t.glassButtonBg : t.inputBg,
                borderColor: abaPrincipal === 'historico' ? t.glassButtonBorder : 'transparent',
                borderWidth: 1,
                marginBottom: 20,
              }}
              onPress={() => {
                setAbaPrincipal('historico');
                setMenuLateralVisivel(false);
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: abaPrincipal === 'historico' ? t.glassButtonText : t.textPrimary }}>
                💪 Meu Treino Ativo
              </Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            <TouchableOpacity
              style={{
                paddingVertical: 14,
                borderRadius: 16,
                backgroundColor: '#ef4444',
                alignItems: 'center',
                marginBottom: 20,
              }}
              onPress={() => {
                setMenuLateralVisivel(false);
                handleLogout();
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
                Sair da Conta 🚪
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* MODAL DE SUBSTITUIÇÃO DE EXERCÍCIO */}
      <Modal visible={modalSubstituicaoVisivel} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: t.overlayBg }]}>
          <View style={[styles.modalContainer, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: t.textPrimary }]}>🔄 Substituir Exercício</Text>

            {exercicioParaSubstituir && (
              <Text style={[styles.modalSubTitle, { color: t.textSecondary }]}>
                Exercício Atual: <Text style={{ color: t.accentGreen, fontWeight: 'bold' }}>{exercicioParaSubstituir.dados.nome}</Text>
              </Text>
            )}

            <Text style={[styles.label, { color: t.textSecondary }]}>Motivo da Troca (Opcional):</Text>
            <TextInput
              style={[styles.input, styles.multilineInput, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.textPrimary }]}
              value={motivoTroca}
              onChangeText={setMotivoTroca}
              multiline
              numberOfLines={3}
              placeholder="Ex: Não tenho essa máquina na academia / Sinto dor no ombro com este movimento"
              placeholderTextColor={t.textSecondary}
            />

            {carregandoTroca ? (
              <ActivityIndicator size="small" color={t.accentGreen} style={{ marginVertical: 10 }} />
            ) : (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: '#475569' }]}
                  onPress={() => setModalSubstituicaoVisivel(false)}
                >
                  <Text style={styles.modalBtnText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalBtn,
                    {
                      backgroundColor: t.glassButtonBg,
                      borderColor: t.glassButtonBorder,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={handleExecutarSubstituicao}
                >
                  <Text style={[styles.modalBtnText, { color: t.glassButtonText }]}>Trocar Exercício 🔄</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ESTILOS VISUAIS E CÁPSULAS SAMSUNG ONE UI 8.5 LIQUID GLASS
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  headerUserText: { fontSize: 13, fontWeight: '600' },
  headerSubtitle: { fontSize: 12, marginTop: 4 },
  menuBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14 },
  menuBtnText: { fontSize: 13, fontWeight: 'bold' },
  dayChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  dayChipText: { fontSize: 13, fontWeight: 'bold' },
  scrollContent: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  authCard: { padding: 24, borderRadius: 24, borderWidth: 1 },
  authLogo: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 6 },
  authSubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 20 },
  authTabContainer: { flexDirection: 'row', borderRadius: 16, padding: 4, marginBottom: 20 },
  authTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  authTabText: { fontSize: 14, fontWeight: 'bold' },
  cardCapsule: { padding: 20, borderRadius: 24, borderWidth: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
  multilineInput: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: 'bold' },
  rowButtons: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  toggleBtn: { flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  toggleBtnText: { fontSize: 13, fontWeight: 'bold' },
  infoText: { fontSize: 12, marginBottom: 12, fontStyle: 'italic' },
  photoContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  photoBox: { width: '31%', height: 90, borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  photoBoxText: { fontSize: 11, textAlign: 'center' },
  photoPreview: { width: '100%', height: '100%', borderRadius: 16 },
  primaryButton: { padding: 16, borderRadius: 18, alignItems: 'center', marginTop: 15 },
  primaryButtonText: { fontWeight: 'bold', fontSize: 15 },
  highlightBadge: { padding: 12, borderRadius: 16, marginBottom: 15, alignItems: 'center' },
  highlightText: { fontWeight: 'bold', fontSize: 16 },
  sectionHeader: { fontWeight: 'bold', marginTop: 12, marginBottom: 4 },
  listItem: { fontSize: 14, marginLeft: 6, marginBottom: 2 },
  bodyText: { fontSize: 13, lineHeight: 18 },
  sessionCard: { padding: 16, borderRadius: 20, marginTop: 10, borderWidth: 1 },
  sessionTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 12 },
  exerciseCapsule: { padding: 14, borderRadius: 18, marginBottom: 10, borderWidth: 1 },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseName: { fontWeight: 'bold', fontSize: 15, flex: 1 },
  replaceBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  replaceBtnText: { fontSize: 12, fontWeight: 'bold' },
  metricPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  metricPillText: { fontSize: 11 },
  exerciseCadence: { fontSize: 11, marginTop: 8, fontStyle: 'italic' },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 20 },
  modalContainer: { padding: 20, borderRadius: 22, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  modalSubTitle: { fontSize: 14, marginBottom: 15 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 15 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 14, alignItems: 'center' },
  modalBtnText: { fontWeight: 'bold', fontSize: 14 },
});
