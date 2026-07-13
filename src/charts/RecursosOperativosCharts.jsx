import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const COLORS = ['#1f4e79', '#d9822b', '#b64a4a', '#2e7d59', '#4ba3c7'];

function RecursosOperativosCharts({ data }) {
  const summary = data?.summary ?? {};
  const hasChartData = [
    data?.estadoMoviles,
    data?.movilesPorCuadrante,
    data?.chalecosPorDistrito,
    data?.movilesPorDistrito,
    data?.zonaComparativa,
  ].some((dataset) => Array.isArray(dataset) && dataset.length > 0);

  return (
    <section className="recursos-charts">
      <RecursosSummaryCards summary={summary} />

      {!hasChartData ? (
        <section className="card chart-card">
          <h2>Recursos Operativos</h2>
          <p className="muted">No hay datos para graficar en esta hoja.</p>
        </section>
      ) : (
        <section className="recursos-chart-grid">
          <DonutCard
            title="Estado de los moviles"
            data={data.estadoMoviles}
          />
          <HorizontalBarCard
            title="Moviles por cuadrante"
            data={data.movilesPorCuadrante}
            barName="Moviles"
            color="#1f4e79"
          />
          <HorizontalBarCard
            title="Chalecos por distrito"
            data={data.chalecosPorDistrito}
            barName="Chalecos"
            color="#2e7d59"
          />
          <HorizontalBarCard
            title="Moviles por distrito"
            data={data.movilesPorDistrito}
            barName="Moviles"
            color="#4ba3c7"
          />
          <ZonaComparisonCard data={data.zonaComparativa} />
        </section>
      )}
    </section>
  );
}

function RecursosSummaryCards({ summary }) {
  const cards = [
    {
      label: 'Moviles activos',
      value: formatNullableNumber(summary.movilesActivos),
    },
    {
      label: 'Moviles en reparacion',
      value: formatNullableNumber(summary.movilesReparacion),
    },
    {
      label: 'Moviles fuera de servicio',
      value: formatNullableNumber(summary.movilesFueraServicio),
    },
    {
      label: 'Chalecos disponibles',
      value: formatNullableNumber(summary.chalecosDisponibles),
    },
    {
      label: 'Fecha de actualizacion',
      value: summary.fechaActualizacion || '-',
    },
  ];

  return (
    <section className="recursos-summary-grid" aria-label="Resumen de recursos operativos">
      {cards.map((card) => (
        <article className="recursos-summary-card" key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </article>
      ))}
    </section>
  );
}

function DonutCard({ title, data }) {
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  return (
    <section className="card chart-card">
      <div className="table-heading">
        <h2>{title}</h2>
      </div>
      <div className="recursos-donut-wrapper">
        {data.length === 0 ? (
          <p className="muted">No hay datos para graficar.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="54%"
                outerRadius="78%"
                paddingAngle={3}
                label={renderPieLabel}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip total={total} />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function HorizontalBarCard({ title, data, barName, color }) {
  return (
    <section className="card chart-card">
      <div className="table-heading">
        <h2>{title}</h2>
      </div>
      <div
        className="recursos-horizontal-wrapper"
        style={{ height: getHorizontalChartHeight(data.length) }}
      >
        {data.length === 0 ? (
          <p className="muted">No hay datos para graficar.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 16, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={formatNumber} />
              <YAxis
                dataKey="name"
                type="category"
                width={88}
                tickLine={false}
                interval={0}
              />
              <Tooltip content={<BarTooltip seriesName={barName} />} />
              <Legend />
              <Bar
                dataKey="value"
                name={barName}
                fill={color}
                radius={[0, 8, 8, 0]}
                isAnimationActive
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function ZonaComparisonCard({ data }) {
  return (
    <section className="card chart-card recursos-wide-card">
      <div className="table-heading">
        <h2>Zona Norte vs Zona Sur</h2>
      </div>
      <div className="recursos-zona-wrapper">
        {data.length === 0 ? (
          <p className="muted">No hay datos para graficar.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 12, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="zona" tickLine={false} />
              <YAxis tickFormatter={formatNumber} />
              <Tooltip formatter={tooltipFormatter} />
              <Legend />
              <Bar
                dataKey="moviles"
                name="Moviles"
                fill="#1f4e79"
                radius={[8, 8, 0, 0]}
                isAnimationActive
              />
              <Bar
                dataKey="chalecos"
                name="Chalecos"
                fill="#2e7d59"
                radius={[8, 8, 0, 0]}
                isAnimationActive
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function PieTooltip({ active, payload, total }) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;
  const percentage = total > 0 ? (item.value / total) * 100 : 0;

  return (
    <div className="chart-tooltip">
      <strong>{item.name}</strong>
      <span>{formatNumber(item.value)} recursos</span>
      <span>{percentage.toFixed(1)}%</span>
    </div>
  );
}

function BarTooltip({ active, payload, seriesName }) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div className="chart-tooltip">
      <strong>{item.name}</strong>
      <span>
        {seriesName}: {formatNumber(item.value)}
      </span>
    </div>
  );
}

function renderPieLabel({ name, value, percent }) {
  if (!value) {
    return '';
  }

  return `${name}: ${formatNumber(value)} (${(percent * 100).toFixed(1)}%)`;
}

function tooltipFormatter(value, name) {
  return [formatNumber(value), name];
}

function getHorizontalChartHeight(length) {
  return Math.max(320, length * 30 + 92);
}

function formatNullableNumber(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return formatNumber(value);
}

function formatNumber(value) {
  return Number(value).toLocaleString('es-AR', {
    maximumFractionDigits: 0,
  });
}

export default RecursosOperativosCharts;
