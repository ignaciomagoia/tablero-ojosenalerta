export const MOVILES_PARSER_VERSION = 1;
export const MOVILES_SHEET_NAME = 'Móviles';

const SECTION_NAMES = ['ZONA', 'CUADRANTE', 'DISTRITO'];

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

export function isMovilesSheetData(sheetData) {
  return (
    sheetData?.type === 'movilesEquipamiento' &&
    sheetData?.metadata?.parser === 'movilesParser' &&
    sheetData.metadata?.version === MOVILES_PARSER_VERSION &&
    sheetData.resumen &&
    Array.isArray(sheetData.movilesPorZona) &&
    Array.isArray(sheetData.chalecosPorZona) &&
    Array.isArray(sheetData.movilesPorCuadrante) &&
    Array.isArray(sheetData.chalecosPorCuadrante) &&
    Array.isArray(sheetData.movilesPorDistrito) &&
    Array.isArray(sheetData.chalecosPorDistrito)
  );
}

export function normalizeMovilesSheetData(sheetData) {
  if (isMovilesSheetData(sheetData)) {
    return sheetData;
  }

  if (sheetData?.type === 'recursosOperativos') {
    return convertLegacyRecursosData(sheetData);
  }

  return createEmptyMovilesData();
}

export function findMovilesSheet(sheets = []) {
  return sheets.find(({ sheetName, matrix }) => {
    const normalizedName = normalizeText(sheetName);

    return normalizedName.includes('MOVILES') || hasMovilesMarkers(matrix);
  });
}

export function parseMovilesSheet(matrix, context = {}) {
  const movilesHeader = findCell(matrix, (cell) => normalizeText(cell).includes('MOVIL'));
  const chalecosHeader = findCell(matrix, (cell) => normalizeText(cell).includes('CHALECO'));
  const fechaCarga = detectLoadDate(matrix);

  if (!movilesHeader || !chalecosHeader) {
    return createEmptyMovilesData(context.fileName, context.sourceSheetName, fechaCarga);
  }

  const movilesColumns = detectMovilesColumns(matrix, movilesHeader);
  const chalecosValueCol = detectSingleValueColumn(matrix, chalecosHeader.col);
  const resumenMoviles = parseMovilesTotals(matrix, movilesHeader.col, movilesColumns);
  const chalecos = parseSingleTotal(matrix, chalecosHeader.col, chalecosValueCol);
  const movilesPorZona = parseMovilesSection(matrix, 'ZONA', movilesHeader.col, movilesColumns, 'zona');
  const chalecosPorZona = parseChalecosSection(matrix, 'ZONA', chalecosHeader.col, chalecosValueCol, 'zona');
  const movilesPorCuadrante = sortTerritorialRows(
    parseMovilesSection(matrix, 'CUADRANTE', movilesHeader.col, movilesColumns, 'cuadrante'),
  );
  const chalecosPorCuadrante = sortTerritorialRows(
    parseChalecosSection(matrix, 'CUADRANTE', chalecosHeader.col, chalecosValueCol, 'cuadrante'),
  );
  const movilesPorDistrito = sortTerritorialRows(
    parseMovilesSection(matrix, 'DISTRITO', movilesHeader.col, movilesColumns, 'distrito'),
  );
  const chalecosPorDistrito = sortTerritorialRows(
    parseChalecosSection(matrix, 'DISTRITO', chalecosHeader.col, chalecosValueCol, 'distrito'),
  );
  const activos = resumenMoviles.activos ?? sumRows(movilesPorZona, 'activos');
  const enReparacion = resumenMoviles.enReparacion ?? sumRows(movilesPorZona, 'enReparacion');
  const fueraDeServicio = resumenMoviles.fueraDeServicio ?? sumRows(movilesPorZona, 'fueraDeServicio');
  const totalMoviles = activos + enReparacion + fueraDeServicio;

  return {
    type: 'movilesEquipamiento',
    fileName: context.fileName ?? '',
    sourceSheetName: context.sourceSheetName ?? '',
    fechaCarga: fechaCarga.iso,
    fechaCargaLabel: fechaCarga.label,
    resumen: {
      activos,
      enReparacion,
      fueraDeServicio,
      totalMoviles,
      chalecos: chalecos ?? sumRows(chalecosPorDistrito, 'cantidad'),
      porcentajeOperatividad: totalMoviles > 0 ? (activos / totalMoviles) * 100 : 0,
    },
    movilesPorZona,
    chalecosPorZona,
    movilesPorCuadrante,
    chalecosPorCuadrante,
    movilesPorDistrito,
    chalecosPorDistrito,
    metadata: {
      parser: 'movilesParser',
      version: MOVILES_PARSER_VERSION,
    },
  };
}

