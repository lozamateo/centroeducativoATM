import { useCallback, useEffect, useRef, useState } from 'react';

// Carga datos de la API y expone estado de carga, error y recarga.
export function useData<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loaderRef.current());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload, setData };
}

// Ejecuta una accion (alta, baja, inscripcion) mostrando mensajes de exito o error.
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const run = useCallback(async (action: () => Promise<unknown>, okText?: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      if (okText) setMessage({ tipo: 'ok', texto: okText });
      return true;
    } catch (err) {
      setMessage({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo completar la operación.' });
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, message, setMessage, run };
}
