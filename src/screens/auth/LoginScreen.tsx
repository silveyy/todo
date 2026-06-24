import { useMemo, useState } from 'react';
import {
  Alert,
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

export function LoginScreen() {
  const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
  const insets = useSafeAreaInsets();
  const { signIn, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

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

    if (!email.trim()) {
      setEmailError('Email is required.');
      hasError = true;
    } else if (!emailRegex.test(email.trim())) {
      setEmailError('Enter a valid email address.');
      hasError = true;
    } else {
      setEmailError(undefined);
    }

    if (!password) {
      setPasswordError('Password is required.');
      hasError = true;
    } else {
      setPasswordError(undefined);
    }

    if (hasError) {
      return;
    }

    await signIn(email.trim(), password);
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
          <Text style={styles.logo}>Todo</Text>
          <Text style={styles.subtitle}>Welcome back</Text>
        </View>

        <View style={styles.form}>
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
            label="Password"
            onChangeText={(value) => {
              setPassword(value);
              if (passwordError) {
                setPasswordError(undefined);
              }
            }}
            placeholder="Enter your password"
            required
            returnKeyType="done"
            secureTextEntry
            testID="password-input"
            textContentType="password"
            value={password}
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
              testID="sign-in-button"
            >
              Sign In
            </Button>
          </View>

          <View style={styles.linksContainer}>
            <Text
              onPress={() =>
                Alert.alert('Forgot password', 'Password reset will be added soon.')
              }
              style={styles.linkText}
            >
              Forgot password?
            </Text>
            <Text
              onPress={() => navigation.navigate('Signup')}
              style={styles.linkText}
              testID="signup-link"
            >
              {"Don't have an account? Sign up"}
            </Text>
          </View>
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
    alignItems: 'center',
    marginBottom: theme.spacing.xxxl,
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
  linksContainer: {
    gap: theme.spacing.md,
  },
  logo: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSizes.xxxl,
    fontWeight: theme.typography.fontWeights.bold,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    color: theme.colors.gray500,
    fontSize: theme.typography.fontSizes.md,
    textAlign: 'center',
  },
});
