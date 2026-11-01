/* =========================================================
   GYM METRICS — pantalla-entrenar.js
   ---------------------------------------------------------
   La pestaña Entrenar: empezar, ver la sesión en curso,
   marcar hechos, terminar y descartar.
   Las hojas (elegir ejercicio, cargar series) están en
   hojas-sesion.js porque también las usa el Historial.
   ========================================================= */

import { buscarEjercicio } from './ejercicios.js';
import {
  obtenerSesionAbierta, registroEnSesion, ultimaSesion, resumenRegistro,
  empezarSesion, terminarSesion, descartarSesion, marcarHecho, cantidadPendientes
} from './sesiones.js';
import { abrirFormularioSesion, abrirElegir, abrirSeries } from './hojas-sesion.js';
import { $, escapar, avisar, plural, claveFecha, fechaLarga, fechaDesdeClave } from './utiles.js';


// "Hoy · miércoles 28 de octubre" o "Lunes 26 de octubre"
function textoFecha(clave) {
  const larga = fechaLarga(fechaDesdeClave(clave));
  return clave === claveFecha() ? `Hoy · ${larga}` : larga;
}


/* ---------------------------------------------------------
   1. DIBUJAR LA PESTAÑA
   --------------------------------------------------------- */
export function dibujarEntrenar() {
  const sesion = obtenerSesionAbierta();
  $('#entrenar-inicio').hidden = Boolean(sesion);
  $('#entrenar-sesion').hidden = !sesion;

  if (sesion) dibujarSesion(sesion);
  else dibujarResumenUltima();
}

function dibujarResumenUltima() {
  const ultima = ultimaSesion();
  $('#resumen-ultima').innerHTML = !ultima ? '' : `
    <div class="tarjeta">
      <p class="resumen-ultima__titulo">Última sesión</p>
      <p class="sesion__fecha">${textoFecha(ultima.fecha)}</p>
      <p class="resumen-ultima__musculos">${ultima.musculos.join(' · ')}</p>
      <p class="ayuda">${plural(ultima.ejercicios.length, 'ejercicio')}</p>
    </div>`;
}

function dibujarSesion(sesion) {
  // Si es hoy, la fecha ya está arriba; solo la mostramos si es otro día
  $('#sesion-fecha').textContent = sesion.fecha === claveFecha()
    ? 'Entrenamiento en curso'
    : `En curso · ${fechaLarga(fechaDesdeClave(sesion.fecha))}`;
  $('#sesion-musculos').textContent = sesion.musculos.join(' · ');

  const lista = $('#sesion-ejercicios');
  if (sesion.ejercicios.length === 0) {
    lista.innerHTML = '<li class="vacio">Todavía no cargaste ejercicios.<br>Tocá “Agregar ejercicio”.</li>';
    return;
  }

  // Dos botones por ejercicio: la tarjeta (abre las series) y el círculo (marca hecho).
  // No pueden ir uno dentro del otro (HTML no permite un botón dentro de otro),
  // así que van uno al lado del otro y con CSS ponemos el círculo encima de la tarjeta.
  lista.innerHTML = sesion.ejercicios.map(registro => {
    const ejercicio = buscarEjercicio(registro.ejercicioId);
    const nombre = escapar(ejercicio?.nombre ?? 'Ejercicio borrado');
    const hecho = Boolean(registro.hecho);
    return `
      <li class="registro ${hecho ? 'hecho' : ''}">
        <button class="item item--registro" data-id="${registro.ejercicioId}">
          <span class="item__nombre">${nombre}</span>
          <span class="item__detalle">${resumenRegistro(registro)}</span>
        </button>
        <button class="check" data-hecho="${registro.ejercicioId}"
                aria-pressed="${hecho}" aria-label="Marcar ${nombre} como hecho">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
        </button>
      </li>`;
  }).join('');
}


/* ---------------------------------------------------------
   2. TERMINAR / DESCARTAR
   --------------------------------------------------------- */
async function terminar() {
  const sesion = obtenerSesionAbierta();
  if (sesion.ejercicios.length === 0) {
    avisar('Cargá al menos un ejercicio, o descartá la sesión.');
    return;
  }
  const pendientes = cantidadPendientes();
  const pregunta = pendientes > 0
    ? `Hay ${plural(pendientes, 'ejercicio')} sin marcar como hecho. ¿Terminar igual?`
    : `¿Terminar el entrenamiento? Se guarda con ${plural(sesion.ejercicios.length, 'ejercicio')}.`;
  if (!confirm(pregunta)) return;

  try {
    await terminarSesion();
    dibujarEntrenar();
    avisar('¡Entrenamiento guardado! 💪');
  } catch (error) {
    avisar(error.message);
  }
}

async function descartar() {
  if (!confirm('¿Descartar este entrenamiento? Se pierde todo lo cargado hoy.')) return;
  await descartarSesion();
  dibujarEntrenar();
  avisar('Sesión descartada');
}


/* ---------------------------------------------------------
   3. EVENTOS (se conectan una vez, desde app.js)
   --------------------------------------------------------- */
export function iniciarPantallaEntrenar() {
  $('#btn-empezar').addEventListener('click', () => {
    abrirFormularioSesion({
      titulo: 'Empezar entrenamiento',
      textoBoton: 'Empezar',
      // Callback: lo que pasa cuando confirmás el formulario
      alConfirmar: async (valores) => {
        await empezarSesion(valores);
        dibujarEntrenar();
      }
    });
  });

  // dibujarEntrenar (sin paréntesis) es la función en sí, no su resultado:
  // se la pasamos a la hoja para que la llame cuando guardes algo.
  $('#btn-agregar-ejercicio').addEventListener('click', () => {
    abrirElegir(obtenerSesionAbierta(), dibujarEntrenar);
  });
  $('#btn-terminar').addEventListener('click', terminar);
  $('#btn-descartar').addEventListener('click', descartar);

  // En la lista de la sesión: el círculo marca hecho; el resto de la tarjeta abre las series
  $('#sesion-ejercicios').addEventListener('click', async (evento) => {
    const sesion = obtenerSesionAbierta();
    const check = evento.target.closest('[data-hecho]');
    if (check) {
      const id = check.dataset.hecho;
      // "!" invierte: si estaba hecho, queda sin hacer, y al revés
      await marcarHecho(id, !registroEnSesion(sesion, id).hecho);
      dibujarEntrenar();
      return; // no seguimos: no queremos abrir las series
    }
    const item = evento.target.closest('[data-id]');
    if (item) abrirSeries(sesion, item.dataset.id, dibujarEntrenar);
  });
}
