/**
 * App navigation structure.
 *
 * Stack-based navigation with auth gating:
 * - Sign-in stack (public)
 * - App stack (authenticated): customer chat, provider portal, admin console
 */

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';

import SignInScreen from '../screens/SignInScreen';
import ChatScreen from '../screens/ChatScreen';
import BookingsScreen from '../screens/BookingsScreen';
import ProviderScreen from '../screens/ProviderScreen';
import AdminScreen from '../screens/AdminScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#1f2937',
        tabBarInactiveTintColor: '#6b7280',
        headerShown: false,
      }}
    >
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
      <Tab.Screen name="Bookings" component={BookingsScreen} options={{ title: 'Bookings' }} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignIn" component={SignInScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  const { user } = useAuth();
  const isProviderOrStaff =
    user?.role === 'provider' || user?.role === 'admin' || user?.role === 'support';

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1f2937' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="CustomerTabs"
        component={CustomerTabs}
        options={{ title: 'Everyday AI' }}
      />
      {isProviderOrStaff && (
        <>
          <Stack.Screen
            name="ProviderRequests"
            component={ProviderScreen}
            options={{ title: 'Job Requests' }}
          />
          {user?.role === 'admin' || user?.role === 'support' ? (
            <Stack.Screen
              name="AdminConsole"
              component={AdminScreen}
              options={{ title: 'Admin Console' }}
            />
          ) : null}
        </>
      )}
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return null; // Splash handled by App.tsx
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? <Stack.Screen name="App" component={AppStack} /> : null}
        {!user ? <Stack.Screen name="Auth" component={AuthStack} /> : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
