/* =========================================================
   GYM METRICS — almacen.js
   ---------------------------------------------------------
   El ÚNICO archivo que sabe DÓNDE se guardan los datos.
   El resto de la app pide los datos con obtenerDatos() y
   avisa que cambiaron con guardar(). Nadie más toca localStorage.

   ¿Por qué? Cuando la pasemos a Android con Capacitor, conviene
   guardar con el plugin "Preferences" en vez de localStorage
   (Android puede limpiar el localStorage de una app). Ese cambio
   va a tocar solo este archivo.

   Este archivo tampoco toca la pantalla (no muestra avisos):
   si algo falla, devuelve false o tira un error, y el que
   lo llamó decide qué mostrar.
   ========================================================= */


// Nombre con el que se guardan los datos en el navegador.
// El "v1" nos permite cambiar el formato en el futuro sin romper nada.
const CLAVE_GUARDADO = 'gymMetrics.v1';

/* ---------------------------------------------------------
   MODELO DE DATOS
   ---------------------------------------------------------
   datos = {
     version: 1,
     ejercicios: [ { id, nombre, musculo, tipo } ],        ← etapa 2
     sesiones:   [ { id, fecha, musculos, ejercicios } ],  ← etapa 3
     ultimoRespaldo: '2026-10-28T22:30:00.000Z' o null,
     precargaHecha: true/false,  ← si ya se cargaron los ejercicios sugeridos
     sesionAbierta: { ... } o null  ← el entrenamiento en curso (etapa 3)
   }
   --------------------------------------------------------- */
function datosVacios() {
  return {
    version: 1, ejercicios: [], sesiones: [],
    ultimoRespaldo: null, precargaHecha: false, sesionAbierta: null
  };
}

// "let" porque al importar un respaldo reemplazamos el objeto entero.
// No lleva "export": desde afuera solo se accede con obtenerDatos().
let datos = datosVacios();


/* ---------------------------------------------------------
   FUNCIONES PÚBLICAS (las que tienen "export")
   --------------------------------------------------------- */

// Devuelve el objeto con todos los datos.
// Es el MISMO objeto (no una copia): si lo modificás, después llamá a guardar().
export function obtenerDatos() {
  return datos;
}

// Lee los datos guardados. Se llama una sola vez, al arrancar la app.
//
// "async" significa que la función devuelve una PROMESA: un "te lo doy
// cuando esté listo". localStorage responde al instante, así que acá no
// haría falta, pero el plugin de Capacitor tarda un poquito y es async.
// Si ya la escribimos así, el resto de la app no va a tener que cambiar.
export async function cargar() {
  try {
    const texto = localStorage.getItem(CLAVE_GUARDADO);
    if (texto) {
      const leidos = JSON.parse(texto);      // texto → objeto
      // "..." (spread) copia las propiedades: primero las vacías por defecto
      // y encima las leídas. Así, si falta alguna parte, queda la vacía.
      datos = { ...datosVacios(), ...leidos };
    }
  } catch (error) {
    console.error('No se pudieron leer los datos guardados', error);
    datos = datosVacios();
  }
  return datos;
}

// Guarda todo. Devuelve true si salió bien y false si falló
// (por ejemplo, si el navegador se quedó sin espacio).
export async function guardar() {
  try {
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(datos)); // objeto → texto
    return true;
  } catch (error) {
    console.error('No se pudieron guardar los datos', error);
    return false;
  }
}

// Reemplaza TODOS los datos por otros (lo usa el importador de respaldos).
export async function reemplazarDatos(nuevos) {
  const anteriores = datos;
  datos = { ...datosVacios(), ...nuevos };
  const salioBien = await guardar();
  if (!salioBien) {
    datos = anteriores; // si no se pudo guardar, volvemos a como estaba
    throw new Error('No se pudo guardar el respaldo importado.');
  }
}
