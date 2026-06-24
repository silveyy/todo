import { StyleSheet, Text, useColorScheme, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/components/ui/theme';

type BadgeVariant =
  | 'priority-low'
  | 'priority-medium'
  | 'priority-high'
  | 'role-owner'
  | 'role-editor'
  | 'role-viewer'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
};

export function Badge({ label, variant = 'info' }: BadgeProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.base, containerVariantStyles[variant], isDark && darkContainerOverrides[variant]]}>
      <Text style={[styles.label, textVariantStyles[variant], isDark && darkTextOverrides[variant]]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    lineHeight: Math.round(typography.fontSizes.xs * typography.lineHeights.normal),
  },
});

const containerVariantStyles = StyleSheet.create<Record<BadgeVariant, { backgroundColor: string }>>({
  'priority-high': { backgroundColor: '#FEE2E2' },
  'priority-low': { backgroundColor: '#DCFCE7' },
  'priority-medium': { backgroundColor: '#FEF3C7' },
  error: { backgroundColor: '#FEE2E2' },
  info: { backgroundColor: '#DBEAFE' },
  'role-editor': { backgroundColor: '#DBEAFE' },
  'role-owner': { backgroundColor: '#E0E7FF' },
  'role-viewer': { backgroundColor: colors.gray200 },
  success: { backgroundColor: '#DCFCE7' },
  warning: { backgroundColor: '#FEF3C7' },
});

const textVariantStyles = StyleSheet.create<Record<BadgeVariant, { color: string }>>({
  'priority-high': { color: colors.priorityHigh },
  'priority-low': { color: colors.priorityLow },
  'priority-medium': { color: colors.priorityMedium },
  error: { color: colors.error },
  info: { color: colors.info },
  'role-editor': { color: colors.info },
  'role-owner': { color: colors.primary },
  'role-viewer': { color: colors.gray700 },
  success: { color: colors.success },
  warning: { color: '#92400E' },
});

const darkContainerOverrides = StyleSheet.create<Record<BadgeVariant, { backgroundColor: string }>>({
  'priority-high': { backgroundColor: '#7F1D1D' },
  'priority-low': { backgroundColor: '#14532D' },
  'priority-medium': { backgroundColor: '#78350F' },
  error: { backgroundColor: '#7F1D1D' },
  info: { backgroundColor: '#1E3A8A' },
  'role-editor': { backgroundColor: '#1E3A8A' },
  'role-owner': { backgroundColor: colors.primaryDark },
  'role-viewer': { backgroundColor: colors.darkBorder },
  success: { backgroundColor: '#14532D' },
  warning: { backgroundColor: '#78350F' },
});

const darkTextOverrides = StyleSheet.create<Record<BadgeVariant, { color: string }>>({
  'priority-high': { color: '#FCA5A5' },
  'priority-low': { color: '#86EFAC' },
  'priority-medium': { color: '#FCD34D' },
  error: { color: '#FCA5A5' },
  info: { color: '#93C5FD' },
  'role-editor': { color: '#93C5FD' },
  'role-owner': { color: '#C7D2FE' },
  'role-viewer': { color: colors.gray100 },
  success: { color: '#86EFAC' },
  warning: { color: '#FCD34D' },
});
