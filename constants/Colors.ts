export const Colors = {
  primary: '#14B8A6',
  primaryLight: '#2DD4BF',
  primaryDark: '#0D9488',
  primarySoft: 'rgba(20,184,166,0.1)',
  primaryMedium: 'rgba(20,184,166,0.2)',

  accentBlue: '#3B82F6',
  accentCoral: '#FF6B35',
  accentGreen: '#10B981',
  accentPink: '#FF6B9D',
  accentYellow: '#F59E0B',

  bgPrimary: '#F0FDFA',
  bgSecondary: '#FFFFFF',
  bgTertiary: '#F1F5F9',
  bgCard: '#FFFFFF',
  bgInput: '#F8FAFC',
  bgGlass: 'rgba(20,184,166,0.06)',
  bgGlassLight: 'rgba(20,184,166,0.1)',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',

  borderLight: '#E2E8F0',
  borderMedium: '#CBD5E1',
  borderFocus: '#14B8A6',

  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',

  shadow: 'rgba(0,0,0,0.08)',
  shadowMedium: 'rgba(0,0,0,0.12)',

  gradientPrimary: ['#14B8A6', '#2DD4BF'] as const,
  gradientHero: ['#0D9488', '#14B8A6', '#2DD4BF'] as const,
  gradientWarm: ['#FF6B9D', '#FF6B35'] as const,
  gradientCool: ['#3B82F6', '#06B6D4'] as const,
  gradientOnline: ['#10B981', '#34D399'] as const,
  gradientGlass: ['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.4)'] as const,
  gradientHeader: ['#F0FDFA', '#FFFFFF'] as const,
} as const;
