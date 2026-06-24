import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoginScreen, SignupScreen } from '@/screens/auth';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerBackTitleVisible: false }}>
      <Stack.Screen
        component={LoginScreen}
        name="Login"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        component={SignupScreen}
        name="Signup"
        options={{ title: 'Create Account' }}
      />
    </Stack.Navigator>
  );
}
