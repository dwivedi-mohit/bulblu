import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface PasswordUnlockModalProps {
  visible: boolean;
  onClose: () => void;
  roomTitle: string;
  expectedPin?: string;
  onUnlockSuccess: () => void;
  onVerifyPin?: (pin: string) => Promise<boolean>;
}

export function PasswordUnlockModal({
  visible,
  onClose,
  roomTitle,
  onUnlockSuccess,
  onVerifyPin,
}: PasswordUnlockModalProps) {
  const [enteredPin, setEnteredPin] = useState('');
  const [verifying, setVerifying] = useState(false);

  if (!visible) return null;

  const handleVerify = async () => {
    if (onVerifyPin) {
      setVerifying(true);
      try {
        const valid = await onVerifyPin(enteredPin);
        if (valid) {
          setEnteredPin('');
          onUnlockSuccess();
        } else {
          Alert.alert('Incorrect PIN', 'The password you entered is incorrect.');
          setEnteredPin('');
        }
      } catch {
        Alert.alert('Error', 'Failed to verify PIN.');
      } finally {
        setVerifying(false);
      }
    } else {
      setEnteredPin('');
      onUnlockSuccess();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.backdrop}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={32} color="#D97706" />
          </View>
          <Text style={styles.title}>Private Voice Lounge</Text>
          <Text style={styles.roomName}>{roomTitle}</Text>
          <Text style={styles.subtitle}>Enter the room password to join this party.</Text>
          <View style={styles.inputBox}>
            <TextInput
              value={enteredPin}
              onChangeText={setEnteredPin}
              keyboardType="numeric"
              maxLength={8}
              secureTextEntry
              placeholder="••••"
              placeholderTextColor="#94A3B8"
              style={styles.pinInput}
              autoFocus
            />
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleVerify}
              disabled={enteredPin.length < 4 || verifying}
              style={[styles.unlockBtn, (enteredPin.length < 4 || verifying) && { opacity: 0.5 }]}
            >
              <LinearGradient colors={['#0F766E', '#14B8A6']} style={styles.unlockGradient}>
                {verifying ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.unlockBtnText}>Unlock & Join</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 24,
  },
  card: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1,
    borderColor: '#CCFBF1', padding: 24, alignItems: 'center',
    shadowColor: '#0F766E', shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF3C7',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  title: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 20, color: '#0F172A', marginBottom: 4 },
  roomName: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 15, color: '#0F766E', marginBottom: 8 },
  subtitle: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  inputBox: {
    width: '100%', backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1.5,
    borderColor: '#0F766E', height: 54, justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  pinInput: { width: '100%', textAlign: 'center', fontFamily: 'SpaceGrotesk-Bold', fontSize: 24, color: '#0F172A', letterSpacing: 10 },
  buttonRow: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelBtnText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 14, color: '#64748B' },
  unlockBtn: { flex: 1.5, borderRadius: 14, overflow: 'hidden' },
  unlockGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  unlockBtnText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 14, color: '#FFFFFF' },
});
