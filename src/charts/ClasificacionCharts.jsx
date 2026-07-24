import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
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

const COLORS = ['#1f4e79', '#4ba3c7', '#2e7d59', '#d9822b', '#b64a4a'];
const LINE_COLORS = [
  '#1f4e79',
  '#4ba3c7',
  '#2e7d59',
  '#d9822b',
  '#b64a4a',
  '#6c7a89',
  '#7aa95c',
  '#315d73',
];
const PREFERRED_MONTHLY_TYPES = [
  'DISTURBIOS',
  'SOSPECHOSO',
  'SOLICITUD DE PRESENCIA POLICIAL',
  'ROBO',
  'VIOLENCIA',
];
const TOP_OPTIONS = [
  { label: 'Top 10', value: 10 },
  { label: 'Top 15', value: 15 },
  { label: 'Top 20', value: 20 },
  { label: 'Todos', value: 'all' },
];
const PERIOD_OPTIONS = [
  { label: 'Año completo', value: 'all' },
  { label: 'Enero', value: 'Enero' },
  { label: 'Febrero', value: 'Febrero' },
  { label: 'Marzo', value: 'Marzo' },
  { label: 'Abril', value: 'Abril' },
  { label: 'Mayo', value: 'Mayo' },
  { label: 'Junio', value: 'Junio' },
  { label: 'Julio', value: 'Julio' },
  { label: 'Agosto', value: 'Agosto' },
  { label: 'Septiembre', value: 'Septiembre' },
  { label: 'Octubre', value: 'Octubre' },
  { label: 'Noviembre', value: 'Noviembre' },
  { label: 'Diciembre', value: 'Diciembre' },
];

