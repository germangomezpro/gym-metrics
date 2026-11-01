/* =========================================================
   GYM METRICS — ejercicios.js
   ---------------------------------------------------------
   La LÓGICA del catálogo de ejercicios: qué músculos y tipos
   existen, crear, editar, borrar, filtrar y la precarga.

   No toca la pantalla: eso lo hace pantalla-ejercicios.js.
   Si algo no se puede hacer (nombre repetido, etc.), tira un
   error con "throw" y la pantalla muestra el mensaje.
   ========================================================= */

import { obtenerDatos, guardar } from './almacen.js';
import { normalizar, plural } from './utiles.js';


/* ---------------------------------------------------------
   1. CONSTANTES
   --------------------------------------------------------- */

// El orden de este array es el orden en que se muestran en toda la app
export const MUSCULOS = [
  'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps',
  'Antebrazos', 'Piernas', 'Abdominales', 'Cardio'
];

// Tipos de ejercicio: la clave es lo que se guarda, el valor es lo que se muestra.
// Un objeto usado así se llama "diccionario" o "mapa": TIPOS.peso → 'Con peso'
export const TIPOS = {
  peso: 'Con peso',
  sinPeso: 'Sin peso',
  cardio: 'Cardio'
};

export const AYUDA_TIPOS = {
  peso: 'Cada serie: repeticiones y kilos',
  sinPeso: 'Cada serie: repeticiones',
  cardio: 'Minutos'
};

// Ejercicios sugeridos: [nombre, músculo, tipo]
// Arrays cortos en vez de objetos para que la lista sea fácil de leer y ampliar.
const SUGERIDOS = [
  ['Press de banca plano', 'Pecho', 'peso'],
  ['Press inclinado con mancuernas', 'Pecho', 'peso'],
  ['Press en máquina', 'Pecho', 'peso'],
  ['Aperturas con mancuernas', 'Pecho', 'peso'],
  ['Cruce de poleas', 'Pecho', 'peso'],
  ['Flexiones de brazos', 'Pecho', 'sinPeso'],

  ['Jalón al pecho', 'Espalda', 'peso'],
  ['Remo con barra', 'Espalda', 'peso'],
  ['Remo con mancuerna', 'Espalda', 'peso'],
  ['Remo en polea baja', 'Espalda', 'peso'],
  ['Peso muerto', 'Espalda', 'peso'],
  ['Dominadas', 'Espalda', 'sinPeso'],

  ['Press militar', 'Hombros', 'peso'],
  ['Press con mancuernas sentado', 'Hombros', 'peso'],
  ['Elevaciones laterales', 'Hombros', 'peso'],
  ['Elevaciones frontales', 'Hombros', 'peso'],
  ['Vuelos posteriores', 'Hombros', 'peso'],

  ['Curl con barra', 'Bíceps', 'peso'],
  ['Curl con mancuernas', 'Bíceps', 'peso'],
  ['Curl martillo', 'Bíceps', 'peso'],
  ['Curl en banco Scott', 'Bíceps', 'peso'],
  ['Curl en polea', 'Bíceps', 'peso'],

  ['Extensión en polea', 'Tríceps', 'peso'],
  ['Press francés', 'Tríceps', 'peso'],
  ['Extensión sobre la cabeza', 'Tríceps', 'peso'],
  ['Patada de tríceps', 'Tríceps', 'peso'],
  ['Fondos en paralelas', 'Tríceps', 'sinPeso'],

  ['Curl de muñeca', 'Antebrazos', 'peso'],
  ['Curl de muñeca invertido', 'Antebrazos', 'peso'],
  ['Curl invertido con barra', 'Antebrazos', 'peso'],

  ['Sentadilla', 'Piernas', 'peso'],
  ['Prensa', 'Piernas', 'peso'],
  ['Extensión de cuádriceps', 'Piernas', 'peso'],
  ['Curl femoral', 'Piernas', 'peso'],
  ['Estocadas', 'Piernas', 'peso'],
  ['Gemelos en máquina', 'Piernas', 'peso'],

  ['Crunch abdominal', 'Abdominales', 'sinPeso'],
  ['Elevación de piernas', 'Abdominales', 'sinPeso'],
  ['Bicicleta abdominal', 'Abdominales', 'sinPeso'],
  ['Rueda abdominal', 'Abdominales', 'sinPeso'],
  ['Crunch en polea', 'Abdominales', 'peso'],

  ['Cinta', 'Cardio', 'cardio'],
  ['Bicicleta fija', 'Cardio', 'cardio'],
  ['Elíptico', 'Cardio', 'cardio'],
  ['Remo (máquina)', 'Cardio', 'cardio']
];


/* ---------------------------------------------------------
   2. CONSULTAS (leen, no cambian nada)
   --------------------------------------------------------- */

