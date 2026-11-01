/* =========================================================
   GYM METRICS — hojas-sesion.js
   ---------------------------------------------------------
   Las tres hojas que se usan para cargar entrenamientos:
     1. Formulario de sesión (músculos + fecha)
     2. Elegir ejercicio
     3. Cargar series (o minutos si es cardio)

   Las usan DOS pantallas: Entrenar (la sesión de hoy) e Historial
   (corregir una vieja). Por eso no saben a qué sesión le están
   cargando: se la pasan al abrirlas, junto con una función
   "alCambiar" que la pantalla quiere que se ejecute después de guardar.

   A una función que se pasa como dato para que otra la llame
   después se le dice CALLBACK ("llamar de vuelta").
   ========================================================= */

import { MUSCULOS, buscarEjercicio, listarEjercicios } from './ejercicios.js';
import {
  registroEnSesion, ultimaVez, registroInicial, copiarRegistro,
  resumenRegistro, formatoKg, guardarEnSesion, quitarDeSesion
} from './sesiones.js';
import { $, escapar, avisar, claveFecha, fechaDesdeClave } from './utiles.js';


/* ---------------------------------------------------------
   1. ESTADO
   --------------------------------------------------------- */
let sesion = null;            // la sesión a la que le estamos cargando cosas
let alCambiar = () => {};     // callback de la pantalla que abrió la hoja
let alConfirmarSesion = null; // callback del formulario de sesión

let filtroElegir = 'De la sesión';
let busquedaElegir = '';

// Lo que estás editando en la hoja de series.
// Es una COPIA del registro: los cambios no se guardan hasta tocar "Guardar".
let edicion = null;   // { ejercicio, registro }

const dialogoSesion = $('#dialogo-empezar');
const dialogoElegir = $('#dialogo-elegir');
const dialogoSeries = $('#dialogo-series');


/* ---------------------------------------------------------
   2. FORMULARIO DE SESIÓN (músculos + fecha)
   ---------------------------------------------------------
   Lo usan "Empezar entrenamiento" y "Cargar sesión de otro día".
   alConfirmar recibe { fecha, musculos }; si tira un error,
   se muestra en rojo y el formulario queda abierto.
   --------------------------------------------------------- */
export function abrirFormularioSesion({ titulo, textoBoton, fecha = claveFecha(), alConfirmar }) {
  const form = $('#form-empezar');
  form.reset();
  $('#titulo-empezar').textContent = titulo;
  $('#btn-confirmar-sesion').textContent = textoBoton;

  // Checkboxes: a diferencia de los radios, se pueden marcar varios
  $('#empezar-musculos').innerHTML = MUSCULOS.map(m => `
    <label><input type="checkbox" name="musculos" value="${m}"><span>${m}</span></label>
  `).join('');
  form.elements.fecha.value = fecha;
  form.elements.fecha.max = claveFecha(); // no se puede elegir un día futuro

  alConfirmarSesion = alConfirmar;
  $('#error-empezar').hidden = true;
  dialogoSesion.showModal();
}

async function confirmarFormularioSesion(evento) {
  evento.preventDefault();
  const form = evento.target;
  // querySelectorAll devuelve una NodeList; Array.from la convierte en array para usar map()
  const musculos = Array.from(form.querySelectorAll('input[name="musculos"]:checked'))
    .map(casilla => casilla.value);

  try {
    await alConfirmarSesion({ fecha: form.elements.fecha.value, musculos });
    dialogoSesion.close();
  } catch (error) {
    $('#error-empezar').textContent = error.message;
    $('#error-empezar').hidden = false;
  }
}


/* ---------------------------------------------------------
   3. ELEGIR EJERCICIO
   --------------------------------------------------------- */
export function abrirElegir(sesionElegida, callback) {
  sesion = sesionElegida;
  alCambiar = callback;
  filtroElegir = 'De la sesión';
  busquedaElegir = '';
  $('#elegir-buscar').value = '';
  dibujarElegir();
  dialogoElegir.showModal();
}

function dibujarElegir() {
  $('#elegir-filtros').innerHTML = ['De la sesión', 'Todos', ...MUSCULOS].map(f => `
    <button class="chip chip--filtro ${f === filtroElegir ? 'activo' : ''}" data-filtro="${f}">${f}</button>
  `).join('');

  // Traemos todos los que coinciden con la búsqueda y filtramos acá por músculo
  let ejercicios = listarEjercicios({ busqueda: busquedaElegir });
  if (filtroElegir === 'De la sesión') ejercicios = ejercicios.filter(ej => sesion.musculos.includes(ej.musculo));
  else if (filtroElegir !== 'Todos') ejercicios = ejercicios.filter(ej => ej.musculo === filtroElegir);

  if (ejercicios.length === 0) {
    $('#elegir-lista').innerHTML = '<p class="vacio">No hay ejercicios para mostrar.</p>';
    return;
  }

  $('#elegir-lista').innerHTML = MUSCULOS.map(musculo => {
    const delGrupo = ejercicios.filter(ej => ej.musculo === musculo);
    if (delGrupo.length === 0) return '';
    return `
      <section class="grupo">
        <h3 class="grupo__titulo">${musculo}</h3>
        <ul class="lista">
          ${delGrupo.map(ej => `
            <li><button class="item" data-id="${ej.id}">
              <span class="item__nombre">${escapar(ej.nombre)}</span>
              ${registroEnSesion(sesion, ej.id) ? '<span class="item__marca">✓ Cargado</span>' : ''}
            </button></li>`).join('')}
        </ul>
      </section>`;
  }).join('');
}


