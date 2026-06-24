import { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import { colors, radii, spacing, typography } from '@/components/ui/theme';

type CheckboxProps = {
  checked: boolean;
  onToggle: () => void;
  label?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
};

export function Checkbox({
  checked,
  onToggle,
  label,
  disabled = false,
  accessibilityLabel,
  testID,
}: CheckboxProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scale = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    Animated.spring(scale, {
      toValue: checked ? 1 : 0,
      friction: 7,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [checked, scale]);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label ?? 'Checkbox'}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={onToggle}
      style={[styles.container, disabled && styles.disabled]}
      testID={testID}
    >
      <View
        style={[
          styles.box,
          isDark && styles.boxDark,
          checked && styles.boxChecked,
          checked && isDark && styles.boxCheckedDark,
        ]}
      >
        {checked ? (
          <Animated.View style={{ transform: [{ scale }] }}>
            <Text style={styles.checkmark}>✓</Text>
          </Animated.View>
        ) : null}
      </View>
      {label ? <Text style={[styles.label, isDark && styles.labelDark]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.gray300,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  boxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  boxCheckedDark: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },
  boxDark: {
    backgroundColor: colors.darkSurface,
    borderColor: colors.darkBorder,
  },
  checkmark: {
    color: colors.white,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    lineHeight: Math.round(typography.fontSizes.sm * typography.lineHeights.tight),
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 44,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: colors.gray800,
    flexShrink: 1,
    fontSize: typography.fontSizes.md,
    lineHeight: Math.round(typography.fontSizes.md * typography.lineHeights.normal),
    marginLeft: spacing.md,
  },
  labelDark: {
    color: colors.gray100,
  },
});
