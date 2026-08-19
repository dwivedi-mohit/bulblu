import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing and using Bulblu ("the App"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.
        </Text>

        <Text style={styles.sectionTitle}>2. Description of Service</Text>
        <Text style={styles.paragraph}>
          Bulblu is a social platform that enables users to connect with others through text messaging, voice rooms, video calls, and companion booking services. The App is designed for users aged 18 and above.
        </Text>

        <Text style={styles.sectionTitle}>3. User Eligibility</Text>
        <Text style={styles.paragraph}>
          You must be at least 18 years of age to use Bulblu. By using the App, you represent and warrant that you meet this age requirement and have the legal capacity to enter into these Terms.
        </Text>

        <Text style={styles.sectionTitle}>4. User Accounts</Text>
        <Text style={styles.paragraph}>
          You are responsible for maintaining the confidentiality of your account credentials. You agree to immediately notify Bulblu of any unauthorized use of your account. Bulblu is not liable for any loss arising from unauthorized use of your account.
        </Text>

        <Text style={styles.sectionTitle}>5. User Conduct</Text>
        <Text style={styles.paragraph}>
          You agree not to use the App to harass, threaten, impersonate, or intimidate other users. You shall not post content that is obscene, defamatory, or violates any law. Bulblu reserves the right to terminate accounts that violate these terms.
        </Text>

        <Text style={styles.sectionTitle}>6. Companion Services</Text>
        <Text style={styles.paragraph}>
          Companion bookings are agreements between you and the companion. Bulblu acts as a platform facilitator and is not a party to any booking agreement. Companions are independent service providers, not employees of Bulblu.
        </Text>

        <Text style={styles.sectionTitle}>7. Payments and Refunds</Text>
        <Text style={styles.paragraph}>
          All payments are processed through our secure payment partners. Refund policies are set by individual companions and may vary. Bulblu does not guarantee refunds for completed sessions.
        </Text>

        <Text style={styles.sectionTitle}>8. Privacy</Text>
        <Text style={styles.paragraph}>
          Your use of the App is also governed by our Privacy Policy, which describes how we collect, use, and protect your personal information. Please review our Privacy Policy carefully.
        </Text>

        <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          Bulblu shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the App. The App is provided "as is" without warranties of any kind.
        </Text>

        <Text style={styles.sectionTitle}>10. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          Bulblu reserves the right to modify these Terms at any time. We will notify users of significant changes through the App or via email. Continued use of the App after changes constitutes acceptance of the new Terms.
        </Text>

        <Text style={styles.sectionTitle}>11. Contact</Text>
        <Text style={styles.paragraph}>
          If you have questions about these Terms, please contact us at support@bulblu.app
        </Text>

        <Text style={styles.lastUpdated}>Last updated: August 2026</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.subheading,
    color: Colors.textPrimary,
  },
  content: {
    padding: Spacing.xl,
    paddingBottom: Spacing['4xl'],
  },
  sectionTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  paragraph: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  lastUpdated: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing['2xl'],
  },
});
