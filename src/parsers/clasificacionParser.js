const MONTHS = {
  ENERO: { name: 'Enero', number: '01' },
  FEBRERO: { name: 'Febrero', number: '02' },
  MARZO: { name: 'Marzo', number: '03' },
  ABRIL: { name: 'Abril', number: '04' },
  MAYO: { name: 'Mayo', number: '05' },
  JUNIO: { name: 'Junio', number: '06' },
  JULIO: { name: 'Julio', number: '07' },
  AGOSTO: { name: 'Agosto', number: '08' },
  SEPTIEMBRE: { name: 'Septiembre', number: '09' },
  SETIEMBRE: { name: 'Septiembre', number: '09' },
  OCTUBRE: { name: 'Octubre', number: '10' },
  NOVIEMBRE: { name: 'Noviembre', number: '11' },
  DICIEMBRE: { name: 'Diciembre', number: '12' },
};

export const CLASIFICACION_PARSER_VERSION = 2;

export const CLASIFICACION_DETALLE_COLUMNS = [
  'anio',
  'mes',
  'tipo',
  'cantidad',
  'fechaOrden',
];

export function parseClasificacionSheet(matrix) {
  return {
    type: 'clasificacion',
    resumenAnual: parseResumenAnual(matrix),
    detalleMensual: parseDetalleMensual(matrix),
  };
}

export function isClasificacionSheet(sheetName) {
  return normalizeText(sheetName).includes('CLASIFICACION');
}

export function parseNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (value === null || value === undefined) {
    return null;
  }

  const rawValue = String(value).trim();

  if (rawValue === '') {
    return null;
  }

  if (/^-+$/.test(rawValue)) {
    return 0;
  }

  let normalizedValue = rawValue
    .replace(/\s/g, '')
    .replace(/[$\u20ac\u00a3]/g, '');

  if (!/^-?[\d,.]+$/.test(normalizedValue)) {
    return null;
  }

  const hasComma = normalizedValue.includes(',');
  const hasDot = normalizedValue.includes('.');

  if (hasComma && hasDot) {
    const lastComma = normalizedValue.lastIndexOf(',');
    const lastDot = normalizedValue.lastIndexOf('.');
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';

    normalizedValue = normalizedValue.split(thousandsSeparator).join('');
    normalizedValue = normalizedValue.replace(decimalSeparator, '.');
  } else if (hasComma) {
    normalizedValue = /^-?\d{1,3}(,\d{3})+$/.test(normalizedValue)
      ? normalizedValue.replace(/,/g, '')
      : normalizedValue.replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(normalizedValue)) {
    normalizedValue = normalizedValue.replace(/\./g, '');
  }

  const number = Number(normalizedValue);

  return Number.isFinite(number) ? number : null;
}

function parseResumenAnual(matrix) {
  const header = findResumenHeader(matrix);

  if (!header) {
    return [];
  }

  const rows = [];

  for (let rowIndex = header.index + 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex] ?? [];
    const type = cleanValue(row[header.typeColumn]);

    if (isStrongEmptyRow(row) || isTotalRow(type) || isYearOnlyRow(row)) {
      break;
    }

    if (!type || normalizeText(type) === 'TIPO') {
      continue;
    }

    const record = { tipo: type };
    let hasValue = false;

    header.yearColumns.forEach(({ year, columnIndex }) => {
      const value = parseNumber(row[columnIndex]);
      record[year] = value;

      if (value !== null) {
        hasValue = true;
      }
    });

    if (hasValue) {
      rows.push(record);
    }
  }

  return rows;
}

function parseDetalleMensual(matrix) {
  const detailRows = [];

  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    const year = findBlockYearInRow(matrix[rowIndex]);

    if (year === null) {
      continue;
    }

    const header = findMonthlyHeader(matrix, rowIndex + 1, rowIndex + 6);

    if (!header) {
      continue;
    }

    const { rows, endIndex } = parseMonthlyBlock(matrix, header, year);

    detailRows.push(...rows);
    rowIndex = Math.max(rowIndex, endIndex - 1);
  }

  return detailRows.sort((leftRow, rightRow) => {
    const dateSort = leftRow.fechaOrden.localeCompare(rightRow.fechaOrden);

    return dateSort === 0 ? leftRow.tipo.localeCompare(rightRow.tipo) : dateSort;
  });
}

