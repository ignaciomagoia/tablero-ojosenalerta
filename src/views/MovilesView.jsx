import { useMemo, useState } from 'react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const STATUS_COLORS = ['#2e7d59', '#d9822b', '#b64a4a'];
const TERRITORY_OPTIONS = [
  {
    label: 'Cuadrantes',
    value: 'cuadrantes',
  },
  {
    label: 'Distritos',
    value: 'distritos',
  },
];

function MovilesView({ data }) {
  const [territoryMode, setTerritoryMode] = useState('cuadrantes');
  const [search, setSearch] = useState('');
  const resumen = data?.resumen ?? {};
  const totalEstado =
    (Number(resumen.activos) || 0) +
    (Number(resumen.enReparacion) || 0) +
    (Number(resumen.fueraDeServicio) || 0);
  const statusRows = [
    { name: 'Activos', value: Number(resumen.activos) || 0, total: totalEstado, color: STATUS_COLORS[0] },
    { name: 'En reparación', value: Number(resumen.enReparacion) || 0, total: totalEstado, color: STATUS_COLORS[1] },
    { name: 'Fuera de servicio', value: Number(resumen.fueraDeServicio) || 0, total: totalEstado, color: STATUS_COLORS[2] },
  ].filter((item) => item.value > 0);
  const zoneRows = mergeMovilesAndChalecos(
    data?.movilesPorZona ?? [],
    data?.chalecosPorZona ?? [],
  );
  const territoryRows = mergeMovilesAndChalecos(
    territoryMode === 'cuadrantes'
      ? data?.movilesPorCuadrante ?? []
      : data?.movilesPorDistrito ?? [],
    territoryMode === 'cuadrantes'
      ? data?.chalecosPorCuadrante ?? []
      : data?.chalecosPorDistrito ?? [],
  );
  const filteredZoneRows = useMemo(
    () => filterRows(zoneRows, search),
    [zoneRows, search],
  );
  const filteredTerritoryRows = useMemo(
    () => filterRows(territoryRows, search),
    [territoryRows, search],
  );

  return (
    <section className="moviles-view">
      <section className="moviles-top-grid">
        <MovilesSummaryCards resumen={resumen} />
        <section className="card moviles-donut-card">
          <div className="table-heading">
            <h2>Estado general de los móviles</h2>
          </div>
          <div className="moviles-donut-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusRows}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="56%"
                  outerRadius="78%"
                  paddingAngle={3}
                >
                  {statusRows.map((row) => (
                    <Cell key={row.name} fill={row.color} />
                  ))}
                </Pie>
                <Tooltip content={<MovilesTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </section>

      <section className="card moviles-search-card">
        <label>
          Buscar zona, cuadrante o distrito
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ej: Norte, 7, 24 bis"
          />
        </label>
      </section>

      <section className="card compact-list-card">
        <div className="table-heading">
          <h2>Resumen por zona</h2>
        </div>
        <MovilesRows rows={filteredZoneRows} emptyMessage="No hay zonas para mostrar." />
      </section>

      <section className="card personal-detail-card">
        <div className="table-heading">
          <div>
            <h2>Distribución territorial</h2>
            <p>Disponibilidad de móviles y chalecos.</p>
          </div>
          <div className="chart-controls">
            <label>
              Ver
              <select
                value={territoryMode}
                onChange={(event) => setTerritoryMode(event.target.value)}
              >
                {TERRITORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <MovilesRows
          rows={filteredTerritoryRows}
          emptyMessage="No hay datos territoriales para mostrar."
        />
      </section>
    </section>
  );
}

function MovilesSummaryCards({ resumen }) {
  const cards = [
    {
      label: 'Móviles activos',
      value: formatNumber(resumen.activos),
    },
    {
      label: 'En reparación',
      value: formatNumber(resumen.enReparacion),
    },
    {
      label: 'Fuera de servicio',
      value: formatNumber(resumen.fueraDeServicio),
    },
    {
      label: 'Operatividad',
      value: formatPercent(resumen.porcentajeOperatividad),
    },
  ];

  return (
    <section className="moviles-summary-grid" aria-label="Resumen de móviles">
      {cards.map((card) => (
        <article className="recursos-summary-card" key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </article>
      ))}
    </section>
  );
}

function MovilesRows({ rows, emptyMessage }) {
  if (!rows || rows.length === 0) {
    return <p className="muted">{emptyMessage}</p>;
  }

  return (
    <div className="moviles-row-list">
      <div className="moviles-row moviles-row-header">
        <span>Nombre</span>
        <span>Estado</span>
        <span>Activos</span>
        <span>Reparación</span>
        <span>Fuera servicio</span>
        <span>Total móviles</span>
        <span>Chalecos</span>
      </div>
      {rows.map((row) => (
        <div className="moviles-row" key={row.name}>
          <strong>{row.name}</strong>
          <StatusBadge row={row} />
          <span>{formatNumber(row.activos)}</span>
          <span>{formatNumber(row.enReparacion)}</span>
          <span>{formatNumber(row.fueraDeServicio)}</span>
          <span>{formatNumber(row.total)}</span>
          <span>{formatNumber(row.chalecos)}</span>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ row }) {
  const status = getStatus(row);

  return (
    <span className={`status-badge status-badge-${status.level}`}>
      {status.label}
    </span>
  );
}

function getStatus(row) {
  if ((Number(row.fueraDeServicio) || 0) > 0) {
    return {
      level: 'danger',
      label: `${formatNumber(row.fueraDeServicio)} fuera de servicio`,
    };
  }

  if ((Number(row.enReparacion) || 0) > 0) {
    return {
      level: 'warning',
      label: `${formatNumber(row.enReparacion)} en reparación`,
    };
  }

  return {
    level: 'success',
    label: 'Operativo',
  };
}

function mergeMovilesAndChalecos(movilesRows, chalecosRows) {
  const chalecosByName = new Map(
    chalecosRows.map((row) => [normalizeKey(row.name), Number(row.cantidad) || 0]),
  );

  return movilesRows.map((row) => ({
    ...row,
    chalecos: chalecosByName.get(normalizeKey(row.name)) ?? 0,
  }));
}

function filterRows(rows, search) {
  const normalizedSearch = normalizeKey(search);

  if (!normalizedSearch) {
    return rows;
  }

  return rows.filter((row) => normalizeKey(row.name).includes(normalizedSearch));
}

function normalizeKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function MovilesTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;
  const percentage = item.total > 0 ? (item.value / item.total) * 100 : 0;

  return (
    <div className="chart-tooltip">
      <strong>{item.name}</strong>
      <span>{formatNumber(item.value)} móviles</span>
      <span>{formatPercent(percentage)}</span>
    </div>
  );
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return Number(value).toLocaleString('es-AR', {
    maximumFractionDigits: 0,
  });
}

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString('es-AR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

export default MovilesView;
