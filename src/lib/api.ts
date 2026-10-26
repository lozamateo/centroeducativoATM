import { createApi } from '../../shared/api';

export const TOKEN_KEY = 'educar_token';

function leerToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

export const api = createApi({
  baseUrl: API_URL,
  getToken: leerToken,
  onUnauthorized: () => window.dispatchEvent(new Event('sesion-expirada')),
});

export { ApiError } from '../../shared/api';
