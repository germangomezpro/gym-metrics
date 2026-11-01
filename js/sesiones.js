/* =========================================================
   GYM METRICS — sesiones.js
   ---------------------------------------------------------
   La LÓGICA de los entrenamientos: la sesión en curso, el
   historial, guardar lo que hiciste en cada ejercicio,
   "la última vez", terminar, descartar y borrar.
   No toca la pantalla.

   La sesión en curso vive en datos.sesionAbierta; las terminadas,
   en datos.sesiones. Muchas funciones reciben la SESIÓN como primer
   parámetro: así sirven igual para la de hoy (Entrenar) que para
   una vieja que estás corrigiendo (Historial).

   FORMA DE UNA SESIÓN
   {
     id: 's...', fecha: '2026-10-28', musculos: ['Bíceps', 'Pecho'],
     ejercicios: [
       { ejercicioId: 'e...', series: [ { reps: 10, kg: 8 }, { reps: 8, kg: 8 } ] },  ← con peso
       { ejercicioId: 'e...', series: [ { reps: 20 }, { reps: 15 } ] },               ← sin peso
       { ejercicioId: 'e...', minutos: 10 }                                           ← cardio
     ]
   }
   A cada elemento de "ejercicios" lo llamamos REGISTRO:
   lo que hiciste de un ejercicio en una sesión.
   ========================================================= */

import { obtenerDatos, guardar } from './almacen.js';
import { buscarEjercicio, MUSCULOS } from './ejercicios.js';
import { claveFecha } from './utiles.js';


/* ---------------------------------------------------------
   1. VALORES INICIALES (cuando nunca hiciste el ejercicio)
   --------------------------------------------------------- */
const REPS_INICIALES = 10;
const KG_INICIALES = 0;
const MINUTOS_INICIALES = 10;


/* ---------------------------------------------------------
   2. CONSULTAS
   --------------------------------------------------------- */

export function obtenerSesionAbierta() {
  return obtenerDatos().sesionAbierta;
}

// Una sesión del historial por su id (o undefined)
export function buscarSesion(id) {
  return obtenerDatos().sesiones.find(s => s.id === id);
}

// El registro de un ejercicio dentro de una sesión (o undefined).
// "?." por si la sesión es null (por ejemplo, si no hay ninguna abierta).
export function registroEnSesion(sesion, ejercicioId) {
  return sesion?.ejercicios.find(r => r.ejercicioId === ejercicioId);
}

