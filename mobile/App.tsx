import React, { useState } from 'react';
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
import {
  enviarAvaliacaoAnamnese,
  solicitarGeracaoTreino,
  solicitarSubstituicaoExercicio,
} from './src/services/api';
import type { AnamneseFormData, ImagemFoto, AvaliacaoFisica, FichaTreino } from './src/types';

export default function App() {
  // Controle de Fase da Aplicação: 1 (Anamnese/Fotos), 2 (Validação), 3 (Ficha de Treino)
  const [faseAtual, setFaseAtual] = useState<1 | 2 | 3>(1);
  const [carregando, setCarregando] = useState(false);

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
  } | null>(null);
  const [motivoTroca, setMotivoTroca] = useState('');
  const [carregandoTroca, setCarregandoTroca] = useState(false);

  // Lista de Objetivos Disponíveis
  const listaObjetivos = ['Hipertrofia', 'Definição', 'Powerlifting', 'Endurance', 'Calistenia'];

  // Lista de Níveis de Experiência
  const listaNiveis = ['Iniciante', 'Intermediário', 'Avançado'];

  // Função para tirar/selecionar foto
  const selecionarFoto = async (tipo: 'frente' | 'costas' | 'perfil') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5, // Compressão de 50% para otimizar envio no Wi-Fi
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
      setFaseAtual(2); // Avança para a Fase 2 (Validação do Usuário)
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
        resultadoAvaliacao.persistencia?.alunoId,
        resultadoAvaliacao.persistencia?.avaliacaoId
      );
      setResultadoTreino(treino);
      setFaseAtual(3); // Avança para a Fase 3 (Ficha de Treino Prescrita)
    } catch (err: any) {
      Alert.alert('Erro ao Prescrever Treino', err.message || 'Falha ao gerar treino.');
    } finally {
      setCarregando(false);
    }
  };

  // Abrir Modal de Substituição de Exercício
  const handleAbrirModalSubstituicao = (sessaoIndex: number, exercicioIndex: number, dados: any) => {
    setExercicioParaSubstituir({ sessaoIndex, exercicioIndex, dados });
    setMotivoTroca('');
    setModalSubstituicaoVisivel(true);
  };

  // Executar a Substituição via IA (Gemini 3.6 Flash)
  const handleExecutarSubstituicao = async () => {
    if (!exercicioParaSubstituir || !resultadoTreino) return;

    setCarregandoTroca(true);
    try {
      const resposta = await solicitarSubstituicaoExercicio(
        exercicioParaSubstituir.dados,
        objetivo,
        motivoTroca
      );

      // Atualiza o treino presencialmente no estado
      const novoTreino = JSON.parse(JSON.stringify(resultadoTreino)) as FichaTreino;
      novoTreino.treino.sessoes[exercicioParaSubstituir.sessaoIndex].exercicios[
        exercicioParaSubstituir.exercicioIndex
      ] = resposta.exercicio_substituto;

      setResultadoTreino(novoTreino);
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏋️ Personal AI Coach</Text>
        <Text style={styles.headerSubtitle}>
          {faseAtual === 1 && 'Fase 1: Coleta & Anamnese Visual'}
          {faseAtual === 2 && 'Fase 2: Diagnóstico & Validação'}
          {faseAtual === 3 && 'Fase 3: Sua Ficha de Treino Personalizada'}
        </Text>
      </View>

      {/* LOADING OVERLAY */}
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
              <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: John Doe" placeholderTextColor="#64748b" />

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

          {/* FASE 3: FICHA DE TREINO PRESCRITA */}
          {faseAtual === 3 && resultadoTreino && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🏋️ Ficha de Treino Prescrita</Text>
              <Text style={styles.headerSubtitle}>Divisão: {resultadoTreino.treino.divisao_nome} | {resultadoTreino.treino.frequencia_semanal}x por semana</Text>

              {resultadoTreino.treino.sessoes.map((sessao, sIdx) => (
                <View key={sIdx} style={styles.sessionCard}>
                  <Text style={styles.sessionTitle}>{sessao.nome}</Text>

                  {sessao.exercicios.map((ex, eIdx) => (
                    <View key={eIdx} style={styles.exerciseBox}>
                      <View style={styles.exerciseHeader}>
                        <Text style={styles.exerciseName}>{eIdx + 1}. {ex.nome}</Text>
                        <TouchableOpacity
                          style={styles.replaceBtn}
                          onPress={() => handleAbrirModalSubstituicao(sIdx, eIdx, ex)}
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
              ))}

              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#475569' }]} onPress={() => setFaseAtual(1)}>
                <Text style={styles.primaryButtonText}>↺ Fazer Nova Anamnese</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
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
  header: { padding: 20, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc' },
  headerSubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  scrollContent: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#94a3b8', marginTop: 12, fontSize: 14 },
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
  sessionCard: { backgroundColor: '#0f172a', padding: 14, borderRadius: 10, marginTop: 15, borderWidth: 1, borderColor: '#334155' },
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
