// Verificacion publica de la credencial deportiva (lo que se ve al escanear el QR).
import { CheckCircle2, XCircle } from 'lucide-react';
import { fecha } from '../../shared/format';
import { Logo } from '../components/Logo';
import { Alert, InfoRow, Loading } from '../components/ui';
import { api } from '../lib/api';
import { Link } from '../lib/router';
import { useData } from '../lib/useData';

export function CredencialPage({ token }: { token: string }) {
  const { data, error, loading } = useData(() => api.credencial(token), [token]);

  return (
    <div className="auth-page">
      <div className="auth-card credential-check">
        <div className="auth-logo"><Logo /></div>
        <h1>Credencial deportiva</h1>
        {loading && <Loading texto="Verificando credencial..." />}
        {error && <Alert tipo="error">{error}</Alert>}
        {data && (
          <>
            <div className={`credential-status ${data.habilitado ? 'ok' : 'blocked'}`}>
              {data.habilitado ? <CheckCircle2 size={44} /> : <XCircle size={44} />}
              <strong>{data.habilitado ? 'HABILITADO' : 'NO HABILITADO'}</strong>
              <span>{data.habilitado ? 'Apto físico vigente' : 'Apto físico vencido o ausente'}</span>
            </div>
            <div className="info-list">
              <InfoRow label="Alumno">{data.alumno}</InfoRow>
              <InfoRow label="Nivel">{data.nivel}</InfoRow>
              <InfoRow label="Apto vence">{fecha(data.apto_fisico_vence)}</InfoRow>
              <InfoRow label="Deportes">{data.deportes || 'Sin inscripciones'}</InfoRow>
            </div>
          </>
        )}
        <Link className="back-link center" href="/">Ir al sitio del centro</Link>
      </div>
    </div>
  );
}
