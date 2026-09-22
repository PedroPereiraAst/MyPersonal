import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  type CameraType,
  type FlashMode,
} from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path,
  Line,
  Circle,
  G,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import {
  Camera,
  SwitchCamera,
  Zap,
  ZapOff,
  Timer,
  RotateCcw,
  Check,
  X,
  Image as ImageIcon,
  Info,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { AERO_THEMES, type AeroThemeType } from '../theme/aeroTheme';
import type { ImagemFoto } from '../types/index';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CameraSilhouetteModalProps {
  visible: boolean;
  initialTipo?: 'frente' | 'costas' | 'perfil';
  onClose: () => void;
  onFotoCapturada: (tipo: 'frente' | 'costas' | 'perfil', foto: ImagemFoto) => void;
  theme?: AeroThemeType;
}

export function CameraSilhouetteModal({
  visible,
  initialTipo = 'frente',
  onClose,
  onFotoCapturada,
  theme = AERO_THEMES.dark,
}: CameraSilhouetteModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // Estados de Controle da Câmera
  const [tipoAtual, setTipoAtual] = useState<'frente' | 'costas' | 'perfil'>(initialTipo);
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [timerDuration, setTimerDuration] = useState<0 | 3 | 5 | 10>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturando, setCapturando] = useState(false);

  // Estado de Foto Capturada para Revisão
  const [fotoRevisao, setFotoRevisao] = useState<{ uri: string; base64: string } | null>(null);
  const [mostrarSilhuetaNaRevisao, setMostrarSilhuetaNaRevisao] = useState(true);
  const [mostrarDicas, setMostrarDicas] = useState(true);

  // Sincroniza o tipo inicial quando o modal abre
  useEffect(() => {
    if (visible) {
      setTipoAtual(initialTipo);
      setFotoRevisao(null);
      setCountdown(null);
    }
  }, [visible, initialTipo]);

  // Contagem regressiva do Timer
  useEffect(() => {
    let timerId: any;
    if (countdown !== null && countdown > 0) {
      timerId = setTimeout(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (countdown === 0) {
      setCountdown(null);
      executarCaptura();
    }
    return () => clearTimeout(timerId);
  }, [countdown]);

  // Iniciar processo de disparo (com ou sem timer)
  const handlePressionarDisparo = () => {
    if (capturando || countdown !== null) return;

    if (timerDuration > 0) {
      setCountdown(timerDuration);
    } else {
      executarCaptura();
    }
  };

  // Cancelar contagem regressiva
  const handleCancelarCountdown = () => {
    setCountdown(null);
  };

  // Capturar foto através do CameraView
  const executarCaptura = async () => {
    if (!cameraRef.current || capturando) return;

    try {
      setCapturando(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
        skipProcessing: false,
      });

      if (photo && photo.uri) {
        setFotoRevisao({
          uri: photo.uri,
          base64: photo.base64 || '',
        });
      }
    } catch (e: any) {
      console.error('Erro ao tirar foto:', e);
      Alert.alert('Erro na Câmera', 'Não foi possível capturar a foto. Tente novamente.');
    } finally {
      setCapturando(false);
    }
  };

  // Confirmar foto revisada e salvar
  const handleConfirmarFoto = () => {
    if (!fotoRevisao) return;

    const novaFoto: ImagemFoto = {
      uri: fotoRevisao.uri,
      mimeType: 'image/jpeg',
      base64Data: fotoRevisao.base64,
      tipo: tipoAtual,
    };

    onFotoCapturada(tipoAtual, novaFoto);
    setFotoRevisao(null);
    onClose();
  };

  // Descartar e tirar novamente
  const handleRepetirFoto = () => {
    setFotoRevisao(null);
  };

  // Alternar Flash
  const handleToggleFlash = () => {
    setFlash((prev) => {
      if (prev === 'off') return 'on';
      if (prev === 'on') return 'auto';
      return 'off';
    });
  };

  // Alternar Timer
  const handleToggleTimer = () => {
    setTimerDuration((prev) => {
      if (prev === 0) return 3;
      if (prev === 3) return 5;
      if (prev === 5) return 10;
      return 0;
    });
  };

  // Alternar Câmera Frontal / Traseira
  const handleToggleFacing = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  // Escolher foto da galeria como alternativa
  const handleEscolherDaGaleria = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        const asset = result.assets[0];
        setFotoRevisao({
          uri: asset.uri,
          base64: asset.base64 || '',
        });
      }
    } catch (e: any) {
      console.warn('Erro ao abrir galeria:', e);
    }
  };

  // Renderização da Silhueta SVG de acordo com a pose
  const renderSilhuetaSvg = () => {
    const corNeon = '#00d2ff';
    const corDestaque = '#00e676';
    const corTranslucida = 'rgba(0, 210, 255, 0.08)';
    const corDestaqueTranslucida = 'rgba(0, 230, 118, 0.12)';

    return (
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid meet">
          <Defs>
            <SvgLinearGradient id="aeroGlow" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#00d2ff" stopOpacity="0.8" />
              <Stop offset="50%" stopColor="#00e676" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#00d2ff" stopOpacity="0.8" />
            </SvgLinearGradient>
          </Defs>

          {/* MOLDURA HUD FRUTIGER AERO NOS 4 CANTOS */}
          <Path d="M 30 75 L 30 45 L 60 45" stroke={corNeon} strokeWidth="2.5" fill="none" opacity="0.8" />
          <Path d="M 340 45 L 370 45 L 370 75" stroke={corNeon} strokeWidth="2.5" fill="none" opacity="0.8" />
          <Path d="M 30 625 L 30 655 L 60 655" stroke={corNeon} strokeWidth="2.5" fill="none" opacity="0.8" />
          <Path d="M 340 655 L 370 655 L 370 625" stroke={corNeon} strokeWidth="2.5" fill="none" opacity="0.8" />

          {/* EIXO CENTRAL VERTICAL DE SIMETRIA */}
          <Line
            x1="200"
            y1="55"
            x2="200"
            y2="645"
            stroke="rgba(0, 210, 255, 0.35)"
            strokeWidth="1.2"
            strokeDasharray="6,6"
          />

          {/* LINHAS GUIAS HORIZONTAIS DE ESCALA PIXEL-TO-CM */}
          {/* 1. TOPO DA CABEÇA (Y = 70) */}
          <Line x1="50" y1="70" x2="350" y2="70" stroke={corNeon} strokeWidth="1.5" strokeDasharray="4,4" />
          <SvgText x="52" y="64" fill={corNeon} fontSize="10" fontWeight="bold" letterSpacing="0.5">
            TOPO DA CABEÇA
          </SvgText>

          {/* 2. LINHA DOS OMBROS (Y = 184) */}
          <Line x1="70" y1="184" x2="330" y2="184" stroke={corNeon} strokeWidth="1.2" strokeDasharray="4,4" />
          <SvgText x="72" y="178" fill={corNeon} fontSize="9.5" fontWeight="600" opacity="0.9">
            LINHA DOS OMBROS
          </SvgText>

          {/* 3. LINHA DA CINTURA (Y = 325 - REGISTRO CHAVE BF) */}
          <Line x1="80" y1="325" x2="320" y2="325" stroke={corDestaque} strokeWidth="1.8" strokeDasharray="5,4" />
          <SvgText x="82" y="318" fill={corDestaque} fontSize="10" fontWeight="bold" letterSpacing="0.4">
            CINTURA (MEDIDA CHAVE BF)
          </SvgText>

          {/* 4. LINHA DO QUADRIL (Y = 390) */}
          <Line x1="80" y1="390" x2="320" y2="390" stroke={corNeon} strokeWidth="1.2" strokeDasharray="4,4" />
          <SvgText x="82" y="384" fill={corNeon} fontSize="9.5" fontWeight="600" opacity="0.9">
            LINHA DO QUADRIL
          </SvgText>

          {/* 5. BASE DOS PÉS (Y = 645) */}
          <Line x1="50" y1="645" x2="350" y2="645" stroke={corNeon} strokeWidth="1.8" strokeDasharray="4,4" />
          <SvgText x="52" y="640" fill={corNeon} fontSize="10" fontWeight="bold" letterSpacing="0.5">
            BASE DOS PÉS (SOLO)
          </SvgText>

          {/* SILHUETAS ANATÔMICAS CONFORME A POSE SELECIONADA */}
          {tipoAtual === 'frente' && (
            <G>
              {/* Cabeça */}
              <Circle
                cx="200"
                cy="108"
                r="34"
                stroke={corNeon}
                strokeWidth="2.2"
                fill={corTranslucida}
              />
              {/* Linha dos olhos */}
              <Line x1="184" y1="106" x2="216" y2="106" stroke={corNeon} strokeWidth="1" strokeDasharray="2,2" />

              {/* Contorno Corporal de Frente */}
              <Path
                d={`
                  M 188 140
                  L 186 168
                  C 170 172, 144 178, 126 186
                  C 118 215, 112 260, 108 315
                  C 104 365, 100 415, 96 450
                  C 96 462, 110 462, 112 450
                  C 118 415, 122 365, 126 315
                  C 132 265, 142 235, 152 225
                  C 156 260, 160 295, 162 325
                  C 160 355, 154 380, 150 415
                  C 146 455, 148 505, 152 535
                  C 150 565, 148 595, 162 638
                  L 154 645
                  L 182 645
                  L 182 638
                  C 176 600, 178 555, 180 535
                  C 182 505, 186 460, 198 420
                  L 202 420
                  C 214 460, 218 505, 220 535
                  C 222 555, 224 600, 218 638
                  L 218 645
                  L 246 645
                  L 238 638
                  C 252 595, 250 565, 248 535
                  C 252 505, 254 455, 250 415
                  C 246 380, 240 355, 238 325
                  C 240 295, 244 260, 248 225
                  C 258 235, 268 265, 274 315
                  C 278 365, 282 415, 288 450
                  C 290 462, 304 462, 304 450
                  C 300 415, 296 365, 292 315
                  C 288 260, 282 215, 274 186
                  C 256 178, 230 172, 214 168
                  L 212 140
                  Z
                `}
                stroke="url(#aeroGlow)"
                strokeWidth="2.2"
                fill={corTranslucida}
              />

              {/* Guia do Peitoral e Abdômen */}
              <Path
                d="M 172 235 C 185 245, 215 245, 228 235"
                stroke={corNeon}
                strokeWidth="1.2"
                fill="none"
                opacity="0.6"
              />
              <Line x1="200" y1="260" x2="200" y2="365" stroke={corNeon} strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
            </G>
          )}

          {tipoAtual === 'perfil' && (
            <G>
              {/* Contorno Corporal de Perfil (Virado para a direita) */}
              <Path
                d={`
                  M 195 72
                  C 172 72, 165 92, 165 110
                  C 165 132, 176 146, 180 156
                  L 176 172
                  C 166 215, 164 260, 172 310
                  C 178 335, 176 360, 162 395
                  C 168 435, 172 475, 174 515
                  C 172 555, 166 590, 174 635
                  L 165 645
                  L 235 645
                  L 232 635
                  C 220 595, 218 555, 218 520
                  C 220 480, 224 445, 222 395
                  C 224 350, 224 325, 222 285
                  C 228 250, 232 215, 215 175
                  L 204 150
                  C 214 145, 218 135, 216 128
                  C 214 122, 220 118, 222 114
                  L 228 108
                  L 216 102
                  C 218 90, 210 76, 195 72
                  Z
                `}
                stroke="url(#aeroGlow)"
                strokeWidth="2.2"
                fill={corTranslucida}
              />

              {/* Braço em perfil (semi-transparente para não tapar o tronco) */}
              <Path
                d={`
                  M 192 185
                  C 190 230, 186 280, 184 330
                  C 182 380, 180 420, 178 445
                  C 182 450, 192 450, 194 445
                  C 196 420, 200 380, 204 330
                  C 206 280, 208 230, 204 185
                  Z
                `}
                stroke={corDestaque}
                strokeWidth="1.5"
                strokeDasharray="3,3"
                fill={corDestaqueTranslucida}
                opacity="0.8"
              />

              {/* Linha da Curvatura Lombar / Abdômen */}
              <Path
                d="M 174 275 C 180 305, 178 335, 168 365"
                stroke={corDestaque}
                strokeWidth="1.8"
                fill="none"
              />
            </G>
          )}

          {tipoAtual === 'costas' && (
            <G>
              {/* Cabeça e Nuca */}
              <Circle
                cx="200"
                cy="108"
                r="34"
                stroke={corNeon}
                strokeWidth="2.2"
                fill={corTranslucida}
              />

              {/* Contorno Corporal de Costas */}
              <Path
                d={`
                  M 188 140
                  L 186 168
                  C 170 172, 144 178, 126 186
                  C 118 215, 112 260, 108 315
                  C 104 365, 100 415, 96 450
                  C 96 462, 110 462, 112 450
                  C 118 415, 122 365, 126 315
                  C 132 265, 142 235, 152 225
                  C 156 260, 160 295, 162 325
                  C 160 355, 154 380, 150 415
                  C 146 455, 148 505, 152 535
                  C 150 565, 148 595, 162 638
                  L 154 645
                  L 182 645
                  L 182 638
                  C 176 600, 178 555, 180 535
                  C 182 505, 186 460, 198 420
                  L 202 420
                  C 214 460, 218 505, 220 535
                  C 222 555, 224 600, 218 638
                  L 218 645
                  L 246 645
                  L 238 638
                  C 252 595, 250 565, 248 535
                  C 252 505, 254 455, 250 415
                  C 246 380, 240 355, 238 325
                  C 240 295, 244 260, 248 225
                  C 258 235, 268 265, 274 315
                  C 278 365, 282 415, 288 450
                  C 290 462, 304 462, 304 450
                  C 300 415, 296 365, 292 315
                  C 288 260, 282 215, 274 186
                  C 256 178, 230 172, 214 168
                  L 212 140
                  Z
                `}
                stroke="url(#aeroGlow)"
                strokeWidth="2.2"
                fill={corTranslucida}
              />

              {/* Marcações de V-Taper (Dorsais e Escápulas) */}
              <Path
                d="M 154 225 C 164 265, 176 305, 185 330"
                stroke={corDestaque}
                strokeWidth="1.8"
                strokeDasharray="4,4"
                fill="none"
              />
              <Path
                d="M 246 225 C 236 265, 224 305, 215 330"
                stroke={corDestaque}
                strokeWidth="1.8"
                strokeDasharray="4,4"
                fill="none"
              />
              <Line x1="200" y1="168" x2="200" y2="390" stroke={corNeon} strokeWidth="1.2" strokeDasharray="3,3" opacity="0.6" />
            </G>
          )}
        </Svg>
      </View>
    );
  };

  // Se o modal não estiver visível, não renderiza
  if (!visible) return null;

  // Tela de Solicitação de Permissão da Câmera
  if (!permission || !permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <SafeAreaView style={[styles.permissionContainer, { backgroundColor: theme.bg }]}>
          <StatusBar barStyle="light-content" />
          <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFillObject} />

          <View style={styles.permissionCard}>
            <LinearGradient
              colors={['rgba(0, 210, 255, 0.25)', 'rgba(0, 230, 118, 0.15)']}
              style={styles.permissionIconCircle}
            >
              <Camera size={44} color="#00d2ff" />
            </LinearGradient>

            <Text style={styles.permissionTitle}>Calibração Visual de Biotipo</Text>
            <Text style={styles.permissionDesc}>
              Para que a IA calcule as proporções biométricas (razão cintura-altura, V-taper e escala pixel-to-cm sem fita métrica), precisamos de acesso à câmera para posicionar a silhueta guia.
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.btnPermissao}
              onPress={requestPermission}
            >
              <LinearGradient
                colors={['#00b4d8', '#0099ff', '#00e676']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.btnPermissaoGradient}
              >
                <Text style={styles.btnPermissaoText}>Permitir Acesso à Câmera</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnCancelarPermissao} onPress={onClose}>
              <Text style={styles.btnCancelarPermissaoText}>Voltar / Cancelar</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* FEED AO VIVO DA CÂMERA OU IMAGEM CAPTURADA */}
        {!fotoRevisao ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing={facing}
            flash={flash}
            animateShutter={false}
            mode="picture"
          />
        ) : (
          <View style={StyleSheet.absoluteFillObject}>
            <Image source={{ uri: fotoRevisao.uri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          </View>
        )}

        {/* OVERLAY DA SILHUETA ANATÔMICA */}
        {(!fotoRevisao || mostrarSilhuetaNaRevisao) && renderSilhuetaSvg()}

        {/* MÁSCARA SUPERIOR COM GRADIENTE & CONTROLES */}
        <SafeAreaView style={styles.topControlsSafeArea}>
          <LinearGradient
            colors={['rgba(4, 13, 26, 0.92)', 'rgba(4, 13, 26, 0.45)', 'transparent']}
            style={styles.topGradient}
          >
            {/* LINHA SUPERIOR: FECHAR, FLASH, TIMER, INVERTER CÂMERA */}
            <View style={styles.topBarRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.glassCircleButton}
                onPress={fotoRevisao ? handleRepetirFoto : onClose}
              >
                <X size={22} color="#ffffff" />
              </TouchableOpacity>

              {/* SELETOR DE POSE (FRENTE / PERFIL / COSTAS) */}
              <View style={styles.poseSelectorContainer}>
                {(['frente', 'perfil', 'costas'] as const).map((pose) => {
                  const ativa = tipoAtual === pose;
                  return (
                    <TouchableOpacity
                      key={pose}
                      activeOpacity={0.75}
                      style={[
                        styles.poseTab,
                        ativa && styles.poseTabAtiva,
                      ]}
                      onPress={() => {
                        if (!fotoRevisao) setTipoAtual(pose);
                      }}
                    >
                      <Text
                        style={[
                          styles.poseTabText,
                          ativa && styles.poseTabTextAtiva,
                        ]}
                      >
                        {pose.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* AÇÕES DA CÂMERA (QUANDO EM MODO DE CAPTURA) */}
              {!fotoRevisao ? (
                <View style={styles.topActionGroup}>
                  {/* Timer */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.glassCircleButton, timerDuration > 0 && styles.activeCircleButton]}
                    onPress={handleToggleTimer}
                  >
                    <Timer size={19} color={timerDuration > 0 ? '#00e676' : '#ffffff'} />
                    {timerDuration > 0 && (
                      <View style={styles.timerBadge}>
                        <Text style={styles.timerBadgeText}>{timerDuration}s</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Flash */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.glassCircleButton, flash !== 'off' && styles.activeCircleButton]}
                    onPress={handleToggleFlash}
                  >
                    {flash === 'off' ? (
                      <ZapOff size={19} color="#ffffff" />
                    ) : (
                      <Zap size={19} color={flash === 'on' ? '#00e676' : '#00d2ff'} />
                    )}
                  </TouchableOpacity>

                  {/* Inverter Câmera */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.glassCircleButton}
                    onPress={handleToggleFacing}
                  >
                    <SwitchCamera size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ) : (
                /* Toggle da Silhueta na Revisão */
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.glassCircleButton, mostrarSilhuetaNaRevisao && styles.activeCircleButton]}
                  onPress={() => setMostrarSilhuetaNaRevisao((prev) => !prev)}
                >
                  {mostrarSilhuetaNaRevisao ? (
                    <Eye size={20} color="#00e676" />
                  ) : (
                    <EyeOff size={20} color="#ffffff" />
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* DICA DE ENQUADRAMENTO */}
            {mostrarDicas && !fotoRevisao && (
              <View style={styles.hintContainer}>
                <Info size={14} color="#00d2ff" style={{ marginRight: 6 }} />
                <Text style={styles.hintText}>
                  Afaste o celular (~2m) até que sua cabeça toque o topo e os pés toquem a base.
                </Text>
                <TouchableOpacity onPress={() => setMostrarDicas(false)} style={{ padding: 2 }}>
                  <X size={12} color="#94c2e6" />
                </TouchableOpacity>
              </View>
            )}
          </LinearGradient>
        </SafeAreaView>

        {/* OVERLAY DE CONTAGEM REGRESSIVA DO TIMER */}
        {countdown !== null && (
          <View style={styles.countdownOverlay}>
            <LinearGradient
              colors={['rgba(0, 210, 255, 0.35)', 'rgba(0, 230, 118, 0.25)']}
              style={styles.countdownBubble}
            >
              <Text style={styles.countdownNumber}>{countdown}</Text>
            </LinearGradient>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.btnCancelarTimer}
              onPress={handleCancelarCountdown}
            >
              <Text style={styles.btnCancelarTimerText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* MÁSCARA INFERIOR COM BOTÃO DISPARADOR OU CONFIRMAÇÃO */}
        <SafeAreaView style={styles.bottomControlsSafeArea}>
          <LinearGradient
            colors={['transparent', 'rgba(4, 13, 26, 0.65)', 'rgba(4, 13, 26, 0.95)']}
            style={styles.bottomGradient}
          >
            {!fotoRevisao ? (
              /* BARRA DE CAPTURA */
              <View style={styles.shutterBar}>
                {/* Botão Galeria */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.secondaryBottomButton}
                  onPress={handleEscolherDaGaleria}
                >
                  <LinearGradient
                    colors={['rgba(8, 28, 52, 0.85)', 'rgba(0, 210, 255, 0.2)']}
                    style={styles.secondaryBottomGradient}
                  >
                    <ImageIcon size={22} color="#00d2ff" />
                  </LinearGradient>
                  <Text style={styles.secondaryBottomLabel}>Galeria</Text>
                </TouchableOpacity>

                {/* BOTÃO PRINCIPAL DE DISPARO (FRUTIGER AERO GLOSS SHUTTER) */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={capturando || countdown !== null}
                  style={styles.shutterOuterRing}
                  onPress={handlePressionarDisparo}
                >
                  <LinearGradient
                    colors={['#00d2ff', '#0099ff', '#00e676']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.shutterInnerRing}
                  >
                    <View style={styles.shutterCore}>
                      {capturando ? (
                        <ActivityIndicator color="#040d1a" size="small" />
                      ) : (
                        <Camera size={30} color="#040d1a" />
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Placeholder para balancear layout */}
                <View style={styles.secondaryBottomButton}>
                  <View style={{ width: 46, height: 46 }} />
                </View>
              </View>
            ) : (
              /* BARRA DE REVISÃO E CONFIRMAÇÃO */
              <View style={styles.reviewBar}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.reviewButtonCancel}
                  onPress={handleRepetirFoto}
                >
                  <RotateCcw size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.reviewButtonCancelText}>Tirar Outra</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.reviewButtonConfirm}
                  onPress={handleConfirmarFoto}
                >
                  <LinearGradient
                    colors={['#00b4d8', '#0099ff', '#00e676']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.reviewButtonConfirmGradient}
                  >
                    <Check size={20} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.reviewButtonConfirmText}>Confirmar Foto</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </LinearGradient>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topControlsSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topGradient: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 12,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  glassCircleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(8, 28, 52, 0.75)',
    borderWidth: 1.2,
    borderColor: 'rgba(0, 210, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCircleButton: {
    borderColor: '#00e676',
    backgroundColor: 'rgba(0, 230, 118, 0.25)',
  },
  timerBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#00e676',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  timerBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#040d1a',
  },
  poseSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(5, 18, 34, 0.75)',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.25)',
  },
  poseTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  poseTabAtiva: {
    backgroundColor: 'rgba(0, 210, 255, 0.3)',
    borderWidth: 1,
    borderColor: '#00e676',
  },
  poseTabText: {
    color: '#94c2e6',
    fontSize: 11,
    fontWeight: '600',
  },
  poseTabTextAtiva: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  topActionGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 28, 52, 0.85)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.3)',
  },
  hintText: {
    flex: 1,
    color: '#d0e6f7',
    fontSize: 11,
    lineHeight: 15,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 13, 26, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  countdownBubble: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#00d2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  countdownNumber: {
    fontSize: 72,
    fontWeight: '900',
    color: '#ffffff',
    textShadowColor: '#00d2ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  btnCancelarTimer: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 77, 77, 0.35)',
    borderWidth: 1,
    borderColor: '#ff4d4d',
  },
  btnCancelarTimerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomControlsSafeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  bottomGradient: {
    paddingTop: 30,
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
    paddingHorizontal: 24,
  },
  shutterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  secondaryBottomButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  secondaryBottomGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(0, 210, 255, 0.4)',
    marginBottom: 4,
  },
  secondaryBottomLabel: {
    fontSize: 11,
    color: '#94c2e6',
    fontWeight: '600',
  },
  shutterOuterRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(0, 210, 255, 0.22)',
    padding: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  shutterInnerRing: {
    flex: 1,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCore: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  reviewButtonCancel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  reviewButtonCancelText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewButtonConfirm: {
    flex: 1.3,
    borderRadius: 24,
    overflow: 'hidden',
  },
  reviewButtonConfirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  reviewButtonConfirmText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionCard: {
    backgroundColor: 'rgba(8, 28, 52, 0.85)',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 210, 255, 0.35)',
    maxWidth: 400,
    width: '100%',
  },
  permissionIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 210, 255, 0.5)',
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 13,
    color: '#94c2e6',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  btnPermissao: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
  },
  btnPermissaoGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPermissaoText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  btnCancelarPermissao: {
    paddingVertical: 8,
  },
  btnCancelarPermissaoText: {
    color: '#5d8ba8',
    fontSize: 13,
  },
});
