import {
  ALERTAS_NUMERIC_COLUMNS,
  ALERTAS_SHEET_COLUMNS,
  isAlertasSheet,
  parseAlertasSheet,
} from '../parsers/alertasParser.js';
import {
  CLASIFICACION_PARSER_VERSION,
  isClasificacionSheet,
  parseClasificacionSheet,
} from '../parsers/clasificacionParser.js';
import {
  TIPOLOGIA_NUMERIC_COLUMNS,
  TIPOLOGIA_SHEET_COLUMNS,
  isTipologiaSheet,
  parseTipologiaSheet,
} from '../parsers/tipologiaParser.js';
import {
  POBLACION_NUMERIC_COLUMNS,
  POBLACION_PARSER_VERSION,
  POBLACION_SHEET_COLUMNS,
  isPoblacionSheet,
  parsePoblacionSheet,
} from '../parsers/poblacionParser.js';
import {
  PERSONAL_SHEET_NAME,
  findPersonalSheet,
  parsePersonalSheet,
} from '../parsers/personalParser.js';
import {
  MOVILES_SHEET_NAME,
  findMovilesSheet,
  isRecursosWorkbook,
  parseMovilesSheet,
} from '../parsers/movilesParser.js';
import { normalizeMatrix } from './sheetNormalizer.js';

export function parseWorkbookSheets(rawSheets, fileName, options = {}) {
  if (isRecursosWorkbook(fileName, rawSheets)) {
    const movilesSheet = findMovilesSheet(rawSheets);
    const personalSheet = findPersonalSheet(rawSheets);
    const parsedSheets = [];

    if (movilesSheet) {
      parsedSheets.push({
        name: MOVILES_SHEET_NAME,
        data: parseMovilesSheet(movilesSheet.matrix, {
          fileName,
          sourceSheetName: movilesSheet.sheetName,
        }),
      });
    }

    if (personalSheet) {
      parsedSheets.push({
        name: PERSONAL_SHEET_NAME,
        data: parsePersonalSheet(personalSheet.matrix, {
          fileName,
          sourceSheetName: personalSheet.sheetName,
        }),
      });
    }

    return parsedSheets;
  }

  return rawSheets.map(({ sheetName, matrix }) => ({
    name: sheetName,
    data: parseSheet(matrix, sheetName, options),
  }));
}

export function parseSheet(matrix, sheetName, options = {}) {
  if (isAlertasSheet(sheetName)) {
    const normalizedRows = parseAlertasSheet(matrix);

    if (options.debug) {
      console.log('HOJA NORMALIZADA', sheetName, normalizedRows[0]);
    }

    return {
      columns: ALERTAS_SHEET_COLUMNS,
      rows: normalizedRows,
      metadata: {
        headerRowIndex: -1,
        detectedLabelColumns: ['mes'],
        detectedNumericColumns: ALERTAS_NUMERIC_COLUMNS,
        generatedColumns: [],
        parser: 'alertasParser',
        chartLabel: 'mesAnio',
      },
    };
  }

  if (isTipologiaSheet(sheetName)) {
    const normalizedRows = parseTipologiaSheet(matrix);

    return {
      columns: TIPOLOGIA_SHEET_COLUMNS,
      rows: normalizedRows,
      metadata: {
        headerRowIndex: -1,
        detectedLabelColumns: ['mes'],
        detectedNumericColumns: TIPOLOGIA_NUMERIC_COLUMNS,
        generatedColumns: [],
        parser: 'tipologiaParser',
        chartLabel: 'mesAnio',
      },
    };
  }

  if (isClasificacionSheet(sheetName)) {
    const parsedSheet = parseClasificacionSheet(matrix);
    const { resumenAnual, detalleMensual } = parsedSheet;

    if (options.debug) {
      console.log('CLASIFICACION PARSEADA', {
        resumenAnual: resumenAnual.slice(0, 3),
        detalleMensual: detalleMensual.slice(0, 3),
      });
    }

    if (options.debug && (resumenAnual.length === 0 || detalleMensual.length === 0)) {
      console.log('CLASIFICACION DEBUG', {
        matrixLength: matrix.length,
        firstRows: matrix.slice(0, 10),
        tipoRows: findRowsContaining(matrix, 'TIPO'),
        yearRows: findRowsWithYear(matrix),
      });
    }

    return {
      ...parsedSheet,
      metadata: {
        parser: 'clasificacionParser',
        version: CLASIFICACION_PARSER_VERSION,
      },
    };
  }

  if (isPoblacionSheet(sheetName)) {
    const normalizedRows = parsePoblacionSheet(matrix);

    return {
      columns: POBLACION_SHEET_COLUMNS,
      rows: normalizedRows,
      metadata: {
        headerRowIndex: -1,
        detectedLabelColumns: ['mes'],
        detectedNumericColumns: POBLACION_NUMERIC_COLUMNS,
        generatedColumns: [],
        parser: 'poblacionParser',
        version: POBLACION_PARSER_VERSION,
        chartLabel: 'mesAnio',
      },
    };
  }

  return normalizeMatrix(matrix, sheetName);
}

function findRowsContaining(matrix, text) {
  const normalizedText = normalizeText(text);

  return matrix
    .map((row, index) => ({ index, row }))
    .filter(({ row }) =>
      row.some((cell) => normalizeText(cell).includes(normalizedText)),
    );
}

function findRowsWithYear(matrix) {
  return matrix
    .map((row, index) => ({ index, row }))
    .filter(({ row }) =>
      row.some((cell) => /(19|20)\d{2}/.test(String(cell ?? ''))),
    );
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}
