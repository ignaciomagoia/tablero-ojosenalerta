export const RECURSOS_PARSER_VERSION = 1;
export const RECURSOS_SHEET_NAME = 'Recursos Operativos';

const SECTION_NAMES = ['TOTALES', 'TOTAL', 'ZONA', 'CUADRANTE', 'DISTRITO'];

export function isRecursosWorkbook(fileName = '', sheets = []) {
  const normalizedFileName = normalizeText(fileName);

  if (normalizedFileName.includes('RECURSOS')) {
    return true;
  }

  return sheets.some(({ matrix }) => {
    const text = matrix.flat().map(normalizeText).join(' ');

    return (
      text.includes('MOVILES') &&
      text.includes('CHALECOS') &&
      text.includes('CUADRANTE') &&
      text.includes('DISTRITO')
    );
  });
}

export function isRecursosSheetData(sheetData) {
  return (
    sheetData?.type === 'recursosOperativos' &&
    Array.isArray(sheetData.estadoMoviles) &&
    Array.isArray(sheetData.movilesPorCuadrante) &&
    Array.isArray(sheetData.chalecosPorDistrito) &&
    Array.isArray(sheetData.movilesPorDistrito) &&
    Array.isArray(sheetData.zonaComparativa)
  );
}

export function parseRecursosWorkbook(sheets = [], fileName = '') {
  const resourceSheet = findResourceSheet(sheets);

  if (!resourceSheet) {
    return createEmptyResourcesData(fileName);
  }

  return parseRecursosSheet(resourceSheet.matrix, {
    fileName,
    sourceSheetName: resourceSheet.sheetName,
  });
}

export function parseRecursosSheet(matrix, context = {}) {
  const movilesHeader = findCell(matrix, (cell) => normalizeText(cell) === 'MOVILES');
  const chalecosHeader = findCell(matrix, (cell) => normalizeText(cell) === 'CHALECOS');
  const fechaActualizacion = detectUpdateDate(matrix);

  if (!movilesHeader || !chalecosHeader) {
    return createEmptyResourcesData(context.fileName, fechaActualizacion);
  }

  const movilesColumns = detectMovilesColumns(matrix, movilesHeader);
  const chalecosValueCol = detectValueColumn(matrix, chalecosHeader.col);
  const movilesTotales = parseMovilesTotals(matrix, movilesHeader.col, movilesColumns);
  const chalecosDisponibles = parseSingleTotal(
    matrix,
    chalecosHeader.col,
    chalecosValueCol,
  );
  const movilesPorCuadrante = parseMovilesSection(
    matrix,
    'CUADRANTE',
    movilesHeader.col,
    movilesColumns,
  );
  const movilesPorDistrito = parseMovilesSection(
    matrix,
    'DISTRITO',
    movilesHeader.col,
    movilesColumns,
  );
  const chalecosPorDistrito = parseSingleValueSection(
    matrix,
    'DISTRITO',
    chalecosHeader.col,
    chalecosValueCol,
  );
  const movilesPorZona = parseMovilesSection(
    matrix,
    'ZONA',
    movilesHeader.col,
    movilesColumns,
    { includeZero: true },
  );
  const chalecosPorZona = parseSingleValueSection(
    matrix,
    'ZONA',
    chalecosHeader.col,
    chalecosValueCol,
    { includeZero: true },
  );

  const summary = {
    movilesActivos: movilesTotales.activos ?? sumValues(movilesPorZona, 'activos'),
    movilesReparacion: movilesTotales.reparacion ?? sumValues(movilesPorZona, 'reparacion'),
    movilesFueraServicio:
      movilesTotales.fueraServicio ?? sumValues(movilesPorZona, 'fueraServicio'),
    chalecosDisponibles:
      chalecosDisponibles ?? sumValues(chalecosPorDistrito, 'value'),
    fechaActualizacion: fechaActualizacion.label,
    fechaActualizacionISO: fechaActualizacion.iso,
  };

  return {
    type: 'recursosOperativos',
    fileName: context.fileName ?? '',
    sourceSheetName: context.sourceSheetName ?? '',
    summary,
    estadoMoviles: [
      { name: 'Activos', value: summary.movilesActivos ?? 0 },
      { name: 'En reparacion', value: summary.movilesReparacion ?? 0 },
      { name: 'Fuera de servicio', value: summary.movilesFueraServicio ?? 0 },
    ],
    movilesPorCuadrante,
    chalecosPorDistrito,
    movilesPorDistrito,
    zonaComparativa: buildZonaComparativa(movilesPorZona, chalecosPorZona),
    metadata: {
      parser: 'recursosParser',
      version: RECURSOS_PARSER_VERSION,
    },
  };
}

