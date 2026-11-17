// Recuperar contraseña (sin sesión) y cambiar contraseña (con sesión).
// El código de recuperación llega a la bandeja de correos simulada del sistema (trabajo práctico).
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import { useAction } from '../lib/useData';
import { Alert, Button, Field, Input, Modal } from './ui';

const REGLA = 'Al menos 8 caracteres, con letras y números.';

export function RecuperarPasswordModal({ onClose, emailInicial = '' }: { onClose: () => void; emailInicial?: string }) {
  const [paso, setPaso] = useState<'email' | 'codigo' | 'listo'>('email');
  const [email, setEmail] = useState(emailInicial);
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const { busy, message, setMessage, run } = useAction();

  const pedir = async (event: FormEvent) => {
    event.preventDefault();
    await run(async () => {
      const r = await api.recuperarPassword(email.trim());
      setAviso(r.codigo_demo ? `${r.mensaje} (Código de prueba: ${r.codigo_demo})` : `${r.mensaje} En esta versión de prueba el correo es simulado: el código se ve en Pagos → Correos enviados del administrador.`);
      setPaso('codigo');
    });
  };

  const restablecer = async (event: FormEvent) => {
    event.preventDefault();
    if (await run(() => api.restablecerPassword(email.trim(), codigo.trim(), password))) setPaso('listo');
  };

  return (
    <Modal title="Recuperar contraseña" onClose={onClose}>
      {message && <Alert tipo={message.tipo} onClose={() => setMessage(null)}>{message.texto}</Alert>}
      {paso === 'email' && (
        <form className="stack" onSubmit={pedir}>
          <p className="muted">Ingresá tu email y te enviamos un código de 6 números (vence en 30 minutos).</p>
          <Field label="Email"><Input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Button type="submit" loading={busy}>Enviar código</Button>
        </form>
      )}
      {paso === 'codigo' && (
        <form className="stack" onSubmit={restablecer}>
          {aviso && <Alert tipo="info">{aviso}</Alert>}
          <Field label="Código"><Input required inputMode="numeric" maxLength={6} value={codigo} onChange={(e) => setCodigo(e.target.value)} /></Field>
          <Field label="Contraseña nueva" hint={REGLA}><Input type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Button type="submit" loading={busy}>Cambiar contraseña</Button>
        </form>
      )}
      {paso === 'listo' && (
        <div className="stack">
          <Alert tipo="ok">La contraseña se cambió. Ya podés iniciar sesión.</Alert>
          <Button onClick={onClose}>Volver al ingreso</Button>
        </div>
      )}
    </Modal>
  );
}

export function CambiarPasswordModal({ onClose }: { onClose: () => void }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const { busy, message, setMessage, run } = useAction();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (nueva !== repetir) return setMessage({ tipo: 'error', texto: 'Las contraseñas nuevas no coinciden.' });
    if (await run(() => api.cambiarPassword(actual, nueva), 'Contraseña actualizada.')) {
      setActual(''); setNueva(''); setRepetir('');
    }
  };

  return (
    <Modal title="Cambiar contraseña" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        {message && <Alert tipo={message.tipo} onClose={() => setMessage(null)}>{message.texto}</Alert>}
        <Field label="Contraseña actual"><Input type="password" required autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} /></Field>
        <Field label="Contraseña nueva" hint={REGLA}><Input type="password" required autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} /></Field>
        <Field label="Repetir contraseña nueva"><Input type="password" required autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} /></Field>
        <Button type="submit" loading={busy}>Guardar</Button>
      </form>
    </Modal>
  );
}
