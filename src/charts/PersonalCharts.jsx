import { useState } from 'react';
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

const COLORS = ['#1f4e79', '#4ba3c7', '#2e7d59', '#d9822b', '#b64a4a'];
const DISTRICT_METRICS = [
  {
    key: 'policial',
    label: 'Policia',
    color: '#1f4e79',
  },
  {
    key: 'etac',
    label: 'ETAC',
    color: '#4ba3c7',
  },
  {
    key: 'civil',
    label: 'Civil',
    color: '#2e7d59',
  },
];

function PersonalCharts({ data }) {
  const [selectedDistrictMetric, setSelectedDistrictMetric] = useState('policial');
  const summary = data?.summary ?? {};
  const districtMetric = DISTRICT_METRICS.find(
    (metric) => metric.key === selectedDistrictMetric,
  ) ?? DISTRICT_METRICS[0];
  const districtRows = getDistrictRows(data?.personalPorDistrito ?? [], districtMetric.key);
  const hasChartData = [
    data?.distribucionPersonal,
    data?.personalPorZona,
    data?.personalPolicialPorCuadrante,
    data?.etacPorCuadrante,
    data?.personalCivilPorCuadrante,
    districtRows,
  ].some((dataset) => Array.isArray(dataset) && dataset.length > 0);

  return (
    <section className="recursos-charts">
      <PersonalSummaryCards summary={summary} />

      {!hasChartData ? (
        <section className="card chart-card">
          <h2>Personal</h2>
          <p className="muted">No hay datos para graficar en esta hoja.</p>
        </section>
      ) : (
        <section className="recursos-chart-grid">
          <DonutCard
            title="Distribucion del personal"
            data={data.distribucionPersonal ?? []}
          />
          <ZonaGroupedBars data={data.personalPorZona ?? []} />
          <HorizontalBarCard
            title="Personal policial por cuadrante"
            data={data.personalPolicialPorCuadrante ?? []}
            barName="Policia"
            color="#1f4e79"
          />
          <HorizontalBarCard
            title="ETAC por cuadrante"
            data={data.etacPorCuadrante ?? []}
            barName="ETAC"
            color="#4ba3c7"
          />
          <HorizontalBarCard
            title="Personal civil por cuadrante"
            data={data.personalCivilPorCuadrante ?? []}
            barName="Civil"
            color="#2e7d59"
          />
          <DistritoChart
            data={districtRows}
            metric={districtMetric}
            selectedMetric={selectedDistrictMetric}
            onSelectMetric={setSelectedDistrictMetric}
          />
        </section>
      )}
    </section>
  );
}

function PersonalSummaryCards({ summary }) {
  const cards = [
    {
      label: 'Policias',
      value: formatNullableNumber(summary.policial),
    },
    {
      label: 'ETAC',
      value: formatNullableNumber(summary.etac),
    },
    {
      label: 'Personal Civil',
      value: formatNullableNumber(summary.civil),
    },
    {
      label: 'Total general',
      value: formatNullableNumber(summary.totalGeneral),
    },
    ...(summary.optionalCards ?? []).map((card) => ({
      label: card.label,
      value: formatNullableNumber(card.value),
    })),
  ];

  return (
    <section className="recursos-summary-grid" aria-label="Resumen de personal">
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
  const visibleData = data.filter((item) => Number(item.value) > 0);
  const total = visibleData.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  return (
    <section className="card chart-card">
      <div className="table-heading">
        <h2>{title}</h2>
      </div>
      <div className="recursos-donut-wrapper">
        {visibleData.length === 0 ? (
          <p className="muted">No hay datos para graficar.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={visibleData}
                dataKey="value"
                nameKey="name"
                innerRadius="54%"
                outerRadius="78%"
                paddingAngle={3}
                label={renderPieLabel}
              >
                {visibleData.map((entry, index) => (
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

function ZonaGroupedBars({ data }) {
  return (
    <section className="card chart-card">
      <div className="table-heading">
        <h2>Comparacion por zona</h2>
      </div>
      <div className="recursos-zona-wrapper">
        {data.length === 0 ? (
          <p className="muted">No hay datos para graficar.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 12, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tickLine={false} />
              <YAxis tickFormatter={formatNumber} />
              <Tooltip formatter={tooltipFormatter} />
              <Legend />
              <Bar
                dataKey="policial"
                name="Policia"
                fill="#1f4e79"
                radius={[8, 8, 0, 0]}
                isAnimationActive
              />
              <Bar
                dataKey="etac"
                name="ETAC"
                fill="#4ba3c7"
                radius={[8, 8, 0, 0]}
                isAnimationActive
              />
              <Bar
                dataKey="civil"
                name="Civil"
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

function DistritoChart({ data, metric, selectedMetric, onSelectMetric }) {
  return (
    <section className="card chart-card recursos-wide-card">
      <div className="table-heading">
        <h2>Personal por distrito</h2>
        <div className="chart-controls">
          <label>
            Tipo
            <select
              value={selectedMetric}
              onChange={(event) => onSelectMetric(event.target.value)}
            >
              {DISTRICT_METRICS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
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
              <Tooltip content={<BarTooltip seriesName={metric.label} />} />
              <Legend />
              <Bar
                dataKey="value"
                name={metric.label}
                fill={metric.color}
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

function PieTooltip({ active, payload, total }) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;
  const percentage = total > 0 ? (item.value / total) * 100 : 0;

  return (
    <div className="chart-tooltip">
      <strong>{item.name}</strong>
      <span>{formatNumber(item.value)} personas</span>
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
  return `${name}: ${formatNumber(value)} (${(percent * 100).toFixed(1)}%)`;
}

function tooltipFormatter(value, name) {
  return [formatNumber(value), name];
}

function getDistrictRows(rows, metric) {
  return rows
    .map((row) => ({
      name: row.name,
      value: Number(row[metric]) || 0,
    }))
    .filter((row) => row.value > 0)
    .sort((left, right) => {
      if (right.value !== left.value) {
        return right.value - left.value;
      }

      return String(left.name).localeCompare(String(right.name), 'es', {
        numeric: true,
      });
    });
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

export default PersonalCharts;