export function parseNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const text = String(value ?? '').trim();

  if (text === '') {
    return null;
  }

  if (text === '-') {
    return 0;
  }

  const withoutPercent = text.replace('%', '').trim();
  const normalized = withoutPercent.includes(',')
    ? withoutPercent.replace(/\./g, '').replace(',', '.')
    : withoutPercent.replace(/\./g, '');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function findResourceSheet(sheets) {
  return (
    sheets.find(({ sheetName, matrix }) => {
      const normalizedName = normalizeText(sheetName);

      return normalizedName.includes('MOVILES') || hasResourceMarkers(matrix);
    }) ?? sheets.find(({ matrix }) => hasResourceMarkers(matrix))
  );
}

function hasResourceMarkers(matrix) {
  const text = matrix.flat().map(normalizeText).join(' ');

  return text.includes('MOVILES') && text.includes('CHALECOS');
}

function detectMovilesColumns(matrix, header) {
  const columns = {
    activos: header.col + 1,
    reparacion: header.col + 2,
    fueraServicio: header.col + 3,
  };

  for (let rowIndex = header.row; rowIndex <= Math.min(matrix.length - 1, header.row + 4); rowIndex += 1) {
    const row = matrix[rowIndex] ?? [];

    for (let colIndex = header.col; colIndex <= header.col + 8; colIndex += 1) {
      const normalizedCell = normalizeText(row[colIndex]);

      if (normalizedCell.includes('ACTIV')) {
        columns.activos = colIndex;
      }

      if (normalizedCell.includes('REPA')) {
        columns.reparacion = colIndex;
      }

      if (normalizedCell.includes('FUERA')) {
        columns.fueraServicio = colIndex;
      }
    }
  }

  return columns;
}

function detectValueColumn(matrix, labelCol) {
  const totalRowIndex = findSectionRow(matrix, 'TOTAL', labelCol);

  if (totalRowIndex >= 0) {
    const row = matrix[totalRowIndex] ?? [];

    for (let colIndex = labelCol + 1; colIndex <= labelCol + 5; colIndex += 1) {
      if (parseNumber(row[colIndex]) !== null) {
        return colIndex;
      }
    }
  }

  return labelCol + 1;
}

function parseMovilesTotals(matrix, labelCol, columns) {
  const totalRowIndex = findSectionRow(matrix, 'TOTAL', labelCol);

  if (totalRowIndex < 0) {
    return {};
  }

  const row = matrix[totalRowIndex] ?? [];

  return {
    activos: parseNumber(row[columns.activos]),
    reparacion: parseNumber(row[columns.reparacion]),
    fueraServicio: parseNumber(row[columns.fueraServicio]),
  };
}

function parseSingleTotal(matrix, labelCol, valueCol) {
  const totalRowIndex = findSectionRow(matrix, 'TOTAL', labelCol);

  if (totalRowIndex < 0) {
    return null;
  }

  return parseNumber(matrix[totalRowIndex]?.[valueCol]);
}

function parseMovilesSection(matrix, sectionName, labelCol, columns, options = {}) {
  const sectionRowIndex = findSectionRow(matrix, sectionName, labelCol);

  if (sectionRowIndex < 0) {
    return [];
  }

  const rows = [];

  for (let rowIndex = sectionRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex] ?? [];
    const category = cleanCategory(row[labelCol]);
    const normalizedCategory = normalizeText(category);

    if (!category) {
      if (isEmptyRange(row, labelCol, columns.fueraServicio)) {
        break;
      }

      continue;
    }

    if (isSectionLabel(normalizedCategory) || normalizedCategory.includes('TOTAL')) {
      break;
    }

    const activos = parseNumber(row[columns.activos]) ?? 0;
    const reparacion = parseNumber(row[columns.reparacion]) ?? 0;
    const fueraServicio = parseNumber(row[columns.fueraServicio]) ?? 0;
    const value = activos + reparacion + fueraServicio;

    if (value > 0 || options.includeZero) {
      rows.push({
        name: formatCategoryName(category, sectionName),
        activos,
        reparacion,
        fueraServicio,
        value,
      });
    }
  }

  return sortDescending(rows);
}

