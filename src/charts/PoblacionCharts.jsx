import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function formatPeriodo(row) {
  return `${row.mes} ${row.anio}`;
}

function PoblacionCharts({ rows }) {
  const chartRows = getSortedRows(rows)
    .filter(isValidChartRow)
    .map((row) => ({
      ...row,
      periodo: formatPeriodo(row),
    }));

  if (chartRows.length === 0) {
    return (
      <section className="card chart-card">
        <h2>Graficos de poblacion</h2>
        <p className="muted">No hay datos para graficar en esta hoja.</p>
      </section>
    );
  }

  const ultimo = chartRows[chartRows.length - 1];

  return (
    <section className="poblacion-charts">
      <PoblacionSummaryCards ultimo={ultimo} />

      <ChartCard title="Evolucion de adheridos">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartRows} margin={chartMargin()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="periodo" angle={-35} textAnchor="end" height={78} interval="preserveStartEnd" />
            <YAxis />
            <Tooltip formatter={numberTooltip} />
            <Legend />
            <Line
              type="monotone"
              dataKey="adheridos"
              name="Adheridos"
              stroke="#1f4e79"
              strokeWidth={3}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="% de poblacion objetivo adherida">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartRows} margin={chartMargin()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="periodo" angle={-35} textAnchor="end" height={78} interval="preserveStartEnd" />
            <YAxis tickFormatter={(value) => `${value}%`} />
            <Tooltip formatter={percentageTooltip} />
            <Legend />
            <Line
              type="monotone"
              dataKey="porcentajePoblacionObjetivoAdherida"
              name="% poblacion objetivo adherida"
              stroke="#2e7d59"
              strokeWidth={3}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Evolucion de barrios incorporados">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartRows} margin={chartMargin()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="periodo" angle={-35} textAnchor="end" height={78} interval="preserveStartEnd" />
            <YAxis />
            <Tooltip formatter={numberTooltip} />
            <Legend />
            <Line
              type="monotone"
              dataKey="cantidadBarrios"
              name="Cantidad de barrios"
              stroke="#4ba3c7"
              strokeWidth={3}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </section>
  );
}

function PoblacionSummaryCards({ ultimo }) {
  const cards = [
    {
      label: 'Periodo',
      value: ultimo ? formatPeriodo(ultimo) : '-',
    },
    {
      label: 'Barrios incorporados',
      value: formatNullableNumber(ultimo?.cantidadBarrios),
    },
    {
      label: 'Adheridos',
      value: formatNullableNumber(ultimo?.adheridos),
    },
    {
      label: 'Poblacion objetivo',
      value: formatNullableNumber(ultimo?.poblacionObjetivo),
    },
    {
      label: '% poblacion objetivo adherida',
      value: formatNullablePercent(ultimo?.porcentajePoblacionObjetivoAdherida),
    },
  ];

  return (
    <section className="poblacion-summary-grid" aria-label="Resumen de poblacion">
      {cards.map((card) => (
        <article className="poblacion-summary-card" key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </article>
      ))}
    </section>
  );
}

function ChartCard({ title, children }) {
  return (
    <section className="card chart-card">
      <div className="table-heading">
        <h2>{title}</h2>
      </div>
      <div className="chart-wrapper poblacion-chart-wrapper">{children}</div>
    </section>
  );
}

function getSortedRows(rows) {
  return [...rows].sort((leftRow, rightRow) =>
    String(leftRow.fechaOrden).localeCompare(String(rightRow.fechaOrden)),
  );
}

function isValidChartRow(row) {
  return (
    Number.isFinite(Number(row?.anio)) &&
    typeof row?.mes === 'string' &&
    row.mes.trim() !== '' &&
    typeof row?.fechaOrden === 'string' &&
    /^\d{4}-\d{2}$/.test(row.fechaOrden)
  );
}

function numberTooltip(value, name) {
  return [formatNumber(value), name];
}

function percentageTooltip(value, name) {
  return [`${formatNumber(value)}%`, name];
}

function formatNullableNumber(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return formatNumber(value);
}

function formatNullablePercent(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return `${formatNumber(value)}%`;
}

function formatNumber(value) {
  return Number(value).toLocaleString('es-AR', {
    maximumFractionDigits: 2,
  });
}

function chartMargin() {
  return { top: 12, right: 24, left: 8, bottom: 24 };
}

export default PoblacionCharts;
