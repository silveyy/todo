import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

import { Button, TextInput, theme } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';

const emailRegex = /^\S+@\S+\.\S+$/;

export function SignupScreen() {
  const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
  const insets = useSafeAreaInsets();
  const { signUp, loading, error } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayNameError, setDisplayNameError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | undefined>();

  const contentContainerStyle = useMemo(
    () => [
      styles.contentContainer,
      {
        paddingBottom: insets.bottom + theme.spacing.xxl,
        paddingTop: insets.top + theme.spacing.xl,
      },
    ],
    [insets.bottom, insets.top],
  );

  const handleSubmit = async () => {
    let hasError = false;

    if (displayName.trim().length < 2) {
      setDisplayNameError('Display name must be at least 2 characters.');
      hasError = true;
    } else {
      setDisplayNameError(undefined);
    }

    if (!email.trim()) {
      setEmailError('Email is required.');
      hasError = true;
    } else if (!emailRegex.test(email.trim())) {
      setEmailError('Enter a valid email address.');
      hasError = true;
    } else {
      setEmailError(undefined);
    }

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      hasError = true;
    } else {
      setPasswordError(undefined);
    }

    if (confirmPassword !== password) {
      setConfirmPasswordError('Passwords do not match.');
      hasError = true;
    } else {
      setConfirmPasswordError(undefined);
    }

    if (hasError) {
      return;
    }

    await signUp(email.trim(), password, displayName.trim());
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardAvoidingView}
    >
      <ScrollView
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Create your profile to start collaborating.</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            accessibilityLabel="Display Name"
            autoCapitalize="words"
            error={displayNameError}
            label="Display Name"
            onChangeText={(value) => {
              setDisplayName(value);
              if (displayNameError) {
                setDisplayNameError(undefined);
              }
            }}
            placeholder="Your name"
            required
            returnKeyType="next"
            testID="name-input"
            textContentType="name"
            value={displayName}
          />
          <TextInput
            accessibilityLabel="Email"
            autoCapitalize="none"
            autoCorrect={false}
            error={emailError}
            keyboardType="email-address"
            label="Email"
            onChangeText={(value) => {
              setEmail(value);
              if (emailError) {
                setEmailError(undefined);
              }
            }}
            placeholder="you@example.com"
            required
            returnKeyType="next"
            testID="email-input"
            textContentType="emailAddress"
            value={email}
          />
          <TextInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoCorrect={false}
            error={passwordError}
            hint="Use at least 8 characters."
            label="Password"
            onChangeText={(value) => {
              setPassword(value);
              if (passwordError) {
                setPasswordError(undefined);
              }
            }}
            placeholder="Create a password"
            required
            returnKeyType="next"
            secureTextEntry
            testID="password-input"
            textContentType="newPassword"
            value={password}
          />
          <TextInput
            accessibilityLabel="Confirm Password"
            autoCapitalize="none"
            autoCorrect={false}
            error={confirmPasswordError}
            label="Confirm Password"
            onChangeText={(value) => {
              setConfirmPassword(value);
              if (confirmPasswordError) {
                setConfirmPasswordError(undefined);
              }
            }}
            placeholder="Confirm your password"
            required
            returnKeyType="done"
            secureTextEntry
            testID="confirm-password-input"
            textContentType="password"
            value={confirmPassword}
          />

          {error ? (
            <Text style={styles.authError} testID="error-message">
              {error}
            </Text>
          ) : null}

          <View style={styles.buttonContainer}>
            <Button
              loading={loading}
              onPress={() => void handleSubmit()}
              style={styles.button}
              testID="create-account-button"
            >
              Create Account
            </Button>
          </View>

          <Text onPress={() => navigation.goBack()} style={styles.linkText} testID="signin-link">
            Already have an account? Sign in
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  authError: {
    color: theme.colors.error,
    fontSize: theme.typography.fontSizes.sm,
    lineHeight: Math.round(
      theme.typography.fontSizes.sm * theme.typography.lineHeights.normal,
    ),
    textAlign: 'center',
  },
  button: {
    width: '100%',
  },
  buttonContainer: {
    width: '100%',
  },
  contentContainer: {
    backgroundColor: theme.colors.white,
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  form: {
    gap: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.xxl,
  },
  keyboardAvoidingView: {
    backgroundColor: theme.colors.white,
    flex: 1,
  },
  linkText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
    textAlign: 'center',
  },
  subtitle: {
    color: theme.colors.gray500,
    fontSize: theme.typography.fontSizes.md,
  },
  title: {
    color: theme.colors.gray900,
    fontSize: theme.typography.fontSizes.xxl,
    fontWeight: theme.typography.fontWeights.bold,
    marginBottom: theme.spacing.sm,
  },
});
