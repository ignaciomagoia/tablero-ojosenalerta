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

export const TIPOLOGIA_SHEET_COLUMNS = [
  'anio',
  'mes',
  'totalAlertas',
  'prevencion',
  'persecucion',
  'codigo107',
  'whatsapp',
  'radio',
  'videovigilancia',
  'fechaOrden',
];

export const TIPOLOGIA_NUMERIC_COLUMNS = [
  'totalAlertas',
  'prevencion',
  'persecucion',
  'codigo107',
  'whatsapp',
  'radio',
  'videovigilancia',
];

export function parseTipologiaSheet(matrix) {
  let currentYear = null;

  return matrix
    .reduce((rows, row) => {
      if (!Array.isArray(row) || isEmptyRow(row.slice(0, 9))) {
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

      const totalAlertas = parseNumber(row[2]);

      // Excluye meses futuros precargados sin datos reales.
      if (totalAlertas === null) {
        return rows;
      }

      rows.push({
        anio: currentYear,
        mes: monthName,
        totalAlertas,
        prevencion: parseNumber(row[3]),
        persecucion: parseNumber(row[4]),
        codigo107: parseNumber(row[5]),
        whatsapp: parseNumber(row[6]),
        radio: parseNumber(row[7]),
        videovigilancia: parseNumber(row[8]),
        fechaOrden: `${currentYear}-${getMonthNumber(monthName)}`,
      });

      return rows;
    }, [])
    .sort((leftRow, rightRow) =>
      leftRow.fechaOrden.localeCompare(rightRow.fechaOrden),
    );
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

  let normalizedValue = rawValue
    .replace(/\s/g, '')
    .replace(/%/g, '')
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

export function isTipologiaSheet(sheetName) {
  const normalizedSheetName = normalizeText(sheetName);

  return normalizedSheetName.includes('TIPOLOGIA') ||
    normalizedSheetName.includes('MEDIO DE INGRESO');
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
