import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';

import type { ListsStackParamList } from '@/navigation/ListsStackNavigator';
import { ListsStackNavigator } from '@/navigation/ListsStackNavigator';
import { SettingsScreen } from '@/screens/settings';

export type AppTabParamList = {
  Lists: NavigatorScreenParams<ListsStackParamList> | undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      <Tab.Screen
        component={ListsStackNavigator}
        name="Lists"
        options={{ headerShown: false, tabBarButtonTestID: 'tab-lists' }}
      />
      <Tab.Screen
        component={SettingsScreen}
        name="Settings"
        options={{ tabBarButtonTestID: 'tab-settings' }}
      />
    </Tab.Navigator>
  );
}
