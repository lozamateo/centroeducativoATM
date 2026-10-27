// Calidad y CI/CD: cómo se optimizó el ciclo de desarrollo de la aplicación (Unidades 4 y 5).
import { ArrowLeft, ExternalLink, FlaskConical, ShieldCheck, Workflow } from 'lucide-react';
import { enlaces, etapasPipeline, herramientas, metricas, pruebas } from '../../shared/calidad';
import { Logo } from '../components/Logo';
import { Card, StatCard, Table } from '../components/ui';
import { Link } from '../lib/router';

export function CalidadPage() {
  const totalPruebas = pruebas.reduce((total, p) => total + p.cantidad, 0);

  return (
    <div className="calidad-page">
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand" href="/"><Logo /></Link>
          <Link className="btn btn-outline" href="/"><ArrowLeft size={18} /> Volver al sitio</Link>
        </div>
      </header>

      <main className="container calidad-main">
        <div className="section-header">
          <span className="eyebrow">Equipo ATM · Metodología de Sistemas II</span>
          <h2>Calidad y CI/CD</h2>
          <p>Cada cambio de la aplicación se integra, se prueba y se despliega de forma automática.</p>
        </div>

        <div className="grid grid-3">
          <StatCard label="Etapas del pipeline" value={etapasPipeline.length} icon={<Workflow />} />
          <StatCard label="Pruebas automatizadas" value={totalPruebas} icon={<FlaskConical />} tone="success" />
          <StatCard label="Cobertura de las reglas de negocio" value="100 %" icon={<ShieldCheck />} tone="warning" />
        </div>

        <Card title="Pipeline CI/CD">
          <ol className="pipeline">
            {etapasPipeline.map((etapa) => (
              <li key={etapa.nombre}>
                <strong>{etapa.nombre}</strong>
                <small>{etapa.detalle}</small>
              </li>
            ))}
          </ol>
        </Card>

        <Card title="Herramientas aplicadas">
          <Table
            rows={herramientas}
            rowKey={(h) => h.practica}
            columns={[
              { header: 'Práctica', render: (h) => h.practica },
              { header: 'Herramienta', render: (h) => h.herramienta },
              { header: 'Dónde', render: (h) => <code>{h.archivo}</code> },
            ]}
          />
        </Card>

        <div className="grid grid-2">
          <Card title="Pruebas automatizadas">
            <Table
              rows={pruebas}
              rowKey={(p) => p.nombre}
              columns={[
                { header: 'Qué prueba', render: (p) => p.nombre },
                { header: 'Tipo', render: (p) => p.tipo },
                { header: 'Cantidad', render: (p) => p.cantidad },
              ]}
            />
          </Card>
          <Card title="Enlaces del proyecto">
            <ul className="calidad-links">
              {enlaces.map((enlace) => (
                <li key={enlace.url}>
                  <a href={enlace.url} target="_blank" rel="noreferrer">{enlace.titulo} <ExternalLink size={15} /></a>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card title="Métricas: antes y después">
          <Table
            rows={metricas}
            rowKey={(m) => m.indicador}
            columns={[
              { header: 'Indicador', render: (m) => m.indicador },
              { header: 'Antes', render: (m) => m.antes },
              { header: 'Después', render: (m) => <strong>{m.despues}</strong> },
            ]}
          />
        </Card>
      </main>
    </div>
  );
}