function parseSingleValueSection(matrix, sectionName, labelCol, valueCol, options = {}) {
  const sectionRowIndex = findSectionRow(matrix, sectionName, labelCol);

  if (sectionRowIndex < 0) {
    return [];
  }

  const rows = [];

  for (let rowIndex = sectionRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex] ?? [];
    const category = cleanCategory(row[labelCol]);
    const normalizedCategory = normalizeText(category);

    if (!category) {
      if (isEmptyRange(row, labelCol, valueCol)) {
        break;
      }

      continue;
    }

    if (isSectionLabel(normalizedCategory) || normalizedCategory.includes('TOTAL')) {
      break;
    }

    const value = parseNumber(row[valueCol]) ?? 0;

    if (value > 0 || options.includeZero) {
      rows.push({
        name: formatCategoryName(category, sectionName),
        value,
      });
    }
  }

  return sortDescending(rows);
}

function buildZonaComparativa(movilesPorZona, chalecosPorZona) {
  const zones = new Map();

  movilesPorZona.forEach((row) => {
    zones.set(row.name, {
      zona: row.name,
      moviles: row.value,
      chalecos: 0,
    });
  });

  chalecosPorZona.forEach((row) => {
    const current = zones.get(row.name) ?? {
      zona: row.name,
      moviles: 0,
      chalecos: 0,
    };

    zones.set(row.name, {
      ...current,
      chalecos: row.value,
    });
  });

  return Array.from(zones.values()).sort((left, right) =>
    left.zona.localeCompare(right.zona, 'es'),
  );
}

function detectUpdateDate(matrix) {
  const fechaLabel = findCell(matrix, (cell) => normalizeText(cell).includes('FECHA'));

  if (fechaLabel) {
    const nearbyCells = [];

    for (let rowIndex = fechaLabel.row; rowIndex <= Math.min(matrix.length - 1, fechaLabel.row + 3); rowIndex += 1) {
      const row = matrix[rowIndex] ?? [];

      for (let colIndex = fechaLabel.col; colIndex <= fechaLabel.col + 4; colIndex += 1) {
        nearbyCells.push(row[colIndex]);
      }
    }

    const nearbyDate = nearbyCells.map(parseDate).find(Boolean);

    if (nearbyDate) {
      return formatDatePayload(nearbyDate);
    }
  }

  const anyDate = matrix.flat().map(parseDate).find(Boolean);

  return anyDate
    ? formatDatePayload(anyDate)
    : { label: '-', iso: '' };
}

function parseDate(value) {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatDatePayload(date) {
  const iso = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

  return {
    iso,
    label: date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
  };
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

function findSectionRow(matrix, sectionName, labelCol) {
  const normalizedSection = normalizeText(sectionName);

  return matrix.findIndex((row) => {
    const normalizedCell = normalizeText(row?.[labelCol]);

    if (normalizedSection === 'TOTAL') {
      return normalizedCell.includes('TOTAL');
    }

    return normalizedCell === normalizedSection;
  });
}

function isSectionLabel(normalizedTextValue) {
  return SECTION_NAMES.some((sectionName) => normalizedTextValue === sectionName);
}

function isEmptyRange(row, startCol, endCol) {
  for (let colIndex = startCol; colIndex <= endCol; colIndex += 1) {
    if (String(row[colIndex] ?? '').trim() !== '') {
      return false;
    }
  }

  return true;
}

function cleanCategory(value) {
  return String(value ?? '').trim();
}

function formatCategoryName(category, sectionName) {
  const text = cleanCategory(category);
  const normalized = normalizeText(text);

  if (sectionName === 'ZONA' && !normalized.includes('ZONA')) {
    return `Zona ${capitalize(text)}`;
  }

  return text;
}

function capitalize(value) {
  const text = String(value ?? '').trim().toLowerCase();

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function sortDescending(rows) {
  return [...rows].sort((left, right) => {
    if (right.value !== left.value) {
      return right.value - left.value;
    }

    return String(left.name).localeCompare(String(right.name), 'es', {
      numeric: true,
    });
  });
}

function sumValues(rows, key) {
  const total = rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);

  return total > 0 ? total : null;
}

function createEmptyResourcesData(fileName = '', fechaActualizacion = { label: '-', iso: '' }) {
  return {
    type: 'recursosOperativos',
    fileName,
    sourceSheetName: '',
    summary: {
      movilesActivos: null,
      movilesReparacion: null,
      movilesFueraServicio: null,
      chalecosDisponibles: null,
      fechaActualizacion: fechaActualizacion.label,
      fechaActualizacionISO: fechaActualizacion.iso,
    },
    estadoMoviles: [],
    movilesPorCuadrante: [],
    chalecosPorDistrito: [],
    movilesPorDistrito: [],
    zonaComparativa: [],
    metadata: {
      parser: 'recursosParser',
      version: RECURSOS_PARSER_VERSION,
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
