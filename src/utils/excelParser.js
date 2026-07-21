import * as XLSX from 'xlsx';
import { parseWorkbookSheets } from './workbookParser.js';

// Lee cada hoja como matriz cruda y la normaliza antes de usarla en React.
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const bytes = new Uint8Array(event.target.result);
        const workbook = XLSX.read(bytes, { type: 'array' });

        resolve(parseWorkbookSheets(readRawSheets(workbook), file.name));
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

export function readRawSheets(workbook) {
  return workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    return {
      sheetName,
      matrix,
    };
  });
}
