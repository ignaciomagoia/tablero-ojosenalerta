import { parseNumber } from './recursosParser.js';

export const PERSONAL_PARSER_VERSION = 4;
export const PERSONAL_SHEET_NAME = 'Personal';

const MAIN_BLOCKS = [
  'PERSONAL ADMINISTRATIVO',
  'PERSONAL DE CALLE',
];
const SECTION_NAMES = ['ZONA', 'CUADRANTE', 'DISTRITO'];
const TOTAL_LABELS = ['TOTAL', 'TOTALES'];
const OPTIONAL_TOTALS = [
  {
    key: 'administracion',
    match: 'ADMINISTRACION',
  },
  {
    key: 'puertaAPuerta',
    match: 'PUERTA A PUERTA',
  },
  {
    key: 'comunicacion',
    match: 'COMUNICACION',
  },
];
const DETAILED_KEYS = [
  'jefesAusentes',
  'jefesPresentes',
  'subalternosAusentes',
  'subalternosPresentes',
  'etacAusentes',
  'etacPresentes',
  'civilAusentes',
  'civilPresentes',
];

export function isPersonalSheetData(sheetData) {
  return (
    sheetData?.type === 'personalOperativo' &&
    sheetData?.metadata?.parser === 'personalParser' &&
    sheetData.metadata?.version === PERSONAL_PARSER_VERSION &&
    sheetData.resumenGeneral &&
    Array.isArray(sheetData.administrativoPorZona) &&
    Array.isArray(sheetData.callePorZona) &&
    Array.isArray(sheetData.callePorCuadrante) &&
    Array.isArray(sheetData.callePorDistrito)
  );
}

export function normalizePersonalSheetData(sheetData) {
  if (isPersonalSheetData(sheetData)) {
    return sheetData;
  }

  if (sheetData?.type === 'personalOperativo') {
    return createEmptyPersonalData(sheetData.fileName, sheetData.sourceSheetName);
  }

  return createEmptyPersonalData();
}

export function findPersonalSheet(sheets = []) {
  return sheets.find(({ sheetName, matrix }) => {
    const normalizedName = normalizeText(sheetName);

    return normalizedName.includes('PERSONAL') || hasPersonalMarkers(matrix);
  });
}

export function parsePersonalSheet(matrix, context = {}) {
  const parsed = parseDetailedPersonalSheet(matrix, context);

  if (hasMeaningfulPersonalData(parsed)) {
    return parsed;
  }

  return createEmptyPersonalData(context.fileName, context.sourceSheetName);
}

function parseDetailedPersonalSheet(matrix, context = {}) {
  const overviewSummary = parseOverviewSummary(matrix);
  const administrativoRange = findMainBlockRange(matrix, 'PERSONAL ADMINISTRATIVO');
  const calleRange = findMainBlockRange(matrix, 'PERSONAL DE CALLE');
  const administrativoPorZona = administrativoRange
    ? parseDetailedSection(matrix, administrativoRange, 'ZONA', 'zona')
    : [];
  const callePorZona = calleRange
    ? parseDetailedSection(matrix, calleRange, 'ZONA', 'zona')
    : [];
  const callePorCuadrante = calleRange
    ? parseDetailedSection(matrix, calleRange, 'CUADRANTE', 'cuadrante')
    : [];
  const callePorDistrito = calleRange
    ? parseDetailedSection(matrix, calleRange, 'DISTRITO', 'distrito')
    : [];
  const resumenGeneral = {
    administrativo: overviewSummary.administrativo ??
      getGroupSummary(administrativoPorZona),
    calle: overviewSummary.calle ?? getGroupSummary(callePorZona),
    administracion: findOptionalTotal(matrix, 'administracion'),
    puertaAPuerta: findOptionalTotal(matrix, 'puertaAPuerta'),
    comunicacion: findOptionalTotal(matrix, 'comunicacion'),
  };

  return {
    type: 'personalOperativo',
    fileName: context.fileName ?? '',
    sourceSheetName: context.sourceSheetName ?? '',
    resumenGeneral,
    administrativoPorZona,
    callePorZona,
    callePorCuadrante: sortAdministrativeRows(callePorCuadrante),
    callePorDistrito: sortAdministrativeRows(callePorDistrito),
    metadata: {
      parser: 'personalParser',
      version: PERSONAL_PARSER_VERSION,
    },
  };
}

function findMainBlockRange(matrix, title) {
  const start = findMainBlockTitleIndex(matrix, title);

  if (start < 0) {
    return null;
  }

  const end = matrix.findIndex((row, index) =>
    index > start &&
    MAIN_BLOCKS.some((blockTitle) =>
      blockTitle !== title && isMainBlockTitleRow(row, blockTitle),
    ),
  );

  return {
    start,
    end: end >= 0 ? end : matrix.length,
  };
}

function findMainBlockTitleIndex(matrix, title) {
  return matrix.findIndex((row) => isMainBlockTitleRow(row, title));
}

function isMainBlockTitleRow(row = [], title) {
  const hasTitle = row.some((cell) => normalizeText(cell).includes(title));

  return hasTitle && !rowHasNumbers(row);
}

