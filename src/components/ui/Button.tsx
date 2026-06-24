import { useMemo, useRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  type ViewStyle,
} from 'react-native';

import { colors, radii, shadows, spacing, typography } from '@/components/ui/theme';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: ReactNode;
  accessibilityLabel?: string;
  testID?: string;
  style?: ViewStyle;
  leftIcon?: ReactNode;
};

type VariantStyles = {
  container: ViewStyle;
  textColor: string;
  spinnerColor: string;
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onPress,
  children,
  accessibilityLabel,
  testID,
  style,
  leftIcon,
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const opacity = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const variantStyles = useMemo<VariantStyles>(() => {
    switch (variant) {
      case 'secondary':
        return {
          container: {
            backgroundColor: 'transparent',
            borderColor: isDark ? colors.primaryLight : colors.primary,
            borderWidth: 1,
          },
          textColor: isDark ? colors.primaryLight : colors.primary,
          spinnerColor: isDark ? colors.primaryLight : colors.primary,
        };
      case 'destructive':
        return {
          container: {
            backgroundColor: colors.error,
          },
          textColor: colors.white,
          spinnerColor: colors.white,
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 0,
            shadowOpacity: 0,
            elevation: 0,
          },
          textColor: isDark ? colors.primaryLight : colors.primary,
          spinnerColor: isDark ? colors.primaryLight : colors.primary,
        };
      case 'primary':
      default:
        return {
          container: {
            backgroundColor: colors.primary,
          },
          textColor: colors.white,
          spinnerColor: colors.white,
        };
    }
  }, [isDark, variant]);

  const resolvedAccessibilityLabel = useMemo(() => {
    if (accessibilityLabel) {
      return accessibilityLabel;
    }

    if (typeof children === 'string' || typeof children === 'number') {
      return String(children);
    }

    return 'Button';
  }, [accessibilityLabel, children]);

  const animateOpacity = (toValue: number) => {
    Animated.timing(opacity, {
      toValue,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  const content = loading ? (
    <ActivityIndicator color={variantStyles.spinnerColor} testID="button-loading-indicator" />
  ) : (
    <View style={styles.content}>
      {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text style={[styles.label, sizeTextStyles[size], { color: variantStyles.textColor }]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );

  return (
    <Pressable
      accessibilityLabel={resolvedAccessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={() => {
        if (!isDisabled) {
          animateOpacity(0.8);
        }
      }}
      onPressOut={() => {
        if (!isDisabled) {
          animateOpacity(1);
        }
      }}
      style={styles.pressable}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.base,
          sizeStyles[size],
          variantStyles.container,
          isDisabled && styles.disabled,
          { opacity },
          style,
        ]}
      >
        {content}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    ...shadows.sm,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  icon: {
    marginRight: spacing.sm,
  },
  label: {
    fontWeight: typography.fontWeights.semibold,
    textAlign: 'center',
  },
  pressable: {
    alignSelf: 'flex-start',
  },
});

const sizeStyles = StyleSheet.create<Record<ButtonSize, ViewStyle>>({
  sm: {
    minHeight: 36,
    paddingVertical: spacing.sm,
  },
  md: {
    minHeight: 44,
    paddingVertical: spacing.md,
  },
  lg: {
    minHeight: 52,
    paddingVertical: spacing.lg,
  },
});

const sizeTextStyles = StyleSheet.create({
  sm: {
    fontSize: typography.fontSizes.sm,
    lineHeight: Math.round(typography.fontSizes.sm * typography.lineHeights.normal),
  },
  md: {
    fontSize: typography.fontSizes.md,
    lineHeight: Math.round(typography.fontSizes.md * typography.lineHeights.normal),
  },
  lg: {
    fontSize: typography.fontSizes.lg,
    lineHeight: Math.round(typography.fontSizes.lg * typography.lineHeights.normal),
  },
});
