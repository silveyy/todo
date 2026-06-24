import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button, TextInput, theme } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

export function LocalSetupScreen() {
  const { setupLocalProfile, loading, error } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleContinue = async () => {
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      setValidationError('Please enter at least 2 characters.');
      return;
    }
    setValidationError(null);
    await setupLocalProfile(trimmed);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.appName}>Todo</Text>
          <Text style={styles.title}>What's your name?</Text>
          <Text style={styles.subtitle}>
            Your lists are stored on this device. You can add a Supabase account later to sync and
            share with others.
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
            error={validationError ?? undefined}
            label="Your name"
            onChangeText={setDisplayName}
            placeholder="e.g. Alex"
            returnKeyType="done"
            testID="name-input"
            value={displayName}
            onSubmitEditing={handleContinue}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button
            loading={loading}
            onPress={handleContinue}
            style={styles.button}
            testID="continue-button"
          >
            Get Started
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const { colors, spacing, typography } = theme;

const styles = StyleSheet.create({
  appName: {
    color: colors.primary,
    fontSize: typography.fontSizes.xxxl,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.lg,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  flex: {
    flex: 1,
  },
  form: {
    marginTop: spacing.xl,
  },
  header: {
    alignItems: 'center',
  },
  subtitle: {
    color: colors.gray500,
    fontSize: typography.fontSizes.md,
    lineHeight: typography.fontSizes.md * 1.5,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  title: {
    color: colors.gray900,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    textAlign: 'center',
  },
});