/* ---------------------------------------------------------
   4. CARGAR SERIES
   --------------------------------------------------------- */
export function abrirSeries(sesionElegida, ejercicioId, callback) {
  sesion = sesionElegida;
  alCambiar = callback;

  const ejercicio = buscarEjercicio(ejercicioId);
  edicion = { ejercicio, registro: registroInicial(sesion, ejercicioId) };

  $('#series-nombre').textContent = ejercicio.nombre;
  $('#series-musculo').textContent = ejercicio.musculo;

  // La última vez (antes de ESTA sesión)
  const anterior = ultimaVez(ejercicioId, sesion);
  $('#series-ultima').hidden = !anterior;
  if (anterior) {
    const fecha = fechaDesdeClave(anterior.fecha);
    const diaSemana = fecha.toLocaleDateString('es-AR', { weekday: 'long' });
    $('#series-ultima-fecha').textContent =
      `La última vez (${diaSemana} ${fecha.getDate()}/${fecha.getMonth() + 1})`;
    $('#series-ultima-detalle').textContent = resumenRegistro(anterior.registro);
  }

  // "Quitar" solo tiene sentido si ya estaba cargado en la sesión
  $('#btn-quitar-ejercicio').hidden = !registroEnSesion(sesion, ejercicioId);
  mostrarErrorSeries('');
  dibujarEditor();
  dialogoSeries.showModal();
}

function mostrarErrorSeries(mensaje) {
  $('#error-series').textContent = mensaje;
  $('#error-series').hidden = !mensaje;
}

// Un contador [−] número [+]. "indice" es la serie (o null para los minutos de cardio)
function htmlContador(campo, valor, indice, etiqueta) {
  // inputmode="decimal" muestra el teclado numérico con coma en el celular.
  // Usamos type="text" (no "number") para poder aceptar "22,5" con coma.
  const modo = campo === 'kg' ? 'decimal' : 'numeric';
  const datosIndice = indice === null ? '' : `data-indice="${indice}"`;
  return `
    <div class="contador">
      <button type="button" data-accion="menos" data-campo="${campo}" ${datosIndice} aria-label="Restar 1">−</button>
      <input type="text" inputmode="${modo}" data-campo="${campo}" ${datosIndice}
             value="${textoNumero(valor, campo)}" aria-label="${etiqueta}" autocomplete="off">
      <button type="button" data-accion="mas" data-campo="${campo}" ${datosIndice} aria-label="Sumar 1">+</button>
    </div>`;
}

function textoNumero(valor, campo) {
  if (Number.isNaN(valor)) return '';
  return campo === 'kg' ? formatoKg(valor) : valor;
}

function dibujarEditor() {
  const { ejercicio, registro } = edicion;
  const editor = $('#series-editor');

  if (ejercicio.tipo === 'cardio') {
    editor.innerHTML = `
      <div class="cardio">
        <p class="ayuda">Minutos</p>
        ${htmlContador('minutos', registro.minutos, null, 'Minutos')}
      </div>`;
    return;
  }

  const conPeso = ejercicio.tipo === 'peso';
  const unaSola = registro.series.length === 1;

  const filas = registro.series.map((serie, i) => `
    <div class="serie">
      <span class="serie__numero">${i + 1}</span>
      ${htmlContador('reps', serie.reps, i, `Repeticiones de la serie ${i + 1}`)}
      ${conPeso ? htmlContador('kg', serie.kg, i, `Kilos de la serie ${i + 1}`) : ''}
      <button type="button" class="serie__borrar" data-accion="borrar" data-indice="${i}"
              aria-label="Borrar serie ${i + 1}" ${unaSola ? 'disabled' : ''}>✕</button>
    </div>`).join('');

  editor.innerHTML = `
    <div class="series ${conPeso ? '' : 'series--sin-peso'}">
      <div class="series__cabecera">
        <span>#</span><span>Reps</span>${conPeso ? '<span>Kg</span>' : ''}<span></span>
      </div>
      ${filas}
      <button type="button" class="boton-secundario series__agregar" data-accion="agregar">+ Serie</button>
    </div>`;
}

// ¿Dónde está el número que hay que cambiar? En la serie N o en el registro (minutos)
function destino(indice) {
  return indice === undefined ? edicion.registro : edicion.registro.series[Number(indice)];
}

// Mínimos: al menos 1 repetición y 1 minuto; los kilos pueden ser 0
const MINIMOS = { reps: 1, kg: 0, minutos: 1 };

