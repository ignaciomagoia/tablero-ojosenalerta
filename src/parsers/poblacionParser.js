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

export const POBLACION_PARSER_VERSION = 1;

export const POBLACION_SHEET_COLUMNS = [
  'anio',
  'mes',
  'cantidadBarrios',
  'poblacion',
  'poblacionObjetivo',
  'adheridos',
  'porcentajePoblacionObjetivoAdherida',
  'fechaOrden',
];

export const POBLACION_NUMERIC_COLUMNS = [
  'cantidadBarrios',
  'poblacion',
  'poblacionObjetivo',
  'adheridos',
  'porcentajePoblacionObjetivoAdherida',
];

export function parsePoblacionSheet(matrix) {
  let currentYear = null;

  return matrix
    .reduce((rows, row) => {
      if (!Array.isArray(row) || isEmptyRow(row.slice(0, 7))) {
        return rows;
      }

      const year = parseYear(row[0]);
      const monthName = normalizeMonthName(row[1]);

      if (year !== null) {
        currentYear = year;
      }

      if (!monthName || currentYear === null) {
        return rows;
      }

      const record = {
        anio: currentYear,
        mes: monthName,
        cantidadBarrios: parseNumber(row[2]),
        poblacion: parseNumber(row[3]),
        poblacionObjetivo: parseNumber(row[4]),
        adheridos: parseNumber(row[5]),
        porcentajePoblacionObjetivoAdherida: parseNumber(row[6]),
        fechaOrden: `${currentYear}-${getMonthNumber(monthName)}`,
      };

      if (!hasRealData(record)) {
        return rows;
      }

      rows.push(record);

      return rows;
    }, [])
    .sort((leftRow, rightRow) =>
      leftRow.fechaOrden.localeCompare(rightRow.fechaOrden),
    );
}

export function isPoblacionSheet(sheetName) {
  const normalizedSheetName = normalizeText(sheetName);

  return normalizedSheetName.includes('POBLACION') ||
    normalizedSheetName.includes('ADHERIDOS');
}

export function getMonthNumber(monthName) {
  return MONTHS[normalizeText(monthName)]?.number ?? '';
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

  const hasPercent = rawValue.includes('%');
  let normalizedValue = rawValue
    .replace(/\s/g, '')
    .replace(/%/g, '')
    .replace(/[$\u20ac\u00a3]/g, '');

  if (!/^-?[\d,.]+$/.test(normalizedValue)) {
    return null;
  }

  const hasComma = normalizedValue.includes(',');
  const hasDot = normalizedValue.includes('.');

  if (hasPercent) {
    // En porcentajes, coma o punto se interpretan como separador decimal.
    normalizedValue = normalizedValue.replace(',', '.');
  } else if (hasComma && hasDot) {
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

function hasRealData(record) {
  return POBLACION_NUMERIC_COLUMNS.some((column) => {
    const value = record[column];

    return value !== null && value !== 0;
  });
}

function normalizeMonthName(value) {
  return MONTHS[normalizeText(value)]?.name ?? '';
}

function parseYear(value) {
  const cleanedValue = cleanValue(value);

  return /^(19|20)\d{2}$/.test(cleanedValue) ? Number(cleanedValue) : null;
}

function isEmptyRow(row) {
  return row.every((cell) => cleanValue(cell) === '');
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
