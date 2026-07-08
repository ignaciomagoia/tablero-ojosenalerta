import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const COLORS = ['#d45b2c', '#1f6b4d', '#2f6f9f'];

export function formatPeriodo(row) {
  return `${row.mes} ${row.anio}`;
}

function TipologiaCharts({ rows }) {
  const chartRows = getSortedRows(rows);
  const years = getAvailableYears(chartRows);
  const [selectedYear, setSelectedYear] = useState('all');

  useEffect(() => {
    if (selectedYear === 'all' || years.includes(selectedYear)) {
      return;
    }

    setSelectedYear('all');
  }, [selectedYear, years.join('|')]);

  if (chartRows.length === 0) {
    return (
      <section className="card chart-card">
        <h2>Graficos de tipologia</h2>
        <p className="muted">No hay datos para graficar en esta hoja.</p>
      </section>
    );
  }

  const filteredRows = selectedYear === 'all'
    ? chartRows
    : chartRows.filter((row) => String(row.anio) === selectedYear);
  const periodLabel = selectedYear === 'all' ? 'Historico' : selectedYear;
  const periodRows = filteredRows.map((row) => ({
    ...row,
    periodo: formatPeriodo(row),
  }));
  const typeTotals = buildPieData([
    { name: 'Prevencion', value: sumColumn(filteredRows, 'prevencion') },
    { name: 'Persecucion', value: sumColumn(filteredRows, 'persecucion') },
    { name: '107', value: sumColumn(filteredRows, 'codigo107') },
  ]);
  const mediaTotals = buildPieData([
    { name: 'Whatsapp', value: sumColumn(filteredRows, 'whatsapp') },
    { name: 'Radio', value: sumColumn(filteredRows, 'radio') },
    { name: 'Videovigilancia', value: sumColumn(filteredRows, 'videovigilancia') },
  ]);

  return (
    <section className="tipologia-charts">
      <section className="card chart-card executive-filter-card">
        <div>
          <h2>Analisis ejecutivo de tipologia</h2>
          <p className="muted">
            Totales acumulados por tipologia y medio de ingreso.
          </p>
        </div>
        <label>
          Periodo
          <select
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value)}
          >
            <option value="all">Todos</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </section>

      <ChartCard title="Evolucion mensual de alertas">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={periodRows} margin={chartMargin()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="periodo" angle={-35} textAnchor="end" height={78} interval="preserveStartEnd" />
            <YAxis />
            <Tooltip formatter={numberTooltip} />
            <Legend />
            <Line
              type="monotone"
              dataKey="totalAlertas"
              name="Total alertas"
              stroke="#d45b2c"
              strokeWidth={3}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="pie-chart-grid">
        <PieChartCard
          title={`Distribucion por tipologia (${periodLabel})`}
          data={typeTotals}
        />
        <PieChartCard
          title={`Distribucion por medio de ingreso (${periodLabel})`}
          data={mediaTotals}
        />
      </div>
    </section>
  );
}

function ChartCard({ title, children }) {
  return (
    <section className="card chart-card">
      <div className="table-heading">
        <h2>{title}</h2>
      </div>
      <div className="chart-wrapper tipologia-chart-wrapper">{children}</div>
    </section>
  );
}

function PieChartCard({ title, data }) {
  return (
    <section className="card chart-card executive-pie-card">
      <div className="table-heading">
        <h2>{title}</h2>
      </div>
      <div className="chart-wrapper pie-chart-wrapper">
        {data.length === 0 ? (
          <p className="muted">No hay datos acumulados para mostrar.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<PieTooltip />} />
              <Legend formatter={legendFormatter} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="52%"
                outerRadius="78%"
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div className="chart-tooltip">
      <strong>{item.name}</strong>
      <span>{formatNumber(item.value)} casos</span>
      <span>{formatPercent(item.percent)}%</span>
    </div>
  );
}

function getSortedRows(rows) {
  return [...rows].sort((leftRow, rightRow) =>
    String(leftRow.fechaOrden).localeCompare(String(rightRow.fechaOrden)),
  );
}

function getAvailableYears(rows) {
  return Array.from(new Set(rows.map((row) => String(row.anio))))
    .filter((year) => /^\d{4}$/.test(year))
    .sort();
}

function buildPieData(items) {
  const positiveItems = items.filter((item) => item.value > 0);
  const total = positiveItems.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return [];
  }

  return positiveItems.map((item) => ({
    ...item,
    percent: (item.value / total) * 100,
  }));
}

function sumColumn(rows, column) {
  return rows.reduce((total, row) => total + (Number(row[column]) || 0), 0);
}

function legendFormatter(value, entry) {
  const item = entry?.payload;

  if (!item) {
    return value;
  }

  return `${value}: ${formatNumber(item.value)} (${formatPercent(item.percent)}%)`;
}

function numberTooltip(value, name) {
  return [formatNumber(value), name];
}

function formatNumber(value) {
  return Number(value).toLocaleString('es-AR', {
    maximumFractionDigits: 0,
  });
}

function formatPercent(value) {
  return Number(value).toLocaleString('es-AR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
}

function chartMargin() {
  return { top: 12, right: 24, left: 8, bottom: 24 };
}

export default TipologiaCharts;
