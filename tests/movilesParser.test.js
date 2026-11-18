import assert from 'node:assert/strict';
import test from 'node:test';
import * as XLSX from 'xlsx';
import {
  isMovilesSheetData,
  normalizeMovilesSheetData,
  parseMovilesSheet,
} from '../src/parsers/movilesParser.js';
import { readRawSheets } from '../src/utils/excelParser.js';

function createMatrix() {
  return [
    ['Fecha carga', '', 'Moviles', '', '', '', '', '', 'Chalecos', ''],
    ['18/11/2026', '', '', 'Activos', 'En reparacion', 'Fuera de servicio', 'Total'],
    ['', '', 'Totales', '251', '0', '71', '322', '', 'Totales', '531'],
    [],
    ['', '', 'Distrito', '', '', '', '', '', 'Distrito'],
    ['', '', '1', '0', '0', '0', '', '', '1', '0'],
    ['', '', '24 bis', '19', '0', '2', '', '', '24 bis', '503'],
    ['', '', '', '', '', '', '', '', 'TOTAL', '503'],
    [],
    ['', '', 'Dependencia', 'Activos', 'En reparacion', 'Fuera de servicio', '', '', 'DEPENDENCIA'],
    ['', '', 'E.P.A.T.', '21', '0', '0', '', '', 'Dependencia nueva', '3'],
    ['', '', 'Unidad sin moviles', '0', '0', '0', '', '', 'E.P.A.T.', '25'],
    ['', '', 'Logistica', '0', '0', '29', '', '', 'Dependencia sin asignacion', '0'],
    ['', '', '', '', '', '', '', '', 'TOTAL', '28'],
  ];
}

function parseExcelMatrix(matrix) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(matrix), 'Moviles');
  const [{ matrix: rawMatrix }] = readRawSheets(workbook);
  return parseMovilesSheet(rawMatrix);
}

test('lee chalecos por dependencia independientemente del orden de los moviles', () => {
  const data = parseExcelMatrix(createMatrix());
  assert.deepEqual(data.chalecosPorDependencia, [
    { dependencia: 'Dependencia nueva', name: 'Dependencia nueva', cantidad: 3 },
    { dependencia: 'Dependencia sin asignacion', name: 'Dependencia sin asignacion', cantidad: 0 },
    { dependencia: 'E.P.A.T.', name: 'E.P.A.T.', cantidad: 25 },
  ]);
  assert.equal(data.movilesPorDependencia.find(row => row.name === 'E.P.A.T.').activos, 21);
  assert.equal(data.chalecosPorDistrito.length, 2);
  assert.equal(data.movilesPorDistrito.length, 2);
});

test('conserva el total general del Excel sin duplicar subtotales de chalecos', () => {
  const data = parseExcelMatrix(createMatrix());
  const districtTotal = data.chalecosPorDistrito.reduce((sum, row) => sum + row.cantidad, 0);
  const dependencyTotal = data.chalecosPorDependencia.reduce((sum, row) => sum + row.cantidad, 0);
  assert.equal(districtTotal, 503);
  assert.equal(dependencyTotal, 28);
  assert.equal(data.resumen.chalecos, 531);
  assert.equal(data.resumen.chalecos, districtTotal + dependencyTotal);
  assert.equal(data.resumen.totalMoviles, 322);
  assert.equal(data.fechaCarga, '2026-11-18');
});

test('detecta nuevas dependencias y tablas desplazadas sin posiciones fijas', () => {
  const matrix = createMatrix();
  const dependencyHeader = matrix.findIndex(row => row[8] === 'DEPENDENCIA');
  const chalecosBlock = matrix.slice(dependencyHeader).map(row => row.slice(8));
  matrix.slice(dependencyHeader).forEach(row => row.splice(8));
  // La tabla de chalecos comienza despues de que termina la tabla de moviles.
  matrix.push([], [], ...chalecosBlock.map(row => [...Array(8).fill(''), ...row]));
  const footerIndex = matrix.findLastIndex(row => row[8] === 'TOTAL');
  matrix.splice(footerIndex, 0, ['', '', '', '', '', '', '', '', 'Nueva unidad 2027', '7']);
  const shiftedMatrix = [[], [], ...matrix.map(row => ['', '', ...row])];
  const data = parseExcelMatrix(shiftedMatrix);
  assert.equal(data.chalecosPorDependencia.length, 4);
  assert.equal(data.chalecosPorDependencia.find(row => row.name === 'Nueva unidad 2027').cantidad, 7);
  assert.equal(data.movilesPorDependencia.length, 3);
});

test('no interpreta una tabla de moviles como chalecos si falta el nuevo encabezado', () => {
  const matrix = createMatrix();
  const header = matrix.find(row => row[8] === 'DEPENDENCIA');
  header[8] = '';
  const data = parseExcelMatrix(matrix);
  assert.deepEqual(data.chalecosPorDependencia, []);
  assert.equal(data.movilesPorDependencia.length, 3);
});

test('mantiene dependencias con cero y convierte guiones a cero', () => {
  const matrix = createMatrix();
  matrix.find(row => row[8] === 'Dependencia nueva')[9] = '-';
  const data = parseExcelMatrix(matrix);
  assert.equal(data.chalecosPorDependencia.length, 3);
  assert.equal(data.chalecosPorDependencia.find(row => row.name === 'Dependencia nueva').cantidad, 0);
  assert.equal(data.chalecosPorDependencia.find(row => row.name === 'Dependencia sin asignacion').cantidad, 0);
});

test('los datos precargados anteriores siguen siendo compatibles', () => {
  const oldData = parseExcelMatrix(createMatrix());
  delete oldData.chalecosPorDependencia;
  assert.ok(isMovilesSheetData(oldData));
  assert.equal(normalizeMovilesSheetData(oldData), oldData);
  assert.deepEqual(parseMovilesSheet([]).chalecosPorDependencia, []);
});
