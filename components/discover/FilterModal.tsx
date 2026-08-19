import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { Button } from '../ui/Button';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

interface FilterState {
  distanceMin: number;
  distanceMax: number;
  ageMin: number;
  ageMax: number;
  genders: string[];
  lookingFor: string[];
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters?: FilterState;
}

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary'];
const LOOKING_FOR_OPTIONS = ['Dating', 'Friends', 'Activity'];

export function FilterModal({
  visible,
  onClose,
  onApply,
  initialFilters,
}: FilterModalProps) {
  const [filters, setFilters] = useState<FilterState>(
    initialFilters ?? {
      distanceMin: 1,
      distanceMax: 50,
      ageMin: 18,
      ageMax: 35,
      genders: [],
      lookingFor: [],
    }
  );

  const translateY = useSharedValue(SHEET_HEIGHT);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    } else {
      translateY.value = withSpring(SHEET_HEIGHT, { damping: 20, stiffness: 200 });
    }
  }, [visible, translateY]);

  const handleClose = useCallback(() => {
    translateY.value = withSpring(SHEET_HEIGHT, { damping: 20, stiffness: 200 });
    runOnJS(onClose)();
  }, [onClose, translateY]);

  const handleApply = useCallback(() => {
    onApply(filters);
    handleClose();
  }, [filters, onApply, handleClose]);

  const handleReset = useCallback(() => {
    setFilters({
      distanceMin: 1,
      distanceMax: 50,
      ageMin: 18,
      ageMax: 35,
      genders: [],
      lookingFor: [],
    });
  }, []);

  const toggleGender = (gender: string) => {
    setFilters((prev) => ({
      ...prev,
      genders: prev.genders.includes(gender)
        ? prev.genders.filter((g) => g !== gender)
        : [...prev.genders, gender],
    }));
  };

  const toggleLookingFor = (option: string) => {
    setFilters((prev) => ({
      ...prev,
      lookingFor: prev.lookingFor.includes(option)
        ? prev.lookingFor.filter((o) => o !== option)
        : [...prev.lookingFor, option],
    }));
  };

  const backdropGesture = Gesture.Tap().onEnd(() => {
    runOnJS(handleClose)();
  });

  return (
    <Modal transparent visible={visible} onRequestClose={handleClose}>
      <GestureDetector gesture={backdropGesture}>
        <View style={styles.backdrop} />
      </GestureDetector>

      <Animated.View style={[styles.sheet, animatedStyle]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>Filters</Text>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <X size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>
            Distance: {filters.distanceMin}–{filters.distanceMax} km
          </Text>
          <View style={styles.sliderRow}>
            {[1, 5, 10, 25, 50, 100].map((val) => (
              <Pressable
                key={val}
                style={[
                  styles.chip,
                  filters.distanceMax === val && styles.chipActive,
                ]}
                onPress={() =>
                  setFilters((prev) => ({ ...prev, distanceMax: val }))
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    filters.distanceMax === val && styles.chipTextActive,
                  ]}
                >
                  {val} km
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>
            Age: {filters.ageMin}–{filters.ageMax}
          </Text>
          <View style={styles.sliderRow}>
            {[18, 21, 25, 30, 35, 45, 55].map((val) => (
              <Pressable
                key={val}
                style={[
                  styles.chip,
                  filters.ageMax === val && styles.chipActive,
                ]}
                onPress={() =>
                  setFilters((prev) => ({ ...prev, ageMax: val }))
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    filters.ageMax === val && styles.chipTextActive,
                  ]}
                >
                  {val}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Gender</Text>
          <View style={styles.chipGroup}>
            {GENDER_OPTIONS.map((gender) => (
              <Pressable
                key={gender}
                style={[
                  styles.chip,
                  filters.genders.includes(gender) && styles.chipActive,
                ]}
                onPress={() => toggleGender(gender)}
              >
                <Text
                  style={[
                    styles.chipText,
                    filters.genders.includes(gender) && styles.chipTextActive,
                  ]}
                >
                  {gender}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Looking for</Text>
          <View style={styles.chipGroup}>
            {LOOKING_FOR_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.chip,
                  filters.lookingFor.includes(option) && styles.chipActive,
                ]}
                onPress={() => toggleLookingFor(option)}
              >
                <Text
                  style={[
                    styles.chipText,
                    filters.lookingFor.includes(option) && styles.chipTextActive,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button variant="ghost" size="md" onPress={handleReset}>
            Reset
          </Button>
          <Button variant="primary" size="md" onPress={handleApply}>
            Apply Filters
          </Button>
        </View>
      </Animated.View>
    </Modal>
  );
}

export type { FilterState };

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: Colors.bgSecondary,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    paddingBottom: Spacing.xl,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.bgGlassLight,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
  },
  closeBtn: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.base,
  },
  sectionLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sliderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgGlass,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    ...Typography.bodyMedium,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    gap: Spacing.md,
  },
});
