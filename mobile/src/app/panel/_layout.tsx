// Zona privada: solo usuarios con sesion iniciada (la API valida ademas el rol en cada pedido).
import { Pressable } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Loading } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { headerOptions } from '../../lib/navigation';

export default function PanelLayout() {
  const { usuario, cargando, logout } = useAuth();
  if (cargando) return <Loading texto="Verificando sesión..." />;
  if (!usuario) return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        ...headerOptions,
        headerRight: () => (
          <Pressable onPress={logout} hitSlop={12} accessibilityLabel="Cerrar sesión">
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Mi panel' }} />
      <Stack.Screen name="hijo/[id]" options={{ title: 'Alumno' }} />
      <Stack.Screen name="ficha/[id]" options={{ title: 'Ficha médica' }} />
      <Stack.Screen name="alumno/[id]" options={{ title: 'Alumno' }} />
      <Stack.Screen name="alumnos" options={{ title: 'Alumnos' }} />
      <Stack.Screen name="tutores" options={{ title: 'Familias' }} />
      <Stack.Screen name="docentes" options={{ title: 'Docentes' }} />
      <Stack.Screen name="cursos" options={{ title: 'Cursos y materias' }} />
      <Stack.Screen name="deportes" options={{ title: 'Deportes' }} />
      <Stack.Screen name="inscripciones" options={{ title: 'Inscripciones' }} />
      <Stack.Screen name="reportes" options={{ title: 'Reportes' }} />
      <Stack.Screen name="salud" options={{ title: 'Aptos físicos' }} />
      <Stack.Screen name="usuarios" options={{ title: 'Usuarios' }} />
      <Stack.Screen name="contenido" options={{ title: 'Sitio web' }} />
      <Stack.Screen name="auditoria" options={{ title: 'Auditoría' }} />
    </Stack>
  );
}
