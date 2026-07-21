import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import { readRawSheets } from '../src/utils/excelParser.js';
import { parseWorkbookSheets } from '../src/utils/workbookParser.js';
import { isRecursosWorkbook } from '../src/parsers/movilesParser.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const OUTPUTS = {
  estadisticas: {
    id: 'tablero-totales',
    path: path.join(projectRoot, 'src', 'data', 'tableroTotales.json'),
  },
  recursos: {
    id: 'visualizacion-tableros-recursos',
    path: path.join(projectRoot, 'src', 'data', 'visualizacionTablerosRecursos.json'),
  },
};

const inputPaths = process.argv.slice(2);

if (inputPaths.length === 0) {
  console.error([
    'Uso:',
    '  npm run data:update -- "C:\\ruta\\Tablero totales.xlsx" "C:\\ruta\\VISUALIZACION tableros recursos.xlsx"',
    '',
    'El comando actualiza los JSON de src/data/. Luego hay que hacer deploy para que lo vea todo el equipo.',
  ].join('\n'));
  process.exit(1);
}

for (const inputPath of inputPaths) {
  await updatePreloadedFile(inputPath);
}

async function updatePreloadedFile(inputPath) {
  const absoluteInputPath = path.resolve(inputPath);
  const fileName = path.basename(absoluteInputPath);
  const workbookBuffer = await fs.readFile(absoluteInputPath);
  const workbook = XLSX.read(workbookBuffer, { type: 'buffer' });
  const rawSheets = readRawSheets(workbook);
  const parsedSheets = parseWorkbookSheets(rawSheets, fileName);
  const outputConfig = isRecursosWorkbook(fileName, rawSheets)
    ? OUTPUTS.recursos
    : OUTPUTS.estadisticas;
  const source = {
    id: outputConfig.id,
    fileName,
    sheets: Object.fromEntries(
      parsedSheets.map((sheet) => [sheet.name, sheet.data]),
    ),
  };

  await fs.writeFile(
    outputConfig.path,
    `${JSON.stringify(source, null, 2)}\n`,
    'utf8',
  );

  console.log(`Actualizado ${path.relative(projectRoot, outputConfig.path)}`);
  console.log(`  Excel: ${fileName}`);
  console.log(`  Hojas: ${parsedSheets.map((sheet) => sheet.name).join(', ')}`);
  console.log(`  Filas procesadas: ${countProcessedRows(parsedSheets)}`);
}

function countProcessedRows(sheets) {
  return sheets.reduce((total, sheet) => {
    const data = sheet.data;

    if (Array.isArray(data?.rows)) {
      return total + data.rows.length;
    }

    if (Array.isArray(data?.detalleMensual)) {
      return total + data.detalleMensual.length;
    }

    if (data?.type === 'movilesEquipamiento') {
      return total +
        (data.movilesPorZona?.length ?? 0) +
        (data.chalecosPorZona?.length ?? 0) +
        (data.movilesPorCuadrante?.length ?? 0) +
        (data.chalecosPorCuadrante?.length ?? 0) +
        (data.movilesPorDistrito?.length ?? 0) +
        (data.chalecosPorDistrito?.length ?? 0);
    }

    if (data?.type === 'personalOperativo') {
      return total +
        (data.administrativoPorZona?.length ?? 0) +
        (data.callePorZona?.length ?? 0) +
        (data.callePorCuadrante?.length ?? 0) +
        (data.callePorDistrito?.length ?? 0);
    }

    return total;
  }, 0);
}
