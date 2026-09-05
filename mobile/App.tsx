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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './src/services/supabase';
import {
  enviarAvaliacaoAnamnese,
  solicitarGeracaoTreino,
  solicitarSubstituicaoExercicio,
  executarCadastroApi,
  executarLoginApi,
  buscarTreinoAtivo,
  definirTreinoAtivoApi,
  registrarCargaApi,
} from './src/services/api';
import type { AnamneseFormData, ImagemFoto, AvaliacaoFisica, FichaTreino } from './src/types';
import { exportarFichaTreinoPDF } from './src/services/pdfExporter';
import { verificarPermissaoDev } from './src/config/devConfig';

import { AERO_THEMES, type AeroThemeType } from './src/theme/aeroTheme';
import {
  AeroBubbleButton,
  AeroGlassCard,
  AeroBubbleChip,
  AeroBadge,
} from './src/components/AeroComponents';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, Square } from 'lucide-react-native';

export default function App() {
  // Estado do Tema Frutiger Aero (Aero Oceanic Dark vs Aero Sky Light)
  const [temaAtual, setTemaAtual] = useState<'dark' | 'light'>('dark');
  const t = AERO_THEMES[temaAtual];

  // Estado para controlar a exibição do Menu Lateral (Drawer Modal)
  const [menuLateralVisivel, setMenuLateralVisivel] = useState(false);

  // Controle de Sessão de Autenticação Supabase
  const [session, setSession] = useState<any>(null);
  const [abaAuth, setAbaAuth] = useState<'login' | 'cadastro'>('login');
  const [emailAuth, setEmailAuth] = useState('');
  const [senhaAuth, setSenhaAuth] = useState('');
  const [carregandoAuth, setCarregandoAuth] = useState(false);

  // Navegação Principal controlada EXCLUSIVAMENTE pelo Menu Lateral: 'novo' vs 'historico' vs 'revisao' (ou 'cronometro')
  const [abaPrincipal, setAbaPrincipal] = useState<'novo' | 'historico' | 'revisao' | 'cronometro'>('novo');

  // Estados da Página de Revisão e Review do Treino
  const [ultimoTempoTreino, setUltimoTempoTreino] = useState<string>('00:00');
  const [rpeReview, setRpeReview] = useState<number>(8);
  const [sensacoesReview, setSensacoesReview] = useState<string[]>(['🔥 Pump Máximo', '🎯 Foco Total']);
  const [notasReview, setNotasReview] = useState<string>('');

  // Controle de Fase da Aplicação: 1 (Anamnese/Fotos), 2 (Validação), 3 (Ficha de Treino)
  const [faseAtual, setFaseAtual] = useState<1 | 2 | 3>(1);
  const [carregando, setCarregando] = useState(false);

  // Estado para o Único Treino Ativo do Usuário no Supabase
  const [treinoAtivoSalvo, setTreinoAtivoSalvo] = useState<any | null>(null);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [sessaoAtivaIndex, setSessaoAtivaIndex] = useState<number>(0);

  // --- ESTADOS DO CRONÔMETRO DE TREINO E TIMER DE DESCANSO (PERSISTÊNCIA EM SEGUNDO PLANO VIA TIMESTAMP) ---
  const [treinoIniciado, setTreinoIniciado] = useState(false);
  const [treinoPausado, setTreinoPausado] = useState(false);
  const [timestampInicioTreino, setTimestampInicioTreino] = useState<number | null>(null);
  const [tempoTreinoSegundos, setTempoTreinoSegundos] = useState(0);

  // Timer de Descanso
  const [descansoDuracaoSegundos, setDescansoDuracaoSegundos] = useState<number>(60); // 30, 60 (1:00) ou 90 (1:30)
  const [timestampFimDescanso, setTimestampFimDescanso] = useState<number | null>(null);
  const [descansoSegundosRestantes, setDescansoSegundosRestantes] = useState<number>(60);
  const [descansoAtivo, setDescansoAtivo] = useState(false);
  const [exercicioDescansoAtivo, setExercicioDescansoAtivo] = useState<string | null>(null);

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

  // Estado para o Pop-up de Erro Vermelho de Dados Incompletos
  const [alertaErroVisivel, setAlertaErroVisivel] = useState(false);
  const [mensagemErroAlerta, setMensagemErroAlerta] = useState('');

  // Estado para Registro de Cargas por Exercício (Sobrecarga Progressiva)
  const [registrosCargas, setRegistrosCargas] = useState<
    Record<string, { carga: string; reps: string; concluido: boolean }>
  >({});

  // Carregar cargas salvas no AsyncStorage ao abrir o app
  useEffect(() => {
    AsyncStorage.getItem('@my_personal_cargas')
      .then((raw) => {
        if (raw) {
          try {
            setRegistrosCargas(JSON.parse(raw));
          } catch (e) {
            console.warn('Erro ao parsear cargas salvas:', e);
          }
        }
      })
      .catch((err) => console.warn('Erro ao ler cargas salvas:', err));
  }, []);

  // Atualizar Carga e Repetições localmente e no AsyncStorage
  const handleAtualizarCargaExercicio = (
    exercicioNome: string,
    serieIndex: number,
    carga: string,
    reps: string,
    concluido: boolean
  ) => {
    const key = `${exercicioNome}_serie_${serieIndex}`;
    const novoEstado = {
      ...registrosCargas,
      [key]: { carga, reps, concluido },
    };
    setRegistrosCargas(novoEstado);
    AsyncStorage.setItem('@my_personal_cargas', JSON.stringify(novoEstado)).catch((err) =>
      console.warn('Erro ao salvar carga no AsyncStorage:', err)
    );
  };

  // Alternar Conclusão da Série, Iniciar Timer de Descanso e Sincronizar
  const handleAlternarConclusaoSerie = (
    exercicioNome: string,
    serieIndex: number,
    carga: string,
    reps: string,
    concluido: boolean,
    descansoSegundosPadrao?: number
  ) => {
    handleAtualizarCargaExercicio(exercicioNome, serieIndex, carga, reps, concluido);

    if (concluido) {
      handleIniciarDescansoExercicio(exercicioNome, descansoSegundosPadrao || 60);
    }

    if (session?.user?.id && concluido) {
      registrarCargaApi(
        session.user.id,
        exercicioNome,
        serieIndex,
        Number(carga) || 0,
        Number(reps) || 0
      ).catch((err) => console.warn('Alerta ao sincronizar carga no servidor:', err.message));
    }
  };

  // Verificação de Permissão do Usuário via devConfig.ts
  const isDevUser = verificarPermissaoDev(session?.user?.email);

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

  // LOOPER EM SEGUNDO PLANO (TIMESTAMP-BASED TIME TRACKING)
  useEffect(() => {
    const timerInterval = setInterval(() => {
      const agora = Date.now();

      // 1. Atualizar Tempo Total de Treino Decorrido
      if (treinoIniciado && !treinoPausado && timestampInicioTreino) {
        const decorrido = Math.floor((agora - timestampInicioTreino) / 1000);
        setTempoTreinoSegundos(decorrido);
      }

      // 2. Atualizar Contagem Regressiva do Timer de Descanso
      if (descansoAtivo && timestampFimDescanso) {
        const restante = Math.max(0, Math.ceil((timestampFimDescanso - agora) / 1000));
        setDescansoSegundosRestantes(restante);

        if (restante === 0) {
          setDescansoAtivo(false);
          setTimestampFimDescanso(null);
          Alert.alert('Fim do Descanso', 'Hora de iniciar a próxima série!');
        }
      }
    }, 500);

    return () => clearInterval(timerInterval);
  }, [treinoIniciado, treinoPausado, timestampInicioTreino, descansoAtivo, timestampFimDescanso]);

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
      if (treino) {
        setTreinoAtivoSalvo(treino);
        setSessaoAtivaIndex(0);
      }
    } catch (err: any) {
      console.warn('Alerta ao buscar treino ativo:', err.message);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  // Funções de Controle do Cronômetro de Treino Total
  const handleIniciarOuContinuarTreino = () => {
    const agora = Date.now();
    if (!treinoIniciado) {
      setTreinoIniciado(true);
      setTreinoPausado(false);
      setTimestampInicioTreino(agora - tempoTreinoSegundos * 1000);
    } else if (treinoPausado) {
      setTreinoPausado(false);
      setTimestampInicioTreino(agora - tempoTreinoSegundos * 1000);
    }
  };

  const handlePausarTreino = () => {
    setTreinoPausado(true);
  };

  const handleFinalizarTreino = () => {
    const tempoFormatado = formatarTempo(tempoTreinoSegundos);

    const encerrar = () => {
      setUltimoTempoTreino(tempoFormatado !== '00:00' ? tempoFormatado : '00:00');
      setTreinoIniciado(false);
      setTreinoPausado(false);
      setTempoTreinoSegundos(0);
      setTimestampInicioTreino(null);
      setDescansoAtivo(false);
      setTimestampFimDescanso(null);
      setAbaPrincipal('revisao');
    };

    if (typeof window !== 'undefined' && typeof (window as any).confirm === 'function') {
      if ((window as any).confirm(`Finalizar Treino\n\nParabéns pelo treino! Duração total: ${tempoFormatado}.\nDeseja encerrar o cronômetro e ir para a Revisão do Treino?`)) {
        encerrar();
      }
    } else {
      Alert.alert(
        'Finalizar Treino',
        `Parabéns pelo treino! Duração total: ${tempoFormatado}.\nDeseja encerrar o cronômetro e ir para a Revisão do Treino?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Finalizar e Revisar', style: 'default', onPress: encerrar },
        ]
      );
    }
  };

  const handleSalvarReview = async () => {
    const duracaoAtual = ultimoTempoTreino !== '00:00'
      ? ultimoTempoTreino
      : (tempoTreinoSegundos > 0 ? formatarTempo(tempoTreinoSegundos) : '00:00');

    const reviewData = {
      data: new Date().toISOString(),
      duracao: duracaoAtual,
      rpe: rpeReview,
      sensacoes: sensacoesReview,
      notas: notasReview,
    };
    try {
      await AsyncStorage.setItem('@my_personal_ultimo_review', JSON.stringify(reviewData));
      if (typeof window !== 'undefined' && typeof (window as any).alert === 'function') {
        (window as any).alert('Avaliação Salva!\n\nSeu review do treino foi registrado com sucesso.');
      } else {
        Alert.alert('Avaliação Salva', 'Seu review do treino foi registrado com sucesso.');
      }
    } catch (e) {
      console.warn('Erro ao salvar review:', e);
    }
  };

  // Funções de Controle do Timer de Descanso por Exercício
  const handleIniciarDescansoExercicio = (exercicioNome: string, segundos: number) => {
    const agora = Date.now();
    const duracao = segundos || 60;
    setExercicioDescansoAtivo(exercicioNome);
    setDescansoDuracaoSegundos(duracao);
    setTimestampFimDescanso(agora + duracao * 1000);
    setDescansoSegundosRestantes(duracao);
    setDescansoAtivo(true);
  };

  const handlePausarDescanso = () => {
    setDescansoAtivo(false);
    setTimestampFimDescanso(null);
  };

  const handleResetarDescanso = () => {
    setDescansoAtivo(false);
    setTimestampFimDescanso(null);
    setDescansoSegundosRestantes(descansoDuracaoSegundos);
    setExercicioDescansoAtivo(null);
  };

  // Formatar Segundos em HH:MM:SS ou MM:SS
  const formatarTempo = (totalSegundos: number) => {
    const hrs = Math.floor(totalSegundos / 3600);
    const mins = Math.floor((totalSegundos % 3600) / 60);
    const secs = totalSegundos % 60;

    const pad = (num: number) => String(num).padStart(2, '0');

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
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
    setTreinoIniciado(false);
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

  // Função para Preencher Dados de Teste Rápido (Modo Dev/Admin)
  const handlePreencherDadosDemo = () => {
    const FOTO_SAMPLE = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const SAMPLE_URI = 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80';

    setNome((prev) => prev || 'Pedro Pereira');
    setIdade('24');
    setPeso('78');
    setAltura('178');
    setObjetivo('Hipertrofia');
    setNivel('Intermediário');
    setDias('4');
    setPassouNutricionista(false);
    setObservacoes('Foco em hipertrofia de peitoral e ombros.');
    setFotos({
      frente: {
        uri: SAMPLE_URI,
        mimeType: 'image/png',
        base64Data: FOTO_SAMPLE,
        tipo: 'frente',
      },
      costas: {
        uri: SAMPLE_URI,
        mimeType: 'image/png',
        base64Data: FOTO_SAMPLE,
        tipo: 'costas',
      },
      perfil: {
        uri: SAMPLE_URI,
        mimeType: 'image/png',
        base64Data: FOTO_SAMPLE,
        tipo: 'perfil',
      },
    });
  };

  // Submeter Fase 1 (Anamnese + Fotos -> Backend Fastify -> Gemini)
  const handleSubmeterAnamnese = async () => {
    if (!nome || !idade || !peso || !altura || passouNutricionista === null) {
      setMensagemErroAlerta('Existem dados essenciais incompletos. Por favor, preencha Nome, Idade, Peso, Altura e selecione a resposta sobre a consulta com nutricionista.');
      setAlertaErroVisivel(true);
      return;
    }

    const fotosArray = Object.values(fotos).filter((f): f is ImagemFoto => f !== undefined);

    if (fotosArray.length === 0) {
      setMensagemErroAlerta('Existem dados essenciais incompletos. É necessário incluir ao menos 1 foto corporal para que a IA processe sua avaliação.');
      setAlertaErroVisivel(true);
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
      const avaliacao = await enviarAvaliacaoAnamnese(anamneseData, fotosArray, session?.user?.id);
      setResultadoAvaliacao(avaliacao);
      setFaseAtual(2);
    } catch (err: any) {
      const msg = err.message || 'Falha ao conectar com o servidor.';
      setMensagemErroAlerta(`Erro na Análise: ${msg}`);
      setAlertaErroVisivel(true);
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
      const msg = err.message || 'Falha ao gerar treino.';
      setMensagemErroAlerta(`Erro ao Prescrever Treino: ${msg}`);
      setAlertaErroVisivel(true);
    } finally {
      setCarregando(false);
    }
  };

  // Função para Definir a Ficha Prescrita como Treino Ativo do Usuário
  const handleDefinirTreinoAtivo = async () => {
    if (!resultadoTreino) return;

    setCarregando(true);
    try {
      const treinoObj = {
        treino_json: resultadoTreino,
        created_at: new Date().toISOString(),
      };

      // 1. Persiste no Supabase PostgreSQL via API se houver usuário
      let treinoSalvoApi = null;
      if (session?.user?.id) {
        const resp = await definirTreinoAtivoApi(
          resultadoTreino,
          session.user.id,
          resultadoAvaliacao?.persistencia?.alunoId,
          resultadoAvaliacao?.persistencia?.avaliacaoId
        ).catch((err) => {
          console.warn('Alerta ao persistir no Supabase:', err.message);
          return null;
        });

        if (resp?.treinoSalvo) {
          treinoSalvoApi = resp.treinoSalvo;
        }
      }

      // 2. Atualiza o estado do treino ativo localmente
      setTreinoAtivoSalvo(treinoSalvoApi || treinoObj);
      setSessaoAtivaIndex(0);

      // 3. Limpa o fluxo de anamnese para reiniciar na Fase 1 inicial
      setFaseAtual(1);
      setResultadoAvaliacao(null);
      setResultadoTreino(null);
      setFotos({});
      setObservacoes('');

      // 4. Redireciona e notifica o usuário
      setAbaPrincipal('historico');
      Alert.alert(
        'Treino Definido com Sucesso!',
        'Sua nova ficha de treino foi gravada como seu Treino Ativo principal! Você já pode acompanhar suas sessões e iniciar seus treinos.'
      );
    } catch (err: any) {
      const msg = err.message || 'Falha ao definir treino ativo.';
      setMensagemErroAlerta(`Erro: ${msg}`);
      setAlertaErroVisivel(true);
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
        'Exercício Substituído com Sucesso!',
        `Novo Exercício: ${resposta.exercicio_substituto.nome}\n\nMotivo da Escolha: ${resposta.motivo_escolha}`
      );
    } catch (err: any) {
      Alert.alert('Erro ao Substituir', err.message || 'Não foi possível trocar o exercício.');
    } finally {
      setCarregandoTroca(false);
    }
  };

  // SE O USUÁRIO NÃO ESTIVER LOGADO -> EXIBIR TELA DE AUTENTICAÇÃO FRUTIGER AERO
  if (!session) {
    return (
      <LinearGradient colors={t.bgGradient} style={{ flex: 1 }}>
        <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
          <StatusBar barStyle={t.statusBar} backgroundColor={t.headerBg} />
          <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1, justifyContent: 'center' }}>
            <AeroGlassCard theme={t} style={{ maxWidth: 440, width: '100%', alignSelf: 'center', padding: 26, borderRadius: 28 }}>
              {/* LOGO E BADGE AERO */}
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                  <Text style={{ fontSize: 32, fontWeight: '900', color: t.accentAqua, letterSpacing: 0.5 }}>My</Text>
                  <Text style={{ fontSize: 32, fontWeight: '900', color: t.accentLime, letterSpacing: 0.5 }}>Personal</Text>
                </View>
                <AeroBadge label="PERSONAL AI" theme={t} color={t.accentAqua} />
              </View>

              {/* ABAS BOLHA (ENTRAR / CRIAR CONTA) */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                <AeroBubbleChip
                  style={{ flex: 1 }}
                  label="Entrar"
                  active={abaAuth === 'login'}
                  onPress={() => setAbaAuth('login')}
                  theme={t}
                />
                <AeroBubbleChip
                  style={{ flex: 1 }}
                  label="Criar Conta"
                  active={abaAuth === 'cadastro'}
                  onPress={() => setAbaAuth('cadastro')}
                  theme={t}
                />
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
                <ActivityIndicator size="large" color={t.accentLime} style={{ marginTop: 15 }} />
              ) : (
                <View style={{ marginTop: 15 }}>
                  <AeroBubbleButton
                    title={abaAuth === 'login' ? 'Entrar no App' : 'Criar Minha Conta'}
                    onPress={abaAuth === 'login' ? handleLogin : handleCadastro}
                    theme={t}
                  />
                </View>
              )}
            </AeroGlassCard>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // TELA PRINCIPAL FRUTIGER AERO
  return (
    <LinearGradient colors={t.bgGradient} style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
        <StatusBar barStyle={t.statusBar} backgroundColor={t.headerBg} />

        {/* HEADER PRINCIPAL FRUTIGER AERO COM LIQUID GLASS */}
        <View
          style={{
            backgroundColor: t.headerBg,
            borderBottomWidth: 1.2,
            borderBottomColor: t.cardBorder,
            paddingHorizontal: 18,
            paddingVertical: 14,
            position: 'relative',
          }}
        >
          {/* LUZ DE TOPO DO HEADER */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 1.5,
              backgroundColor: t.cardHighlight,
            }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: t.accentAqua }}>My</Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: t.accentLime }}>Personal</Text>
              </View>
              <Text style={{ fontSize: 12, color: t.textSecondary, marginTop: 2, fontWeight: '600' }}>
                Olá, <Text style={{ color: t.accentLime, fontWeight: 'bold' }}>{nome || session.user.email?.split('@')[0]}</Text>
              </Text>
            </View>
            <AeroBubbleButton
              variant="glass"
              title="☰ Menu"
              onPress={() => setMenuLateralVisivel(true)}
              theme={t}
              style={{
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderWidth: 0,
                borderColor: 'transparent',
                shadowOpacity: 0,
                elevation: 0,
              }}
              textStyle={{ fontSize: 13 }}
            />
          </View>
        </View>

        {/* ABA 3: REVISÃO & REVIEW DO TREINO FRUTIGER AERO */}
        {(abaPrincipal === 'revisao' || abaPrincipal === 'cronometro') && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {(() => {
              const tData = treinoAtivoSalvo?.treino_json?.treino;
              const sessoes = tData?.sessoes || [];
              const sessaoAtual = sessoes[sessaoAtivaIndex] || sessoes[0];

              let totalSeriesPlanejadas = 0;
              let totalSeriesConcluidas = 0;
              let totalVolumeKg = 0;

              if (sessaoAtual?.exercicios) {
                sessaoAtual.exercicios.forEach((ex: any) => {
                  const numSeries = Number(ex.series) || 3;
                  totalSeriesPlanejadas += numSeries;
                  for (let s = 0; s < numSeries; s++) {
                    const key = `${sessaoAtivaIndex}_${ex.nome}_${s}`;
                    const reg = registrosCargas[key];
                    if (reg?.concluido) {
                      totalSeriesConcluidas++;
                      const c = parseFloat(reg.carga) || 0;
                      const r = parseInt(reg.reps) || 0;
                      totalVolumeKg += (c * r);
                    }
                  }
                });
              }

              const duracaoExibicao = ultimoTempoTreino !== '00:00'
                ? ultimoTempoTreino
                : (tempoTreinoSegundos > 0 ? formatarTempo(tempoTreinoSegundos) : '00:00');

              return (
                <AeroGlassCard theme={t} style={{ borderRadius: 28, padding: 22 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={[styles.cardTitle, { color: t.textPrimary, marginBottom: 0 }]}>Revisão & Review do Treino</Text>
                    <AeroBadge label={treinoIniciado ? 'EM ANDAMENTO' : 'SESSÃO FINALIZADA'} theme={t} color={treinoIniciado ? t.accentLime : t.accentAqua} />
                  </View>
                  <Text style={{ color: t.textSecondary, fontSize: 13, marginBottom: 18 }}>
                    Resumo biomecânico e registro de percepção de esforço (RPE) da sua sessão.
                  </Text>

                  {/* MINI-CARDS DE RESUMO DA SESSÃO */}
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
                    {/* DURAÇÃO */}
                    <View style={{ flex: 1, backgroundColor: t.inputBg, borderColor: t.cardBorder, borderWidth: 1, borderRadius: 16, padding: 12, alignItems: 'center' }}>
                      <Text style={{ fontSize: 11.5, color: t.textSecondary, fontWeight: '600' }}>⏱️ Duração</Text>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: t.accentAqua, marginTop: 4 }}>
                        {duracaoExibicao}
                      </Text>
                    </View>

                    {/* SÉRIES CONCLUÍDAS */}
                    <View style={{ flex: 1, backgroundColor: t.inputBg, borderColor: t.cardBorder, borderWidth: 1, borderRadius: 16, padding: 12, alignItems: 'center' }}>
                      <Text style={{ fontSize: 11.5, color: t.textSecondary, fontWeight: '600' }}>🏋️‍♂️ Séries Feitas</Text>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: t.accentLime, marginTop: 4 }}>
                        {totalSeriesConcluidas}/{totalSeriesPlanejadas || '0'}
                      </Text>
                    </View>

                    {/* VOLUME DE CARGA */}
                    <View style={{ flex: 1, backgroundColor: t.inputBg, borderColor: t.cardBorder, borderWidth: 1, borderRadius: 16, padding: 12, alignItems: 'center' }}>
                      <Text style={{ fontSize: 11.5, color: t.textSecondary, fontWeight: '600' }}>⚖️ Volume Total</Text>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: t.accentLime, marginTop: 4 }}>
                        {totalVolumeKg > 0 ? `${totalVolumeKg.toLocaleString('pt-BR')} kg` : '0 kg'}
                      </Text>
                    </View>
                  </View>

                  {/* IDENTIFICAÇÃO DO TREINO REVISADO */}
                  {sessaoAtual && (
                    <View style={{ backgroundColor: 'rgba(0, 210, 255, 0.08)', borderColor: t.cardBorder, borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 20 }}>
                      <Text style={{ fontSize: 12, color: t.textSecondary }}>Ficha Ativa:</Text>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: t.accentAqua, marginTop: 2 }}>
                        Dia {sessaoAtivaIndex + 1} - {String(sessaoAtual.nome || '').replace(/^Treino [A-Z]\s*-\s*/i, '')}
                      </Text>
                    </View>
                  )}

                  {/* PERCEPÇÃO DE ESFORÇO (RPE / ESCALA BORG) */}
                  <Text style={{ fontSize: 13.5, fontWeight: 'bold', color: t.textPrimary, marginBottom: 8 }}>
                    Percepção de Esforço (RPE da Sessão):
                  </Text>
                  <Text style={{ fontSize: 12, color: t.textSecondary, marginBottom: 12 }}>
                    Como você avalia a intensidade geral do treino hoje?
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                    {[
                      { rpe: 6, label: 'RPE 6 - Leve' },
                      { rpe: 7, label: 'RPE 7 - Moderado (3 RIR)' },
                      { rpe: 8, label: 'RPE 8 - Desafiador (2 RIR)' },
                      { rpe: 9, label: 'RPE 9 - Muito Difícil (1 RIR)' },
                      { rpe: 10, label: 'RPE 10 - Até a Falha' },
                    ].map((item) => (
                      <AeroBubbleChip
                        key={item.rpe}
                        label={item.label}
                        active={rpeReview === item.rpe}
                        onPress={() => setRpeReview(item.rpe)}
                        theme={t}
                      />
                    ))}
                  </View>

                  {/* SENSAÇÕES & FEEDBACK FISIOLÓGICO */}
                  <Text style={{ fontSize: 13.5, fontWeight: 'bold', color: t.textPrimary, marginBottom: 8 }}>
                    Sensações do Treino:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                    {[
                      '🔥 Pump Máximo',
                      '⚡ Alta Energia',
                      '🎯 Foco Total',
                      '💪 Cargas Superadas',
                      '😴 Fadiga Elevada',
                      '⚠️ Desconforto Articular',
                    ].map((sensacao) => {
                      const ativo = sensacoesReview.includes(sensacao);
                      return (
                        <AeroBubbleChip
                          key={sensacao}
                          label={sensacao}
                          active={ativo}
                          onPress={() => {
                            if (ativo) {
                              setSensacoesReview(sensacoesReview.filter((s) => s !== sensacao));
                            } else {
                              setSensacoesReview([...sensacoesReview, sensacao]);
                            }
                          }}
                          theme={t}
                        />
                      );
                    })}
                  </View>

                  {/* FEEDBACK / OBSERVAÇÕES DO ATLETA */}
                  <Text style={{ fontSize: 13.5, fontWeight: 'bold', color: t.textPrimary, marginBottom: 8 }}>
                    Notas e Observações da Sessão:
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: t.inputBg,
                        borderColor: t.inputBorder,
                        color: t.textPrimary,
                        minHeight: 80,
                        textAlignVertical: 'top',
                        paddingTop: 10,
                        marginBottom: 20,
                      },
                    ]}
                    multiline
                    numberOfLines={3}
                    placeholder="Ex: Treino muito produtivo! Senti excelente ativação nas paralelas e aumentei 2kg nas séries finais..."
                    placeholderTextColor={t.textSecondary}
                    value={notasReview}
                    onChangeText={setNotasReview}
                  />

                  {/* BOTÕES DE AÇÃO */}
                  <View style={{ gap: 10 }}>
                    <AeroBubbleButton
                      title="✅ Salvar Review do Treino"
                      onPress={handleSalvarReview}
                      theme={t}
                    />

                    <AeroBubbleButton
                      variant="glass"
                      title="📋 Ver Minha Ficha de Treino"
                      onPress={() => setAbaPrincipal('historico')}
                      theme={t}
                    />
                  </View>
                </AeroGlassCard>
              );
            })()}
          </ScrollView>
        )}

        {/* ABA 2: MEU TREINO ATIVO NO SUPABASE FRUTIGER AERO */}
        {abaPrincipal === 'historico' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <AeroGlassCard theme={t} style={{ borderRadius: 28, padding: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <Text style={[styles.cardTitle, { color: t.textPrimary, marginBottom: 0 }]}>Ficha de Treino Ativa</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  {/* WIDGET CRONÔMETRO LIQUID GLASS COM APENAS ÍCONES (CONFORME ESBOÇO DO USUÁRIO) */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: treinoIniciado
                        ? (treinoPausado ? 'rgba(0, 145, 255, 0.16)' : 'rgba(0, 230, 118, 0.14)')
                        : t.glassButtonBg,
                      borderColor: treinoIniciado
                        ? (treinoPausado ? t.accentAqua : t.accentLime)
                        : t.cardBorder,
                      borderWidth: 1.2,
                      borderRadius: 14,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      gap: 6,
                    }}
                  >
                    {/* INDICADOR LUMINOSO PULSANTE */}
                    <View
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 4,
                        backgroundColor: treinoIniciado
                          ? (treinoPausado ? t.accentAqua : t.accentLime)
                          : t.textMuted,
                      }}
                    />

                    {/* MOSTRADOR DIGITAL */}
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: 'bold',
                        color: treinoIniciado
                          ? (treinoPausado ? t.accentAqua : t.accentLime)
                          : t.textPrimary,
                        letterSpacing: 0.5,
                        minWidth: 44,
                        textAlign: 'center',
                      }}
                    >
                      {formatarTempo(tempoTreinoSegundos)}
                    </Text>

                    {/* DIVISOR VERTICAL */}
                    <View style={{ width: 1, height: 14, backgroundColor: t.cardBorder, opacity: 0.7 }} />

                    {/* FUNÇÕES DO CRONÔMETRO: APENAS OS ÍCONES */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {!treinoIniciado ? (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={handleIniciarOuContinuarTreino}
                          style={{ padding: 4 }}
                          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                          accessibilityLabel="Iniciar Treino"
                        >
                          <Play size={14} color={t.accentLime} fill={t.accentLime} />
                        </TouchableOpacity>
                      ) : (
                        <>
                          {treinoPausado ? (
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={handleIniciarOuContinuarTreino}
                              style={{ padding: 4 }}
                              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                              accessibilityLabel="Continuar Treino"
                            >
                              <Play size={14} color={t.accentLime} fill={t.accentLime} />
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={handlePausarTreino}
                              style={{ padding: 4 }}
                              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                              accessibilityLabel="Pausar Treino"
                            >
                              <Pause size={14} color={t.accentAqua} fill={t.accentAqua} />
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={handleFinalizarTreino}
                            style={{ padding: 4 }}
                            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                            accessibilityLabel="Finalizar Treino"
                          >
                            <Square size={13} color="#ff4d4d" fill="#ff4d4d" />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>

                  {treinoAtivoSalvo && (
                    <AeroBubbleButton
                      variant="glass"
                      title="📄 PDF"
                      onPress={() => exportarFichaTreinoPDF(treinoAtivoSalvo.treino_json, nome || session?.user?.email)}
                      theme={t}
                      style={{ borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 }}
                      textStyle={{ fontSize: 12 }}
                    />
                  )}
                  <AeroBubbleButton
                    variant="glass"
                    title="⟳ Atualizar"
                    onPress={carregarTreinoAtivo}
                    theme={t}
                    style={{ borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 }}
                    textStyle={{ fontSize: 12 }}
                  />
                </View>
              </View>

              {carregandoHistorico ? (
                <ActivityIndicator size="large" color={t.accentLime} style={{ marginVertical: 30 }} />
              ) : !treinoAtivoSalvo ? (
                <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                  <Text style={{ color: t.textPrimary, fontWeight: 'bold', fontSize: 16 }}>Nenhum treino ativo encontrado</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: 20 }}>
                    Abra o Menu no topo e selecione "Gerar Novo Treino" para prescrever sua primeira ficha inteligente!
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
                        Divisão: <Text style={{ color: t.accentLime, fontWeight: 'bold' }}>{tData?.divisao_nome}</Text> | {tData?.frequencia_semanal}x por semana
                      </Text>

                      {/* SELEÇÃO DE DIAS DE TREINO (BOLHAS INTERATIVAS) */}
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {sessoes.map((s: any, idx: number) => (
                            <AeroBubbleChip
                              key={idx}
                              label={`Dia ${idx + 1}`}
                              active={sessaoAtivaIndex === idx}
                              onPress={() => setSessaoAtivaIndex(idx)}
                              theme={t}
                            />
                          ))}
                        </View>
                      </ScrollView>

                      {/* SESSÃO DE TREINO SELECIONADA */}
                      {sessaoAtual && (
                        <View style={[styles.sessionCard, { backgroundColor: t.inputBg, borderColor: t.cardBorder, borderRadius: 22 }]}>
                          <Text style={[styles.sessionTitle, { color: t.accentLime }]}>
                            Dia {sessaoAtivaIndex + 1} - {String(sessaoAtual.nome || '').replace(/^Treino [A-Z]\s*-\s*/i, '')}
                          </Text>

                          {sessaoAtual.exercicios?.map((ex: any, eIdx: number) => (
                            <View key={eIdx} style={[styles.exerciseCapsule, { backgroundColor: t.card, borderColor: t.cardBorder, borderRadius: 20 }]}>
                              <View style={styles.exerciseHeader}>
                                <Text style={[styles.exerciseName, { color: t.textPrimary }]}>{eIdx + 1}. {ex.nome}</Text>
                                <AeroBubbleButton
                                  variant="secondary"
                                  title="Substituir"
                                  onPress={() => handleAbrirModalSubstituicao(sessaoAtivaIndex, eIdx, ex, true)}
                                  theme={t}
                                  style={{ borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}
                                  textStyle={{ fontSize: 11.5 }}
                                />
                              </View>

                              {/* PÍLULAS DE ESTATÍSTICAS AERO */}
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
                                <TouchableOpacity
                                  style={[
                                    styles.metricPill,
                                    {
                                      backgroundColor: (descansoAtivo && exercicioDescansoAtivo === ex.nome) ? t.glassButtonBg : t.inputBg,
                                      borderColor: (descansoAtivo && exercicioDescansoAtivo === ex.nome) ? t.glassButtonBorder : t.cardBorder,
                                      borderWidth: 1,
                                    },
                                  ]}
                                  onPress={() => handleIniciarDescansoExercicio(ex.nome, ex.descanso_segundos || 60)}
                                >
                                  <Text style={[styles.metricPillText, { color: t.textSecondary }]}>
                                    Descanso: <Text style={{ color: t.accentAqua, fontWeight: 'bold' }}>{ex.descanso_segundos}s</Text>
                                  </Text>
                                </TouchableOpacity>
                              </View>
                              <Text style={[styles.exerciseCadence, { color: t.textSecondary }]}>Cadência: {ex.foco_biomecanico}</Text>

                              {/* BARRA DO TIMER DE DESCANSO INTEGRADO DO EXERCÍCIO */}
                              {descansoAtivo && exercicioDescansoAtivo === ex.nome && (
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 10,
                                    marginTop: 10,
                                    backgroundColor: 'rgba(0, 210, 255, 0.16)',
                                    borderColor: 'rgba(0, 210, 255, 0.50)',
                                    borderWidth: 1,
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 14,
                                  }}
                                >
                                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: t.accentAqua, flex: 1 }}>
                                    Descansando: {formatarTempo(descansoSegundosRestantes)}
                                  </Text>
                                  <AeroBubbleButton
                                    variant="secondary"
                                    title="Pausar"
                                    onPress={handlePausarDescanso}
                                    theme={t}
                                    style={{ borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}
                                    textStyle={{ fontSize: 11 }}
                                  />
                                  <AeroBubbleButton
                                    variant="secondary"
                                    title="Resetar"
                                    onPress={handleResetarDescanso}
                                    theme={t}
                                    style={{ borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}
                                    textStyle={{ fontSize: 11 }}
                                  />
                                </View>
                              )}

                              {/* PAINEL DE REGISTRO DE CARGAS AERO */}
                              <View
                                style={{
                                  marginTop: 12,
                                  padding: 12,
                                  backgroundColor: t.inputBg,
                                  borderRadius: 16,
                                  borderWidth: 1,
                                  borderColor: t.cardBorder,
                                }}
                              >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: t.accentLime, letterSpacing: 0.5 }}>
                                    REGISTRO DE CARGAS (KG) & REPETIÇÕES
                                  </Text>
                                  <Text style={{ fontSize: 11, color: t.textSecondary }}>
                                    {ex.series_trabalho || 3} Séries
                                  </Text>
                                </View>

                                {Array.from({ length: Number(ex.series_trabalho) || 3 }).map((_, sIdx) => {
                                  const key = `${ex.nome}_serie_${sIdx}`;
                                  const reg = registrosCargas[key] || { carga: '', reps: '', concluido: false };

                                  return (
                                    <View
                                      key={sIdx}
                                      style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginBottom: 6,
                                        backgroundColor: reg.concluido ? 'rgba(0, 230, 118, 0.15)' : t.card,
                                        paddingHorizontal: 8,
                                        paddingVertical: 6,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor: reg.concluido ? t.accentLime : t.cardBorder,
                                      }}
                                    >
                                      <Text style={{ width: 52, fontSize: 11, fontWeight: 'bold', color: t.textPrimary }}>
                                        Série {sIdx + 1}:
                                      </Text>

                                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                        <TextInput
                                          style={{
                                            flex: 1,
                                            backgroundColor: t.inputBg,
                                            borderColor: t.inputBorder,
                                            borderWidth: 1,
                                            borderRadius: 8,
                                            paddingHorizontal: 6,
                                            paddingVertical: 3,
                                            color: t.textPrimary,
                                            fontSize: 12,
                                            textAlign: 'center',
                                          }}
                                          placeholder="kg"
                                          placeholderTextColor={t.textSecondary}
                                          keyboardType="numeric"
                                          value={reg.carga}
                                          onChangeText={(txt) => handleAtualizarCargaExercicio(ex.nome, sIdx, txt, reg.reps, reg.concluido)}
                                        />
                                        <Text style={{ fontSize: 10, color: t.textSecondary }}>kg</Text>
                                      </View>

                                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                        <TextInput
                                          style={{
                                            flex: 1,
                                            backgroundColor: t.inputBg,
                                            borderColor: t.inputBorder,
                                            borderWidth: 1,
                                            borderRadius: 8,
                                            paddingHorizontal: 6,
                                            paddingVertical: 3,
                                            color: t.textPrimary,
                                            fontSize: 12,
                                            textAlign: 'center',
                                          }}
                                          placeholder="reps"
                                          placeholderTextColor={t.textSecondary}
                                          keyboardType="numeric"
                                          value={reg.reps}
                                          onChangeText={(txt) => handleAtualizarCargaExercicio(ex.nome, sIdx, reg.carga, txt, reg.concluido)}
                                        />
                                        <Text style={{ fontSize: 10, color: t.textSecondary }}>reps</Text>
                                      </View>

                                      <AeroBubbleButton
                                        variant={reg.concluido ? 'check' : 'glass'}
                                        title={reg.concluido ? '✓ Feito' : 'Check'}
                                        onPress={() => handleAlternarConclusaoSerie(ex.nome, sIdx, reg.carga, reg.reps, !reg.concluido, ex.descanso_segundos)}
                                        theme={t}
                                        style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}
                                        textStyle={{ fontSize: 10 }}
                                      />
                                    </View>
                                  );
                                })}
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })()
              )}
            </AeroGlassCard>
          </ScrollView>
        )}

        {/* ABA 1: GERAR NOVO TREINO (FLUXO 3 FASES FRUTIGER AERO) */}
        {abaPrincipal === 'novo' && (
          <>
            {carregando ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={t.accentLime} />
                <Text style={[styles.loadingText, { color: t.textSecondary, marginTop: 14, fontWeight: '600' }]}>
                  {faseAtual === 1 ? 'Analisando fotos e biotipo com Gemini AI...' : 'Prescrevendo sua ficha de treino...'}
                </Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* FASE 1: FORMULÁRIO DE ANAMNESE E FOTOS FRUTIGER AERO */}
                {faseAtual === 1 && (
                  <AeroGlassCard theme={t} style={{ borderRadius: 28, padding: 22 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <Text style={[styles.cardTitle, { color: t.textPrimary, marginBottom: 0 }]}>Dados Biométricos</Text>
                      {isDevUser && (
                        <AeroBubbleButton
                          variant="glass"
                          title="⚡ Teste Rápido"
                          onPress={handlePreencherDadosDemo}
                          theme={t}
                          style={{
                            borderRadius: 12,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderWidth: 0,
                            borderColor: 'transparent',
                            shadowOpacity: 0,
                            elevation: 0,
                          }}
                          textStyle={{ fontSize: 11.5 }}
                        />
                      )}
                    </View>

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

                    {/* SELEÇÃO DO OBJETIVO (PÍLULAS BOLHA AERO) */}
                    <Text style={[styles.label, { marginTop: 12, color: t.textSecondary }]}>Objetivo Principal:</Text>
                    <View style={styles.chipContainer}>
                      {listaObjetivos.map((item) => (
                        <AeroBubbleChip
                          key={item}
                          label={item}
                          active={objetivo === item}
                          onPress={() => setObjetivo(item)}
                          theme={t}
                        />
                      ))}
                    </View>

                    {/* SELEÇÃO DO NÍVEL (PÍLULAS BOLHA AERO) */}
                    <Text style={[styles.label, { marginTop: 12, color: t.textSecondary }]}>Nível / Tempo de Treino:</Text>
                    <View style={styles.chipContainer}>
                      {listaNiveis.map((item) => (
                        <AeroBubbleChip
                          key={item}
                          label={item}
                          active={nivel === item}
                          onPress={() => setNivel(item)}
                          theme={t}
                        />
                      ))}
                    </View>

                    {/* OBSERVAÇÕES E PREFERÊNCIAS */}
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

                    {/* REGRA DO NUTRICIONISTA COM BOLHAS TÁTEIS */}
                    <Text style={[styles.label, { marginTop: 15, color: t.textSecondary }]}>Você já passou por consulta com nutricionista?</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                      <AeroBubbleChip
                        style={{ flex: 1 }}
                        label="Sim, já consultei"
                        active={passouNutricionista === true}
                        onPress={() => setPassouNutricionista(true)}
                        theme={t}
                      />
                      <AeroBubbleChip
                        style={{ flex: 1 }}
                        label="Não, nunca consultei"
                        active={passouNutricionista === false}
                        onPress={() => setPassouNutricionista(false)}
                        theme={t}
                      />
                    </View>

                    {passouNutricionista === true && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={[styles.label, { color: t.textSecondary }]}>Digite seu % de Gordura (BF) do nutricionista:</Text>
                        <TextInput style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.textPrimary }]} value={bfInformado} onChangeText={setBfInformado} keyboardType="numeric" placeholder="Ex: 15" placeholderTextColor={t.textSecondary} />
                      </View>
                    )}

                    {passouNutricionista === false && (
                      <Text style={[styles.infoText, { color: t.accentAqua, marginTop: 4 }]}>
                        ✨ A visão computacional multimodal da IA estimará o seu % de gordura a partir das fotos.
                      </Text>
                    )}

                    {/* UPLOAD DE FOTOS CORPORAIS */}
                    <Text style={[styles.cardTitle, { marginTop: 22, color: t.textPrimary }]}>Fotos Corporais</Text>

                    <View style={styles.photoContainer}>
                      {(['frente', 'costas', 'perfil'] as const).map((tipo) => (
                        <TouchableOpacity
                          key={tipo}
                          activeOpacity={0.8}
                          style={[
                            styles.photoBox,
                            {
                              backgroundColor: t.inputBg,
                              borderColor: fotos[tipo] ? t.accentLime : t.cardBorder,
                              borderWidth: fotos[tipo] ? 2 : 1.2,
                              borderRadius: 20,
                              overflow: 'hidden',
                            },
                          ]}
                          onPress={() => selecionarFoto(tipo)}
                        >
                          {fotos[tipo] ? (
                            <Image source={{ uri: fotos[tipo]?.uri }} style={styles.photoPreview} />
                          ) : (
                            <View style={{ alignItems: 'center', padding: 6 }}>
                              <Text style={{ fontSize: 18, marginBottom: 2 }}>📸</Text>
                              <Text style={[styles.photoBoxText, { color: t.accentAqua, fontWeight: 'bold' }]}>
                                +{tipo.toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>

                    <AeroBubbleButton
                      title="⚡ Analisar Biomecânica com IA"
                      onPress={handleSubmeterAnamnese}
                      theme={t}
                      style={{ marginTop: 14 }}
                    />
                  </AeroGlassCard>
                )}

                {/* FASE 2: VALIDAÇÃO DO DIAGNÓSTICO DA IA FRUTIGER AERO */}
                {faseAtual === 2 && resultadoAvaliacao && (
                  <AeroGlassCard theme={t} style={{ borderRadius: 28, padding: 22 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <Text style={[styles.cardTitle, { color: t.textPrimary, marginBottom: 0 }]}>Diagnóstico Visual da IA</Text>
                      <AeroBadge label="BIO-SCAN MULTIMODAL" theme={t} color={t.accentAqua} />
                    </View>

                    {/* BADGE ESFÉRICA DE BF ESTIMADO */}
                    <LinearGradient
                      colors={['rgba(0, 210, 255, 0.22)', 'rgba(0, 230, 118, 0.14)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        borderRadius: 22,
                        padding: 16,
                        borderWidth: 1.2,
                        borderColor: t.accentLime,
                        marginBottom: 16,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 12, color: t.textSecondary, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 }}>
                        PERCENTUAL DE GORDURA ESTIMADO (BF)
                      </Text>
                      <Text style={{ fontSize: 30, fontWeight: '900', color: t.accentLime, letterSpacing: 1 }}>
                        {resultadoAvaliacao.avaliacao.bf_estimado}
                      </Text>
                    </LinearGradient>

                    <Text style={[styles.sectionHeader, { color: t.accentLime }]}>Pontos Fortes Musculares:</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {resultadoAvaliacao.avaliacao.pontos_fortes.map((pf, idx) => (
                        <AeroBadge key={idx} label={`★ ${pf}`} theme={t} color={t.accentLime} />
                      ))}
                    </View>

                    <Text style={[styles.sectionHeader, { color: t.accentAqua }]}>Prioridades Biomecânicas (Foco de Treino):</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {resultadoAvaliacao.avaliacao.pontos_fracos.map((pf, idx) => (
                        <AeroBadge key={idx} label={`⚡ ${pf}`} theme={t} color={t.accentAqua} />
                      ))}
                    </View>

                    <Text style={[styles.sectionHeader, { color: t.accentLime }]}>Observações Posturais:</Text>
                    <Text style={[styles.bodyText, { color: t.textSecondary, marginBottom: 12 }]}>{resultadoAvaliacao.avaliacao.postura_observacoes}</Text>

                    <Text style={[styles.sectionHeader, { color: t.accentLime }]}>Mensagem do Especialista:</Text>
                    <Text style={[styles.bodyText, { color: t.textSecondary, marginBottom: 16 }]}>{resultadoAvaliacao.avaliacao.mensagem_validacao}</Text>

                    <AeroBubbleButton
                      title="✓ Concordo 100% • Prescrever Treino"
                      onPress={handleConfirmarEGerarTreino}
                      theme={t}
                      style={{ marginTop: 10 }}
                    />
                  </AeroGlassCard>
                )}

                {/* FASE 3: FICHA DE TREINO PRESCRITA FRUTIGER AERO */}
                {faseAtual === 3 && resultadoTreino && (
                  <AeroGlassCard theme={t} style={{ borderRadius: 28, padding: 22 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={[styles.cardTitle, { color: t.textPrimary, marginBottom: 0 }]}>Ficha de Treino Prescrita</Text>
                      <AeroBubbleButton
                        variant="glass"
                        title="📄 Exportar PDF"
                        onPress={() => exportarFichaTreinoPDF(resultadoTreino, nome || session?.user?.email)}
                        theme={t}
                        style={{ borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 }}
                        textStyle={{ fontSize: 12 }}
                      />
                    </View>
                    <Text style={[styles.headerSubtitle, { color: t.textSecondary }]}>
                      Divisão: <Text style={{ color: t.accentLime, fontWeight: 'bold' }}>{resultadoTreino.treino.divisao_nome}</Text> | {resultadoTreino.treino.frequencia_semanal}x por semana
                    </Text>

                    {/* BOTAO PRINCIPAL DE DEFINIR COMO TREINO ATIVO */}
                    <AeroBubbleButton
                      title="⭐ Definir como Meu Treino Ativo"
                      onPress={handleDefinirTreinoAtivo}
                      theme={t}
                      style={{ marginVertical: 14 }}
                    />

                    {/* NAVEGAÇÃO DE DIAS DE TREINO (BOLHAS AERO) */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {resultadoTreino.treino.sessoes.map((s, idx) => (
                          <AeroBubbleChip
                            key={idx}
                            label={`Dia ${idx + 1}`}
                            active={sessaoAtivaIndex === idx}
                            onPress={() => setSessaoAtivaIndex(idx)}
                            theme={t}
                          />
                        ))}
                      </View>
                    </ScrollView>

                    {/* SESSÃO ATIVA */}
                    {resultadoTreino.treino.sessoes[sessaoAtivaIndex] && (
                      <View style={[styles.sessionCard, { backgroundColor: t.inputBg, borderColor: t.cardBorder, borderRadius: 22 }]}>
                        <Text style={[styles.sessionTitle, { color: t.accentLime }]}>
                          Dia {sessaoAtivaIndex + 1} - {String(resultadoTreino.treino.sessoes[sessaoAtivaIndex].nome || '').replace(/^Treino [A-Z]\s*-\s*/i, '')}
                        </Text>

                        {resultadoTreino.treino.sessoes[sessaoAtivaIndex].exercicios.map((ex, eIdx) => (
                          <View key={eIdx} style={[styles.exerciseCapsule, { backgroundColor: t.card, borderColor: t.cardBorder, borderRadius: 20 }]}>
                            <View style={styles.exerciseHeader}>
                              <Text style={[styles.exerciseName, { color: t.textPrimary }]}>{eIdx + 1}. {ex.nome}</Text>
                              <AeroBubbleButton
                                variant="secondary"
                                title="Substituir"
                                onPress={() => handleAbrirModalSubstituicao(sessaoAtivaIndex, eIdx, ex)}
                                theme={t}
                                style={{ borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}
                                textStyle={{ fontSize: 11.5 }}
                              />
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
                              <TouchableOpacity
                                style={[
                                  styles.metricPill,
                                  {
                                    backgroundColor: (descansoAtivo && exercicioDescansoAtivo === ex.nome) ? t.glassButtonBg : t.inputBg,
                                    borderColor: (descansoAtivo && exercicioDescansoAtivo === ex.nome) ? t.glassButtonBorder : t.cardBorder,
                                    borderWidth: 1,
                                  },
                                ]}
                                onPress={() => handleIniciarDescansoExercicio(ex.nome, ex.descanso_segundos || 60)}
                              >
                                <Text style={[styles.metricPillText, { color: t.textSecondary }]}>
                                  Descanso: <Text style={{ color: t.accentAqua, fontWeight: 'bold' }}>{ex.descanso_segundos}s</Text>
                                </Text>
                              </TouchableOpacity>
                            </View>
                            <Text style={[styles.exerciseCadence, { color: t.textSecondary }]}>Cadência: {ex.foco_biomecanico}</Text>

                            {/* BARRA DO TIMER DE DESCANSO INTEGRADO DO EXERCÍCIO */}
                            {descansoAtivo && exercicioDescansoAtivo === ex.nome && (
                              <View
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 10,
                                  marginTop: 10,
                                  backgroundColor: 'rgba(0, 210, 255, 0.16)',
                                  borderColor: 'rgba(0, 210, 255, 0.50)',
                                  borderWidth: 1,
                                  paddingHorizontal: 12,
                                  paddingVertical: 8,
                                  borderRadius: 14,
                                }}
                              >
                                <Text style={{ fontSize: 13, fontWeight: 'bold', color: t.accentAqua, flex: 1 }}>
                                  Descansando: {formatarTempo(descansoSegundosRestantes)}
                                </Text>
                                <AeroBubbleButton
                                  variant="secondary"
                                  title="Pausar"
                                  onPress={handlePausarDescanso}
                                  theme={t}
                                  style={{ borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}
                                  textStyle={{ fontSize: 11 }}
                                />
                                <AeroBubbleButton
                                  variant="secondary"
                                  title="Resetar"
                                  onPress={handleResetarDescanso}
                                  theme={t}
                                  style={{ borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}
                                  textStyle={{ fontSize: 11 }}
                                />
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    )}

                    <AeroBubbleButton
                      variant="secondary"
                      title="Fazer Nova Anamnese"
                      onPress={() => setFaseAtual(1)}
                      theme={t}
                      style={{ marginTop: 16 }}
                    />
                  </AeroGlassCard>
                )}
              </ScrollView>
            )}
          </>
        )}

        {/* MENU LATERAL SLIDE DRAWER MODAL FRUTIGER AERO */}
        <Modal visible={menuLateralVisivel} transparent animationType="fade">
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: t.overlayBg, flexDirection: 'row' }}
            activeOpacity={1}
            onPress={() => setMenuLateralVisivel(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={{
                width: '82%',
                maxWidth: 340,
                backgroundColor: t.drawerBg,
                height: '100%',
                padding: 22,
                paddingTop: 50,
                borderTopRightRadius: 32,
                borderBottomRightRadius: 32,
                borderRightWidth: 1.2,
                borderRightColor: t.cardBorder,
              }}
            >
              <View style={{ marginBottom: 22 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: t.accentAqua }}>My</Text>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: t.accentLime }}>Personal</Text>
                </View>
                <Text style={{ fontSize: 13, color: t.textSecondary, marginTop: 4 }}>
                  {nome || session?.user?.email}
                </Text>
              </View>

              {/* SEÇÃO ALTERNADOR DE TEMA */}
              <Text style={{ fontSize: 11.5, fontWeight: 'bold', color: t.textSecondary, marginBottom: 10, letterSpacing: 0.6 }}>
                TEMA DO APLICATIVO
              </Text>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 22 }}>
                <AeroBubbleChip
                  style={{ flex: 1 }}
                  label="☀️ Modo Claro"
                  active={temaAtual === 'light'}
                  onPress={() => setTemaAtual('light')}
                  theme={t}
                />
                <AeroBubbleChip
                  style={{ flex: 1 }}
                  label="🌙 Modo Escuro"
                  active={temaAtual === 'dark'}
                  onPress={() => setTemaAtual('dark')}
                  theme={t}
                />
              </View>

              {/* SEÇÃO MODO DEV / TESTE RÁPIDO */}
              {isDevUser && (
                <>
                  <Text style={{ fontSize: 11.5, fontWeight: 'bold', color: t.textSecondary, marginBottom: 10, letterSpacing: 0.6 }}>
                    MODO DEV / ATALHOS DE TESTE
                  </Text>

                  <AeroBubbleButton
                    variant="glass"
                    title="⚡ Preencher Teste Rápido"
                    onPress={() => {
                      handlePreencherDadosDemo();
                      setAbaPrincipal('novo');
                      setFaseAtual(1);
                      setMenuLateralVisivel(false);
                    }}
                    theme={t}
                    style={{ marginBottom: 20 }}
                    textStyle={{ fontSize: 13 }}
                  />
                </>
              )}

              {/* SEÇÃO NAVEGAÇÃO PRINCIPAL */}
              <Text style={{ fontSize: 11.5, fontWeight: 'bold', color: t.textSecondary, marginBottom: 10, letterSpacing: 0.6 }}>
                NAVEGAÇÃO PRINCIPAL
              </Text>

              <AeroBubbleButton
                variant={abaPrincipal === 'novo' ? 'primary' : 'glass'}
                title="✨ Gerar Novo Treino"
                onPress={() => {
                  setAbaPrincipal('novo');
                  setMenuLateralVisivel(false);
                }}
                theme={t}
                style={{ marginBottom: 10 }}
                textStyle={{ fontSize: 13.5 }}
              />

              <AeroBubbleButton
                variant={abaPrincipal === 'historico' ? 'primary' : 'glass'}
                title="📋 Meu Treino Ativo"
                onPress={() => {
                  setAbaPrincipal('historico');
                  setMenuLateralVisivel(false);
                }}
                theme={t}
                style={{ marginBottom: 10 }}
                textStyle={{ fontSize: 13.5 }}
              />

              <AeroBubbleButton
                variant={abaPrincipal === 'revisao' ? 'primary' : 'glass'}
                title="⭐ Revisão do Treino"
                onPress={() => {
                  setAbaPrincipal('revisao');
                  setMenuLateralVisivel(false);
                }}
                theme={t}
                style={{ marginBottom: 20 }}
                textStyle={{ fontSize: 13.5 }}
              />

              <View style={{ flex: 1 }} />

              <AeroBubbleButton
                variant="danger"
                title="Sair da Conta"
                onPress={() => {
                  setMenuLateralVisivel(false);
                  handleLogout();
                }}
                theme={t}
                style={{ marginBottom: 20 }}
                textStyle={{ fontSize: 14 }}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* MODAL DE SUBSTITUIÇÃO DE EXERCÍCIO FRUTIGER AERO */}
        <Modal visible={modalSubstituicaoVisivel} transparent animationType="fade">
          <View style={[styles.modalOverlay, { backgroundColor: t.overlayBg }]}>
            <AeroGlassCard theme={t} style={{ maxWidth: 440, width: '92%', alignSelf: 'center', borderRadius: 28, padding: 22 }}>
              <Text style={[styles.modalTitle, { color: t.textPrimary }]}>Substituir Exercício</Text>

              {exercicioParaSubstituir && (
                <Text style={[styles.modalSubTitle, { color: t.textSecondary }]}>
                  Exercício Atual: <Text style={{ color: t.accentLime, fontWeight: 'bold' }}>{exercicioParaSubstituir.dados.nome}</Text>
                </Text>
              )}

              <Text style={[styles.label, { color: t.textSecondary }]}>Motivo da Troca (Opcional):</Text>
              <TextInput
                style={[styles.input, styles.multilineInput, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.textPrimary, borderRadius: 16 }]}
                value={motivoTroca}
                onChangeText={setMotivoTroca}
                multiline
                numberOfLines={3}
                placeholder="Ex: Não tenho essa máquina na academia / Sinto dor no ombro com este movimento"
                placeholderTextColor={t.textSecondary}
              />

              {carregandoTroca ? (
                <ActivityIndicator size="small" color={t.accentLime} style={{ marginVertical: 10 }} />
              ) : (
                <View style={styles.modalActions}>
                  <AeroBubbleButton
                    variant="secondary"
                    title="Cancelar"
                    onPress={() => setModalSubstituicaoVisivel(false)}
                    theme={t}
                    style={{ flex: 1 }}
                  />

                  <AeroBubbleButton
                    title="Trocar Exercício"
                    onPress={handleExecutarSubstituicao}
                    theme={t}
                    style={{ flex: 1 }}
                  />
                </View>
              )}
            </AeroGlassCard>
          </View>
        </Modal>

        {/* MODAL POP-UP DE ALERTA FRUTIGER AERO LIQUID GLASS */}
        <Modal visible={alertaErroVisivel} transparent animationType="fade">
          <View style={[styles.modalOverlay, { backgroundColor: t.overlayBg }]}>
            <AeroGlassCard
              theme={t}
              style={{
                maxWidth: 420,
                width: '90%',
                alignSelf: 'center',
                borderRadius: 28,
                padding: 24,
                alignItems: 'center',
                borderColor: 'rgba(255, 77, 77, 0.55)',
              }}
            >
              {/* BADGE TRANSLÚCIDA DE ALERTA LIQUID GLASS */}
              <AeroBadge label="ATENÇÃO DE PREENCHIMENTO" color="#ff4d4d" theme={t} style={{ marginBottom: 12 }} />

              <Text style={{ fontSize: 19, fontWeight: 'bold', color: temaAtual === 'dark' ? '#ff6b6b' : '#dc2626', marginBottom: 10, textAlign: 'center' }}>
                Dados Essenciais Incompletos
              </Text>

              <Text style={{ fontSize: 13.5, color: temaAtual === 'dark' ? '#cbd5e1' : '#475569', textAlign: 'center', lineHeight: 21, marginBottom: 20 }}>
                {mensagemErroAlerta}
              </Text>

              <AeroBubbleButton
                variant="danger"
                title="Entendido"
                onPress={() => setAlertaErroVisivel(false)}
                theme={t}
                style={{ width: '85%' }}
              />
            </AeroGlassCard>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ESTILOS VISUAIS E CÁPSULAS FRUTIGER AERO LIQUID GLASS
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1.2 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  headerUserText: { fontSize: 13, fontWeight: '600' },
  headerSubtitle: { fontSize: 12, marginTop: 4 },
  menuBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  menuBtnText: { fontSize: 13, fontWeight: 'bold' },
  dayChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22, borderWidth: 1 },
  dayChipText: { fontSize: 13, fontWeight: 'bold' },
  scrollContent: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  authCard: { padding: 24, borderRadius: 28, borderWidth: 1.2 },
  authLogo: { fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 6 },
  authSubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 20 },
  authTabContainer: { flexDirection: 'row', borderRadius: 18, padding: 4, marginBottom: 20 },
  authTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 14 },
  authTabText: { fontSize: 14, fontWeight: 'bold' },
  cardCapsule: { padding: 20, borderRadius: 26, borderWidth: 1.2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1.2, borderRadius: 16, padding: 12, marginBottom: 12 },
  multilineInput: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: 'bold' },
  rowButtons: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  toggleBtn: { flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  toggleBtnText: { fontSize: 13, fontWeight: 'bold' },
  infoText: { fontSize: 12, marginBottom: 12, fontStyle: 'italic' },
  photoContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  photoBox: { width: '31%', height: 92, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  photoBoxText: { fontSize: 11, textAlign: 'center' },
  photoPreview: { width: '100%', height: '100%', borderRadius: 20 },
  primaryButton: { padding: 16, borderRadius: 22, alignItems: 'center', marginTop: 15 },
  primaryButtonText: { fontWeight: 'bold', fontSize: 15 },
  highlightBadge: { padding: 14, borderRadius: 20, marginBottom: 15, alignItems: 'center' },
  highlightText: { fontWeight: 'bold', fontSize: 16 },
  sectionHeader: { fontWeight: 'bold', marginTop: 12, marginBottom: 4 },
  listItem: { fontSize: 14, marginLeft: 6, marginBottom: 2 },
  bodyText: { fontSize: 13, lineHeight: 18 },
  sessionCard: { padding: 16, borderRadius: 22, marginTop: 10, borderWidth: 1.2 },
  sessionTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 12 },
  exerciseCapsule: { padding: 14, borderRadius: 20, marginBottom: 10, borderWidth: 1.2 },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseName: { fontWeight: 'bold', fontSize: 15, flex: 1 },
  replaceBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  replaceBtnText: { fontSize: 12, fontWeight: 'bold' },
  metricPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  metricPillText: { fontSize: 11 },
  exerciseCadence: { fontSize: 11, marginTop: 8, fontStyle: 'italic' },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 20 },
  modalContainer: { padding: 20, borderRadius: 26, borderWidth: 1.2 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  modalSubTitle: { fontSize: 14, marginBottom: 15 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 15 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 16, alignItems: 'center' },
  modalBtnText: { fontWeight: 'bold', fontSize: 14 },
});
