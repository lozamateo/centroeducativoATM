import type { ComponentType } from 'react';
import type { Rol } from '../../shared/types';
import { NotFoundPage } from '../pages/NotFoundPage';
import { CursosPage } from './admin/Academico';
import { DeportesPage } from './admin/Deportes';
import { InscripcionesPage } from './admin/Inscripciones';
import { AlumnosPage, DocentesPage, TutoresPage } from './admin/Personas';
import { ReportesPage } from './admin/Reportes';
import { AuditoriaPage, ContenidoPage, UsuariosPage } from './admin/Sistema';
import { Tablero } from './admin/Tablero';
import { FichaEditor, FichasLista } from './enfermeria/Enfermeria';
import { AlumnoInicio, DocenteInicio, FamiliaHijo, FamiliaInicio } from './portales';

const adminRutas: Record<string, ComponentType> = {
  '/panel': Tablero,
  '/panel/alumnos': AlumnosPage,
  '/panel/tutores': TutoresPage,
  '/panel/docentes': DocentesPage,
  '/panel/cursos': CursosPage,
  '/panel/deportes': DeportesPage,
  '/panel/inscripciones': InscripcionesPage,
  '/panel/reportes': ReportesPage,
  '/panel/salud': () => <FichasLista soloLectura />,
  '/panel/usuarios': UsuariosPage,
  '/panel/contenido': ContenidoPage,
  '/panel/auditoria': AuditoriaPage,
};

// Cada rol solo puede acceder a sus pantallas (la API vuelve a validarlo).
export function PanelRoutes({ path, rol }: { path: string; rol: Rol }) {
  const idDe = (prefijo: string) => {
    const match = path.match(new RegExp(`^${prefijo}/(\\d+)$`));
    return match ? Number(match[1]) : null;
  };

  switch (rol) {
    case 'ADMIN': {
      const Pagina = adminRutas[path];
      return Pagina ? <Pagina /> : <NotFoundPage />;
    }
    case 'TUTOR': {
      const hijo = idDe('/panel/hijos');
      if (hijo) return <FamiliaHijo id={hijo} />;
      return path === '/panel' ? <FamiliaInicio /> : <NotFoundPage />;
    }
    case 'ENFERMERIA': {
      const ficha = idDe('/panel/fichas');
      if (ficha) return <FichaEditor alumnoId={ficha} />;
      return path === '/panel' ? <FichasLista /> : <NotFoundPage />;
    }
    case 'DOCENTE':
      return path === '/panel' ? <DocenteInicio /> : <NotFoundPage />;
    case 'ALUMNO':
      return path === '/panel' ? <AlumnoInicio /> : <NotFoundPage />;
  }
}