// Recibe UN objeto con las opciones y lo "desarma" (desestructuración).
// "= 'Todos'" y "= ''" son valores por defecto si no los pasás,
// y el "= {}" del final permite llamarla sin nada: listarEjercicios()
export function listarEjercicios({ musculo = 'Todos', busqueda = '' } = {}) {
  const texto = normalizar(busqueda);

  return obtenerDatos().ejercicios
    // filter() se queda con los que cumplen la condición (devuelve un array NUEVO)
    .filter(ej => musculo === 'Todos' || ej.musculo === musculo)
    .filter(ej => normalizar(ej.nombre).includes(texto))
    // sort() ordena; localeCompare compara textos respetando el español (á, ñ...)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

// Cuántos ejercicios hay de cada músculo → { Pecho: 6, Espalda: 6, ... }
export function contarPorMusculo() {
  const cuenta = {};
  for (const ej of obtenerDatos().ejercicios) {
    // "?? 0": si todavía no hay número para ese músculo, arrancamos de 0
    cuenta[ej.musculo] = (cuenta[ej.musculo] ?? 0) + 1;
  }
  return cuenta;
}

// find() devuelve el PRIMER elemento que cumple, o undefined si ninguno
export function buscarEjercicio(id) {
  return obtenerDatos().ejercicios.find(ej => ej.id === id);
}

// En cuántas sesiones aparece un ejercicio (contando la que está en curso).
// some() responde true si AL MENOS UNO cumple la condición.
export function vecesUsado(id) {
  const { sesiones, sesionAbierta } = obtenerDatos();
  // filter(Boolean) saca el null si no hay sesión abierta
  return [...sesiones, sesionAbierta]
    .filter(Boolean)
    .filter(sesion => sesion.ejercicios.some(e => e.ejercicioId === id))
    .length;
}


/* ---------------------------------------------------------
   3. CAMBIOS (crear, editar, eliminar)
   --------------------------------------------------------- */

// Un id único: la hora actual en base 36 + 4 caracteres al azar → 'emhb3k2x9f1a'
function nuevoId() {
  return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function nombreRepetido(nombre, idQueNoCuenta = null) {
  const buscado = normalizar(nombre);
  return obtenerDatos().ejercicios.some(ej =>
    ej.id !== idQueNoCuenta && normalizar(ej.nombre) === buscado
  );
}

// Revisa los datos del formulario. Si algo está mal, tira un error.
function validar({ nombre, musculo, tipo }, idQueNoCuenta = null) {
  if (!nombre) throw new Error('Escribí un nombre.');
  if (!MUSCULOS.includes(musculo)) throw new Error('Elegí un músculo.');
  if (!(tipo in TIPOS)) throw new Error('Elegí un tipo.'); // "in": ¿existe esa clave en el objeto?
  if (nombreRepetido(nombre, idQueNoCuenta)) throw new Error(`Ya tenés un ejercicio llamado "${nombre}".`);
}

async function guardarOFallar() {
  const salioBien = await guardar();
  if (!salioBien) throw new Error('No se pudo guardar. Revisá el espacio del celular.');
}

export async function crearEjercicio({ nombre, musculo, tipo }) {
  nombre = nombre.trim();
  validar({ nombre, musculo, tipo });

  const ejercicio = { id: nuevoId(), nombre, musculo, tipo };
  obtenerDatos().ejercicios.push(ejercicio);
  await guardarOFallar();
  return ejercicio;
}

export async function editarEjercicio(id, { nombre, musculo, tipo }) {
  const ejercicio = buscarEjercicio(id);
  if (!ejercicio) throw new Error('Ese ejercicio ya no existe.');

  nombre = nombre.trim();
  validar({ nombre, musculo, tipo }, id);

  // Si ya está en el historial, cambiarle el tipo rompería los datos
  // (una sesión guardó "minutos" y ahora esperaría "series", por ejemplo)
  if (tipo !== ejercicio.tipo && vecesUsado(id) > 0) {
    throw new Error('No se puede cambiar el tipo de un ejercicio que ya usaste.');
  }

  // Object.assign copia las propiedades del segundo objeto sobre el primero
  Object.assign(ejercicio, { nombre, musculo, tipo });
  await guardarOFallar();
  return ejercicio;
}

export async function eliminarEjercicio(id) {
  const usos = vecesUsado(id);
  if (usos > 0) {
    throw new Error(`No se puede eliminar: está en ${plural(usos, 'sesión', 'sesiones')} del historial.`);
  }
  const datos = obtenerDatos();
  datos.ejercicios = datos.ejercicios.filter(ej => ej.id !== id);
  await guardarOFallar();
}


/* ---------------------------------------------------------
   4. PRECARGA
   --------------------------------------------------------- */

// Agrega los sugeridos que todavía no tengas (compara por nombre).
// Devuelve cuántos agregó.
export async function agregarSugeridos() {
  let agregados = 0;
  // "Desarmamos" cada array [nombre, músculo, tipo] en tres variables
  for (const [nombre, musculo, tipo] of SUGERIDOS) {
    if (!nombreRepetido(nombre)) {
      obtenerDatos().ejercicios.push({ id: nuevoId(), nombre, musculo, tipo });
      agregados++;
    }
  }
  if (agregados > 0) await guardarOFallar();
  return agregados;
}

// Solo la primera vez que se abre la app. La marca "precargaHecha" evita
// que vuelvan a aparecer los ejercicios que borraste a propósito.
export async function precargarSiHaceFalta() {
  const datos = obtenerDatos();
  if (datos.precargaHecha) return;
  await agregarSugeridos();
  datos.precargaHecha = true;
  await guardar();
}
