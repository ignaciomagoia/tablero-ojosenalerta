import { useEffect, useState } from 'react';
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
import { parseNumericValue } from '../utils/sheetNormalizer';

function SheetChart({ rows, columns, metadata, selectedSheetName }) {
  const [selectedMetric, setSelectedMetric] = useState('');
  const [chartType, setChartType] = useState('bar');
  const numericColumns = getUsableNumericColumns(rows, metadata);
  const labelColumn = getLabelColumn(columns, metadata, numericColumns);

  useEffect(() => {
    setSelectedMetric((currentMetric) => {
      if (numericColumns.includes(currentMetric)) {
        return currentMetric;
      }

      return numericColumns[0] ?? '';
    });

  }, [rows, selectedSheetName, numericColumns.join('|')]);

  if (!rows || rows.length === 0 || numericColumns.length === 0) {
    return (
      <section className="card chart-card">
        <h2>Grafico</h2>
        <p className="muted">
          No hay datos numericos para graficar en esta hoja.
        </p>
      </section>
    );
  }

  const activeMetric = numericColumns.includes(selectedMetric)
    ? selectedMetric
    : numericColumns[0];
  const chartRows = rows
    .map((row, index) => ({
      label: formatLabel(getChartLabel(row, labelColumn, metadata), index),
      value: getNumericValue(row[activeMetric]),
    }))
    .filter((row) => row.value !== null);
  const ChartComponent = chartType === 'line' ? LineChart : BarChart;

  if (chartRows.length === 0) {
    return (
      <section className="card chart-card">
        <h2>Grafico</h2>
        <p className="muted">
          No hay datos numericos para graficar en esta hoja.
        </p>
      </section>
    );
  }

  return (
    <section className="card chart-card">
      <div className="table-heading">
        <div>
          <h2>Grafico</h2>
          <p>{selectedSheetName}</p>
        </div>

        <div className="chart-controls">
          <label>
            Columna
            <select
              value={activeMetric}
              onChange={(event) => setSelectedMetric(event.target.value)}
            >
              {numericColumns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tipo
            <select
              value={chartType}
              onChange={(event) => setChartType(event.target.value)}
            >
              <option value="bar">Barras</option>
              <option value="line">Linea</option>
            </select>
          </label>
        </div>
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent
            data={chartRows}
            margin={{ top: 12, right: 24, left: 8, bottom: 12 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} />
            <YAxis tickLine={false} />
            <Tooltip />
            <Legend />
            {chartType === 'line' ? (
              <Line
                type="monotone"
                dataKey="value"
                name={activeMetric}
                stroke="#d45b2c"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
            ) : (
              <Bar
                dataKey="value"
                name={activeMetric}
                fill="#d45b2c"
                radius={[8, 8, 0, 0]}
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function getUsableNumericColumns(rows, metadata) {
  const detectedNumericColumns = metadata?.detectedNumericColumns ?? [];
  const generatedColumns = metadata?.generatedColumns ?? [];

  if (metadata?.parser === 'alertasParser') {
    return detectedNumericColumns;
  }

  return detectedNumericColumns.filter((column) => {
    const hasData = rows.some((row) => getNumericValue(row[column]) !== null);
    const isGeneratedWithoutData = generatedColumns.includes(column) && !hasData;

    return hasData && !isGeneratedWithoutData;
  });
}

function getLabelColumn(columns, metadata, numericColumns) {
  const detectedLabelColumns = metadata?.detectedLabelColumns ?? [];
  const firstDetectedLabel = detectedLabelColumns.find((column) =>
    columns.includes(column),
  );

  if (firstDetectedLabel) {
    return firstDetectedLabel;
  }

  return columns.find((column) => !numericColumns.includes(column)) ?? columns[0];
}

function getNumericValue(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  return parseNumericValue(value);
}

function getChartLabel(row, labelColumn, metadata) {
  if (metadata?.parser === 'alertasParser') {
    const month = row.mes ?? '';
    const year = row.anio ?? '';
    const label = `${month} ${year}`.trim();

    return label || row[labelColumn];
  }

  return row[labelColumn];
}

function formatLabel(value, index) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return `Fila ${index + 1}`;
  }

  return String(value);
}

export default SheetChart;
