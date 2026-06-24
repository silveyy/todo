import { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  useColorScheme,
  View,
  type TextInputProps as RNTextInputProps,
} from 'react-native';

import { colors, radii, spacing, typography } from '@/components/ui/theme';

type TextInputProps = RNTextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
};

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(
  {
    label,
    error,
    hint,
    required = false,
    accessibilityLabel,
    accessibilityHint,
    onBlur,
    onFocus,
    style,
    placeholderTextColor,
    ...props
  },
  ref,
) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, isDark && styles.labelDark]}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}
      <RNTextInput
        ref={ref}
        accessibilityHint={error ?? hint ?? accessibilityHint}
        accessibilityLabel={accessibilityLabel ?? label}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        placeholderTextColor={
          placeholderTextColor ?? (isDark ? colors.gray400 : colors.gray500)
        }
        style={[
          styles.input,
          isDark && styles.inputDark,
          isFocused && styles.inputFocused,
          Boolean(error) && styles.inputError,
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hintText, isDark && styles.hintTextDark]}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    lineHeight: Math.round(typography.fontSizes.sm * typography.lineHeights.normal),
    marginTop: spacing.xs,
  },
  hintText: {
    color: colors.gray500,
    fontSize: typography.fontSizes.sm,
    lineHeight: Math.round(typography.fontSizes.sm * typography.lineHeights.normal),
    marginTop: spacing.xs,
  },
  hintTextDark: {
    color: colors.gray400,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.gray300,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.gray900,
    fontSize: typography.fontSizes.md,
    lineHeight: Math.round(typography.fontSizes.md * typography.lineHeights.normal),
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  inputDark: {
    backgroundColor: colors.darkSurface,
    borderColor: colors.darkBorder,
    color: colors.gray50,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  label: {
    color: colors.gray700,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    lineHeight: Math.round(typography.fontSizes.sm * typography.lineHeights.normal),
    marginBottom: spacing.sm,
  },
  labelDark: {
    color: colors.gray200,
  },
  required: {
    color: colors.error,
  },
});
