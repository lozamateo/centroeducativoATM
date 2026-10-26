import { useEffect } from 'react';
import { Loading } from './components/ui';
import { AuthProvider, useAuth } from './lib/auth';
import { navigate, usePath } from './lib/router';
import { CalidadPage } from './pages/CalidadPage';
import { CredencialPage } from './pages/CredencialPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PanelLayout } from './panel/PanelLayout';
import { PanelRoutes } from './panel/PanelRoutes';

function Router() {
  const path = usePath();
  const { usuario, cargando } = useAuth();
  const enPanel = path === '/panel' || path.startsWith('/panel/');

  useEffect(() => {
    if (enPanel && !cargando && !usuario) navigate('/login', { replace: true });
  }, [enPanel, cargando, usuario]);

  if (path === '/') return <HomePage />;
  if (path === '/login') return <LoginPage />;
  if (path === '/calidad') return <CalidadPage />;
  const credencial = path.match(/^\/credencial\/([\w-]+)$/);
  if (credencial) return <CredencialPage token={credencial[1]} />;

  if (enPanel) {
    if (cargando || !usuario) return <Loading texto="Verificando sesión..." />;
    return (
      <PanelLayout path={path}>
        <PanelRoutes path={path} rol={usuario.rol} />
      </PanelLayout>
    );
  }

  return <NotFoundPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
