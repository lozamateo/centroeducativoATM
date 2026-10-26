// Sesion del usuario (misma logica que la web).
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Usuario } from '../../../shared/types';
import { api, onSesionExpirada, tokenStorage } from './api';

interface AuthState {
  usuario: Usuario | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<Usuario>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  const logout = useCallback(async () => {
    await tokenStorage.set(null);
    setUsuario(null);
  }, []);

  useEffect(() => {
    onSesionExpirada(() => void logout());
    (async () => {
      if (await tokenStorage.get()) {
        try {
          setUsuario(await api.perfil());
        } catch {
          await tokenStorage.set(null);
        }
      }
      setCargando(false);
    })();
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const respuesta = await api.login(email, password);
    await tokenStorage.set(respuesta.token);
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
