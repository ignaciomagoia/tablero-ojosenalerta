import { useState } from 'react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const STATUS_COLORS = ['#2e7d59', '#b64a4a'];
const DETAIL_OPTIONS = [
  {
    label: 'Cuadrantes',
    value: 'cuadrantes',
  },
  {
    label: 'Distritos',
    value: 'distritos',
  },
];

function PersonalView({ data }) {
  const [detailMode, setDetailMode] = useState('cuadrantes');
  const resumen = data?.resumenGeneral ?? {};
  const totals = getPersonalTotals(data);
  const hasData = hasPersonalData(data, totals);
  const detailRows = detailMode === 'cuadrantes'
    ? data?.callePorCuadrante ?? []
    : data?.callePorDistrito ?? [];

  if (!hasData) {
    return (
      <section className="personal-view">
        <section className="card empty-state-card">
          <h2>Personal operativo</h2>
          <p className="muted">
            No hay datos de personal cargados para mostrar. Cuando cargues el
            Excel actualizado desde /admin, esta seccion se completa
            automaticamente.
          </p>
        </section>
      </section>
    );
  }

  return (
    <section className="personal-view">
      <PersonalSummaryCards resumen={resumen} totals={totals} />

      <section className="personal-status-grid">
        <section className="card personal-status-card">
          <div className="table-heading">
            <div>
              <h2>Estado general del personal</h2>
              <p>Resumen administrativo de asistencia.</p>
            </div>
          </div>
          <div className="personal-status-cards">
            <MiniMetric label="Presentes" value={formatNumber(totals.presentes)} />
            <MiniMetric label="Ausentes" value={formatNumber(totals.ausentes)} />
            <MiniMetric
              label="Porcentaje de asistencia"
              value={formatPercent(totals.porcentajeAsistencia)}
            />
          </div>
        </section>

        <section className="card personal-status-card">
          <div className="table-heading">
            <h2>Estado general del personal</h2>
          </div>
          <div className="personal-donut-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Presentes', value: totals.presentes },
                    { name: 'Ausentes', value: totals.ausentes },
                  ].filter((item) => item.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="80%"
                  paddingAngle={3}
                >
                  {STATUS_COLORS.map((color) => (
                    <Cell key={color} fill={color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [formatNumber(value), name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </section>

      <section className="personal-resumen-grid">
        <CompactRowsCard
          title="Personal administrativo por zona"
          rows={data?.administrativoPorZona ?? []}
        />
        <CompactRowsCard
          title="Personal de calle por zona"
          rows={data?.callePorZona ?? []}
        />
      </section>

      <section className="card personal-detail-card">
        <div className="table-heading">
          <div>
            <h2>Personal de calle por {detailMode === 'cuadrantes' ? 'cuadrante' : 'distrito'}</h2>
            <p>Totales presentes, ausentes y generales.</p>
          </div>
          <div className="chart-controls">
            <label>
              Ver
              <select
                value={detailMode}
                onChange={(event) => setDetailMode(event.target.value)}
              >
                {DETAIL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <CompactRows rows={detailRows} emptyMessage="No hay datos disponibles." />
      </section>
    </section>
  );
}

function PersonalSummaryCards({ resumen, totals }) {
  const cards = [
    {
      label: 'Personal total',
      value: formatNumber(totals.total),
    },
    {
      label: 'Personal administrativo',
      value: formatNumber(totals.administrativo),
    },
    {
      label: 'Personal de calle',
      value: formatNumber(totals.calle),
    },
    {
      label: 'Policia total',
      value: formatNumber(totals.policia),
    },
    {
      label: 'ETAC total',
      value: formatNumber(totals.etac),
    },
    {
      label: 'Civil total',
      value: formatNumber(totals.civil),
    },
    {
      label: 'Presentes totales',
      value: formatNumber(totals.presentes),
    },
    {
      label: 'Ausentes totales',
      value: formatNumber(totals.ausentes),
    },
    ...getOptionalCards(resumen),
  ];

  return (
    <section className="personal-summary-grid" aria-label="Resumen de personal">
      {cards.map((card) => (
        <article className="recursos-summary-card" key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </article>
      ))}
    </section>
  );
}

function CompactRowsCard({ title, rows }) {
  return (
    <section className="card compact-list-card">
      <div className="table-heading">
        <h2>{title}</h2>
      </div>
      <CompactRows rows={rows} emptyMessage="No hay datos disponibles." />
    </section>
  );
}

function CompactRows({ rows, emptyMessage }) {
  if (!rows || rows.length === 0) {
    return <p className="muted">{emptyMessage}</p>;
  }

  return (
    <div className="compact-row-list">
      <div className="compact-row compact-row-header">
        <span>Nombre</span>
        <span>Presentes</span>
        <span>Ausentes</span>
        <span>Total</span>
      </div>
      {rows.map((row) => (
        <div
          className={`compact-row ${row.isTotal ? 'compact-row-total' : ''}`}
          key={row.name}
        >
          <strong>{row.name}</strong>
          <span>{formatNumber(row.presentes)}</span>
          <span>{formatNumber(row.ausentes)}</span>
          <span>{formatNumber(row.total)}</span>
        </div>
      ))}
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <article className="personal-mini-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function getPersonalTotals(data) {
  const resumen = data?.resumenGeneral ?? {};
  const administrativo = totalGroup(resumen.administrativo);
  const calle = totalGroup(resumen.calle);
  const asistenciaAdministrativa = getAttendanceTotals(data?.administrativoPorZona ?? [], administrativo);
  const asistenciaCalle = getAttendanceTotals(data?.callePorZona ?? [], calle);
  const presentes = asistenciaAdministrativa.presentes + asistenciaCalle.presentes;
  const ausentes = asistenciaAdministrativa.ausentes + asistenciaCalle.ausentes;
  const total = administrativo + calle;

  return {
    administrativo,
    calle,
    total,
    policia: sumValues([
      resumen.administrativo?.jefes,
      resumen.administrativo?.subalternos,
      resumen.calle?.jefes,
      resumen.calle?.subalternos,
    ]),
    etac: sumValues([resumen.administrativo?.etac, resumen.calle?.etac]),
    civil: sumValues([resumen.administrativo?.civil, resumen.calle?.civil]),
    presentes,
    ausentes,
    porcentajeAsistencia: presentes + ausentes > 0
      ? (presentes / (presentes + ausentes)) * 100
      : 0,
  };
}

function getAttendanceTotals(rows, fallbackTotal) {
  const totalRow = rows.find((row) => row.isTotal);
  const sourceRows = totalRow ? [totalRow] : rows;

  if (sourceRows.length === 0) {
    return {
      presentes: fallbackTotal,
      ausentes: 0,
    };
  }

  return sourceRows.reduce(
    (totals, row) => ({
      presentes: totals.presentes + (Number(row.presentes) || 0),
      ausentes: totals.ausentes + (Number(row.ausentes) || 0),
    }),
    { presentes: 0, ausentes: 0 },
  );
}

function getOptionalCards(resumen) {
  return [
    ['Administracion', resumen.administracion],
    ['Puerta a Puerta', resumen.puertaAPuerta],
    ['Comunicacion', resumen.comunicacion],
  ]
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([label, value]) => ({
      label,
      value: formatNumber(value),
    }));
}

function totalGroup(group = {}) {
  return sumValues([group.jefes, group.subalternos, group.etac, group.civil]);
}

function sumValues(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

function hasPersonalData(data, totals) {
  if (totals.total > 0 || totals.presentes > 0 || totals.ausentes > 0) {
    return true;
  }

  const rows = [
    ...(data?.administrativoPorZona ?? []),
    ...(data?.callePorZona ?? []),
    ...(data?.callePorCuadrante ?? []),
    ...(data?.callePorDistrito ?? []),
  ];

  return rows.some((row) => Number(row.total) > 0);
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
  return `${Number(value).toLocaleString('es-AR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

export default PersonalView;
