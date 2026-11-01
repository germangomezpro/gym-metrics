/* =========================================================
   GYM METRICS — pantalla-historial.js
   ---------------------------------------------------------
   La pestaña Historial (sesiones agrupadas por mes) y la
   pantalla de detalle de una sesión, donde se puede corregir,
   cambiar la fecha o borrar.
   Para cargar o corregir series usa las mismas hojas que
   Entrenar (hojas-sesion.js).
   ========================================================= */

import { buscarEjercicio } from './ejercicios.js';
import {
  sesionesOrdenadas, buscarSesion, contarSeries, textoSerie,
  crearSesionPasada, cambiarFecha, eliminarSesion
} from './sesiones.js';
import { abrirFormularioSesion, abrirElegir, abrirSeries } from './hojas-sesion.js';
import { irA, volver } from './navegacion.js';
import { $, escapar, avisar, plural, claveFecha, fechaLarga, fechaDesdeClave } from './utiles.js';


// La sesión que está abierta en el detalle
let idDetalle = null;

// '5 ejercicios · 18 series'
function textoResumen(sesion) {
  const partes = [plural(sesion.ejercicios.length, 'ejercicio')];
  const series = contarSeries(sesion);
  if (series > 0) partes.push(plural(series, 'serie'));
  return partes.join(' · ');
}


/* ---------------------------------------------------------
   1. LISTA (pestaña Historial)
   --------------------------------------------------------- */
export function dibujarHistorial() {
  const sesiones = sesionesOrdenadas();
  $('#cantidad-sesiones').textContent = plural(sesiones.length, 'sesión', 'sesiones');

  if (sesiones.length === 0) {
    $('#lista-historial').innerHTML =
      '<p class="vacio">Todavía no hay entrenamientos terminados.<br>Cuando termines uno, aparece acá.</p>';
    return;
  }

  // Agrupamos por mes. La clave '2026-10' son los primeros 7 caracteres de la fecha.
  // Como las sesiones ya vienen ordenadas, los meses quedan en orden también.
  const porMes = {};
  for (const sesion of sesiones) {
    const mes = sesion.fecha.slice(0, 7);
    // "??=" asigna solo si todavía no tiene valor: crea el array la primera vez
    porMes[mes] ??= [];
    porMes[mes].push(sesion);
  }

  // Object.entries → [['2026-10', [sesiones...]], ['2026-09', [...]]]
  $('#lista-historial').innerHTML = Object.entries(porMes).map(([mes, delMes]) => {
    const nombreMes = fechaDesdeClave(`${mes}-01`)
      .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
      .replace(' de ', ' '); // 'octubre de 2026' → 'octubre 2026'
    return `
      <section class="mes">
        <h3 class="mes__titulo">${nombreMes}<span>${plural(delMes.length, 'sesión', 'sesiones')}</span></h3>
        <ul class="lista">${delMes.map(htmlSesion).join('')}</ul>
      </section>`;
  }).join('');
}

function htmlSesion(sesion) {
  const fecha = fechaDesdeClave(sesion.fecha);
  const diaSemana = fecha.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '');
  return `
    <li>
      <button class="item item--sesion" data-sesion="${sesion.id}">
        <span class="dia-bloque">
          <span class="dia-bloque__numero">${fecha.getDate()}</span>
          <span class="dia-bloque__semana">${diaSemana}</span>
        </span>
        <span class="item__textos">
          <span class="item__musculos">${sesion.musculos.join(' · ')}</span>
          <span class="item__detalle">${textoResumen(sesion)}</span>
        </span>
      </button>
    </li>`;
}


/* ---------------------------------------------------------
   2. DETALLE DE UNA SESIÓN
   --------------------------------------------------------- */
// Exportada porque también la usa Progreso (al tocar un día del calendario)
export function abrirDetalle(id) {
  idDetalle = id;
  irA('sesion'); // navegacion.js llama a dibujarDetalle() al entrar
}

