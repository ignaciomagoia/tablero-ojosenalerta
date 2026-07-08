const HEADER_KEYWORDS = [
  'MES',
  'TIPO',
  'CLASIFICACION',
  'BARRIO',
  'POBLACION',
  'INDICADOR',
  'TOTAL',
  'ALERTAS',
  'POSITIVOS',
  'ANO',
  'ANIO',
  '2024',
  '2025',
  '2026',
];

const LABEL_HINTS = [
  'mes',
  'tipo',
  'clasificacion',
  'barrio',
  'poblacion',
  'indicador',
];

const STOP_WORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y']);
export function normalizeMatrix(matrix, sheetName = '') {
  const safeMatrix = sanitizeMatrix(matrix);

  const headerRowIndex = detectHeaderRowIndex(safeMatrix);

  if (headerRowIndex === -1) {
    return createEmptyResult(-1);
  }

  return normalizeFromMatrix(safeMatrix, headerRowIndex, true);
}

export function normalizeRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return createEmptyResult(0);
  }

  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const matrix = [
    columns,
    ...rows.map((row) => columns.map((column) => row[column] ?? '')),
  ];

  return normalizeFromMatrix(matrix, 0, false);
}

export function parseNumericValue(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (value === null || value === undefined) {
    return null;
  }

  const rawValue = String(value).trim();

  if (rawValue === '' || isDashValue(rawValue)) {
    return null;
  }

  const hasPercent = rawValue.includes('%');
  let normalized = rawValue
    .replace(/\s/g, '')
    .replace(/%/g, '')
    .replace(/[$\u20ac\u00a3]/g, '');

  if (!/^-?[\d,.]+$/.test(normalized)) {
    return null;
  }

  const hasComma = normalized.includes(',');
  const hasDot = normalized.includes('.');

  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(',');
    const lastDot = normalized.lastIndexOf('.');
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';

    normalized = normalized.split(thousandsSeparator).join('');
    normalized = normalized.replace(decimalSeparator, '.');
  } else if (hasComma) {
    normalized = /^-?\d{1,3}(,\d{3})+$/.test(normalized)
      ? normalized.replace(/,/g, '')
      : normalized.replace(',', '.');
  } else if (hasDot && !hasPercent && /^-?\d{1,3}(\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, '');
  }

  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}

function normalizeFromMatrix(matrix, headerRowIndex, allowMultiHeader) {
  const headerStartIndex = allowMultiHeader
    ? detectHeaderStartIndex(matrix, headerRowIndex)
    : headerRowIndex;
  const headerRows = matrix.slice(headerStartIndex, headerRowIndex + 1);
  const maxColumnCount = Math.max(...matrix.map((row) => row.length), 0);
  const rawColumnNames = buildRawColumnNames(headerRows, maxColumnCount);
  const { columns, generatedColumns } = cleanColumnNames(rawColumnNames);
  const rawRows = buildRows(matrix.slice(headerRowIndex + 1), columns);
  const activeColumns = columns.filter((column) =>
    rawRows.some((row) => hasUsefulValue(row[column])),
  );

  if (activeColumns.length === 0 || rawRows.length === 0) {
    return {
      columns: activeColumns,
      rows: [],
      metadata: {
        headerRowIndex,
        detectedLabelColumns: [],
        detectedNumericColumns: [],
        generatedColumns,
        propagatedYearColumns: [],
      },
    };
  }

  const rowsWithYears = propagateYears(rawRows, activeColumns);
  const propagatedYearColumns = detectYearColumns(rowsWithYears, activeColumns);
  const detectedNumericColumns = detectNumericColumns(
    rowsWithYears,
    activeColumns,
    propagatedYearColumns,
  );
  const detectedLabelColumns = detectLabelColumns(
    rowsWithYears,
    activeColumns,
    detectedNumericColumns,
  );
  const rows = cleanRows(rowsWithYears, activeColumns, detectedNumericColumns);

  return {
    columns: activeColumns,
    rows,
    metadata: {
      headerRowIndex,
      detectedLabelColumns,
      detectedNumericColumns,
      generatedColumns,
      propagatedYearColumns,
    },
  };
}

function sanitizeMatrix(matrix) {
  if (!Array.isArray(matrix)) {
    return [];
  }

  return matrix.map((row) => (Array.isArray(row) ? row : []));
}

function createEmptyResult(headerRowIndex) {
  return {
    columns: [],
    rows: [],
    metadata: {
      headerRowIndex,
      detectedLabelColumns: [],
      detectedNumericColumns: [],
    },
  };
}