function findResumenHeader(matrix) {
  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex] ?? [];
    const typeColumn = row.findIndex((cell) => normalizeText(cell) === 'TIPO');

    if (typeColumn === -1) {
      continue;
    }

    const yearColumns = row
      .map((cell, columnIndex) => ({
        year: parseYear(cell),
        columnIndex,
      }))
      .filter(({ year, columnIndex }) => year !== null && columnIndex > typeColumn)
      .map(({ year, columnIndex }) => ({ year: String(year), columnIndex }));

    if (yearColumns.length > 0) {
      return { index: rowIndex, typeColumn, yearColumns };
    }
  }

  return null;
}

function findMonthlyHeader(matrix, startIndex, endIndex) {
  for (
    let rowIndex = startIndex;
    rowIndex < matrix.length && rowIndex <= endIndex;
    rowIndex += 1
  ) {
    const row = matrix[rowIndex] ?? [];
    const typeColumn = row.findIndex((cell) => normalizeText(cell) === 'TIPO');

    if (typeColumn === -1) {
      continue;
    }

    const monthColumns = row
      .map((cell, columnIndex) => ({
        month: normalizeMonthName(cell),
        columnIndex,
      }))
      .filter(({ month, columnIndex }) => month && columnIndex > typeColumn);

    if (monthColumns.length > 0) {
      return { index: rowIndex, typeColumn, monthColumns };
    }
  }

  return null;
}

function parseMonthlyBlock(matrix, header, year) {
  const rows = [];
  let endIndex = header.index + 1;

  for (let rowIndex = header.index + 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex] ?? [];
    const type = cleanValue(row[header.typeColumn]);

    if (isStrongEmptyRow(row) || isYearOnlyRow(row)) {
      endIndex = rowIndex;
      break;
    }

    if (!type || normalizeText(type) === 'TIPO') {
      continue;
    }

    if (isTotalRow(type)) {
      endIndex = rowIndex + 1;
      break;
    }

    const monthlyValues = header.monthColumns.map(({ month, columnIndex }) => ({
      month,
      value: parseNumber(row[columnIndex]),
    }));
    const hasAnyMonthData = monthlyValues.some(
      ({ value }) => value !== null && value !== 0,
    );

    if (!hasAnyMonthData) {
      continue;
    }

    monthlyValues.forEach(({ month, value }) => {
      if (value === null) {
        return;
      }

      rows.push({
        anio: year,
        mes: month,
        tipo: type,
        cantidad: value,
        fechaOrden: `${year}-${getMonthNumber(month)}`,
      });
    });

    endIndex = rowIndex + 1;
  }

  return { rows, endIndex };
}

function parseYear(value) {
  const cleanedValue = cleanValue(value);
  const yearMatch = cleanedValue.match(/(19|20)\d{2}/);

  return yearMatch ? Number(yearMatch[0]) : null;
}

function isYearOnlyRow(row = []) {
  const usefulCells = row.map(cleanValue).filter(Boolean);

  return usefulCells.length <= 2 && findBlockYearInRow(row) !== null;
}

function findBlockYearInRow(row = []) {
  const usefulCells = row.map(cleanValue).filter(Boolean);

  if (
    usefulCells.length === 0 ||
    usefulCells.length > 2 ||
    usefulCells.some((cell) => normalizeText(cell) === 'TIPO')
  ) {
    return null;
  }

  const years = Array.from(
    new Set(
      usefulCells
        .map(parseYear)
        .filter((year) => year !== null),
    ),
  );

  return years.length === 1 ? years[0] : null;
}

function isStrongEmptyRow(row = []) {
  return row.every((cell) => cleanValue(cell) === '');
}

function isTotalRow(value) {
  const normalizedValue = normalizeText(value);

  return normalizedValue.includes('TOTAL');
}

function normalizeMonthName(value) {
  return MONTHS[normalizeText(value)]?.name ?? '';
}

function getMonthNumber(monthName) {
  return MONTHS[normalizeText(monthName)]?.number ?? '';
}

function cleanValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).replace(/\s+/g, ' ').trim();
}

function normalizeText(value) {
  return cleanValue(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}
