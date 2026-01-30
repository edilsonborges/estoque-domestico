import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/contexts/AuthContext';
import { NetworkProvider } from '../src/contexts/NetworkContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NetworkProvider>
          <StatusBar style="light" />
          <Slot />
        </NetworkProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