function detectHeaderRowIndex(matrix) {
  const bestRow = matrix.reduce(
    (best, row, index) => {
      if (isEmptyRow(row)) {
        return best;
      }

      const score = scoreHeaderRow(row);

      if (score > best.score || (score === best.score && index > best.index)) {
        return { index, score };
      }

      return best;
    },
    { index: -1, score: -Infinity },
  );

  if (bestRow.index === -1) {
    return -1;
  }

  let headerRowIndex = bestRow.index;

  for (let index = bestRow.index + 1; index <= bestRow.index + 2; index += 1) {
    if (!matrix[index] || isEmptyRow(matrix[index])) {
      break;
    }

    if (isHeaderLikeRow(matrix[index])) {
      headerRowIndex = index;
    } else {
      break;
    }
  }

  return headerRowIndex;
}

function detectHeaderStartIndex(matrix, headerRowIndex) {
  let startIndex = headerRowIndex;

  for (let index = headerRowIndex - 1; index >= 0 && headerRowIndex - index <= 2; index -= 1) {
    const row = matrix[index];

    if (!row || isEmptyRow(row) || !isHeaderPrefixRow(row)) {
      break;
    }

    startIndex = index;
  }

  return startIndex;
}

function scoreHeaderRow(row) {
  const cells = row.map(cleanCellValue).filter(Boolean);
  const textCells = cells.filter(isTextLikeHeaderValue);
  const keywordMatches = cells.filter(hasHeaderKeyword);
  const yearCells = cells.filter(isLikelyYearValue);
  const singleCellPenalty = cells.length === 1 ? 6 : 0;

  return (
    cells.length +
    textCells.length * 2 +
    keywordMatches.length * 4 +
    yearCells.length * 3 -
    singleCellPenalty
  );
}

function isHeaderLikeRow(row) {
  const cells = row.map(cleanCellValue).filter(Boolean);

  if (cells.length < 2) {
    return false;
  }

  const headerLikeCells = cells.filter(isTextLikeHeaderValue);
  const numericDataCells = cells.filter(
    (cell) => parseNumericValue(cell) !== null && !isLikelyYearValue(cell),
  );

  return headerLikeCells.length >= Math.ceil(cells.length * 0.6) &&
    numericDataCells.length === 0;
}

function isHeaderPrefixRow(row) {
  const cells = row.map(cleanCellValue).filter(Boolean);

  if (cells.length < 2) {
    return false;
  }

  return cells.filter(isTextLikeHeaderValue).length >= Math.ceil(cells.length / 2);
}

function buildRawColumnNames(headerRows, maxColumnCount) {
  const preparedHeaderRows = headerRows.map((row, index) => {
    const shouldFillGroups = index < headerRows.length - 1;

    return shouldFillGroups ? fillHeaderGroups(row, maxColumnCount) : row;
  });

  return Array.from({ length: maxColumnCount }, (_, columnIndex) => {
    const parts = [];

    preparedHeaderRows.forEach((row) => {
      const part = cleanCellValue(row[columnIndex]);

      if (!part) {
        return;
      }

      const duplicatedPart = parts.some(
        (currentPart) => normalizeText(currentPart) === normalizeText(part),
      );

      if (!duplicatedPart) {
        parts.push(part);
      }
    });

    return parts.join(' ');
  });
}

function fillHeaderGroups(row, maxColumnCount) {
  const filledRow = [];
  let lastValue = '';

  for (let index = 0; index < maxColumnCount; index += 1) {
    const value = cleanCellValue(row[index]);

    if (value) {
      lastValue = value;
      filledRow[index] = value;
    } else {
      filledRow[index] = lastValue;
    }
  }

  return filledRow;
}

function cleanColumnNames(rawColumnNames) {
  const usedNames = {};
  const generatedColumns = [];

  const columns = rawColumnNames.map((rawName, index) => {
    const baseName = toCamelCase(rawName);
    const fallbackName = `columna${index + 1}`;
    const wasGenerated = !baseName;
    const normalizedBaseName = baseName || fallbackName;
    const nextCount = (usedNames[normalizedBaseName] ?? 0) + 1;

    usedNames[normalizedBaseName] = nextCount;

    const columnName =
      nextCount === 1 ? normalizedBaseName : `${normalizedBaseName}${nextCount}`;

    if (wasGenerated) {
      generatedColumns.push(columnName);
    }

    return columnName;
  });

  return { columns, generatedColumns };
}

