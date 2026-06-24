import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ListDetailScreen, ListsScreen } from '@/screens/lists';

export type ListsStackParamList = {
  ListsHome: undefined;
  ListDetail: { listId: string };
};

const Stack = createNativeStackNavigator<ListsStackParamList>();

export function ListsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerBackTitleVisible: false }}>
      <Stack.Screen
        component={ListsScreen}
        name="ListsHome"
        options={{ title: 'My Lists' }}
      />
      <Stack.Screen component={ListDetailScreen} name="ListDetail" />
    </Stack.Navigator>
  );
}
