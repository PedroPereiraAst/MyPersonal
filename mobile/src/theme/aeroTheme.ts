// SISTEMA DE DESIGN FRUTIGER AERO • TOKENS VISUAIS & LIQUID GLASS
// Inspirado na estética anos 2000/2010: Otimismo tecnológico, água, vitalidade, brilho especular e bolhas 3D

export const AERO_THEMES = {
  dark: {
    name: 'Aero Oceanic Abyss',
    // Fundos e Superfícies
    bgGradient: ['#040d1a', '#081d33', '#0a2a4a'] as const,
    bg: '#061324',
    card: 'rgba(8, 28, 52, 0.72)',
    cardBorder: 'rgba(0, 210, 255, 0.30)',
    cardHighlight: 'rgba(255, 255, 255, 0.38)',
    cardGlow: 'rgba(0, 210, 255, 0.18)',

    // Textos
    textPrimary: '#ffffff',
    textSecondary: '#94c2e6',
    textMuted: '#5d8ba8',

    // Campos de Entrada (Inputs com aspecto de vidro)
    inputBg: 'rgba(5, 18, 34, 0.80)',
    inputBorder: 'rgba(0, 210, 255, 0.28)',
    inputFocusBorder: '#00d2ff',

    // Cores de Ação & Vitalidade (Azul Aqua & Verde Lima)
    accentAqua: '#00d2ff',
    accentAzure: '#0091ff',
    accentLime: '#00e676',
    accentGreen: '#00e676',
    accentGreenDark: '#00c853',
    accentEmerald: '#10b981',
    accentCyan: '#06b6d4',

    // Gradientes dos Botões Bolha (Bubble Buttons)
    bubblePrimaryGradient: ['#00b4d8', '#0099ff', '#00e676'] as const,
    bubbleSecondaryGradient: ['rgba(0, 210, 255, 0.25)', 'rgba(0, 230, 118, 0.18)'] as const,
    bubbleCheckGradient: ['#00e676', '#00c853'] as const,
    bubbleDangerGradient: ['#ff4d4d', '#dc2626'] as const,

    // Botões e Pílulas
    glassButtonBg: 'rgba(0, 210, 255, 0.18)',
    glassButtonBorder: 'rgba(0, 210, 255, 0.45)',
    glassButtonText: '#00e676',

    pillBg: 'rgba(8, 28, 52, 0.75)',
    pillActiveBg: 'rgba(0, 210, 255, 0.28)',
    pillActiveBorder: '#00e676',
    pillActiveText: '#ffffff',

    // Modais & Drawer
    modalBg: '#09213d',
    overlayBg: 'rgba(3, 10, 20, 0.85)',
    headerBg: 'rgba(6, 22, 42, 0.88)',
    drawerBg: '#07182c',
    statusBar: 'light-content' as const,
  },

  light: {
    name: 'Aero Daylight Sky & Water',
    // Fundos e Superfícies
    bgGradient: ['#eef7ff', '#d9efff', '#c2e4ff'] as const,
    bg: '#eaf4fd',
    card: 'rgba(255, 255, 255, 0.80)',
    cardBorder: 'rgba(0, 145, 255, 0.25)',
    cardHighlight: 'rgba(255, 255, 255, 0.95)',
    cardGlow: 'rgba(0, 145, 255, 0.12)',

    // Textos
    textPrimary: '#08213b',
    textSecondary: '#3b6790',
    textMuted: '#6f93b5',

    // Campos de Entrada (Inputs com aspecto de vidro)
    inputBg: 'rgba(255, 255, 255, 0.90)',
    inputBorder: 'rgba(0, 145, 255, 0.35)',
    inputFocusBorder: '#0091ff',

    // Cores de Ação & Vitalidade (Azul Aqua & Verde Lima)
    accentAqua: '#0091ff',
    accentAzure: '#0284c7',
    accentLime: '#00c853',
    accentGreen: '#00c853',
    accentGreenDark: '#00a843',
    accentEmerald: '#059669',
    accentCyan: '#0891b2',

    // Gradientes dos Botões Bolha (Bubble Buttons)
    bubblePrimaryGradient: ['#0091ff', '#00b4d8', '#00c853'] as const,
    bubbleSecondaryGradient: ['rgba(0, 145, 255, 0.15)', 'rgba(0, 200, 83, 0.15)'] as const,
    bubbleCheckGradient: ['#00c853', '#00a843'] as const,
    bubbleDangerGradient: ['#ef4444', '#b91c1c'] as const,

    // Botões e Pílulas
    glassButtonBg: 'rgba(0, 145, 255, 0.14)',
    glassButtonBorder: 'rgba(0, 145, 255, 0.45)',
    glassButtonText: '#00a843',

    pillBg: 'rgba(225, 240, 255, 0.85)',
    pillActiveBg: '#0091ff',
    pillActiveBorder: '#00c853',
    pillActiveText: '#ffffff',

    // Modais & Drawer
    modalBg: '#ffffff',
    overlayBg: 'rgba(8, 33, 59, 0.65)',
    headerBg: 'rgba(255, 255, 255, 0.92)',
    drawerBg: '#f2f8ff',
    statusBar: 'dark-content' as const,
  },
};

export type AeroThemeType = typeof AERO_THEMES.dark | typeof AERO_THEMES.light;
