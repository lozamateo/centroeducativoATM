// Recuperar contraseña: se envía un código a la bandeja de correos simulada del sistema.
import { useState } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Button, Card, Feedback, Field, Input, Screen, styles } from '../components/ui';
import { api } from '../lib/api';
import { useAction } from '../lib/useData';

export default function Recuperar() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [paso, setPaso] = useState<'email' | 'codigo' | 'listo'>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const accion = useAction();

  return (
    <Screen>
      <Card style={{ gap: 12 }}>
        <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
        {paso === 'email' && (
          <>
            <Text style={styles.muted}>Ingresá tu email y te enviamos un código de 6 números (vence en 30 minutos).</Text>
            <Field label="Email"><Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" /></Field>
            <Button title="Enviar código" icon="mail-outline" loading={accion.busy} disabled={!email} onPress={() => accion.run(async () => {
              const r = await api.recuperarPassword(email.trim());
              setAviso(r.codigo_demo ? `${r.mensaje} (Código de prueba: ${r.codigo_demo})` : `${r.mensaje} En esta versión de prueba el correo es simulado: el código se ve en Pagos → Correos enviados del administrador (web).`);
              setPaso('codigo');
            })} />
          </>
        )}
        {paso === 'codigo' && (
          <>
            {aviso && <Alert tipo="info">{aviso}</Alert>}
            <Field label="Código"><Input value={codigo} onChangeText={setCodigo} keyboardType="number-pad" maxLength={6} /></Field>
            <Field label="Contraseña nueva" hint="Al menos 8 caracteres, con letras y números."><Input value={password} onChangeText={setPassword} secureTextEntry /></Field>
            <Button title="Cambiar contraseña" icon="key-outline" loading={accion.busy} disabled={!codigo || !password} onPress={() => accion.run(async () => {
              await api.restablecerPassword(email.trim(), codigo.trim(), password);
              setPaso('listo');
            })} />
          </>
        )}
        {paso === 'listo' && (
          <>
            <Alert tipo="ok">La contraseña se cambió. Ya podés iniciar sesión.</Alert>
            <Button title="Volver al ingreso" onPress={() => router.back()} />
          </>
        )}
      </Card>
    </Screen>
  );
}
