/* =========================================================
   GYM METRICS — utiles.js
   Funciones chicas que usan varios archivos.
   ========================================================= */

// Atajos para buscar elementos en la página (como en tu app de hábitos)
export const $ = (selector) => document.querySelector(selector);
export const $$ = (selector) => document.querySelectorAll(selector);

// Evita que un texto escrito por vos se interprete como HTML
export function escapar(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

// Para comparar textos sin importar mayúsculas ni tildes:
// normalizar('  Bíceps ') → 'biceps'
// normalize('NFD') separa la letra de su tilde (í → i + ´) y el replace borra las tildes.
export function normalizar(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// plural(1, 'ejercicio') → '1 ejercicio' · plural(3, 'sesión', 'sesiones') → '3 sesiones'
// El tercer parámetro tiene un valor por defecto: si no lo pasás, agrega una "s".
export function plural(cantidad, singular, pluralTexto = singular + 's') {
  return `${cantidad} ${cantidad === 1 ? singular : pluralTexto}`;
}

// Mensajito flotante que desaparece solo
let temporizadorAviso = null;
export function avisar(mensaje) {
  const aviso = $('#aviso');
  aviso.textContent = mensaje;
  aviso.classList.add('visible');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => aviso.classList.remove('visible'), 2500);
}


/* ---------------------------------------------------------
   FECHAS
   OJO: no usamos toISOString() para la fecha del día porque devuelve
   hora UTC. En Argentina (UTC-3), a partir de las 21 hs ya daría el día siguiente.
   --------------------------------------------------------- */

// Date → '2026-10-28' (en hora local)
export function claveFecha(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0'); // getMonth() arranca en 0
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

// '2026-10-28' → Date (a las 00:00 en hora local).
// Ojo: new Date('2026-10-28') la toma como UTC y en Argentina daría el 27 a las 21 hs.
export function fechaDesdeClave(clave) {
  const [anio, mes, dia] = clave.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

// Date → 'miércoles 28 de octubre'
export function fechaLarga(fecha = new Date()) {
  return fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

// Cuántos días enteros pasaron desde una fecha hasta hoy
export function diasDesde(fecha) {
  const unDia = 24 * 60 * 60 * 1000; // en milisegundos
  return Math.floor((Date.now() - new Date(fecha).getTime()) / unDia);
}


/* ---------------------------------------------------------
   DESCARGAR UN ARCHIVO
   Lo usan el respaldo JSON y, más adelante, el CSV.
   NOTA para Capacitor: dentro de una app de Android esto no descarga;
   ahí vamos a usar los plugins Filesystem + Share. Por eso está aislado acá.
   --------------------------------------------------------- */
export function descargarArchivo(nombre, contenido, tipo) {
  // Un Blob es un "archivo en memoria" armado con nuestro texto
  const blob = new Blob([contenido], { type: tipo });
  // Le pedimos al navegador una dirección temporal que apunte a ese Blob
  const url = URL.createObjectURL(blob);

  // Truco clásico: un link invisible con "download", al que le hacemos clic
  const link = document.createElement('a');
  link.href = url;
  link.download = nombre;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Liberamos la memoria un rato después (la descarga ya arrancó)
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
