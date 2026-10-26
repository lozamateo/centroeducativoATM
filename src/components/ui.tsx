// Componentes de interfaz reutilizables (mismo lenguaje visual que la app movil).
import { useEffect } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { AlertCircle, CheckCircle2, Inbox, Loader2, X } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

export function Button({
  variant = 'primary',
  size,
  loading,
  icon,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm'; loading?: boolean; icon?: ReactNode }) {
  return (
    <button
      className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 size={16} className="spin" /> : icon}
      {children}
    </button>
  );
}

export function Field({ label, hint, children, full }: { label: string; hint?: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={`field ${full ? 'field-full' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => <input className="input" {...props} />;
export const Textarea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className="input" rows={4} {...props} />;
export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => <select className="input" {...props} />;

export function Card({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-header">
          {title && <h3>{title}</h3>}
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export type Tone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

export const Badge = ({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) => (
  <span className={`badge badge-${tone}`}>{children}</span>
);

export function Alert({ tipo, children, onClose }: { tipo: 'ok' | 'error' | 'info'; children: ReactNode; onClose?: () => void }) {
  return (
    <div className={`alert alert-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      {tipo === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      <span>{children}</span>
      {onClose && (
        <button className="alert-close" onClick={onClose} aria-label="Cerrar">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function Feedback({ message, onClose }: { message: { tipo: 'ok' | 'error'; texto: string } | null; onClose?: () => void }) {
  if (!message) return null;
  return (
    <Alert tipo={message.tipo} onClose={onClose}>
      {message.texto}
    </Alert>
  );
}

export const Loading = ({ texto = 'Cargando...' }: { texto?: string }) => (
  <div className="loading">
    <Loader2 size={22} className="spin" /> {texto}
  </div>
);

export const Empty = ({ texto, children }: { texto: string; children?: ReactNode }) => (
  <div className="empty">
    <Inbox size={28} />
    <p>{texto}</p>
    {children}
  </div>
);

// Estado estandar de una carga: muestra spinner, error o el contenido.
export function DataState({ loading, error, children, onRetry }: { loading: boolean; error: string | null; children: ReactNode; onRetry?: () => void }) {
  if (loading) return <Loading />;
  if (error)
    return (
      <Alert tipo="error">
        {error} {onRetry && <button className="link-button" onClick={onRetry}>Reintentar</button>}
      </Alert>
    );
  return <>{children}</>;
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h3>{title}</h3>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon, tone = 'info' }: { label: string; value: ReactNode; icon: ReactNode; tone?: Tone }) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export function Table<T>({ columns, rows, rowKey, empty = 'No hay registros.' }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string | number; empty?: string }) {
  if (!rows.length) return <Empty texto={empty} />;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.header} className={column.className}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.header} className={column.className} data-label={column.header}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Tabs<K extends string>({ tabs, active, onChange }: { tabs: { key: K; label: string }[]; active: K; onChange: (key: K) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button key={tab.key} role="tab" aria-selected={active === tab.key} className={`tab ${active === tab.key ? 'tab-active' : ''}`} onClick={() => onChange(tab.key)}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export const InfoRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="info-row">
    <span>{label}</span>
    <strong>{children || '-'}</strong>
  </div>
);
