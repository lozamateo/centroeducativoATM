// Ruteo minimo basado en la History API (sin dependencias externas).
import { useEffect, useState } from 'react';
import type { AnchorHTMLAttributes, MouseEvent } from 'react';

const EVENTO = 'navegacion';

export function navigate(to: string, { replace = false } = {}) {
  if (replace) window.history.replaceState(null, '', to);
  else window.history.pushState(null, '', to);
  window.dispatchEvent(new Event(EVENTO));
  if (!to.includes('#')) window.scrollTo(0, 0);
}

export function usePath() {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener('popstate', update);
    window.addEventListener(EVENTO, update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener(EVENTO, update);
    };
  }, []);
  return path.replace(/\/+$/, '') || '/';
}

export function Link({ href = '/', onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || href.startsWith('http') || href.startsWith('#')) return;
    event.preventDefault();
    navigate(href);
  };
  return <a href={href} onClick={handleClick} {...props} />;
}