export function parseMovilesNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const text = String(value ?? '').trim();

  if (text === '') {
    return null;
  }

  if (/^-+$/.test(text)) {
    return 0;
  }

  const normalized = text.includes(',')
    ? text.replace(/\./g, '').replace(',', '.')
    : text.replace(/\./g, '');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function detectMovilesColumns(matrix, header) {
  const columns = {
    activos: header.col + 1,
    enReparacion: header.col + 2,
    fueraDeServicio: header.col + 3,
  };

  for (let rowIndex = header.row; rowIndex <= Math.min(matrix.length - 1, header.row + 5); rowIndex += 1) {
    const row = matrix[rowIndex] ?? [];

    for (let colIndex = header.col; colIndex <= header.col + 8; colIndex += 1) {
      const normalizedCell = normalizeText(row[colIndex]);

      if (normalizedCell.includes('ACTIV')) {
        columns.activos = colIndex;
      }

      if (normalizedCell.includes('REPA')) {
        columns.enReparacion = colIndex;
      }

      if (normalizedCell.includes('FUERA')) {
        columns.fueraDeServicio = colIndex;
      }
    }
  }

  return columns;
}

function parseMovilesTotals(matrix, labelCol, columns) {
  const totalRowIndex = findSectionRow(matrix, 'TOTAL', labelCol);

  if (totalRowIndex < 0) {
    return {};
  }

  const row = matrix[totalRowIndex] ?? [];

  return {
    activos: parseMovilesNumber(row[columns.activos]) ?? 0,
    enReparacion: parseMovilesNumber(row[columns.enReparacion]) ?? 0,
    fueraDeServicio: parseMovilesNumber(row[columns.fueraDeServicio]) ?? 0,
  };
}

function parseSingleTotal(matrix, labelCol, valueCol) {
  const totalRowIndex = findSectionRow(matrix, 'TOTAL', labelCol);

  return totalRowIndex >= 0 ? parseMovilesNumber(matrix[totalRowIndex]?.[valueCol]) : null;
}

function parseMovilesSection(matrix, sectionName, labelCol, columns, nameKey) {
  const sectionRowIndex = findSectionRow(matrix, sectionName, labelCol);

  if (sectionRowIndex < 0) {
    return [];
  }

  const rows = [];

  for (let rowIndex = sectionRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex] ?? [];
    const name = cleanCell(row[labelCol]);
    const normalizedName = normalizeText(name);

    if (!name) {
      if (isEmptyRange(row, labelCol, columns.fueraDeServicio)) {
        break;
      }

      continue;
    }

    if (isSectionLabel(normalizedName) || normalizedName.includes('TOTAL')) {
      break;
    }

    const activos = parseMovilesNumber(row[columns.activos]) ?? 0;
    const enReparacion = parseMovilesNumber(row[columns.enReparacion]) ?? 0;
    const fueraDeServicio = parseMovilesNumber(row[columns.fueraDeServicio]) ?? 0;
    const total = activos + enReparacion + fueraDeServicio;

    rows.push({
      [nameKey]: name,
      name,
      activos,
      enReparacion,
      fueraDeServicio,
      total,
    });
  }

  return rows;
}

function parseChalecosSection(matrix, sectionName, labelCol, valueCol, nameKey) {
  const sectionRowIndex = findSectionRow(matrix, sectionName, labelCol);

  if (sectionRowIndex < 0) {
    return [];
  }

  const rows = [];

  for (let rowIndex = sectionRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex] ?? [];
    const name = cleanCell(row[labelCol]);
    const normalizedName = normalizeText(name);

    if (!name) {
      if (isEmptyRange(row, labelCol, valueCol)) {
        break;
      }

      continue;
    }

    if (isSectionLabel(normalizedName) || normalizedName.includes('TOTAL')) {
      break;
    }

    const cantidad = parseMovilesNumber(row[valueCol]) ?? 0;

    rows.push({
      [nameKey]: name,
      name,
      cantidad,
    });
  }

  return rows;
}

function detectSingleValueColumn(matrix, labelCol) {
  const totalRowIndex = findSectionRow(matrix, 'TOTAL', labelCol);

  if (totalRowIndex >= 0) {
    const row = matrix[totalRowIndex] ?? [];

    for (let colIndex = labelCol + 1; colIndex <= labelCol + 5; colIndex += 1) {
      if (parseMovilesNumber(row[colIndex]) !== null) {
        return colIndex;
      }
    }
  }

  return labelCol + 1;
}

