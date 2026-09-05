import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AERO_THEMES, type AeroThemeType } from '../theme/aeroTheme';

interface AeroBubbleButtonProps {
  onPress: () => void;
  title?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'check' | 'danger' | 'glass';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  theme?: AeroThemeType;
  icon?: React.ReactNode;
}

/**
 * Botão Estilo Bolha 3D Frutiger Aero (Glossy Bubble Button)
 * Apresenta reflexo especular elíptico na metade superior simulando uma gota ou bolha de vidro líquido.
 */
export function AeroBubbleButton({
  onPress,
  title,
  children,
  variant = 'primary',
  style,
  textStyle,
  disabled = false,
  theme = AERO_THEMES.dark,
  icon,
}: AeroBubbleButtonProps) {
  let colors: readonly [string, string, ...string[]] = theme.bubblePrimaryGradient;
  let textColor = '#ffffff';
  let borderColor = 'rgba(255, 255, 255, 0.55)';

  if (variant === 'secondary' || variant === 'glass') {
    colors = theme.bubbleSecondaryGradient;
    textColor = theme.glassButtonText;
    borderColor = theme.glassButtonBorder;
  } else if (variant === 'check') {
    colors = theme.bubbleCheckGradient;
    textColor = '#ffffff';
    borderColor = 'rgba(255, 255, 255, 0.65)';
  } else if (variant === 'danger') {
    colors = theme.bubbleDangerGradient;
    textColor = '#ffffff';
    borderColor = 'rgba(255, 255, 255, 0.55)';
  }

  const flattenedStyle = (StyleSheet.flatten(style) || {}) as ViewStyle;
  const {
    padding,
    paddingVertical,
    paddingHorizontal,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    borderRadius,
    ...wrapperStyle
  } = flattenedStyle;

  const gradientPadding: ViewStyle = {
    ...(padding !== undefined && { padding }),
    ...(paddingVertical !== undefined && { paddingVertical }),
    ...(paddingHorizontal !== undefined && { paddingHorizontal }),
    ...(paddingTop !== undefined && { paddingTop }),
    ...(paddingBottom !== undefined && { paddingBottom }),
    ...(paddingLeft !== undefined && { paddingLeft }),
    ...(paddingRight !== undefined && { paddingRight }),
  };

  const customRadius = borderRadius !== undefined ? { borderRadius } : null;

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.bubbleWrapper,
        {
          opacity: disabled ? 0.55 : 1,
          borderColor,
        },
        customRadius,
        wrapperStyle,
      ]}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.bubbleGradient, gradientPadding, customRadius]}
      >
        {/* REFLEXO ESPECULAR SUPERIOR DA BOLHA (Liquid Glass Highlight) */}
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.55)', 'rgba(255, 255, 255, 0.08)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.specularSheen}
        />

        {/* CONTEÚDO DO BOTÃO */}
        <View style={styles.bubbleContent}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          {title ? (
            <Text style={[styles.bubbleText, { color: textColor }, textStyle]}>
              {title}
            </Text>
          ) : (
            children
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

interface AeroGlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  theme?: AeroThemeType;
}

/**
 * Card Liquid Glass Frutiger Aero
 * Borda translúcida com brilho especular de topo e profundidade aquática
 */
export function AeroGlassCard({
  children,
  style,
  theme = AERO_THEMES.dark,
}: AeroGlassCardProps) {
  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
          borderTopColor: theme.cardHighlight,
          shadowColor: theme.cardGlow,
        },
        style,
      ]}
    >
      {/* LINHA DE LUZ DE TOPO (Glossy Rim) */}
      <View
        style={[
          styles.cardTopRim,
          {
            backgroundColor: theme.cardHighlight,
          },
        ]}
      />
      {children}
    </View>
  );
}

interface AeroBubbleChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  theme?: AeroThemeType;
  style?: StyleProp<ViewStyle>;
}

/**
 * Chip / Pílula Bolha Interativa Frutiger Aero
 */
export function AeroBubbleChip({
  label,
  active,
  onPress,
  theme = AERO_THEMES.dark,
  style,
}: AeroBubbleChipProps) {
  if (active) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[styles.chipWrapper, style]}
      >
        <LinearGradient
          colors={theme.bubblePrimaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.8 }}
          style={styles.chipGradient}
        >
          {/* Brilho da Bolha no topo */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.60)', 'rgba(255, 255, 255, 0.05)']}
            style={styles.chipSheen}
          />
          <Text style={styles.chipTextActive}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.chipInactive,
        {
          backgroundColor: theme.pillBg,
          borderColor: theme.cardBorder,
        },
        style,
      ]}
    >
      <Text style={[styles.chipTextInactive, { color: theme.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface AeroBadgeProps {
  label: string;
  theme?: AeroThemeType;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Badge Cápsula Líquida com Brilho
 */
export function AeroBadge({
  label,
  theme = AERO_THEMES.dark,
  color,
  style,
}: AeroBadgeProps) {
  const accentColor = color || theme.accentLime;

  return (
    <View
      style={[
        styles.badgeContainer,
        {
          backgroundColor: 'rgba(0, 210, 255, 0.12)',
          borderColor: accentColor,
        },
        style,
      ]}
    >
      <Text style={[styles.badgeText, { color: accentColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleWrapper: {
    borderRadius: 24,
    borderWidth: 1.2,
    overflow: 'hidden',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  bubbleGradient: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  specularSheen: {
    position: 'absolute',
    top: 1,
    left: '8%',
    right: '8%',
    height: '46%',
    borderRadius: 18,
  },
  bubbleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  iconContainer: {
    marginRight: 8,
  },
  bubbleText: {
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardContainer: {
    padding: 20,
    borderRadius: 26,
    borderWidth: 1.2,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 7,
    position: 'relative',
    overflow: 'hidden',
  },
  cardTopRim: {
    position: 'absolute',
    top: 0,
    left: '10%',
    right: '10%',
    height: 1.8,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    opacity: 0.8,
  },
  chipWrapper: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    overflow: 'hidden',
  },
  chipGradient: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  chipSheen: {
    position: 'absolute',
    top: 1,
    left: 4,
    right: 4,
    height: '45%',
    borderRadius: 14,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12.5,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  chipInactive: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipTextInactive: {
    fontWeight: '600',
    fontSize: 12.5,
  },
  badgeContainer: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: 'bold',
    letterSpacing: 0.6,
  },
});
