import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/auth';
import { headerOptions } from '../lib/navigation';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={headerOptions}>
        <Stack.Screen name="index" options={{ headerShown: false, title: 'Inicio' }} />
        <Stack.Screen name="login" options={{ title: 'Ingresar' }} />
        <Stack.Screen name="preinscripcion" options={{ title: 'Pre-inscripción' }} />
        <Stack.Screen name="contacto" options={{ title: 'Contacto' }} />
        <Stack.Screen name="credencial/[token]" options={{ title: 'Credencial deportiva' }} />
        <Stack.Screen name="panel" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
