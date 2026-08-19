import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { companionApi } from '../../lib/services';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { BookingSheet } from '../../components/companion/BookingSheet';

const STEPS = ['Activity', 'Date', 'Time', 'Duration'];

const TIME_SLOTS = [
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
  '6:00 PM',
  '7:00 PM',
  '8:00 PM',
];

const DURATION_OPTIONS = [
  { label: '1hr', value: 1 },
  { label: '2hr', value: 2 },
  { label: '4hr', value: 4 },
  { label: '8hr', value: 8 },
];

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getNext7Days() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      label: i === 0 ? 'Today' : DAYS_SHORT[d.getDay()],
      date: d.getDate(),
      month: d.getMonth(),
      full: d,
      display: `${DAYS_SHORT[d.getDay()]} ${d.getDate()}`,
    };
  });
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function BookingScreen() {
  const params = useLocalSearchParams<{
    companionId: string;
    companionName: string;
    hourlyRate: string;
    activities: string;
    selectedDay: string;
  }>();

  const companionName = params.companionName ?? 'Companion';
  const hourlyRate = Number(params.hourlyRate) ?? 40;
  const activities = (params.activities ?? '').split(',').filter(Boolean);

  const [step, setStep] = useState(0);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [booking, setBooking] = useState(false);

  const weekDays = getNext7Days();
  const totalCents = hourlyRate * 100 * (selectedDuration ?? 1);

  const canProceed = () => {
    switch (step) {
      case 0:
        return selectedActivity !== null;
      case 1:
        return selectedDate !== null;
      case 2:
        return selectedTime !== null;
      case 3:
        return selectedDuration !== null;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      setSheetVisible(true);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const handleConfirm = async () => {
    setSheetVisible(false);
    if (!params.companionId || !selectedActivity || selectedDate === null || !selectedTime || !selectedDuration) {
      Alert.alert('Error', 'Missing booking details');
      return;
    }

    setBooking(true);
    try {
      const dateObj = weekDays[selectedDate].full;
      const dateStr = dateObj.toISOString().split('T')[0];

      await companionApi.createBooking({
        companion_id: params.companionId,
        activity: selectedActivity,
        date: dateStr,
        start_time: selectedTime,
        duration_hours: selectedDuration,
        total_cents: totalCents,
      });

      router.replace('/companion/history');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to create booking');
    } finally {
      setBooking(false);
    }
  };

  const renderProgress = () => (
    <View style={styles.progressRow}>
      {STEPS.map((s, i) => (
        <View key={s} style={styles.progressItem}>
          <View
            style={[
              styles.progressDot,
              i <= step && styles.progressDotActive,
            ]}
          >
            <Text
              style={[
                styles.progressDotText,
                i <= step && styles.progressDotTextActive,
              ]}
            >
              {i + 1}
            </Text>
          </View>
          <Text
            style={[
              styles.progressLabel,
              i === step && styles.progressLabelActive,
            ]}
          >
            {s}
          </Text>
          {i < STEPS.length - 1 && (
            <View
              style={[
                styles.progressLine,
                i < step && styles.progressLineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderActivityStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Select Activity</Text>
      <Text style={styles.stepSubtitle}>What would you like to do?</Text>
      <View style={styles.chipGrid}>
        {activities.map((activity) => (
          <Pressable
            key={activity}
            onPress={() => setSelectedActivity(activity)}
            style={[
              styles.chip,
              selectedActivity === activity && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                selectedActivity === activity && styles.chipTextActive,
              ]}
            >
              {activity}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderDateStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Select Date</Text>
      <Text style={styles.stepSubtitle}>Pick a day for your booking</Text>
      <View style={styles.chipGrid}>
        {weekDays.map((day, i) => (
          <Pressable
            key={i}
            onPress={() => setSelectedDate(i)}
            style={[
              styles.chip,
              styles.dateChip,
              selectedDate === i && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipLabel,
                selectedDate === i && styles.chipTextActive,
              ]}
            >
              {day.label}
            </Text>
            <Text
              style={[
                styles.chipDate,
                selectedDate === i && styles.chipTextActive,
              ]}
            >
              {day.date}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderTimeStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Select Time</Text>
      <Text style={styles.stepSubtitle}>Choose a start time</Text>
      <View style={styles.chipGrid}>
        {TIME_SLOTS.map((time) => (
          <Pressable
            key={time}
            onPress={() => setSelectedTime(time)}
            style={[
              styles.chip,
              styles.timeChip,
              selectedTime === time && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                selectedTime === time && styles.chipTextActive,
              ]}
            >
              {time}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderDurationStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Select Duration</Text>
      <Text style={styles.stepSubtitle}>How long will you need?</Text>
      <View style={styles.durationGrid}>
        {DURATION_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => setSelectedDuration(opt.value)}
            style={[
              styles.durationCard,
              selectedDuration === opt.value && styles.durationCardActive,
            ]}
          >
            <Text
              style={[
                styles.durationLabel,
                selectedDuration === opt.value && styles.durationLabelActive,
              ]}
            >
              {opt.label}
            </Text>
            <Text
              style={[
                styles.durationPrice,
                selectedDuration === opt.value && styles.durationPriceActive,
              ]}
            >
              {formatCurrency(hourlyRate * 100 * opt.value)}
            </Text>
          </Pressable>
        ))}
      </View>

      {selectedDuration && (
        <GlassCard style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Rate</Text>
            <Text style={styles.priceValue}>${hourlyRate}/hr × {selectedDuration}hr</Text>
          </View>
          <View style={styles.priceDivider} />
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, styles.totalLabel]}>Total</Text>
            <Text style={[styles.priceValue, styles.totalValue]}>
              {formatCurrency(totalCents)}
            </Text>
          </View>
        </GlassCard>
      )}
    </View>
  );

  const stepContent = [
    renderActivityStep,
    renderDateStep,
    renderTimeStep,
    renderDurationStep,
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <ChevronLeft size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Book {companionName}</Text>
        <View style={styles.backBtn} />
      </View>

      {renderProgress()}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {stepContent[step]()}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          variant="primary"
          onPress={handleNext}
          disabled={!canProceed() || booking}
          loading={booking}
          style={styles.nextBtn}
        >
          {step === 3 ? 'Confirm & Pay' : 'Continue'}
        </Button>
      </View>

      <BookingSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onConfirm={handleConfirm}
        companionName={companionName}
        activity={selectedActivity ?? ''}
        date={selectedDate !== null ? weekDays[selectedDate].display : ''}
        startTime={selectedTime ?? ''}
        durationHours={selectedDuration ?? 1}
        hourlyRate={hourlyRate}
      />
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
    paddingVertical: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgGlassLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.bodyBold,
    fontSize: 17,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.base,
    gap: Spacing.xs,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgGlassLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  progressDotText: {
    ...Typography.tabBar,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  progressDotTextActive: {
    color: '#FFFFFF',
  },
  progressLabel: {
    ...Typography.tabBar,
    color: Colors.textTertiary,
    marginRight: Spacing.xs,
  },
  progressLabelActive: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  progressLine: {
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.bgGlassLight,
    marginHorizontal: Spacing.xs,
  },
  progressLineActive: {
    backgroundColor: Colors.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  stepContent: {
    gap: Spacing.base,
  },
  stepTitle: {
    ...Typography.subheading,
    fontSize: 22,
  },
  stepSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    backgroundColor: Colors.bgGlassLight,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  dateChip: {
    alignItems: 'center',
    minWidth: 64,
  },
  chipLabel: {
    ...Typography.tabBar,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  chipDate: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    fontSize: 18,
  },
  timeChip: {
    minWidth: 100,
    alignItems: 'center',
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  durationCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.bgGlassLight,
    padding: Spacing.base,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  durationCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  durationLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    fontSize: 18,
  },
  durationLabelActive: {
    color: '#FFFFFF',
  },
  durationPrice: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  durationPriceActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  priceCard: {
    marginTop: Spacing.base,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  priceLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  priceValue: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
  },
  priceDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  totalLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  totalValue: {
    ...Typography.subheading,
    fontSize: 18,
    color: Colors.primaryLight,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.base,
    backgroundColor: 'rgba(10,10,26,0.9)',
  },
  nextBtn: {
    width: '100%',
  },
});