export function dibujarDetalle() {
  const sesion = buscarSesion(idDetalle);
  if (!sesion) return;

  $('#detalle-titulo').textContent = fechaLarga(fechaDesdeClave(sesion.fecha));
  $('#detalle-musculos').textContent = sesion.musculos.join(' · ');
  $('#detalle-resumen').textContent = textoResumen(sesion);
  $('#detalle-fecha').value = sesion.fecha;
  $('#detalle-fecha').max = claveFecha();

  if (sesion.ejercicios.length === 0) {
    $('#detalle-ejercicios').innerHTML =
      '<p class="vacio">Esta sesión no tiene ejercicios.<br>Si volvés sin agregar ninguno, se borra.</p>';
    return;
  }

  $('#detalle-ejercicios').innerHTML = `<ul class="lista">${sesion.ejercicios.map(registro => {
    const ejercicio = buscarEjercicio(registro.ejercicioId);
    // Cardio: una línea con los minutos. Si no: una línea por serie.
    const lineas = registro.minutos !== undefined
      ? `<li><b>${registro.minutos} minutos</b></li>`
      : registro.series.map((serie, i) =>
          `<li><span class="detalle-series__n">Serie ${i + 1}</span><b>${textoSerie(serie)}</b></li>`
        ).join('');
    return `
      <li>
        <button class="item detalle-ejercicio" data-id="${registro.ejercicioId}">
          <span class="detalle-ejercicio__cabecera">
            <span class="item__nombre">${escapar(ejercicio?.nombre ?? 'Ejercicio borrado')}</span>
            <span class="detalle-ejercicio__editar">Editar</span>
          </span>
          <ol class="detalle-series">${lineas}</ol>
        </button>
      </li>`;
  }).join('')}</ul>`;
}

// Al volver: si la sesión quedó sin ejercicios, la borramos (una sesión vacía no sirve).
// volver() te lleva a la pestaña de la que viniste (Historial o Progreso).
async function volverAlHistorial() {
  const sesion = buscarSesion(idDetalle);
  if (sesion && sesion.ejercicios.length === 0) {
    await eliminarSesion(sesion.id);
    avisar('Sesión vacía descartada');
  }
  idDetalle = null;
  volver();
}

async function cambiarFechaDetalle(evento) {
  const sesion = buscarSesion(idDetalle);
  if (evento.target.value === sesion.fecha) return; // no cambió nada
  try {
    await cambiarFecha(sesion, evento.target.value);
    dibujarDetalle();
    avisar('Fecha actualizada');
  } catch (error) {
    evento.target.value = sesion.fecha; // volvemos a la fecha que tenía
    avisar(error.message);
  }
}

async function borrarDetalle() {
  const sesion = buscarSesion(idDetalle);
  const fecha = fechaLarga(fechaDesdeClave(sesion.fecha));
  if (!confirm(`¿Borrar la sesión del ${fecha}? No se puede deshacer.`)) return;
  await eliminarSesion(sesion.id);
  idDetalle = null;
  volver();
  avisar('Sesión borrada');
}


/* ---------------------------------------------------------
   3. EVENTOS (se conectan una vez, desde app.js)
   --------------------------------------------------------- */
export function iniciarPantallaHistorial() {
  $('#lista-historial').addEventListener('click', (evento) => {
    const item = evento.target.closest('[data-sesion]');
    if (item) abrirDetalle(item.dataset.sesion);
  });

  // Cargar un día que te olvidaste: se crea directo en el historial y se abre su detalle
  $('#btn-sesion-pasada').addEventListener('click', () => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1); // setDate se encarga de cambiar de mes si hace falta
    abrirFormularioSesion({
      titulo: 'Cargar sesión de otro día',
      textoBoton: 'Crear sesión',
      fecha: claveFecha(ayer),
      alConfirmar: async (valores) => {
        const sesion = await crearSesionPasada(valores);
        abrirDetalle(sesion.id);
      }
    });
  });

  $('#btn-volver-historial').addEventListener('click', volverAlHistorial);
  $('#detalle-fecha').addEventListener('change', cambiarFechaDetalle);
  $('#btn-detalle-borrar').addEventListener('click', borrarDetalle);

  // Agregar o corregir un ejercicio: las mismas hojas que en Entrenar,
  // pero con esta sesión y con dibujarDetalle como callback
  $('#btn-detalle-agregar').addEventListener('click', () => {
    abrirElegir(buscarSesion(idDetalle), dibujarDetalle);
  });
  $('#detalle-ejercicios').addEventListener('click', (evento) => {
    const item = evento.target.closest('[data-id]');
    if (item) abrirSeries(buscarSesion(idDetalle), item.dataset.id, dibujarDetalle);
  });
}
