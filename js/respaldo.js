/* =========================================================
   GYM METRICS — respaldo.js
   Exportar e importar todos los datos como un archivo JSON.
   ========================================================= */

import { obtenerDatos, guardar, reemplazarDatos } from './almacen.js';
import { claveFecha, descargarArchivo } from './utiles.js';

// Marca para reconocer que un archivo es un respaldo de ESTA app
const MARCA_APP = 'gym-metrics';


/* ---------------------------------------------------------
   EXPORTAR
   El archivo tiene esta forma:
   { app: 'gym-metrics', exportado: '2026-10-28T...', datos: { ... } }
   --------------------------------------------------------- */
export async function exportarRespaldo() {
  const datos = obtenerDatos();
  datos.ultimoRespaldo = new Date().toISOString(); // acá sí sirve UTC: es un instante exacto
  await guardar();

  const respaldo = { app: MARCA_APP, exportado: datos.ultimoRespaldo, datos };
  // JSON.stringify(objeto, null, 2) → texto con sangría de 2 espacios (legible)
  const texto = JSON.stringify(respaldo, null, 2);

  descargarArchivo(`gym-metrics-respaldo-${claveFecha()}.json`, texto, 'application/json');
}


/* ---------------------------------------------------------
   IMPORTAR (en dos pasos)
   1. leerRespaldo(): lee y revisa el archivo, sin tocar nada.
   2. aplicarRespaldo(): reemplaza los datos actuales.
   Separados para que app.js pueda pedir confirmación en el medio.
   --------------------------------------------------------- */

// Recibe el archivo elegido en el <input type="file">.
// Si algo está mal, "throw" corta la función con un error que
// el que la llamó atrapa con try/catch.
export async function leerRespaldo(archivo) {
  // archivo.text() es async: leer un archivo puede tardar, así que esperamos con await
  const texto = await archivo.text();

  let leido;
  try {
    leido = JSON.parse(texto);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }

  // "?." (encadenamiento opcional): si leido es null, no explota, da undefined
  const esValido =
    leido?.app === MARCA_APP &&
    Array.isArray(leido.datos?.ejercicios) &&
    Array.isArray(leido.datos?.sesiones);

  if (!esValido) {
    throw new Error('Ese archivo no parece un respaldo de Gym Metrics.');
  }

  return leido.datos;
}

export async function aplicarRespaldo(datosNuevos) {
  await reemplazarDatos(datosNuevos);
}
