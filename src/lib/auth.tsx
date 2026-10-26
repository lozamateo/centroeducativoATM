// Sesion del usuario: guarda el token JWT y el perfil en el navegador.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Usuario } from '../../shared/types';
import { TOKEN_KEY, api } from './api';

interface AuthState {
  usuario: Usuario | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<Usuario>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function guardar(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Sin almacenamiento disponible: la sesion dura mientras la pagina este abierta.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api
      .perfil()
      .then(setUsuario)
      .catch(() => guardar(null))
      .finally(() => setCargando(false));
  }, []);

  const logout = useCallback(() => {
    guardar(null);
    setUsuario(null);
  }, []);

  useEffect(() => {
    window.addEventListener('sesion-expirada', logout);
    return () => window.removeEventListener('sesion-expirada', logout);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const respuesta = await api.login(email, password);
    guardar(respuesta.token);
    setUsuario(respuesta.usuario);
    return respuesta.usuario;
  }, []);

  return <AuthContext.Provider value={{ usuario, cargando, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