function ClasificacionCharts({ resumenAnual, detalleMensual }) {
  const years = getAvailableYears(resumenAnual, detalleMensual);
  const types = getAvailableTypes(resumenAnual, detalleMensual);
  const [rankingYear, setRankingYear] = useState(years.at(-1) ?? '');
  const [rankingPeriod, setRankingPeriod] = useState('all');
  const [rankingLimit, setRankingLimit] = useState(10);
  const [comparisonType, setComparisonType] = useState(types[0] ?? '');
  const [monthlyType, setMonthlyType] = useState(types[0] ?? '');
  const [selectedMonthlyTypes, setSelectedMonthlyTypes] = useState(
    PREFERRED_MONTHLY_TYPES,
  );
  const [pieYear, setPieYear] = useState(years.at(-1) ?? '');
  const [piePeriod, setPiePeriod] = useState('all');

  useEffect(() => {
    setRankingYear((currentYear) =>
      years.includes(currentYear) ? currentYear : years.at(-1) ?? '',
    );
    setPieYear((currentYear) =>
      years.includes(currentYear) ? currentYear : years.at(-1) ?? '',
    );
  }, [years.join('|')]);

  useEffect(() => {
    setComparisonType((currentType) =>
      types.includes(currentType) ? currentType : types[0] ?? '',
    );
    setMonthlyType((currentType) =>
      types.includes(currentType) ? currentType : types[0] ?? '',
    );
  }, [types.join('|')]);

  useEffect(() => {
    setSelectedMonthlyTypes((currentTypes) => {
      const validCurrentTypes = currentTypes.filter((type) =>
        types.includes(type),
      );

      return validCurrentTypes.length > 0
        ? validCurrentTypes
        : PREFERRED_MONTHLY_TYPES.filter((type) => types.includes(type));
    });
  }, [detalleMensual.length, types.join('|')]);

  if (resumenAnual.length === 0 && detalleMensual.length === 0) {
    return (
      <section className="card chart-card">
        <h2>Graficos de clasificacion</h2>
        <p className="muted">No hay datos para graficar en esta hoja.</p>
      </section>
    );
  }

  const rankingPeriodLabel = getPeriodLabel(rankingYear, rankingPeriod);
  const piePeriodLabel = getPeriodLabel(pieYear, piePeriod);
  const rankingRows = getRankingRows(
    resumenAnual,
    detalleMensual,
    rankingYear,
    rankingPeriod,
    rankingLimit,
  );
  const comparisonRows = comparisonType
    ? [getComparisonRow(resumenAnual, comparisonType, years)]
    : [];
  const monthlyRows = getMonthlyRows(detalleMensual, monthlyType);
  const monthlyTypeOptions = getTypesByMonthlyTotal(detalleMensual);
  const visibleMonthlyTypes = selectedMonthlyTypes.filter((type) =>
    monthlyTypeOptions.includes(type),
  );
  const monthlyComparisonRows = getMonthlyComparisonRows(
    detalleMensual,
    visibleMonthlyTypes,
  );
  const pieRows = getPieRows(
    resumenAnual,
    detalleMensual,
    pieYear,
    piePeriod,
  );

  return (
    <section className="clasificacion-charts">
      <ChartCard
        title="Evolucion mensual de clasificaciones"
        height={420}
      >
        <CompactTypeEditor
          values={selectedMonthlyTypes}
          onChange={setSelectedMonthlyTypes}
          options={monthlyTypeOptions.map((type) => ({
            label: type,
            value: type,
          }))}
        />
        {monthlyComparisonRows.length === 0 || visibleMonthlyTypes.length === 0 ? (
          <p className="muted">No hay datos para las clasificaciones seleccionadas.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyComparisonRows} margin={chartMargin()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="periodo" angle={-35} textAnchor="end" height={86} interval="preserveStartEnd" />
              <YAxis />
              <Tooltip />
              <Legend />
              {visibleMonthlyTypes.map((type) => (
                <Line
                  key={type}
                  type="monotone"
                  dataKey={type}
                  name={type}
                  stroke={getMonthlyTypeColor(type)}
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title={`Ranking de tipos de alerta - ${rankingPeriodLabel}`}
        controls={(
          <>
            <SelectControl
              label="Año"
              value={rankingYear}
              onChange={setRankingYear}
              options={years.map((year) => ({ label: year, value: year }))}
            />
            <SelectControl
              label="Mes"
              value={rankingPeriod}
              onChange={setRankingPeriod}
              options={PERIOD_OPTIONS}
            />
            <SelectControl
              label="Cantidad"
              value={rankingLimit}
              onChange={(value) => setRankingLimit(value === 'all' ? 'all' : Number(value))}
              options={TOP_OPTIONS}
            />
          </>
        )}
        height={getRankingChartHeight(rankingRows.length)}
      >
        {rankingRows.length === 0 ? (
          <p className="muted">No hay datos para el periodo seleccionado.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rankingRows}
              layout="vertical"
              margin={{ top: 12, right: 24, left: 150, bottom: 12 }}
              barCategoryGap={8}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis
                dataKey="tipo"
                type="category"
                width={220}
                interval={0}
                tickLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={formatRankingLabel}
              />
              <Tooltip />
              <Legend />
              <Bar dataKey="cantidad" name={rankingPeriodLabel} fill="#1f4e79" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Comparación anual por tipo"
        controls={(
          <SelectControl
            label="Tipo"
            value={comparisonType}
            onChange={setComparisonType}
            options={types.map((type) => ({ label: type, value: type }))}
          />
        )}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={comparisonRows} margin={chartMargin()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tipo" />
            <YAxis />
            <Tooltip />
            <Legend />
            {years.map((year, index) => (
              <Bar
                key={year}
                dataKey={year}
                name={year}
                fill={COLORS[index % COLORS.length]}
                radius={[6, 6, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Evolución mensual por tipo"
        controls={(
          <SelectControl
            label="Tipo"
            value={monthlyType}
            onChange={setMonthlyType}
            options={types.map((type) => ({ label: type, value: type }))}
          />
        )}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthlyRows} margin={chartMargin()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="periodo" angle={-35} textAnchor="end" height={78} interval="preserveStartEnd" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="cantidad"
              name={monthlyType}
              stroke="#1f4e79"
              strokeWidth={3}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title={`Distribución de clasificaciones - ${piePeriodLabel}`}
        controls={(
          <>
            <SelectControl
              label="Año"
              value={pieYear}
              onChange={setPieYear}
              options={years.map((year) => ({ label: year, value: year }))}
            />
            <SelectControl
              label="Mes"
              value={piePeriod}
              onChange={setPiePeriod}
              options={PERIOD_OPTIONS}
            />
          </>
        )}
      >
        {pieRows.length === 0 ? (
          <p className="muted">No hay datos para el periodo seleccionado.</p>
        ) : (
          <AnnualDistributionChart rows={pieRows} />
        )}
      </ChartCard>
    </section>
  );
}

function ChartCard({ title, controls, height = 360, children }) {
  return (
    <section className="card chart-card">
      <div className="table-heading">
        <h2>{title}</h2>
        {controls && <div className="chart-controls">{controls}</div>}
      </div>
      <div className="chart-wrapper clasificacion-chart-wrapper" style={{ height }}>
        {children}
      </div>
    </section>
  );
}

function SelectControl({ label, value, options, onChange }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CompactTypeEditor({ values, options, onChange }) {
  return (
    <details className="compact-type-editor">
      <summary>Editar tipos</summary>
      <label>
        Tipos
        <select
          multiple
          value={values}
          size={Math.min(Math.max(options.length, 4), 8)}
          onChange={(event) =>
            onChange(
              Array.from(event.target.selectedOptions).map(
                (option) => option.value,
              ),
            )
          }
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="control-hint">Ctrl + click para elegir varios.</span>
      </label>
    </details>
  );
}

function AnnualDistributionChart({ rows }) {
  return (
    <div className="annual-distribution-layout">
      <div className="annual-distribution-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ClasificacionPieTooltip />} />
            <Pie
              data={rows}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={2}
              labelLine={false}
            >
              {rows.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ol className="annual-distribution-list">
        {rows.map((row, index) => (
          <li key={row.name}>
            <span
              className="distribution-color"
              style={{ background: COLORS[index % COLORS.length] }}
              aria-hidden="true"
            />
            <span className="distribution-name">{row.name}</span>
            <strong>{formatPercentage(row.percentage)}</strong>
            <span className="distribution-value">({formatNumber(row.value)})</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function getAvailableYears(resumenAnual, detalleMensual) {
  return Array.from(
    new Set(
      [
        ...resumenAnual.flatMap((row) =>
          Object.keys(row).filter((key) => /^(19|20)\d{2}$/.test(key)),
        ),
        ...detalleMensual
          .map((row) => String(row.anio))
          .filter((year) => /^(19|20)\d{2}$/.test(year)),
      ],
    ),
  ).sort();
}

function getAvailableTypes(resumenAnual, detalleMensual) {
  return Array.from(
    new Set([
      ...resumenAnual.map((row) => row.tipo),
      ...detalleMensual.map((row) => row.tipo),
    ]),
  ).filter(Boolean).sort((left, right) => left.localeCompare(right));
}

function getTypesByMonthlyTotal(detalleMensual) {
  const totalByType = detalleMensual.reduce((totals, row) => {
    const type = row.tipo;

    if (!type) {
      return totals;
    }

    totals[type] = (totals[type] ?? 0) + (Number(row.cantidad) || 0);

    return totals;
  }, {});

  return Object.entries(totalByType)
    .sort((leftEntry, rightEntry) => rightEntry[1] - leftEntry[1])
    .map(([type]) => type);
}

function getMonthlyComparisonRows(detalleMensual, selectedTypes) {
  const selectedTypesSet = new Set(selectedTypes);
  const rowsByDate = detalleMensual.reduce((rows, row) => {
    if (!selectedTypesSet.has(row.tipo)) {
      return rows;
    }

    const key = row.fechaOrden;

    if (!rows[key]) {
      rows[key] = {
        fechaOrden: row.fechaOrden,
        periodo: `${row.mes} ${row.anio}`,
      };
    }

    rows[key][row.tipo] = (rows[key][row.tipo] ?? 0) + (Number(row.cantidad) || 0);

    return rows;
  }, {});

  return Object.values(rowsByDate)
    .map((row) => {
      selectedTypes.forEach((type) => {
        row[type] = row[type] ?? 0;
      });

      return row;
    })
    .sort((leftRow, rightRow) =>
      leftRow.fechaOrden.localeCompare(rightRow.fechaOrden),
    );
}

function getMonthlyTypeColor(type) {
  const preferredIndex = PREFERRED_MONTHLY_TYPES.indexOf(type);

  if (preferredIndex !== -1) {
    return LINE_COLORS[preferredIndex % LINE_COLORS.length];
  }

  return LINE_COLORS[Math.abs(hashText(type)) % LINE_COLORS.length];
}

function hashText(text) {
  return String(text)
    .split('')
    .reduce((hash, character) => hash + character.charCodeAt(0), 0);
}

function getRankingRows(resumenAnual, detalleMensual, year, period, limit) {
  const rows = getPeriodTypeTotals(resumenAnual, detalleMensual, year, period)
    .filter((row) => row.cantidad > 0)
    .sort((leftRow, rightRow) => rightRow.cantidad - leftRow.cantidad);

  return limit === 'all' ? rows : rows.slice(0, limit);
}

function getRankingChartHeight(rowCount) {
  return Math.max(420, rowCount * 42 + 80);
}

function formatRankingLabel(value) {
  const text = String(value ?? '');

  return text.length > 30 ? `${text.slice(0, 29)}...` : text;
}

function getComparisonRow(resumenAnual, type, years) {
  const sourceRow = resumenAnual.find((row) => row.tipo === type) ?? {};

  return years.reduce(
    (row, year) => ({
      ...row,
      [year]: Number(sourceRow[year]) || 0,
    }),
    { tipo: type },
  );
}

function getMonthlyRows(detalleMensual, type) {
  return detalleMensual
    .filter((row) => row.tipo === type)
    .sort((leftRow, rightRow) =>
      leftRow.fechaOrden.localeCompare(rightRow.fechaOrden),
    )
    .map((row) => ({
      ...row,
      periodo: `${row.mes} ${row.anio}`,
    }));
}

function getPieRows(resumenAnual, detalleMensual, year, period) {
  const sortedRows = getPeriodTypeTotals(
    resumenAnual,
    detalleMensual,
    year,
    period,
  )
    .map((row) => ({
      name: row.tipo,
      value: row.cantidad,
    }))
    .filter((row) => row.value > 0)
    .sort((leftRow, rightRow) => rightRow.value - leftRow.value);
  const totalPeriodo = sortedRows.reduce((total, row) => total + row.value, 0);
  const topRows = sortedRows.slice(0, 10);
  const otherValue = sortedRows
    .slice(10)
    .reduce((total, row) => total + row.value, 0);
  const rowsWithOthers = otherValue > 0
    ? [...topRows, { name: 'Otros', value: otherValue }]
    : topRows;

  return rowsWithOthers.map((row) => ({
    ...row,
    totalPeriodo,
    percentage: totalPeriodo > 0 ? (row.value / totalPeriodo) * 100 : 0,
  }));
}

function getPeriodTypeTotals(resumenAnual, detalleMensual, year, period) {
  if (!year) {
    return [];
  }

  if (period === 'all') {
    return resumenAnual.map((row) => ({
      tipo: row.tipo,
      cantidad: Number(row[year]) || 0,
    }));
  }

  const totalsByType = detalleMensual.reduce((totals, row) => {
    if (String(row.anio) !== String(year) || row.mes !== period) {
      return totals;
    }

    totals[row.tipo] = (totals[row.tipo] ?? 0) + (Number(row.cantidad) || 0);

    return totals;
  }, {});

  return Object.entries(totalsByType).map(([tipo, cantidad]) => ({
    tipo,
    cantidad,
  }));
}

function getPeriodLabel(year, period) {
  if (!year) {
    return 'Sin periodo';
  }

  return period === 'all' ? `Año ${year}` : `${period} ${year}`;
}

function ClasificacionPieTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div className="chart-tooltip">
      <strong>{item.name}</strong>
      <span>{formatPercentage(item.percentage)}</span>
      <span>({formatNumber(item.value)})</span>
    </div>
  );
}

function formatPercentage(value) {
  return `${Number(value).toLocaleString('es-AR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function formatNumber(value) {
  return Number(value).toLocaleString('es-AR', {
    maximumFractionDigits: 0,
  });
}

function chartMargin() {
  return { top: 12, right: 24, left: 8, bottom: 24 };
}

export default ClasificacionCharts;
