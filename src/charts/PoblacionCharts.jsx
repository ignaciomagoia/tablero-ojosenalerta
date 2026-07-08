import {
  Bar,
  BarChart,
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

  return (
    <section className="poblacion-charts">
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
              stroke="#d45b2c"
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
              stroke="#1f6b4d"
              strokeWidth={3}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Poblacion objetivo vs adheridos">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartRows} margin={chartMargin()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="periodo" angle={-35} textAnchor="end" height={78} interval="preserveStartEnd" />
            <YAxis />
            <Tooltip formatter={numberTooltip} />
            <Legend />
            <Bar dataKey="poblacionObjetivo" name="Poblacion objetivo" fill="#1f6b4d" radius={[6, 6, 0, 0]} />
            <Bar dataKey="adheridos" name="Adheridos" fill="#d45b2c" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Cantidad de barrios incorporados">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartRows} margin={chartMargin()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="periodo" angle={-35} textAnchor="end" height={78} interval="preserveStartEnd" />
            <YAxis />
            <Tooltip formatter={numberTooltip} />
            <Legend />
            <Bar dataKey="cantidadBarrios" name="Cantidad de barrios" fill="#2f6f9f" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
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

function formatNumber(value) {
  return Number(value).toLocaleString('es-AR', {
    maximumFractionDigits: 2,
  });
}

function chartMargin() {
  return { top: 12, right: 24, left: 8, bottom: 24 };
}

export default PoblacionCharts;
