import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, LogIn } from 'lucide-react';
import { ROLES } from '../../shared/format';
import type { Rol } from '../../shared/types';
import { Logo } from '../components/Logo';
import { Alert, Button, Field, Input } from '../components/ui';
import { useAuth } from '../lib/auth';
import { Link, navigate } from '../lib/router';

// Usuarios de demostración creados por supabase/schema.sql.
const demo: { rol: Rol; email: string; password: string }[] = [
  { rol: 'ADMIN', email: 'admin@educar.com', password: 'admin123' },
  { rol: 'TUTOR', email: 'tutor@educar.com', password: 'tutor123' },
  { rol: 'DOCENTE', email: 'docente@educar.com', password: 'docente123' },
  { rol: 'ALUMNO', email: 'alumno@educar.com', password: 'alumno123' },
  { rol: 'ENFERMERIA', email: 'enfermeria@educar.com', password: 'enfermeria123' },
];

export function LoginPage() {
  const { usuario, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (usuario) navigate('/panel', { replace: true });
  }, [usuario]);

  async function submit(event: FormEvent) {
    event.preventDefault();
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
    <div className="auth-page">
      <div className="auth-card">
        <Link className="back-link" href="/"><ArrowLeft size={16} /> Volver al sitio</Link>
        <div className="auth-logo"><Logo /></div>
        <h1>Ingresar al sistema</h1>
        <p className="muted">Familias, docentes, alumnos y personal del centro.</p>

        <form onSubmit={submit} className="auth-form">
          {error && <Alert tipo="error">{error}</Alert>}
          <Field label="Email"><Input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Contraseña"><Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Button type="submit" loading={busy} icon={<LogIn size={18} />} className="btn-block">Ingresar</Button>
        </form>

        <div className="demo-users">
          <span>Usuarios de demostración</span>
          <div>
            {demo.map((d) => (
              <button key={d.rol} type="button" className="chip" onClick={() => { setEmail(d.email); setPassword(d.password); }}>
                {ROLES[d.rol]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
