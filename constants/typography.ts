import { TextStyle } from 'react-native';
import { Colors } from './colors';

export const Typography = {
  heading: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.02,
    color: Colors.textPrimary,
  } as TextStyle,

  subheading: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.01,
    color: Colors.textPrimary,
  } as TextStyle,

  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
  } as TextStyle,

  bodyMedium: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
  } as TextStyle,

  bodyBold: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
  } as TextStyle,

  caption: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  } as TextStyle,

  button: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.02,
  } as TextStyle,

  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.03,
    color: Colors.textSecondary,
  } as TextStyle,

  tabBar: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    lineHeight: 14,
  } as TextStyle,
} as const;
