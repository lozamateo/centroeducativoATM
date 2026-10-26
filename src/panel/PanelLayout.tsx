import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  BarChart3, BookOpen, ClipboardList, Dumbbell, FileClock, GraduationCap, HeartPulse, Home, LayoutDashboard, LogOut,
  Menu, Newspaper, ShieldCheck, UserCog, Users, X,
} from 'lucide-react';
import { ROLES } from '../../shared/format';
import type { Rol } from '../../shared/types';
import { Logo } from '../components/Logo';
import { useAuth } from '../lib/auth';
import { Link } from '../lib/router';

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

export const navPorRol: Record<Rol, NavItem[]> = {
  ADMIN: [
    { href: '/panel', label: 'Tablero', icon: <LayoutDashboard size={18} /> },
    { href: '/panel/alumnos', label: 'Alumnos', icon: <GraduationCap size={18} /> },
    { href: '/panel/tutores', label: 'Familias', icon: <Users size={18} /> },
    { href: '/panel/docentes', label: 'Docentes', icon: <UserCog size={18} /> },
    { href: '/panel/cursos', label: 'Cursos y materias', icon: <BookOpen size={18} /> },
    { href: '/panel/deportes', label: 'Deportes', icon: <Dumbbell size={18} /> },
    { href: '/panel/inscripciones', label: 'Inscripciones', icon: <ClipboardList size={18} /> },
    { href: '/panel/reportes', label: 'Reportes', icon: <BarChart3 size={18} /> },
    { href: '/panel/salud', label: 'Aptos físicos', icon: <HeartPulse size={18} /> },
    { href: '/panel/usuarios', label: 'Usuarios', icon: <ShieldCheck size={18} /> },
    { href: '/panel/contenido', label: 'Sitio web', icon: <Newspaper size={18} /> },
    { href: '/panel/auditoria', label: 'Auditoría', icon: <FileClock size={18} /> },
  ],
  TUTOR: [{ href: '/panel', label: 'Mis hijos', icon: <Users size={18} /> }],
  DOCENTE: [{ href: '/panel', label: 'Mis cursos', icon: <BookOpen size={18} /> }],
  ALUMNO: [{ href: '/panel', label: 'Mi escuela', icon: <GraduationCap size={18} /> }],
  ENFERMERIA: [{ href: '/panel', label: 'Fichas médicas', icon: <HeartPulse size={18} /> }],
};

export function PanelLayout({ path, children }: { path: string; children: ReactNode }) {
  const { usuario, logout } = useAuth();
  const [open, setOpen] = useState(false);
  if (!usuario) return null;

  const items = navPorRol[usuario.rol];
  const activo = (href: string) => (href === '/panel' ? path === '/panel' || (path.startsWith('/panel/') && items.length === 1) : path.startsWith(href));

  return (
    <div className={`panel ${open ? 'panel-open' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Logo />
          <button className="icon-button mobile-only" onClick={() => setOpen(false)} aria-label="Cerrar menú"><X size={20} /></button>
        </div>
        <nav className="sidebar-nav" aria-label="Menú del panel">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={activo(item.href) ? 'active' : ''} onClick={() => setOpen(false)}>
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Link href="/"><Home size={18} /> Sitio público</Link>
          <button onClick={logout}><LogOut size={18} /> Cerrar sesión</button>
        </div>
      </aside>
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}
      <div className="panel-main">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="Abrir menú"><Menu size={22} /></button>
          <div className="topbar-user">
            <div className="avatar">{usuario.nombre[0]}{usuario.apellido[0]}</div>
            <div>
              <strong>{usuario.nombre} {usuario.apellido}</strong>
              <span>{ROLES[usuario.rol]}</span>
            </div>
          </div>
        </header>
        <main className="panel-content">{children}</main>
      </div>
    </div>
  );
}
