import { useEffect, useState } from 'react';
import DataSourceSelector from './components/DataSourceSelector';
import FileUploader from './components/FileUploader';
import SheetChart from './components/SheetChart';
import SheetSelector from './components/SheetSelector';
import ClasificacionCharts from './charts/ClasificacionCharts';
import PoblacionCharts from './charts/PoblacionCharts';
import TipologiaCharts from './charts/TipologiaCharts';
import segundoArchivo from './data/segundoArchivo.json';
import tableroTotales from './data/tableroTotales.json';
import { isAlertasSheet } from './parsers/alertasParser';
import {
  CLASIFICACION_PARSER_VERSION,
  isClasificacionSheet,
} from './parsers/clasificacionParser';
import {
  POBLACION_NUMERIC_COLUMNS,
  POBLACION_PARSER_VERSION,
  POBLACION_SHEET_COLUMNS,
  isPoblacionSheet,
  parsePoblacionSheet,
} from './parsers/poblacionParser';
import { isTipologiaSheet } from './parsers/tipologiaParser';
import { normalizeRows } from './utils/sheetNormalizer';

const STORAGE_KEY = 'ojos-en-alerta-files-v2';
const PRELOADED_FILES = createFilesCollection([tableroTotales, segundoArchivo]);

function App() {
  const [files, setFiles] = useState(getInitialFiles);
  const firstFileName = getFirstFileName(files);
  const [selectedFileName, setSelectedFileName] = useState(firstFileName);
  const [selectedSheetName, setSelectedSheetName] = useState(
    getFirstSheetName(files[firstFileName]),
  );
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fileList = Object.values(files);
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
  const isTipologiaSheetSelected = isTipologiaSheet(selectedSheetName);
  const totalSheets = fileList.reduce(
    (total, file) => total + Object.keys(file.sheets).length,
    0,
  );
  const totalRows = fileList.reduce(
    (total, file) =>
      total +
      Object.values(file.sheets).reduce(
        (sheetTotal, sheet) => sheetTotal + getSheetRowCount(sheet),
        0,
      ),
    0,
  );

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
      setError('El archivo no contiene hojas disponibles.');
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
      <header className="app-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Ojos en Alerta</h1>
        </div>
        <p>Datos listos para consultar desde el inicio.</p>
      </header>

      <section className="summary-grid" aria-label="Resumen del tablero">
        <article className="summary-card">
          <span>Archivos</span>
          <strong>{fileList.length}</strong>
        </article>
        <article className="summary-card">
          <span>Hojas</span>
          <strong>{totalSheets}</strong>
        </article>
        <article className="summary-card">
          <span>Filas</span>
          <strong>{totalRows}</strong>
        </article>
      </section>

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
            {isClasificacionSheetSelected ? (
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
        isStaleClasificacionSheet(sheetName, sheet) ||
        isStalePoblacionSheet(sheetName, sheet) ||
        (isAlertasSheet(sheetName) &&
          sheet.metadata?.parser !== 'alertasParser'),
    ),
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

function getSheetRowCount(sheet) {
  if (isClasificacionSheetData(sheet)) {
    return sheet.resumenAnual.length + sheet.detalleMensual.length;
  }

  return sheet?.rows?.length ?? 0;
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

export default App;
