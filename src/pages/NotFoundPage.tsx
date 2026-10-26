import { Logo } from '../components/Logo';
import { Link } from '../lib/router';

export function NotFoundPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><Logo /></div>
        <h1>Página no encontrada</h1>
        <p className="muted">La dirección ingresada no existe.</p>
        <Link className="btn btn-primary btn-block" href="/">Volver al inicio</Link>
      </div>
    </div>
  );
}
