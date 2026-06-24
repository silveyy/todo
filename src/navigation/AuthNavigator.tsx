import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { IS_SUPABASE_CONFIGURED } from '@/api/supabaseClient';
import { LocalSetupScreen } from '@/screens/auth/LocalSetupScreen';
import { LoginScreen, SignupScreen } from '@/screens/auth';

export type AuthStackParamList =
  | { LocalSetup: undefined }
  | { Login: undefined; Signup: undefined };

// Local-mode: single screen asking for the user's name.
type LocalStackParamList = { LocalSetup: undefined };
const LocalStack = createNativeStackNavigator<LocalStackParamList>();

function LocalAuthNavigator() {
  return (
    <LocalStack.Navigator>
      <LocalStack.Screen
        component={LocalSetupScreen}
        name="LocalSetup"
        options={{ headerShown: false }}
      />
    </LocalStack.Navigator>
  );
}

// Connected mode: standard Login → Signup flow.
type ConnectedStackParamList = { Login: undefined; Signup: undefined };
const ConnectedStack = createNativeStackNavigator<ConnectedStackParamList>();

function ConnectedAuthNavigator() {
  return (
    <ConnectedStack.Navigator screenOptions={{ headerBackTitleVisible: false }}>
      <ConnectedStack.Screen
        component={LoginScreen}
        name="Login"
        options={{ headerShown: false }}
      />
      <ConnectedStack.Screen
        component={SignupScreen}
        name="Signup"
        options={{ title: 'Create Account' }}
      />
    </ConnectedStack.Navigator>
  );
}

export function AuthNavigator() {
  return IS_SUPABASE_CONFIGURED ? <ConnectedAuthNavigator /> : <LocalAuthNavigator />;
}
