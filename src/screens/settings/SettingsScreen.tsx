import { StyleSheet, Text, View } from 'react-native';

import { Button, theme } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

export function SettingsScreen() {
  const { signOut, loading } = useAuth();

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Manage your account session.</Text>
      <View style={styles.buttonContainer}>
        <Button
          loading={loading}
          onPress={() => void signOut()}
          style={styles.button}
          testID="sign-out-button"
        >
          Sign Out
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
  },
  buttonContainer: {
    width: '100%',
  },
  screen: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  subtitle: {
    color: theme.colors.gray500,
    fontSize: theme.typography.fontSizes.md,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  title: {
    color: theme.colors.gray900,
    fontSize: theme.typography.fontSizes.xxl,
    fontWeight: theme.typography.fontWeights.bold,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
});
