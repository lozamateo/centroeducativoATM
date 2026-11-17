// Cambiar contraseña con la sesión iniciada (todos los roles).
import { useState } from 'react';
import { Button, Card, Feedback, Field, Input, Screen } from '../../components/ui';
import { api } from '../../lib/api';
import { useAction } from '../../lib/useData';

export default function Clave() {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const accion = useAction();
  return (
    <Screen>
      <Card style={{ gap: 12 }}>
        <Feedback message={accion.message} onClose={() => accion.setMessage(null)} />
        <Field label="Contraseña actual"><Input value={actual} onChangeText={setActual} secureTextEntry /></Field>
        <Field label="Contraseña nueva" hint="Al menos 8 caracteres, con letras y números."><Input value={nueva} onChangeText={setNueva} secureTextEntry /></Field>
        <Field label="Repetir contraseña nueva"><Input value={repetir} onChangeText={setRepetir} secureTextEntry /></Field>
        <Button title="Guardar" icon="key-outline" loading={accion.busy} disabled={!actual || !nueva || !repetir} onPress={() => {
          if (nueva !== repetir) return accion.setMessage({ tipo: 'error', texto: 'Las contraseñas nuevas no coinciden.' });
          accion.run(async () => {
            await api.cambiarPassword(actual, nueva);
            setActual(''); setNueva(''); setRepetir('');
          }, 'Contraseña actualizada.');
        }} />
      </Card>
    </Screen>
  );
}
