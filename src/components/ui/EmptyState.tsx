import { type ReactNode } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/components/ui/theme';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
};

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.title, isDark && styles.titleDark]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>{subtitle}</Text> : null}
      {action ? (
        <View style={styles.action}>
          <Button accessibilityLabel={action.label} onPress={action.onPress} variant="primary">
            {action.label}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    marginTop: spacing.xl,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  icon: {
    marginBottom: spacing.lg,
  },
  subtitle: {
    color: colors.gray500,
    fontSize: typography.fontSizes.md,
    lineHeight: Math.round(typography.fontSizes.md * typography.lineHeights.normal),
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  subtitleDark: {
    color: colors.gray400,
  },
  title: {
    color: colors.gray900,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    lineHeight: Math.round(typography.fontSizes.lg * typography.lineHeights.normal),
    textAlign: 'center',
  },
  titleDark: {
    color: colors.gray50,
  },
});
