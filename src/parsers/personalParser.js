import { parseNumber } from './recursosParser.js';

export const PERSONAL_PARSER_VERSION = 1;
export const PERSONAL_SHEET_NAME = 'Personal';

const SECTION_NAMES = ['TOTALES', 'TOTAL', 'ZONA', 'CUADRANTE', 'DISTRITO'];
const OPTIONAL_CARD_LABELS = [
  {
    key: 'administracion',
    label: 'Administracion',
    match: 'ADMINISTRACION',
  },
  {
    key: 'puertaAPuerta',
    label: 'Puerta a Puerta',
    match: 'PUERTA A PUERTA',
  },
  {
    key: 'comunicacion',
    label: 'Comunicacion',
    match: 'COMUNICACION',
  },
];

export function isPersonalSheetData(sheetData) {
  return (
    sheetData?.type === 'personalOperativo' &&
    Array.isArray(sheetData.distribucionPersonal) &&
    Array.isArray(sheetData.personalPorZona) &&
    Array.isArray(sheetData.personalPolicialPorCuadrante) &&
    Array.isArray(sheetData.etacPorCuadrante) &&
    Array.isArray(sheetData.personalCivilPorCuadrante) &&
    Array.isArray(sheetData.personalPorDistrito)
  );
}

export function findPersonalSheet(sheets = []) {
  return sheets.find(({ sheetName, matrix }) => {
    const normalizedName = normalizeText(sheetName);

    return normalizedName.includes('PERSONAL') || hasPersonalMarkers(matrix);
  });
}

export function parsePersonalSheet(matrix, context = {}) {
  const header = detectPersonalHeader(matrix);

  if (!header) {
    return createEmptyPersonalData(context.fileName, context.sourceSheetName);
  }

  const totals = parseTotals(matrix, header);
  const optionalCards = parseOptionalCards(matrix);
  const personalPorZona = parseSection(matrix, 'ZONA', header, {
    includeZero: true,
  });
  const personalPorCuadrante = parseSection(matrix, 'CUADRANTE', header);
  const personalPorDistrito = parseSection(matrix, 'DISTRITO', header);
  const summary = {
    policial: totals.policial ?? sumMetric(personalPorZona, 'policial'),
    etac: totals.etac ?? sumMetric(personalPorZona, 'etac'),
    civil: totals.civil ?? sumMetric(personalPorZona, 'civil'),
    optionalCards,
  };

  summary.totalGeneral =
    (Number(summary.policial) || 0) +
    (Number(summary.etac) || 0) +
    (Number(summary.civil) || 0);

  return {
    type: 'personalOperativo',
    fileName: context.fileName ?? '',
    sourceSheetName: context.sourceSheetName ?? '',
    summary,
    distribucionPersonal: [
      { name: 'Policia', value: summary.policial ?? 0 },
      { name: 'ETAC', value: summary.etac ?? 0 },
      { name: 'Civil', value: summary.civil ?? 0 },
    ],
    personalPorZona,
    personalPolicialPorCuadrante: toMetricRows(personalPorCuadrante, 'policial'),
    etacPorCuadrante: toMetricRows(personalPorCuadrante, 'etac'),
    personalCivilPorCuadrante: toMetricRows(personalPorCuadrante, 'civil'),
    personalPorDistrito,
    metadata: {
      parser: 'personalParser',
      version: PERSONAL_PARSER_VERSION,
    },
  };
}

function detectPersonalHeader(matrix) {
  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex] ?? [];
    const columns = {
      policial: findColumn(row, ['POLICIAL', 'POLICIA']),
      etac: findColumn(row, ['ETAC']),
      civil: findColumn(row, ['CIVIL']),
    };

    if (
      columns.policial >= 0 &&
      columns.etac >= 0 &&
      columns.civil >= 0
    ) {
      return {
        rowIndex,
        labelCol: Math.max(0, Math.min(columns.policial, columns.etac, columns.civil) - 1),
        columns,
      };
    }
  }

  return null;
}

function parseTotals(matrix, header) {
  const candidateRows = matrix.slice(header.rowIndex, header.rowIndex + 6);
  const row = candidateRows.find((candidateRow, offset) => {
    if (offset === 0) {
      return false;
    }

    return ['policial', 'etac', 'civil'].some(
      (key) => parseNumber(candidateRow?.[header.columns[key]]) !== null,
    );
  });

  if (!row) {
    return {};
  }

  return {
    policial: parseNumber(row[header.columns.policial]),
    etac: parseNumber(row[header.columns.etac]),
    civil: parseNumber(row[header.columns.civil]),
  };
}