function buildRows(dataRows, columns) {
  return dataRows
    .map((row) =>
      columns.reduce((record, column, index) => {
        record[column] = cleanCellValue(row[index]);
        return record;
      }, {}),
    )
    .filter((row) => Object.values(row).some(hasUsefulValue));
}

function propagateYears(rows, columns) {
  const yearColumns = detectYearColumns(rows, columns);
  const lastYearByColumn = {};

  return rows.map((row) => {
    const nextRow = { ...row };

    yearColumns.forEach((column) => {
      const value = nextRow[column];

      if (isLikelyYearValue(value)) {
        lastYearByColumn[column] = value;
      } else if (!hasUsefulValue(value) && lastYearByColumn[column]) {
        nextRow[column] = lastYearByColumn[column];
      }
    });

    return nextRow;
  });
}

function detectYearColumns(rows, columns) {
  return columns.filter((column) => {
    const normalizedColumn = normalizeText(column);
    const values = rows.map((row) => row[column]).filter(hasUsefulValue);
    const yearValues = values.filter(isLikelyYearValue);

    return ['ANO', 'ANIO', 'YEAR'].includes(normalizedColumn) ||
      (yearValues.length > 0 && yearValues.length >= values.length / 2);
  });
}

function detectNumericColumns(rows, columns, yearColumns) {
  return columns.filter((column) => {
    if (yearColumns.includes(column)) {
      return false;
    }

    const values = rows.map((row) => row[column]).filter(hasUsefulValue);

    if (values.length === 0) {
      return false;
    }

    const numericValues = values.filter((value) => parseNumericValue(value) !== null);
    const dashValues = values.filter(isDashValue);

    return numericValues.length > 0 &&
      numericValues.length + dashValues.length > values.length / 2;
  });
}

function detectLabelColumns(rows, columns, numericColumns) {
  const preferredColumns = columns.filter((column) => {
    const normalizedColumn = toCamelCase(column);

    return !numericColumns.includes(column) &&
      LABEL_HINTS.some((hint) => normalizedColumn.includes(hint));
  });

  if (preferredColumns.length > 0) {
    return preferredColumns;
  }

  const firstTextColumn = columns.find((column) => {
    if (numericColumns.includes(column)) {
      return false;
    }

    return rows.some((row) => {
      const value = row[column];

      return hasUsefulValue(value) && parseNumericValue(value) === null;
    });
  });

  return firstTextColumn ? [firstTextColumn] : columns.slice(0, 1);
}

function cleanRows(rows, columns, numericColumns) {
  return rows.map((row) =>
    columns.reduce((record, column) => {
      const value = row[column];

      if (!numericColumns.includes(column)) {
        record[column] = value;
        return record;
      }

      if (!hasUsefulValue(value)) {
        record[column] = '';
      } else if (isDashValue(value)) {
        record[column] = 0;
      } else {
        record[column] = parseNumericValue(value) ?? value;
      }

      return record;
    }, {}),
  );
}

function toCamelCase(value) {
  const cleanedValue = removeAccents(value)
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim();

  if (!cleanedValue) {
    return '';
  }

  if (/^\d{4}$/.test(cleanedValue)) {
    return cleanedValue;
  }

  const tokens = cleanedValue
    .split(/\s+/)
    .map((token) => token.toLowerCase())
    .filter((token) => token && !STOP_WORDS.has(token));

  if (tokens.length === 0) {
    return '';
  }

  return tokens
    .map((token, index) =>
      index === 0 ? token : token.charAt(0).toUpperCase() + token.slice(1),
    )
    .join('');
}

function cleanCellValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).replace(/\s+/g, ' ').trim();
}

function isEmptyRow(row) {
  return row.every((cell) => !hasUsefulValue(cell));
}

function hasUsefulValue(value) {
  return cleanCellValue(value) !== '';
}

function isDashValue(value) {
  return /^-+$/.test(cleanCellValue(value));
}

function isTextLikeHeaderValue(value) {
  const normalizedValue = normalizeText(value);

  return /[A-Z]/.test(normalizedValue) ||
    isLikelyYearValue(value) ||
    hasHeaderKeyword(value);
}

function hasHeaderKeyword(value) {
  const normalizedValue = normalizeText(value);

  return HEADER_KEYWORDS.some((keyword) => normalizedValue.includes(keyword));
}

function isLikelyYearValue(value) {
  return /^(19|20)\d{2}$/.test(cleanCellValue(value));
}

function normalizeText(value) {
  return removeAccents(value).toUpperCase();
}

function removeAccents(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
