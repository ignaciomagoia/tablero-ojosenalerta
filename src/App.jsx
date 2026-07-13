import { useEffect, useState } from 'react';
import DataSourceSelector from './components/DataSourceSelector';
import FileUploader from './components/FileUploader';
import SheetChart from './components/SheetChart';
import SheetSelector from './components/SheetSelector';
import ClasificacionCharts from './charts/ClasificacionCharts';
import PersonalCharts from './charts/PersonalCharts';
import PoblacionCharts from './charts/PoblacionCharts';
import RecursosOperativosCharts from './charts/RecursosOperativosCharts';
import TipologiaCharts from './charts/TipologiaCharts';
import tableroTotales from './data/tableroTotales.json';
import visualizacionTablerosRecursos from './data/visualizacionTablerosRecursos.json';
import { isAlertasSheet } from './parsers/alertasParser';
import {
  CLASIFICACION_PARSER_VERSION,
  isClasificacionSheet,
} from './parsers/clasificacionParser';
import {
  PERSONAL_PARSER_VERSION,
  isPersonalSheetData,
} from './parsers/personalParser';
import {
  POBLACION_NUMERIC_COLUMNS,
  POBLACION_PARSER_VERSION,
  POBLACION_SHEET_COLUMNS,
  isPoblacionSheet,
  parsePoblacionSheet,
} from './parsers/poblacionParser';
import {
  RECURSOS_PARSER_VERSION,
  isRecursosSheetData,
} from './parsers/recursosParser';
import { isTipologiaSheet } from './parsers/tipologiaParser';
import { normalizeRows } from './utils/sheetNormalizer';

const STORAGE_KEY = 'ojos-en-alerta-files-v5';
const PRELOADED_FILES = createFilesCollection([
  tableroTotales,
  visualizacionTablerosRecursos,
]);

