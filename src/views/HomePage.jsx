import { useState } from 'react';

const accessItems = [
  {
    title: 'Dashboard de Gestión',
    description: 'Indicadores estadísticos y recursos operativos.',
    path: '/dashboard',
    icon: 'chart',
    enabled: true,
  },
  {
    title: 'Reportes',
    description: 'Acceso a reportes institucionales y documentos de gestión.',
    path: '',
    icon: 'report',
    enabled: false,
  },
  {
    title: 'Otros servicios',
    description: 'Nuevos accesos operativos para futuras herramientas.',
    path: '',
    icon: 'services',
    enabled: false,
  },
];

function HomePage() {
  const [showBanner, setShowBanner] = useState(true);

  return (
    <main className="home-shell">
      <section className="home-banner" aria-label="Encabezado institucional">
        {showBanner ? (
          <img
            className="home-banner-image"
            src="/encabezado.png"
            alt="Ministerio de Seguridad de Córdoba"
            onError={() => setShowBanner(false)}
          />
        ) : (
          <div className="home-banner-fallback">
            <img src="/ojosenalerta.png" alt="Ojos en Alerta" />
            <img src="/ministerio.png" alt="Ministerio de Seguridad de Córdoba" />
          </div>
        )}
      </section>

      <section className="home-heading">
        <h1>Panel de Gestión</h1>
      </section>

      <section className="access-grid" aria-label="Accesos disponibles">
        {accessItems.map((item) => (
          <AccessCard key={item.title} item={item} />
        ))}
      </section>
    </main>
  );
}

function AccessCard({ item }) {
  const target = item.path || item.url || '#';
  const isExternal = Boolean(item.url);

  return (
    <article className={`access-card ${item.enabled ? '' : 'access-card-disabled'}`}>
      <div className="access-card-icon" aria-hidden="true">
        <AccessIcon name={item.icon} />
      </div>
      <div>
        <span className={`access-status ${item.enabled ? 'active' : ''}`}>
          {item.enabled ? 'Disponible' : 'Próximamente'}
        </span>
        <h2>{item.title}</h2>
        <p>{item.description}</p>
      </div>
      {item.enabled ? (
        <a
          className="access-button"
          href={target}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noreferrer' : undefined}
        >
          Ingresar
        </a>
      ) : (
        <span className="access-button access-button-disabled">Próximamente</span>
      )}
    </article>
  );
}

function AccessIcon({ name }) {
  if (name === 'report') {
    return (
      <svg viewBox="0 0 24 24" role="img">
        <path d="M6 3h9l3 3v15H6V3Zm8 1.8V7h2.2L14 4.8ZM8 11h8v1.8H8V11Zm0 4h8v1.8H8V15Zm0-8h4v1.8H8V7Z" />
      </svg>
    );
  }

  if (name === 'services') {
    return (
      <svg viewBox="0 0 24 24" role="img">
        <path d="M4 5h7v7H4V5Zm2 2v3h3V7H6Zm7-2h7v7h-7V5Zm2 2v3h3V7h-3ZM4 14h7v7H4v-7Zm2 2v3h3v-3H6Zm10.5-2 1.3 2.4 2.7.5-1.9 2 0.4 2.8-2.5-1.2-2.5 1.2.4-2.8-1.9-2 2.7-.5 1.3-2.4Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" role="img">
      <path d="M4 19h16v2H4v-2Zm1-7h3v5H5v-5Zm5-6h3v11h-3V6Zm5 3h3v8h-3V9Zm4-5h2v13h-2V4Z" />
    </svg>
  );
}

export default HomePage;