function detectLoadDate(matrix) {
  const fechaCell = findCell(matrix, (cell) => normalizeText(cell).includes('FECHA'));

  if (fechaCell) {
    const nearbyDate = getNearbyCells(matrix, fechaCell.row, fechaCell.col)
      .map(parseDate)
      .find(Boolean);

    if (nearbyDate) {
      return formatDatePayload(nearbyDate);
    }
  }

  const anyDate = matrix.flat().map(parseDate).find(Boolean);

  return anyDate ? formatDatePayload(anyDate) : { iso: '', label: '-' };
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

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
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

function getNearbyCells(matrix, rowIndex, colIndex) {
  const cells = [];

  for (let row = rowIndex; row <= Math.min(matrix.length - 1, rowIndex + 3); row += 1) {
    for (let col = colIndex; col <= colIndex + 4; col += 1) {
      cells.push(matrix[row]?.[col]);
    }
  }

  return cells;
}

function convertLegacyRecursosData(sheetData) {
  const summary = sheetData.summary ?? {};
  const activos = Number(summary.movilesActivos) || 0;
  const enReparacion = Number(summary.movilesReparacion) || 0;
  const fueraDeServicio = Number(summary.movilesFueraServicio) || 0;
  const totalMoviles = activos + enReparacion + fueraDeServicio;

  return {
    type: 'movilesEquipamiento',
    fileName: sheetData.fileName ?? '',
    sourceSheetName: sheetData.sourceSheetName ?? '',
    fechaCarga: summary.fechaActualizacionISO ?? '',
    fechaCargaLabel: summary.fechaActualizacion ?? '-',
    resumen: {
      activos,
      enReparacion,
      fueraDeServicio,
      totalMoviles,
      chalecos: Number(summary.chalecosDisponibles) || 0,
      porcentajeOperatividad: totalMoviles > 0 ? (activos / totalMoviles) * 100 : 0,
    },
    movilesPorZona: (sheetData.zonaComparativa ?? []).map((row) => ({
      zona: row.zona,
      name: row.zona,
      activos: Number(row.moviles) || 0,
      enReparacion: 0,
      fueraDeServicio: 0,
      total: Number(row.moviles) || 0,
    })),
    chalecosPorZona: (sheetData.zonaComparativa ?? []).map((row) => ({
      zona: row.zona,
      name: row.zona,
      cantidad: Number(row.chalecos) || 0,
    })),
    movilesPorCuadrante: normalizeLegacyRows(sheetData.movilesPorCuadrante ?? [], 'cuadrante'),
    chalecosPorCuadrante: [],
    movilesPorDistrito: normalizeLegacyRows(sheetData.movilesPorDistrito ?? [], 'distrito'),
    chalecosPorDistrito: (sheetData.chalecosPorDistrito ?? []).map((row) => ({
      distrito: row.name,
      name: row.name,
      cantidad: Number(row.value) || 0,
    })),
    metadata: {
      parser: 'movilesParser',
      version: MOVILES_PARSER_VERSION,
      source: 'legacy',
    },
  };
}

function normalizeLegacyRows(rows, nameKey) {
  return rows.map((row) => ({
    [nameKey]: row.name,
    name: row.name,
    activos: Number(row.activos) || 0,
    enReparacion: Number(row.reparacion) || 0,
    fueraDeServicio: Number(row.fueraServicio) || 0,
    total: Number(row.value) || 0,
  }));
}

function hasMovilesMarkers(matrix) {
  const text = matrix.flat().map(normalizeText).join(' ');

  return text.includes('MOVILES') && text.includes('CHALECOS');
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
  const directMatchIndex = matrix.findIndex((row) => {
    const normalizedCell = normalizeText(row?.[labelCol]);

    if (normalizedSection === 'TOTAL') {
      return normalizedCell.includes('TOTAL');
    }

    return normalizedCell === normalizedSection;
  });

  if (directMatchIndex >= 0) {
    return directMatchIndex;
  }

  return matrix.findIndex((row) =>
    row.some((cell) => {
      const normalizedCell = normalizeText(cell);

      if (normalizedSection === 'TOTAL') {
        return normalizedCell.includes('TOTAL');
      }

      return normalizedCell === normalizedSection;
    }),
  );
}

function isSectionLabel(value) {
  return SECTION_NAMES.includes(value);
}

function isEmptyRange(row, startCol, endCol) {
  for (let colIndex = startCol; colIndex <= endCol; colIndex += 1) {
    if (cleanCell(row[colIndex]) !== '') {
      return false;
    }
  }

  return true;
}

function sortTerritorialRows(rows) {
  return [...rows].sort((left, right) => {
    const leftOrder = getTerritorialOrder(left.name);
    const rightOrder = getTerritorialOrder(right.name);

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return String(left.name).localeCompare(String(right.name), 'es', {
      numeric: true,
    });
  });
}

function getTerritorialOrder(value) {
  const text = normalizeText(value);
  const match = text.match(/\d+/);

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Number(match[0]) + (text.includes('BIS') ? 0.5 : 0);
}

function sumRows(rows, key) {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}

function createEmptyMovilesData(fileName = '', sourceSheetName = '', fechaCarga = { iso: '', label: '-' }) {
  return {
    type: 'movilesEquipamiento',
    fileName,
    sourceSheetName,
    fechaCarga: fechaCarga.iso,
    fechaCargaLabel: fechaCarga.label,
    resumen: {
      activos: 0,
      enReparacion: 0,
      fueraDeServicio: 0,
      totalMoviles: 0,
      chalecos: 0,
      porcentajeOperatividad: 0,
    },
    movilesPorZona: [],
    chalecosPorZona: [],
    movilesPorCuadrante: [],
    chalecosPorCuadrante: [],
    movilesPorDistrito: [],
    chalecosPorDistrito: [],
    metadata: {
      parser: 'movilesParser',
      version: MOVILES_PARSER_VERSION,
    },
  };
}

function cleanCell(value) {
  return String(value ?? '').trim();
}

function normalizeText(value) {
  return cleanCell(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .trim();
}
