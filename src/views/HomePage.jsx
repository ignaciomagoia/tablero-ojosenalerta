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
    title: 'SAE',
    description: 'Acceso al Sistema de Atención de Emergencias.',
    url: 'https://xiriussae.geoposicionamiento.com.ar/saeweb/#/login',
    openInSameTab: true,
    icon: 'report',
    enabled: true,
  },
  {
    title: 'SISEP',
    description: 'Acceso al sistema SISEP.',
    url: 'https://xirius.geoposicionamiento.com.ar/#/',
    icon: 'services',
    enabled: true,
  },
  {
    title: 'Mapas',
    description: 'Accesos a mapas operativos.',
    icon: 'map',
    enabled: true,
    links: [
      {
        label: 'SECTORES',
        url: 'https://www.google.com/maps/d/u/0/viewer?mid=11aDfct4fltEMX5F8scbS5iqsqcUY2aA&ll=-31.453965980523513%2C-64.18211926280797&z=14',
      },
      {
        label: 'PROYECCIÓN',
        url: 'https://www.google.com/maps/d/u/0/edit?mid=1y20baibi-p9wBXK2nFuUhgHkO1XSGMo&ll=-31.36505198669365%2C-64.2247009437767&z=13',
      },
    ],
  },
];

// Para sumar una cuarta card de Mapas despues, se puede agregar un item con:
// links: [{ label: 'Mapa operativo', url: 'https://...' }, { label: 'Otro mapa', url: 'https://...' }]

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
  const links = getAccessLinks(item);

  return (
    <article className={`access-card ${item.enabled ? '' : 'access-card-disabled'}`}>
      <div className="access-card-icon" aria-hidden="true">
        <AccessIcon name={item.icon} />
      </div>
      <div>
        <h2>{item.title}</h2>
        <p>{item.description}</p>
      </div>
      {item.enabled ? (
        <div className="access-actions">
          {links.map((link) => (
            <a
              className="access-button"
              href={link.href}
              key={`${item.title}-${link.label}`}
              target={link.opensInNewTab ? '_blank' : undefined}
              rel={link.rel}
            >
              {link.label}
            </a>
          ))}
        </div>
      ) : (
        <span className="access-button access-button-disabled">Próximamente</span>
      )}
    </article>
  );
}

function getAccessLinks(item) {
  if (Array.isArray(item.links) && item.links.length > 0) {
    return item.links.map((link) => ({
      label: link.label || 'Ingresar',
      href: link.path || link.url || '#',
      opensInNewTab: Boolean(link.url) && !link.openInSameTab,
      rel: Boolean(link.url) && !link.openInSameTab
        ? link.rel || 'noreferrer'
        : undefined,
    }));
  }

  return [
    {
      label: 'Ingresar',
      href: item.path || item.url || '#',
      opensInNewTab: Boolean(item.url) && !item.openInSameTab,
      rel: Boolean(item.url) && !item.openInSameTab
        ? item.rel || 'noreferrer'
        : undefined,
    },
  ];
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

  if (name === 'map') {
    return (
      <svg viewBox="0 0 24 24" role="img">
        <path d="m9 4 6 2.1L20 4v15l-5 2.1L9 19l-5 2V6l5-2Zm1.2 2.2v11.1l3.6 1.3V7.5l-3.6-1.3ZM6 7.4v10.3l2.2-.9V6.5L6 7.4Zm10 0v10.4l2-.9V6.5l-2 .9Z" />
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