function parseOverviewSummary(matrix) {
  return {
    administrativo: parseOverviewGroup(matrix, 'PERSONAL ADMINISTRATIVO'),
    calle: parseOverviewGroup(matrix, 'PERSONAL DE CALLE'),
  };
}

function parseOverviewGroup(matrix, label) {
  for (const row of matrix) {
    const labelCol = row.findIndex((cell) =>
      normalizeText(cell).includes(label),
    );

    if (labelCol === -1) {
      continue;
    }

    const values = row
      .slice(labelCol + 1)
      .map(parsePersonalNumber)
      .filter((value) => value !== null);

    if (values.length >= 4) {
      return {
        jefes: values[0],
        subalternos: values[1],
        etac: values[2],
        civil: values[3],
      };
    }
  }

  return null;
}

function parseDetailedSection(matrix, range, sectionName, nameKey) {
  const sectionCell = findSectionCell(matrix, range, sectionName);

  if (!sectionCell) {
    return [];
  }

  const columns = detectAttendanceColumns(matrix, sectionCell.row, sectionCell.col);

  if (!columns) {
    return [];
  }

  const nextSectionRow = findNextSectionRow(matrix, sectionCell.row, range.end);
  const endRow = nextSectionRow >= 0 ? nextSectionRow : range.end;
  const rows = [];

  for (let rowIndex = sectionCell.row + 1; rowIndex < endRow; rowIndex += 1) {
    const row = matrix[rowIndex] ?? [];
    const name = cleanCell(row[sectionCell.col]);
    const normalizedName = normalizeText(name);

    if (!name || isTechnicalLabel(normalizedName)) {
      continue;
    }

    const parsedRow = {
      [nameKey]: name,
      name,
      isTotal: isTotalLabel(normalizedName),
      ...readAttendanceRow(row, columns),
    };
    parsedRow.presentes = sumFields(parsedRow, [
      'jefesPresentes',
      'subalternosPresentes',
      'etacPresentes',
      'civilPresentes',
    ]);
    parsedRow.ausentes = sumFields(parsedRow, [
      'jefesAusentes',
      'subalternosAusentes',
      'etacAusentes',
      'civilAusentes',
    ]);
    parsedRow.total = parsedRow.presentes + parsedRow.ausentes;

    if (parsedRow.total > 0 || parsedRow.isTotal) {
      rows.push(parsedRow);
    }
  }

  return rows;
}

function detectAttendanceColumns(matrix, sectionRowIndex, labelCol) {
  const startRow = Math.max(0, sectionRowIndex - 4);
  const endRow = Math.min(matrix.length - 1, sectionRowIndex + 5);
  const maxCol = Math.max(
    ...matrix.slice(startRow, endRow + 1).map((row) => row.length),
    labelCol + 8,
  );
  const columns = {};

  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
    const row = matrix[rowIndex] ?? [];
    let activeGroup = '';

    for (let colIndex = labelCol + 1; colIndex < maxCol; colIndex += 1) {
      const normalizedCell = normalizeText(row[colIndex]);
      const group = detectGroup(normalizedCell);

      if (group) {
        activeGroup = group;
      }

      const status = detectStatus(normalizedCell);

      if (status && activeGroup) {
        columns[`${activeGroup}${capitalize(status)}`] = colIndex;
      }
    }
  }

  if (DETAILED_KEYS.every((key) => Number.isInteger(columns[key]))) {
    return columns;
  }

  return {
    jefesAusentes: labelCol + 1,
    jefesPresentes: labelCol + 2,
    subalternosAusentes: labelCol + 3,
    subalternosPresentes: labelCol + 4,
    etacAusentes: labelCol + 5,
    etacPresentes: labelCol + 6,
    civilAusentes: labelCol + 7,
    civilPresentes: labelCol + 8,
  };
}

function readAttendanceRow(row, columns) {
  return DETAILED_KEYS.reduce((values, key) => ({
    ...values,
    [key]: parsePersonalNumber(row[columns[key]]),
  }), {});
}

function findSectionCell(matrix, range, sectionName) {
  for (let rowIndex = range.start; rowIndex < range.end; rowIndex += 1) {
    const row = matrix[rowIndex] ?? [];

    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      if (normalizeText(row[colIndex]) === sectionName) {
        return {
          row: rowIndex,
          col: colIndex,
        };
      }
    }
  }

  return null;
}

function findNextSectionRow(matrix, currentRow, endRow) {
  for (let rowIndex = currentRow + 1; rowIndex < endRow; rowIndex += 1) {
    if (
      (matrix[rowIndex] ?? []).some((cell) =>
        SECTION_NAMES.includes(normalizeText(cell)),
      )
    ) {
      return rowIndex;
    }
  }

  return -1;
}

function detectGroup(normalizedTextValue) {
  if (normalizedTextValue.includes('JEFE')) {
    return 'jefes';
  }

  if (normalizedTextValue.includes('SUBALTERNO')) {
    return 'subalternos';
  }

  if (normalizedTextValue.includes('ETAC')) {
    return 'etac';
  }

  if (normalizedTextValue.includes('CIVIL')) {
    return 'civil';
  }

  return '';
}