function cambiarEnUno(campo, indice, signo) {
  const objeto = destino(indice);
  const actual = Number.isNaN(objeto[campo]) ? 0 : objeto[campo];
  // Math.round(x * 100) / 100 evita cosas como 22.5 + 1 = 23.499999...
  const nuevo = Math.round((actual + signo) * 100) / 100;
  objeto[campo] = Math.max(MINIMOS[campo], nuevo);
}

// Convierte lo que escribiste en un número (NaN si no es un número)
function leerNumero(texto, campo) {
  const limpio = texto.trim().replace(',', '.'); // "22,5" → "22.5"
  if (limpio === '') return NaN;
  return campo === 'kg' ? Number(limpio) : parseInt(limpio, 10);
}

function clicEnEditor(evento) {
  const boton = evento.target.closest('[data-accion]');
  if (!boton) return;
  const { accion, campo, indice } = boton.dataset; // desestructuración de dataset
  const series = edicion.registro.series;

  if (accion === 'mas') cambiarEnUno(campo, indice, +1);
  if (accion === 'menos') cambiarEnUno(campo, indice, -1);
  if (accion === 'borrar') series.splice(Number(indice), 1); // splice(posición, cuántos) borra
  if (accion === 'agregar') {
    // La nueva serie copia la anterior: { ...objeto } hace una copia
    series.push({ ...series[series.length - 1] });
  }

  mostrarErrorSeries('');
  dibujarEditor();

  // Al agregar, mostramos la serie nueva (bajamos hasta el final)
  if (accion === 'agregar') {
    $('#series-editor .serie:last-of-type')?.scrollIntoView({ block: 'nearest' });
  }
}

// Mientras escribís en un número: actualizamos el dato SIN redibujar
// (si redibujáramos, se perdería el cursor del input y se cerraría el teclado)
function escribirEnEditor(evento) {
  const { campo, indice } = evento.target.dataset;
  if (!campo) return;
  destino(indice)[campo] = leerNumero(evento.target.value, campo);
}

// Al salir del input ("change"), dejamos el número prolijo ("22.50" → "22,5").
// Cambiamos solo ese input: si redibujáramos todo, un toque en [+] justo
// después de escribir podría perderse, porque el botón se reemplazaría.
function salirDeNumero(evento) {
  const { campo, indice } = evento.target.dataset;
  if (!campo) return;
  evento.target.value = textoNumero(destino(indice)[campo], campo);
}

function repetirUltimaVez() {
  const anterior = ultimaVez(edicion.ejercicio.id, sesion);
  if (!anterior) return;
  edicion.registro = copiarRegistro(anterior.registro);
  mostrarErrorSeries('');
  dibujarEditor();
  avisar('Cargado lo de la última vez');
}

async function guardarSeries() {
  try {
    await guardarEnSesion(sesion, edicion.registro);
    dialogoSeries.close();
    avisar(`Guardado: ${edicion.ejercicio.nombre}`);
    alCambiar(); // la pantalla que abrió la hoja se redibuja
  } catch (error) {
    mostrarErrorSeries(error.message);
  }
}

async function quitarEjercicio() {
  if (!confirm(`¿Quitar "${edicion.ejercicio.nombre}" de esta sesión?`)) return;
  await quitarDeSesion(sesion, edicion.ejercicio.id);
  dialogoSeries.close();
  alCambiar();
}


/* ---------------------------------------------------------
   5. EVENTOS (se conectan una vez, desde app.js)
   --------------------------------------------------------- */
export function iniciarHojas() {
  $('#form-empezar').addEventListener('submit', confirmarFormularioSesion);

  // Elegir
  $('#elegir-filtros').addEventListener('click', (evento) => {
    const chip = evento.target.closest('[data-filtro]');
    if (!chip) return;
    filtroElegir = chip.dataset.filtro;
    dibujarElegir();
  });
  $('#elegir-buscar').addEventListener('input', (evento) => {
    busquedaElegir = evento.target.value;
    dibujarElegir();
  });
  $('#elegir-lista').addEventListener('click', (evento) => {
    const item = evento.target.closest('[data-id]');
    if (!item) return;
    dialogoElegir.close();
    abrirSeries(sesion, item.dataset.id, alCambiar); // si ya estaba cargado, se abre con lo que tenías
  });

  // Series
  $('#series-editor').addEventListener('click', clicEnEditor);
  $('#series-editor').addEventListener('input', escribirEnEditor);
  $('#series-editor').addEventListener('change', salirDeNumero);
  $('#btn-repetir').addEventListener('click', repetirUltimaVez);
  $('#btn-guardar-series').addEventListener('click', guardarSeries);
  $('#btn-quitar-ejercicio').addEventListener('click', quitarEjercicio);

  // En las tres hojas: botones con data-cerrar y tocar el fondo oscuro las cierran
  for (const dialogo of [dialogoSesion, dialogoElegir, dialogoSeries]) {
    dialogo.addEventListener('click', (evento) => {
      if (evento.target === dialogo || evento.target.closest('[data-cerrar]')) dialogo.close();
    });
  }
}
