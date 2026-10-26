import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ROLES } from '../../../shared/format';
import type { Rol } from '../../../shared/types';
import { Logo } from '../components/Logo';
import { Alert, Button, Card, Chip, Field, Input, Row, Screen, styles } from '../components/ui';
import { useAuth } from '../lib/auth';

// Usuarios de demostracion creados por supabase/schema.sql (los mismos que en la web).
const demo: { rol: Rol; email: string; password: string }[] = [
  { rol: 'ADMIN', email: 'admin@educar.com', password: 'admin123' },
  { rol: 'TUTOR', email: 'tutor@educar.com', password: 'tutor123' },
  { rol: 'DOCENTE', email: 'docente@educar.com', password: 'docente123' },
  { rol: 'ALUMNO', email: 'alumno@educar.com', password: 'alumno123' },
  { rol: 'ENFERMERIA', email: 'enfermeria@educar.com', password: 'enfermeria123' },
];

export default function Login() {
  const router = useRouter();
  const { usuario, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (usuario) router.replace('/panel');
  }, [usuario, router]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Card style={{ gap: 14 }}>
          <View style={{ alignItems: 'center', marginVertical: 6 }}><Logo height={60} /></View>
          <Text style={{ fontSize: 22, fontWeight: '800', textAlign: 'center' }}>Ingresar al sistema</Text>
          <Text style={[styles.muted, { textAlign: 'center' }]}>Familias, docentes, alumnos y personal del centro.</Text>
          {error && <Alert tipo="error">{error}</Alert>}
          <Field label="Email">
            <Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="username" />
          </Field>
          <Field label="Contraseña">
            <Input value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" textContentType="password" onSubmitEditing={submit} />
          </Field>
          <Button title="Ingresar" icon="log-in-outline" loading={busy} disabled={!email || !password} onPress={submit} />
          <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12, gap: 8 }}>
            <Text style={styles.small}>USUARIOS DE DEMOSTRACIÓN</Text>
            <Row>
              {demo.map((d) => <Chip key={d.rol} label={ROLES[d.rol]} onPress={() => { setEmail(d.email); setPassword(d.password); }} />)}
            </Row>
          </View>
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
