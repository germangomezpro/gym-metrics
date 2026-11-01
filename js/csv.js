/* =========================================================
   GYM METRICS — csv.js
   ---------------------------------------------------------
   Exporta los entrenamientos a un archivo CSV para abrirlo
   en Google Sheets o Excel. Una fila por serie:

   Fecha;Músculo;Ejercicio;Serie;Reps;Kg;Minutos
   2026-10-28;Bíceps;Curl con barra;1;10;8;
   2026-10-28;Bíceps;Curl con barra;2;8;8,5;
   2026-10-28;Cardio;Cinta;;;;15

   ¿Por qué punto y coma y coma decimal? Porque el Excel en
   español (Argentina) usa ";" para separar columnas y "," para
   los decimales. Con comas, al abrirlo con doble clic quedaría
   todo en una sola columna.
   ========================================================= */

import { buscarEjercicio } from './ejercicios.js';
import { sesionesOrdenadas, formatoKg } from './sesiones.js';
import { claveFecha, descargarArchivo } from './utiles.js';

const SEPARADOR = ';';
const COLUMNAS = ['Fecha', 'Músculo', 'Ejercicio', 'Serie', 'Reps', 'Kg', 'Minutos'];

// BOM ("Byte Order Mark"): un carácter invisible al principio del archivo
// que le avisa a Excel que el texto está en UTF-8. Sin él, "Bíceps" se ve "BÃ­ceps".
const BOM = '﻿';


// Prepara un valor para una celda del CSV.
// Si el texto tiene el separador, comillas o un salto de línea, va entre comillas,
// y las comillas de adentro se duplican: Curl "Scott" → "Curl ""Scott"""
// (Es la regla del formato CSV: así el programa sabe dónde termina cada celda.)
function celda(valor) {
  if (valor === undefined || valor === null) return '';
  const texto = String(valor);
  if (/[;"\n\r]/.test(texto)) return `"${texto.replaceAll('"', '""')}"`;
  return texto;
}

function fila(valores) {
  return valores.map(celda).join(SEPARADOR);
}

// Arma todo el texto del CSV (sin descargarlo).
// Separada de exportarCSV() para poder probarla sola.
export function generarCSV() {
  const filas = [fila(COLUMNAS)];

  // De la sesión más vieja a la más nueva (sesionesOrdenadas da la más nueva primero)
  const sesiones = sesionesOrdenadas().reverse();

  for (const sesion of sesiones) {
    for (const registro of sesion.ejercicios) {
      const ejercicio = buscarEjercicio(registro.ejercicioId);
      const nombre = ejercicio?.nombre ?? 'Ejercicio borrado';
      const musculo = ejercicio?.musculo ?? '';

      if (registro.minutos !== undefined) {
        // Cardio: una sola fila, sin serie/reps/kg
        filas.push(fila([sesion.fecha, musculo, nombre, '', '', '', registro.minutos]));
        continue;
      }

      // forEach con índice: i + 1 es el número de serie
      registro.series.forEach((serie, i) => {
        const kg = serie.kg === undefined ? '' : formatoKg(serie.kg);
        filas.push(fila([sesion.fecha, musculo, nombre, i + 1, serie.reps, kg, '']));
      });
    }
  }

  // "\r\n" es el salto de línea "de Windows": Excel lo prefiere
  return BOM + filas.join('\r\n') + '\r\n';
}

// Genera y descarga. Devuelve cuántas filas de datos tiene (sin el encabezado).
export function exportarCSV() {
  const texto = generarCSV();
  const cantidad = texto.trim().split('\r\n').length - 1;
  if (cantidad === 0) throw new Error('Todavía no hay entrenamientos terminados para exportar.');

  descargarArchivo(`gym-metrics-entrenamientos-${claveFecha()}.csv`, texto, 'text/csv;charset=utf-8');
  return cantidad;
}