function App() {
  const isAdmin = window.location.pathname === '/admin';
  const [files, setFiles] = useState(getInitialFiles);
  const firstFileName = getFirstFileName(files);
  const [selectedFileName, setSelectedFileName] = useState(firstFileName);
  const [selectedSheetName, setSelectedSheetName] = useState(
    getFirstSheetName(files[firstFileName]),
  );
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const selectedFile = files[selectedFileName];
  const availableSheets = Object.keys(selectedFile?.sheets || {});
  const rawCurrentSheet = selectedFile?.sheets?.[selectedSheetName];
  const isPoblacionSheetSelected = isPoblacionSheet(selectedSheetName);
  const currentSheet = isPoblacionSheetSelected
    ? normalizePoblacionSheetData(rawCurrentSheet)
    : rawCurrentSheet;
  const currentRows = currentSheet?.rows || [];
  const currentColumns = currentSheet?.columns || [];
  const isClasificacionSheetSelected =
    currentSheet?.type === 'clasificacion' || isClasificacionSheet(selectedSheetName);
  const isPersonalSheetSelected = isPersonalSheetData(currentSheet);
  const isRecursosSheetSelected = isRecursosSheetData(currentSheet);
  const isTipologiaSheetSelected = isTipologiaSheet(selectedSheetName);
  const dashboardSummary = getDashboardSummary(files);

  useEffect(() => {
    if (!hasStaleSpecialSheets(files)) {
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    setFiles(PRELOADED_FILES);

    const firstPreloadedFileName = getFirstFileName(PRELOADED_FILES);

    setSelectedFileName(firstPreloadedFileName);
    setSelectedSheetName(
      getFirstSheetName(PRELOADED_FILES[firstPreloadedFileName]),
    );
    setError(
      'Se limpiaron datos guardados antiguos. Si cargaste un Excel manual, volve a seleccionarlo para reprocesarlo.',
    );
  }, [files]);

  const handleFilesLoad = (loadedFiles) => {
    const validFiles = loadedFiles
      .map(({ fileName, sheets }) => ({
        fileName,
        sheets: normalizeSheets(sheets),
      }))
      .filter((file) => Object.keys(file.sheets).length > 0);

    if (validFiles.length === 0) {
      setError('El archivo no contiene secciones disponibles.');
      return;
    }

    const newFiles = validFiles.reduce(
      (collection, { fileName, sheets }) => ({
        ...collection,
        [fileName]: {
          fileName,
          sheets,
        },
      }),
      {},
    );
    const firstLoadedFileName = getFirstFileName(newFiles);

    // Cada seleccion del input reemplaza toda la coleccion anterior.
    setFiles(newFiles);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newFiles));
    setSelectedFileName(firstLoadedFileName);
    setSelectedSheetName(getFirstSheetName(newFiles[firstLoadedFileName]));
    setError('');
  };

  const handleFileSelect = (fileName) => {
    setSelectedFileName(fileName);
    setSelectedSheetName(getFirstSheetName(files[fileName]));
  };

  const handleError = (message) => {
    // Si falla una carga manual, conservamos lo que el usuario ya estaba viendo.
    setError(message);
  };

  const handleRestorePreloadedData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setFiles(PRELOADED_FILES);
    setSelectedFileName(getFirstFileName(PRELOADED_FILES));
    setSelectedSheetName(
      getFirstSheetName(PRELOADED_FILES[getFirstFileName(PRELOADED_FILES)]),
    );
    setError('');
  };

  const handleClearSavedData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setFiles({});
    setSelectedFileName('');
    setSelectedSheetName('');
    setError('');
  };

  return (
    <main className="app-shell">
      <section className="institutional-header" aria-label="Encabezado institucional">
        <div className="institutional-logo-slot institutional-logo-slot-left">
          <img
            src="/ojosenalerta.png"
            alt="Ojos en Alerta"
          />
        </div>
        <div className="institutional-logo-slot institutional-logo-slot-right">
          <img
            src="/ministerio.png"
            alt="Ministerio de Seguridad de Cordoba"
          />
        </div>
      </section>

      <header className="app-header">
        <h1>Tablero de Gestión</h1>
        {isAdmin && (
          <a className="secondary-button admin-back-link" href="/">
            Volver al tablero
          </a>
        )}
      </header>

      <section className="summary-grid" aria-label="Resumen del tablero">
        <article className="summary-card">
          <span>Periodo de datos</span>
          <strong>{dashboardSummary.dataPeriod}</strong>
        </article>
        <article className="summary-card">
          <span>Total de alertas</span>
          <strong>{dashboardSummary.totalAlertas}</strong>
        </article>
        <article className="summary-card">
          <span>Última actualización</span>
          <strong>{dashboardSummary.latestPeriod}</strong>
        </article>
      </section>

      {isAdmin && (
        <details className="card update-panel">
          <summary>Actualizar datos</summary>
          <p className="muted">
            Carga uno o varios Excel juntos. Cada carga reemplaza por completo
            los archivos actuales.
          </p>
          <FileUploader
            onFilesLoad={handleFilesLoad}
            onError={handleError}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
          <button
            type="button"
            className="secondary-button"
            onClick={handleRestorePreloadedData}
          >
            Restaurar datos precargados
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={handleClearSavedData}
          >
            Limpiar datos guardados
          </button>
        </details>
      )}

      {error && <p className="alert">{error}</p>}

      <div className="dashboard-grid">
        <div className="sidebar">
          <DataSourceSelector
            files={files}
            selectedFileName={selectedFileName}
            onSelectFile={handleFileSelect}
          />
          <SheetSelector
            sheets={availableSheets}
            selectedSheetName={selectedSheetName}
            onSelectSheet={setSelectedSheetName}
          />
        </div>

        {selectedFile && (
          <div className="content-panel">
            {isPersonalSheetSelected ? (
              <PersonalCharts data={currentSheet} />
            ) : isRecursosSheetSelected ? (
              <RecursosOperativosCharts data={currentSheet} />
            ) : isClasificacionSheetSelected ? (
              <>
                <ClasificacionCharts
                  resumenAnual={currentSheet?.resumenAnual ?? []}
                  detalleMensual={currentSheet?.detalleMensual ?? []}
                />
              </>
            ) : isTipologiaSheetSelected ? (
              <TipologiaCharts rows={currentRows} />
            ) : isPoblacionSheetSelected ? (
              <PoblacionCharts rows={currentRows} />
            ) : (
              <SheetChart
                rows={currentRows}
                columns={currentColumns}
                metadata={currentSheet?.metadata}
                selectedSheetName={selectedSheetName}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function getInitialFiles() {
  const savedData = localStorage.getItem(STORAGE_KEY);

  if (!savedData) {
    return PRELOADED_FILES;
  }

  try {
    const parsedData = JSON.parse(savedData);
    const normalizedData = normalizeSavedFiles(parsedData);

    if (hasStaleSpecialSheets(normalizedData)) {
      localStorage.removeItem(STORAGE_KEY);
      return PRELOADED_FILES;
    }

    if (isValidFilesCollection(normalizedData)) {
      return normalizedData;
    }
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
  }

  return PRELOADED_FILES;
}

function normalizeSavedFiles(data) {
  // Soporta datos guardados por la version anterior, que usaba una lista.
  if (Array.isArray(data)) {
    return createFilesCollection(data);
  }

  if (data && !Array.isArray(data)) {
    return Object.entries(data).reduce((collection, [fileName, file]) => {
      if (!file?.sheets) {
        return collection;
      }

      return {
        ...collection,
        [fileName]: {
          fileName: file.fileName || fileName,
          sheets: normalizeSheets(file.sheets),
        },
      };
    }, {});
  }

  return null;
}

function createFilesCollection(sources) {
  return sources.reduce((collection, source) => {
    const fileName = source.fileName || source.name;

    return {
      ...collection,
      [fileName]: {
        fileName,
        sheets: normalizeSheets(source.sheets),
      },
    };
  }, {});
}

function normalizeSheets(sheets) {
  if (Array.isArray(sheets)) {
    return sheets.reduce(
      (sheetMap, sheet) => ({
        ...sheetMap,
        [sheet.name]: normalizeSheetData(sheet.data, sheet.name),
      }),
      {},
    );
  }

  return Object.entries(sheets ?? {}).reduce(
    (sheetMap, [sheetName, sheetData]) => ({
      ...sheetMap,
      [sheetName]: normalizeSheetData(sheetData, sheetName),
    }),
    {},
  );
}

function normalizeSheetData(sheetData, sheetName = '') {
  if (isPersonalSheetData(sheetData)) {
    return sheetData;
  }

  if (isRecursosSheetData(sheetData)) {
    return sheetData;
  }

  if (isPoblacionSheet(sheetName)) {
    return normalizePoblacionSheetData(sheetData);
  }

  if (isClasificacionSheetData(sheetData)) {
    return sheetData;
  }

  if (isNormalizedSheet(sheetData)) {
    return sheetData;
  }

  if (Array.isArray(sheetData)) {
    return normalizeRows(sheetData);
  }

  return {
    columns: [],
    rows: [],
    metadata: {
      headerRowIndex: -1,
      detectedLabelColumns: [],
      detectedNumericColumns: [],
    },
  };
}

function getFirstFileName(files) {
  return Object.keys(files)[0] ?? '';
}

function getFirstSheetName(file) {
  return Object.keys(file?.sheets ?? {})[0] ?? '';
}

function isValidFilesCollection(data) {
  return (
    data &&
    !Array.isArray(data) &&
    Object.keys(data).length > 0 &&
    Object.entries(data).every(
      ([fileName, file]) =>
        file.fileName === fileName &&
        file.sheets &&
        !Array.isArray(file.sheets) &&
        Object.values(file.sheets).every(
          (sheet) =>
            isPersonalSheetData(sheet) ||
            isRecursosSheetData(sheet) ||
            isClasificacionSheetData(sheet) ||
            (Array.isArray(sheet?.rows) && Array.isArray(sheet?.columns)),
        ),
    )
  );
}

function isNormalizedSheet(sheetData) {
  return (
    sheetData &&
    Array.isArray(sheetData.columns) &&
    Array.isArray(sheetData.rows) &&
    sheetData.metadata
  );
}

function hasStaleSpecialSheets(files) {
  if (!files || Array.isArray(files)) {
    return false;
  }

  return Object.values(files).some((file) =>
    Object.entries(file?.sheets ?? {}).some(
      ([sheetName, sheet]) =>
        (isTipologiaSheet(sheetName) &&
          sheet.metadata?.parser !== 'tipologiaParser') ||
        isStalePersonalSheet(sheet) ||
        isStaleRecursosSheet(sheet) ||
        isStaleClasificacionSheet(sheetName, sheet) ||
        isStalePoblacionSheet(sheetName, sheet) ||
        (isAlertasSheet(sheetName) &&
          sheet.metadata?.parser !== 'alertasParser'),
    ),
  );
}

function isStalePersonalSheet(sheet) {
  if (sheet?.type !== 'personalOperativo') {
    return false;
  }

  return (
    sheet?.metadata?.parser !== 'personalParser' ||
    sheet.metadata?.version !== PERSONAL_PARSER_VERSION ||
    !isPersonalSheetData(sheet)
  );
}

function isStaleRecursosSheet(sheet) {
  if (sheet?.type !== 'recursosOperativos') {
    return false;
  }

  return (
    sheet?.metadata?.parser !== 'recursosParser' ||
    sheet.metadata?.version !== RECURSOS_PARSER_VERSION ||
    !isRecursosSheetData(sheet)
  );
}

function isStaleClasificacionSheet(sheetName, sheet) {
  if (!isClasificacionSheet(sheetName)) {
    return false;
  }

  return (
    sheet?.metadata?.parser !== 'clasificacionParser' ||
    sheet.metadata?.version !== CLASIFICACION_PARSER_VERSION ||
    !isClasificacionSheetData(sheet) ||
    sheet.resumenAnual.length === 0 ||
    sheet.detalleMensual.length === 0
  );
}

function isStalePoblacionSheet(sheetName, sheet) {
  if (!isPoblacionSheet(sheetName)) {
    return false;
  }

  return (
    sheet?.metadata?.parser !== 'poblacionParser' ||
    sheet.metadata?.version !== POBLACION_PARSER_VERSION ||
    !Array.isArray(sheet?.rows) ||
    sheet.rows.length === 0 ||
    sheet.rows.some((row) => !isValidPoblacionRow(row))
  );
}

function isValidPoblacionRow(row) {
  return (
    Number.isFinite(Number(row?.anio)) &&
    typeof row?.mes === 'string' &&
    row.mes.trim() !== '' &&
    typeof row?.fechaOrden === 'string' &&
    /^\d{4}-\d{2}$/.test(row.fechaOrden) &&
    Object.prototype.hasOwnProperty.call(row, 'cantidadBarrios') &&
    Object.prototype.hasOwnProperty.call(row, 'poblacion') &&
    Object.prototype.hasOwnProperty.call(row, 'poblacionObjetivo') &&
    Object.prototype.hasOwnProperty.call(row, 'adheridos') &&
    Object.prototype.hasOwnProperty.call(row, 'porcentajePoblacionObjetivoAdherida')
  );
}

function normalizePoblacionSheetData(sheetData) {
  if (isPoblacionSheetData(sheetData)) {
    return sheetData;
  }

  const sourceRows = Array.isArray(sheetData) ? sheetData : sheetData?.rows ?? [];
  const normalizedRows = parsePoblacionSheet(
    sourceRows.map(toPoblacionMatrixRow),
  );

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

function toPoblacionMatrixRow(row) {
  if (Array.isArray(row)) {
    return row.slice(0, 7);
  }

  return [
    getRowValue(row, ['anio', 'ano', 'año', 'columna1']),
    getRowValue(row, ['mes', 'columna2']),
    getRowValue(row, ['cantidadBarrios', 'cantidadbarrios']),
    getRowValue(row, ['poblacion']),
    getRowValue(row, ['poblacionObjetivo']),
    getRowValue(row, ['adheridos']),
    getRowValue(row, [
      'porcentajePoblacionObjetivoAdherida',
      'poblacionObjetivoAdherida',
    ]),
  ];
}

function getRowValue(row, keys) {
  const matchedKey = keys.find((key) => {
    const value = row?.[key];

    return value !== undefined && value !== null && value !== '';
  });

  return matchedKey ? row[matchedKey] : '';
}

function isClasificacionSheetData(sheetData) {
  return (
    sheetData?.type === 'clasificacion' &&
    Array.isArray(sheetData.resumenAnual) &&
    Array.isArray(sheetData.detalleMensual)
  );
}

function isPoblacionSheetData(sheetData) {
  return (
    sheetData?.metadata?.parser === 'poblacionParser' &&
    sheetData.metadata?.version === POBLACION_PARSER_VERSION &&
    Array.isArray(sheetData.rows) &&
    Array.isArray(sheetData.columns) &&
    sheetData.rows.length > 0 &&
    sheetData.rows.every(isValidPoblacionRow)
  );
}

function getDashboardSummary(files) {
  const datedRows = getRowsWithPeriods(files);
  const sortedDatedRows = datedRows.sort((leftRow, rightRow) =>
    leftRow.fechaOrden.localeCompare(rightRow.fechaOrden),
  );
  const firstRow = sortedDatedRows[0];
  const lastRow = sortedDatedRows.at(-1);
  const totalAlertas = getTotalAlertas(files);

  return {
    latestPeriod: lastRow ? formatPeriodLabel(lastRow) : '-',
    dataPeriod: firstRow && lastRow
      ? `${formatPeriodLabel(firstRow)} - ${formatPeriodLabel(lastRow)}`
      : '-',
    totalAlertas: totalAlertas === null ? '-' : formatNumber(totalAlertas),
  };
}

function getRowsWithPeriods(files) {
  return Object.values(files).flatMap((file) =>
    Object.values(file.sheets).flatMap((sheet) => {
      const rows = isClasificacionSheetData(sheet)
        ? sheet.detalleMensual
        : sheet.rows ?? [];

      return rows.filter((row) => isValidPeriodRow(row));
    }),
  );
}

function getTotalAlertas(files) {
  const prioritizedSheetRows = findRowsForSheet(files, isAlertasSheet) ??
    findRowsForSheet(files, isTipologiaSheet);

  if (prioritizedSheetRows) {
    return sumTotalAlertas(prioritizedSheetRows);
  }

  const fallbackRows = Object.values(files).flatMap((file) =>
    Object.values(file.sheets).flatMap((sheet) => sheet.rows ?? []),
  );
  const rowsWithAlertas = fallbackRows.filter((row) =>
    Object.prototype.hasOwnProperty.call(row, 'totalAlertas'),
  );

  return rowsWithAlertas.length > 0 ? sumTotalAlertas(rowsWithAlertas) : null;
}

function findRowsForSheet(files, matcher) {
  for (const file of Object.values(files)) {
    for (const [sheetName, sheet] of Object.entries(file.sheets)) {
      if (matcher(sheetName) && Array.isArray(sheet.rows)) {
        return sheet.rows;
      }
    }
  }

  return null;
}

function sumTotalAlertas(rows) {
  return rows.reduce((total, row) => total + (Number(row.totalAlertas) || 0), 0);
}

function isValidPeriodRow(row) {
  return (
    typeof row?.fechaOrden === 'string' &&
    /^\d{4}-\d{2}$/.test(row.fechaOrden) &&
    typeof row?.mes === 'string' &&
    row.mes.trim() !== '' &&
    Number.isFinite(Number(row?.anio))
  );
}

function formatPeriodLabel(row) {
  return `${row.mes} ${row.anio}`;
}

function formatNumber(value) {
  return Number(value).toLocaleString('es-AR', {
    maximumFractionDigits: 0,
  });
}

export default App;