function parseOptionalCards(matrix) {
  return OPTIONAL_CARD_LABELS
    .map((card) => {
      const cell = findCell(matrix, (value) => normalizeText(value).includes(card.match));
      const value = cell ? findFirstNumericBelow(matrix, cell.row, cell.col) : null;

      return {
        key: card.key,
        label: card.label,
        value,
      };
    })
    .filter((card) => card.value !== null);
}

function findFirstNumericBelow(matrix, startRow, col) {
  for (let rowIndex = startRow + 1; rowIndex < Math.min(matrix.length, startRow + 8); rowIndex += 1) {
    const value = parseNumber(matrix[rowIndex]?.[col]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function parseSection(matrix, sectionName, header, options = {}) {
  const section = findSectionCell(matrix, sectionName, header.labelCol);

  if (!section) {
    return [];
  }

  const rows = [];

  for (let rowIndex = section.row + 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex] ?? [];
    const name = cleanCategory(row[section.col]);
    const normalizedName = normalizeText(name);

    if (!name) {
      if (isEmptyMetricRange(row, section.col, header.columns)) {
        break;
      }

      continue;
    }

    if (isSectionLabel(normalizedName) || normalizedName.includes('TOTAL')) {
      break;
    }

    const parsedRow = {
      name,
      policial: parseNumber(row[header.columns.policial]) ?? 0,
      etac: parseNumber(row[header.columns.etac]) ?? 0,
      civil: parseNumber(row[header.columns.civil]) ?? 0,
    };
    parsedRow.value = parsedRow.policial + parsedRow.etac + parsedRow.civil;

    if (parsedRow.value > 0 || options.includeZero) {
      rows.push(parsedRow);
    }
  }

  return sortDescending(rows);
}

function toMetricRows(rows, metric) {
  return rows
    .map((row) => ({
      name: row.name,
      value: Number(row[metric]) || 0,
    }))
    .filter((row) => row.value > 0)
    .sort(compareRows);
}

function findSectionCell(matrix, sectionName, fallbackCol) {
  const normalizedSection = normalizeText(sectionName);
  const exactCell = findCell(matrix, (value) => normalizeText(value) === normalizedSection);

  if (exactCell) {
    return exactCell;
  }

  const fallbackRow = matrix.findIndex(
    (row) => normalizeText(row?.[fallbackCol]) === normalizedSection,
  );

  return fallbackRow >= 0 ? { row: fallbackRow, col: fallbackCol } : null;
}

function hasPersonalMarkers(matrix) {
  const text = matrix.flat().map(normalizeText).join(' ');

  return (
    text.includes('PERSONAL') &&
    text.includes('POLICIAL') &&
    text.includes('ETAC') &&
    text.includes('CIVIL')
  );
}

function findColumn(row, possibleLabels) {
  return row.findIndex((cell) => {
    const normalizedCell = normalizeText(cell);

    return possibleLabels.some((label) => normalizedCell.includes(label));
  });
}

function findCell(matrix, predicate) {
  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex] ?? [];

    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      if (predicate(row[colIndex], rowIndex, colIndex)) {
        return {
          row: rowIndex,
          col: colIndex,
          value: row[colIndex],
        };
      }
    }
  }

  return null;
}

function isSectionLabel(normalizedTextValue) {
  return SECTION_NAMES.some((sectionName) => normalizedTextValue === sectionName);
}

function isEmptyMetricRange(row, labelCol, columns) {
  const cols = [labelCol, columns.policial, columns.etac, columns.civil];

  return cols.every((col) => String(row[col] ?? '').trim() === '');
}

function cleanCategory(value) {
  return String(value ?? '').trim();
}

function sortDescending(rows) {
  return [...rows].sort(compareRows);
}

function compareRows(left, right) {
  if (right.value !== left.value) {
    return right.value - left.value;
  }

  return String(left.name).localeCompare(String(right.name), 'es', {
    numeric: true,
  });
}

function sumMetric(rows, metric) {
  const total = rows.reduce((sum, row) => sum + (Number(row[metric]) || 0), 0);

  return total > 0 ? total : null;
}

function createEmptyPersonalData(fileName = '', sourceSheetName = '') {
  return {
    type: 'personalOperativo',
    fileName,
    sourceSheetName,
    summary: {
      policial: null,
      etac: null,
      civil: null,
      totalGeneral: null,
      optionalCards: [],
    },
    distribucionPersonal: [],
    personalPorZona: [],
    personalPolicialPorCuadrante: [],
    etacPorCuadrante: [],
    personalCivilPorCuadrante: [],
    personalPorDistrito: [],
    metadata: {
      parser: 'personalParser',
      version: PERSONAL_PARSER_VERSION,
    },
  };
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}
