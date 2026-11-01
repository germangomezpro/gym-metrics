/* =========================================================
   GYM METRICS — app.js
   ---------------------------------------------------------
   ETAPA 1 (esqueleto): arranque, navegación entre pestañas
   y pantalla de Ajustes con el respaldo.
   ETAPA 2: catálogo de ejercicios (pantalla-ejercicios.js).
   ETAPA 3: entrenar (pantalla-entrenar.js + hojas-sesion.js).
   ETAPA 4: historial (pantalla-historial.js). La navegación
   pasó a navegacion.js.
   ETAPA 5: progreso (pantalla-progreso.js, progreso.js, graficos.js).
   ETAPA 6: exportar a CSV (csv.js).

   Este archivo es el "director": no guarda datos ni sabe
   armar respaldos; usa lo que le dan los otros módulos.
   ========================================================= */

/* ---------------------------------------------------------
   1. IMPORTS
   Cada import trae funciones que otro archivo marcó con "export".
   La ruta empieza con "./" = "en esta misma carpeta" y lleva ".js".
   --------------------------------------------------------- */
import { cargar, obtenerDatos } from './almacen.js';
import { exportarRespaldo, leerRespaldo, aplicarRespaldo } from './respaldo.js';
import { exportarCSV } from './csv.js';
import { iniciarPWA } from './pwa.js';
import { precargarSiHaceFalta, agregarSugeridos } from './ejercicios.js';
import { iniciarNavegacion, registrarPantalla } from './navegacion.js';
import { iniciarHojas } from './hojas-sesion.js';
import { iniciarPantallaEjercicios, dibujarEjercicios } from './pantalla-ejercicios.js';
import { iniciarPantallaEntrenar, dibujarEntrenar } from './pantalla-entrenar.js';
import { iniciarPantallaHistorial, dibujarHistorial, dibujarDetalle } from './pantalla-historial.js';
import { iniciarPantallaProgreso, dibujarProgreso } from './pantalla-progreso.js';
import { $, avisar, fechaLarga, diasDesde, plural } from './utiles.js';


/* ---------------------------------------------------------
   2. NAVEGACIÓN
   Le decimos a navegacion.js qué dibujar al entrar a cada pantalla.
   --------------------------------------------------------- */
registrarPantalla('entrenar', dibujarEntrenar);
registrarPantalla('historial', dibujarHistorial);
registrarPantalla('sesion', dibujarDetalle);
registrarPantalla('progreso', dibujarProgreso);
registrarPantalla('ejercicios', dibujarEjercicios);
registrarPantalla('ajustes', dibujarAjustes); // funciona aunque esté definida más abajo (ver nota)
// NOTA: las funciones declaradas con "function nombre()" se pueden usar antes de
// la línea donde están escritas. JavaScript las "sube" al principio (hoisting).


/* ---------------------------------------------------------
   3. PANTALLA DE AJUSTES
   --------------------------------------------------------- */

function dibujarAjustes() {
  const datos = obtenerDatos();

  $('#resumen-datos').innerHTML = `
    <li><strong>${datos.ejercicios.length}</strong><span>ejercicios</span></li>
    <li><strong>${datos.sesiones.length}</strong><span>sesiones</span></li>
  `;

  $('#ultimo-respaldo').textContent = textoUltimoRespaldo(datos.ultimoRespaldo);
}

function textoUltimoRespaldo(fecha) {
  if (!fecha) return 'Todavía no hiciste ningún respaldo.';
  const dias = diasDesde(fecha);
  if (dias === 0) return 'Último respaldo: hoy.';
  if (dias === 1) return 'Último respaldo: ayer.';
  return `Último respaldo: hace ${dias} días.`;
}

// Exportar
$('#btn-exportar').addEventListener('click', async () => {
  await exportarRespaldo();
  dibujarAjustes();
  avisar('Respaldo descargado');
});

// Importar: el botón visible "hace clic" en el input de archivo oculto
$('#btn-importar').addEventListener('click', () => $('#input-importar').click());

// "change" se dispara cuando elegiste un archivo
$('#input-importar').addEventListener('change', async (evento) => {
  const input = evento.target;
  const archivo = input.files[0];
  input.value = ''; // limpiamos, así se puede volver a elegir el mismo archivo
  if (!archivo) return;

  // try/catch: si algo de adentro tira un error (throw), saltamos al catch
  try {
    const nuevos = await leerRespaldo(archivo);

    const seguro = confirm(
      `El respaldo tiene ${plural(nuevos.ejercicios.length, 'ejercicio')} y ` +
      `${plural(nuevos.sesiones.length, 'sesión', 'sesiones')}.\n\n` +
      'Va a REEMPLAZAR todo lo que hay ahora en la app. ¿Seguimos?'
    );
    if (!seguro) return;

    await aplicarRespaldo(nuevos);
    dibujarAjustes();
    dibujarEntrenar();
    avisar('Respaldo importado');
  } catch (error) {
    avisar(error.message);
  }
});

// Exportar a CSV (planilla)
$('#btn-csv').addEventListener('click', () => {
  try {
    const filas = exportarCSV();
    avisar(`CSV descargado: ${plural(filas, 'fila')}`);
  } catch (error) {
    avisar(error.message);
  }
});

// Volver a agregar los ejercicios sugeridos que falten
$('#btn-sugeridos').addEventListener('click', async () => {
  try {
    const cantidad = await agregarSugeridos();
    dibujarAjustes();
    avisar(cantidad > 0
      ? `Se ${cantidad === 1 ? 'agregó' : 'agregaron'} ${plural(cantidad, 'ejercicio')}`
      : 'Ya tenés todos los sugeridos');
  } catch (error) {
    avisar(error.message);
  }
});


/* ---------------------------------------------------------
   4. ARRANQUE
   Como cargar() es async, usamos una función async para poder
   esperarla con "await" antes de dibujar nada.
   --------------------------------------------------------- */
async function iniciar() {
  await cargar();
  await precargarSiHaceFalta(); // la primera vez, carga los ejercicios sugeridos
  $('#fecha-hoy').textContent = fechaLarga();
  iniciarNavegacion();
  iniciarHojas();
  iniciarPantallaEjercicios();
  iniciarPantallaEntrenar();
  iniciarPantallaHistorial();
  iniciarPantallaProgreso();
  dibujarEntrenar(); // si quedó un entrenamiento abierto, aparece tal cual
  iniciarPWA();
}

iniciar();