// Las sesiones terminadas, de la más nueva a la más vieja.
// [...array] hace una COPIA antes de ordenar: sort() modifica el array
// sobre el que se aplica, y no queremos desordenar los datos guardados.
export function sesionesOrdenadas() {
  return [...obtenerDatos().sesiones].sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function ultimaSesion() {
  return sesionesOrdenadas()[0]; // undefined si no hay ninguna
}

// La última vez que hiciste un ejercicio ANTES de una sesión:
// - mira solo sesiones de esa fecha o anteriores
// - y no cuenta la sesión misma (si estás corrigiendo una vieja, no se compara consigo)
// Sin sesión, busca hasta hoy. Devuelve { fecha, registro } o null.
export function ultimaVez(ejercicioId, sesionActual = null) {
  const hasta = sesionActual?.fecha ?? claveFecha();
  for (const sesion of sesionesOrdenadas()) {
    if (sesion.id === sesionActual?.id) continue; // "continue" salta a la siguiente vuelta
    if (sesion.fecha > hasta) continue;
    const registro = registroEnSesion(sesion, ejercicioId);
    if (registro) return { fecha: sesion.fecha, registro };
  }
  return null;
}

// Con qué arranca la hoja de series (la opción A que elegiste):
// - si ya está en la sesión → lo que cargaste
// - si lo hiciste antes → la PRIMERA serie de la última vez
// - si nunca → 10 reps y 0 kg (o 10 minutos si es cardio)
// Devuelve una COPIA, para que editar en pantalla no cambie los datos hasta guardar.
export function registroInicial(sesion, ejercicioId) {
  const actual = registroEnSesion(sesion, ejercicioId);
  if (actual) return copiarRegistro(actual);

  const ejercicio = buscarEjercicio(ejercicioId);
  const anterior = ultimaVez(ejercicioId, sesion);

  if (ejercicio.tipo === 'cardio') {
    return { ejercicioId, minutos: anterior?.registro.minutos ?? MINUTOS_INICIALES };
  }

  const primera = anterior?.registro.series?.[0];
  const serie = { reps: primera?.reps ?? REPS_INICIALES };
  if (ejercicio.tipo === 'peso') serie.kg = primera?.kg ?? KG_INICIALES;
  return { ejercicioId, series: [serie] };
}

// Copia "profunda": copia también los objetos que están adentro.
// Con { ...registro } solo, el array series sería EL MISMO en las dos copias.
export function copiarRegistro(registro) {
  const copia = { ...registro };
  if (registro.series) copia.series = registro.series.map(serie => ({ ...serie }));
  return copia;
}

// Total de series de una sesión (el cardio no suma series).
// reduce() recorre el array "acumulando" un resultado: arranca en 0
// y a cada vuelta le suma las series de ese registro.
export function contarSeries(sesion) {
  return sesion.ejercicios.reduce((total, r) => total + (r.series?.length ?? 0), 0);
}


/* ---------------------------------------------------------
   3. TEXTOS PARA MOSTRAR
   --------------------------------------------------------- */

// 22.5 → '22,5' (con coma, como escribimos en Argentina)
export function formatoKg(kg) {
  return String(kg).replace('.', ',');
}

// Un registro en una línea: '10×8 · 8×8 · 6×10', '20 · 15 · 15 reps' o '10 min'
export function resumenRegistro(registro) {
  if (registro.minutos !== undefined) return `${registro.minutos} min`;
  const conPeso = registro.series[0]?.kg !== undefined;
  const texto = registro.series
    .map(s => (conPeso ? `${s.reps}×${formatoKg(s.kg)}` : `${s.reps}`))
    .join(' · ');
  return conPeso ? texto : `${texto} reps`;
}

// Una serie suelta: '10 reps × 8 kg' o '20 reps'
export function textoSerie(serie) {
  return serie.kg !== undefined ? `${serie.reps} reps × ${formatoKg(serie.kg)} kg` : `${serie.reps} reps`;
}


/* ---------------------------------------------------------
   4. CAMBIOS EN CUALQUIER SESIÓN
   --------------------------------------------------------- */

function nuevoId() {
  return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

async function guardarOFallar() {
  if (!(await guardar())) throw new Error('No se pudo guardar. Revisá el espacio del celular.');
}

// Ordena los músculos como en MUSCULOS (Pecho, Espalda, ...), sin repetidos
function ordenarMusculos(lista) {
  return MUSCULOS.filter(m => lista.includes(m));
}

function validarFecha(fecha) {
  if (!fecha || fecha > claveFecha()) throw new Error('Elegí una fecha válida (hoy o anterior).');
}

// Revisa que los números tengan sentido antes de guardar
function validarRegistro(registro, tipo) {
  if (tipo === 'cardio') {
    if (!(registro.minutos > 0)) throw new Error('Los minutos tienen que ser más que 0.');
    return;
  }
  if (registro.series.length === 0) throw new Error('Agregá al menos una serie.');

  // forEach con dos parámetros: el elemento y su posición (índice)
  registro.series.forEach((serie, i) => {
    if (!Number.isInteger(serie.reps) || serie.reps < 1) {
      throw new Error(`Serie ${i + 1}: las repeticiones tienen que ser un número entero desde 1.`);
    }
    if (tipo === 'peso' && !(serie.kg >= 0)) {
      throw new Error(`Serie ${i + 1}: revisá los kilos.`);
    }
  });
}

// Guarda lo que hiciste de un ejercicio en una sesión.
// Si ya estaba, lo reemplaza; si no, lo agrega al final.
export async function guardarEnSesion(sesion, registro) {
  const ejercicio = buscarEjercicio(registro.ejercicioId);
  if (!sesion || !ejercicio) throw new Error('No se encontró la sesión o el ejercicio.');

  validarRegistro(registro, ejercicio.tipo);

  // findIndex: como find, pero devuelve la POSICIÓN (o -1 si no está)
  const posicion = sesion.ejercicios.findIndex(r => r.ejercicioId === registro.ejercicioId);
  if (posicion === -1) sesion.ejercicios.push(registro);
  else sesion.ejercicios[posicion] = registro;

  // Si el ejercicio es de un músculo que no habías elegido, lo sumamos
  if (!sesion.musculos.includes(ejercicio.musculo)) {
    sesion.musculos = ordenarMusculos([...sesion.musculos, ejercicio.musculo]);
  }

  await guardarOFallar();
}

export async function quitarDeSesion(sesion, ejercicioId) {
  sesion.ejercicios = sesion.ejercicios.filter(r => r.ejercicioId !== ejercicioId);
  await guardarOFallar();
}


/* ---------------------------------------------------------
   5. LA SESIÓN EN CURSO (Entrenar)
   --------------------------------------------------------- */

export async function empezarSesion({ fecha, musculos }) {
  if (obtenerSesionAbierta()) throw new Error('Ya hay un entrenamiento en curso.');
  if (musculos.length === 0) throw new Error('Elegí al menos un músculo.');
  validarFecha(fecha);

  obtenerDatos().sesionAbierta = {
    id: nuevoId(),
    fecha,
    musculos: ordenarMusculos(musculos),
    ejercicios: []
  };
  await guardarOFallar();
}

// Marca o desmarca un ejercicio como hecho (el círculo con la tilde).
// Es solo una ayuda durante el entrenamiento: no se guarda en el historial.
export async function marcarHecho(ejercicioId, hecho) {
  const registro = registroEnSesion(obtenerSesionAbierta(), ejercicioId);
  if (!registro) return;
  registro.hecho = hecho;
  await guardarOFallar();
}

// Cuántos ejercicios de la sesión abierta todavía no marcaste
export function cantidadPendientes() {
  return obtenerSesionAbierta()?.ejercicios.filter(r => !r.hecho).length ?? 0;
}

// Pasa la sesión abierta al historial. Devuelve la sesión guardada.
export async function terminarSesion() {
  const datos = obtenerDatos();
  const sesion = datos.sesionAbierta;
  if (!sesion) throw new Error('No hay un entrenamiento en curso.');
  if (sesion.ejercicios.length === 0) throw new Error('La sesión no tiene ejercicios.');

  // "delete" borra una propiedad de un objeto: la marca de hecho no va al historial
  sesion.ejercicios.forEach(registro => { delete registro.hecho; });

  datos.sesiones.push(sesion);
  datos.sesionAbierta = null;
  await guardarOFallar();
  return sesion;
}

export async function descartarSesion() {
  obtenerDatos().sesionAbierta = null;
  await guardarOFallar();
}


/* ---------------------------------------------------------
   6. EL HISTORIAL
   --------------------------------------------------------- */

// Crea una sesión directamente en el historial (un día que te olvidaste de cargar)
export async function crearSesionPasada({ fecha, musculos }) {
  if (musculos.length === 0) throw new Error('Elegí al menos un músculo.');
  validarFecha(fecha);

  const sesion = { id: nuevoId(), fecha, musculos: ordenarMusculos(musculos), ejercicios: [] };
  obtenerDatos().sesiones.push(sesion);
  await guardarOFallar();
  return sesion;
}

export async function cambiarFecha(sesion, fecha) {
  validarFecha(fecha);
  sesion.fecha = fecha;
  await guardarOFallar();
}

export async function eliminarSesion(id) {
  const datos = obtenerDatos();
  datos.sesiones = datos.sesiones.filter(s => s.id !== id);
  await guardarOFallar();
}