function detectStatus(normalizedTextValue) {
  if (normalizedTextValue.includes('AUSENTE')) {
    return 'ausentes';
  }

  if (normalizedTextValue.includes('PRESENTE')) {
    return 'presentes';
  }

  return '';
}

function getGroupSummary(rows) {
  const totalRow = rows.find((row) => row.isTotal);
  const sourceRows = totalRow ? [totalRow] : rows;

  if (sourceRows.length === 0) {
    return createEmptyGroupSummary();
  }

  return {
    jefes: sumRows(sourceRows, ['jefesAusentes', 'jefesPresentes']),
    subalternos: sumRows(sourceRows, [
      'subalternosAusentes',
      'subalternosPresentes',
    ]),
    etac: sumRows(sourceRows, ['etacAusentes', 'etacPresentes']),
    civil: sumRows(sourceRows, ['civilAusentes', 'civilPresentes']),
  };
}

function findOptionalTotal(matrix, key) {
  const option = OPTIONAL_TOTALS.find((item) => item.key === key);
  const cell = option
    ? findCell(matrix, (value) => normalizeText(value).includes(option.match))
    : null;

  if (!cell) {
    return null;
  }

  return findNearestNumber(matrix, cell.row, cell.col);
}

function findNearestNumber(matrix, rowIndex, colIndex) {
  const offsets = [
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
    [2, 0],
    [2, 1],
  ];

  for (const [rowOffset, colOffset] of offsets) {
    const value = parsePersonalNumber(matrix[rowIndex + rowOffset]?.[colIndex + colOffset]);

    if (value !== null) {
      return value;
    }
  }

  return null;
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

function findColumn(row, possibleLabels) {
  return row.findIndex((cell) => {
    const normalizedCell = normalizeText(cell);

    return possibleLabels.some((label) => normalizedCell.includes(label));
  });
}

function hasPersonalMarkers(matrix) {
  const text = matrix.flat().map(normalizeText).join(' ');

  return (
    text.includes('PERSONAL') &&
    (text.includes('ETAC') || text.includes('CIVIL'))
  );
}

function hasMeaningfulPersonalData(sheetData) {
  return [
    sheetData.administrativoPorZona,
    sheetData.callePorZona,
    sheetData.callePorCuadrante,
    sheetData.callePorDistrito,
  ].some((rows) => rows.length > 0);
}

function rowHasNumbers(row = []) {
  return row.some((cell) => parsePersonalNumber(cell) !== null);
}

function isTechnicalLabel(normalizedName) {
  return (
    SECTION_NAMES.includes(normalizedName) ||
    normalizedName.includes('AUSENTE') ||
    normalizedName.includes('PRESENTE') ||
    normalizedName.includes('JEFE') ||
    normalizedName.includes('SUBALTERNO') ||
    normalizedName.includes('ETAC') ||
    normalizedName.includes('CIVIL')
  );
}

function isTotalLabel(normalizedName) {
  return TOTAL_LABELS.some((label) => normalizedName.includes(label));
}

function parsePersonalNumber(value) {
  const parsedValue = parseNumber(value);

  return parsedValue === undefined ? null : parsedValue;
}

function sumRows(rows, fields) {
  const total = rows.reduce((sum, row) => sum + sumFields(row, fields), 0);

  return total > 0 ? total : null;
}

function sumFields(row, fields) {
  return fields.reduce((total, field) => total + (Number(row[field]) || 0), 0);
}

function sortAdministrativeRows(rows) {
  return [...rows].sort(compareAdministrativeRows);
}

function compareAdministrativeRows(left, right) {
  if (left.isTotal !== right.isTotal) {
    return left.isTotal ? 1 : -1;
  }

  const leftOrder = getAdministrativeOrder(left.name);
  const rightOrder = getAdministrativeOrder(right.name);

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return String(left.name).localeCompare(String(right.name), 'es', {
    numeric: true,
  });
}

function getAdministrativeOrder(value) {
  const text = normalizeText(value);
  const match = text.match(/\d+/);

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Number(match[0]) + (text.includes('BIS') ? 0.5 : 0);
}

function createEmptyPersonalData(fileName = '', sourceSheetName = '') {
  return {
    type: 'personalOperativo',
    fileName,
    sourceSheetName,
    resumenGeneral: {
      administrativo: createEmptyGroupSummary(),
      calle: createEmptyGroupSummary(),
      administracion: null,
      puertaAPuerta: null,
      comunicacion: null,
    },
    administrativoPorZona: [],
    callePorZona: [],
    callePorCuadrante: [],
    callePorDistrito: [],
    metadata: {
      parser: 'personalParser',
      version: PERSONAL_PARSER_VERSION,
    },
  };
}

function createEmptyGroupSummary() {
  return {
    jefes: null,
    subalternos: null,
    etac: null,
    civil: null,
  };
}

function cleanCell(value) {
  return String(value ?? '').trim();
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeText(value) {
  return cleanCell(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .trim();
}
