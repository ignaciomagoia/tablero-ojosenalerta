export function getFriendlyFileName(fileName, fallbackIndex = 0) {
  const normalizedName = normalizeDisplayText(fileName).replace(/\s+\./g, '.');

  if (normalizedName.includes('TABLERO TOTALES')) {
    return 'Gestión Estadística';
  }

  if (
    normalizedName.includes('VISUALIZACION TABLEROS RECURSOS') ||
    normalizedName.includes('RECURSOS')
  ) {
    return 'Recursos Operativos';
  }

  return `Archivo ${fallbackIndex + 1}`;
}

export function getFriendlySheetName(sheetName) {
  const normalizedName = normalizeDisplayText(sheetName);

  if (normalizedName.includes('ALERTAS') && normalizedName.includes('POSITIVOS')) {
    return 'Alertas';
  }

  if (normalizedName.includes('TIPOLOGIA') || normalizedName.includes('MEDIO DE INGRESO')) {
    return 'Tipologías e Ingreso';
  }

  if (normalizedName.includes('CLASIFICACION')) {
    return 'Clasificaciones';
  }

  if (normalizedName.includes('POBLACION') || normalizedName.includes('ADHERIDOS')) {
    return 'Cobertura del Programa';
  }

  if (normalizedName.includes('RECURSOS OPERATIVOS') || normalizedName.includes('MOVILES')) {
    return 'Móviles y equipamiento';
  }

  if (normalizedName.includes('PERSONAL')) {
    return 'Personal operativo';
  }

  return 'Sección';
}

function normalizeDisplayText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .trim();
}
