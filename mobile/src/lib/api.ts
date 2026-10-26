// Cliente de la API compartido con la web (../shared/api.ts).
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createApi } from '../../../shared/api';

const TOKEN_KEY = 'educar_token';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api';
export const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? API_URL.replace(/\/api\/?$/, '');

// El token se guarda cifrado en el telefono (SecureStore); en la version web, en localStorage.
export const tokenStorage = {
  async get() {
    try {
      if (Platform.OS === 'web') return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  async set(token: string | null) {
    try {
      if (Platform.OS === 'web') {
        if (token) globalThis.localStorage?.setItem(TOKEN_KEY, token);
        else globalThis.localStorage?.removeItem(TOKEN_KEY);
      } else if (token) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch {
      // Sin almacenamiento: la sesion dura mientras la app este abierta.
    }
  },
};

let alExpirar: (() => void) | null = null;
export const onSesionExpirada = (fn: () => void) => {
  alExpirar = fn;
};

export const api = createApi({
  baseUrl: API_URL,
  getToken: tokenStorage.get,
  onUnauthorized: () => alExpirar?.(),
});

export { ApiError } from '../../../shared/api';
