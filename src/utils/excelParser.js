import * as XLSX from 'xlsx';
import {
  ALERTAS_NUMERIC_COLUMNS,
  ALERTAS_SHEET_COLUMNS,
  isAlertasSheet,
  parseAlertasSheet,
} from '../parsers/alertasParser';
import {
  CLASIFICACION_PARSER_VERSION,
  isClasificacionSheet,
  parseClasificacionSheet,
} from '../parsers/clasificacionParser';
import {
  TIPOLOGIA_NUMERIC_COLUMNS,
  TIPOLOGIA_SHEET_COLUMNS,
  isTipologiaSheet,
  parseTipologiaSheet,
} from '../parsers/tipologiaParser';
import {
  POBLACION_NUMERIC_COLUMNS,
  POBLACION_PARSER_VERSION,
  POBLACION_SHEET_COLUMNS,
  isPoblacionSheet,
  parsePoblacionSheet,
} from '../parsers/poblacionParser';
import { normalizeMatrix } from './sheetNormalizer';

// Lee cada hoja como matriz cruda y la normaliza antes de usarla en React.
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const bytes = new Uint8Array(event.target.result);
        const workbook = XLSX.read(bytes, { type: 'array' });

        const sheets = workbook.SheetNames.map((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const matrix = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            raw: false,
          });

          return {
            name: sheetName,
            data: parseSheet(matrix, sheetName),
          };
        });

        resolve(sheets);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('No se pudo leer el archivo seleccionado.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

function parseSheet(matrix, sheetName) {
  if (isAlertasSheet(sheetName)) {
    const normalizedRows = parseAlertasSheet(matrix);

    console.log("HOJA NORMALIZADA", sheetName, normalizedRows[0]);

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

    console.log('CLASIFICACION PARSEADA', {
      resumenAnual: resumenAnual.slice(0, 3),
      detalleMensual: detalleMensual.slice(0, 3),
    });

    if (resumenAnual.length === 0 || detalleMensual.length === 0) {
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
