import { useEffect, useRef, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { institucion } from '../../shared/theme';

// Logo institucional; si la imagen no carga, muestra el isotipo con el nombre.
export function Logo({ variant = 'color' }: { variant?: 'color' | 'light' }) {
  const [error, setError] = useState(false);
  const img = useRef<HTMLImageElement>(null);

  // La imagen puede fallar antes de que React registre onError (por ejemplo, desde cache).
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth === 0) setError(true);
  }, []);

  if (error) {
    return (
      <span className={`logo-fallback logo-${variant}`}>
        <span className="logo-mark"><GraduationCap size={22} /></span>
        <span className="logo-text">
          <strong>Educar</strong> para Transformar
        </span>
      </span>
    );
  }

  return <img ref={img} className={`logo logo-${variant}`} src={institucion.logoUrl} alt={institucion.nombre} onError={() => setError(true)} />;
}
