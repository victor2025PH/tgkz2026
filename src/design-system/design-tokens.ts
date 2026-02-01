/**
 * TG-Matrix 設計令牌系統
 * Phase C: UI/UX - 組件庫建設
 *
 * 提供統一的設計規範：
 * 1. 顏色系統
 * 2. 排版系統
 * 3. 間距系統
 * 4. 陰影系統
 * 5. 圓角系統
 * 6. 動效系統
 */

// ==================== 顏色系統 ====================

export const colors = {
  // 主色
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',  // 主色
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // 輔色 - 青色
  secondary: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',  // 輔色
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
  },
  
  // 語義色 - 成功
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',  // 成功
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  
  // 語義色 - 警告
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',  // 警告
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  
  // 語義色 - 錯誤
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',  // 錯誤
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  // 語義色 - 信息
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',  // 信息
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  
  // 灰階
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  
  // Slate (深色主題背景)
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
} as const;

// ==================== 排版系統 ====================

export const typography = {
  // 字體家族
  fontFamily: {
    sans: 'Inter, "Noto Sans TC", system-ui, -apple-system, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", Consolas, monospace',
  },
  
  // 字體大小
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
  },
  
  // 字體粗細
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  // 行高
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
  
  // 字母間距
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
  },
} as const;

// ==================== 間距系統 ====================

export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
} as const;

// ==================== 陰影系統 ====================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  
  // 主題陰影
  primary: '0 4px 14px 0 rgba(59, 130, 246, 0.25)',
  success: '0 4px 14px 0 rgba(34, 197, 94, 0.25)',
  error: '0 4px 14px 0 rgba(239, 68, 68, 0.25)',
} as const;

// ==================== 圓角系統 ====================

export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

// ==================== 動效系統 ====================

export const animation = {
  // 時長
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  
  // 緩動函數
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  // 預設動畫
  keyframes: {
    fadeIn: {
      from: { opacity: '0' },
      to: { opacity: '1' },
    },
    fadeOut: {
      from: { opacity: '1' },
      to: { opacity: '0' },
    },
    slideInFromRight: {
      from: { transform: 'translateX(100%)', opacity: '0' },
      to: { transform: 'translateX(0)', opacity: '1' },
    },
    slideInFromLeft: {
      from: { transform: 'translateX(-100%)', opacity: '0' },
      to: { transform: 'translateX(0)', opacity: '1' },
    },
    slideInFromTop: {
      from: { transform: 'translateY(-100%)', opacity: '0' },
      to: { transform: 'translateY(0)', opacity: '1' },
    },
    slideInFromBottom: {
      from: { transform: 'translateY(100%)', opacity: '0' },
      to: { transform: 'translateY(0)', opacity: '1' },
    },
    scaleIn: {
      from: { transform: 'scale(0.95)', opacity: '0' },
      to: { transform: 'scale(1)', opacity: '1' },
    },
    spin: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },
    pulse: {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '0.5' },
    },
    bounce: {
      '0%, 100%': { transform: 'translateY(0)' },
      '50%': { transform: 'translateY(-10px)' },
    },
  },
} as const;

// ==================== 斷點系統 ====================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ==================== Z-Index 系統 ====================

export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// ==================== 組件變體 ====================

export const componentVariants = {
  button: {
    sizes: {
      xs: { height: '24px', padding: '0 8px', fontSize: typography.fontSize.xs },
      sm: { height: '32px', padding: '0 12px', fontSize: typography.fontSize.sm },
      md: { height: '40px', padding: '0 16px', fontSize: typography.fontSize.base },
      lg: { height: '48px', padding: '0 24px', fontSize: typography.fontSize.lg },
      xl: { height: '56px', padding: '0 32px', fontSize: typography.fontSize.xl },
    },
    variants: {
      solid: 'filled background',
      outline: 'bordered with transparent background',
      ghost: 'no border, transparent background',
      link: 'looks like a link',
    },
  },
  
  input: {
    sizes: {
      sm: { height: '32px', fontSize: typography.fontSize.sm },
      md: { height: '40px', fontSize: typography.fontSize.base },
      lg: { height: '48px', fontSize: typography.fontSize.lg },
    },
    states: {
      default: colors.gray[300],
      focus: colors.primary[500],
      error: colors.error[500],
      disabled: colors.gray[200],
    },
  },
  
  card: {
    variants: {
      elevated: { shadow: shadows.md, borderRadius: borderRadius.lg },
      outlined: { shadow: shadows.none, border: `1px solid ${colors.gray[200]}` },
      filled: { shadow: shadows.none, background: colors.gray[100] },
    },
  },
} as const;

// ==================== 主題配置 ====================

export type ThemeMode = 'light' | 'dark' | 'system';

export const themes = {
  light: {
    background: {
      primary: '#ffffff',
      secondary: colors.gray[50],
      tertiary: colors.gray[100],
    },
    text: {
      primary: colors.gray[900],
      secondary: colors.gray[600],
      tertiary: colors.gray[400],
      inverse: '#ffffff',
    },
    border: {
      default: colors.gray[200],
      focus: colors.primary[500],
    },
  },
  
  dark: {
    background: {
      primary: colors.slate[900],
      secondary: colors.slate[800],
      tertiary: colors.slate[700],
    },
    text: {
      primary: colors.gray[50],
      secondary: colors.gray[300],
      tertiary: colors.gray[500],
      inverse: colors.gray[900],
    },
    border: {
      default: colors.slate[700],
      focus: colors.primary[400],
    },
  },
} as const;

// ==================== 導出所有設計令牌 ====================

export const designTokens = {
  colors,
  typography,
  spacing,
  shadows,
  borderRadius,
  animation,
  breakpoints,
  zIndex,
  componentVariants,
  themes,
} as const;

export type DesignTokens = typeof designTokens;
