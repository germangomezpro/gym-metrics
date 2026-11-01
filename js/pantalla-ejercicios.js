/* =========================================================
   GYM METRICS — pantalla-ejercicios.js
   ---------------------------------------------------------
   Todo lo que se VE y se TOCA en la pestaña Ejercicios:
   filtros, buscador, lista y el formulario (hoja).
   Los datos los maneja ejercicios.js; acá solo dibujamos
   y le pasamos lo que escribiste.
   ========================================================= */

import {
  MUSCULOS, TIPOS, AYUDA_TIPOS,
  listarEjercicios, contarPorMusculo, buscarEjercicio, vecesUsado,
  crearEjercicio, editarEjercicio, eliminarEjercicio
} from './ejercicios.js';
import { obtenerDatos } from './almacen.js';
import { $, escapar, avisar, plural } from './utiles.js';


/* ---------------------------------------------------------
   1. ESTADO DE LA PANTALLA
   Variables que recuerdan qué estás viendo. No se guardan:
   si cerrás la app, vuelven a como arrancan.
   --------------------------------------------------------- */
let filtroMusculo = 'Todos';
let textoBusqueda = '';
let idEditando = null; // null = estás creando uno nuevo

// Elementos que usamos seguido (los buscamos una sola vez)
const dialogo = $('#dialogo-ejercicio');
const formulario = $('#form-ejercicio');


/* ---------------------------------------------------------
   2. DIBUJAR LA LISTA
   --------------------------------------------------------- */

export function dibujarEjercicios() {
  const total = obtenerDatos().ejercicios.length;
  $('#cantidad-ejercicios').textContent = plural(total, 'ejercicio');
  dibujarFiltros();
  dibujarLista();
}

function dibujarFiltros() {
  const cuenta = contarPorMusculo();
  const total = obtenerDatos().ejercicios.length;

  // map() transforma cada músculo en un pedacito de HTML;
  // join('') los pega todos en un solo texto.
  const chips = ['Todos', ...MUSCULOS].map(musculo => {
    const cantidad = musculo === 'Todos' ? total : (cuenta[musculo] ?? 0);
    const activo = musculo === filtroMusculo ? 'activo' : '';
    return `<button class="chip chip--filtro ${activo}" data-musculo="${musculo}">
              ${musculo}<span class="chip__cantidad">${cantidad}</span>
            </button>`;
  }).join('');

  $('#filtros-musculo').innerHTML = chips;
}

function dibujarLista() {
  const ejercicios = listarEjercicios({ musculo: filtroMusculo, busqueda: textoBusqueda });
  const contenedor = $('#lista-ejercicios');

  if (ejercicios.length === 0) {
    contenedor.innerHTML = textoBusqueda
      ? `<p class="vacio">No hay ejercicios que coincidan con "${escapar(textoBusqueda)}".</p>`
      : '<p class="vacio">No hay ejercicios en este grupo. Tocá + para agregar uno.</p>';
    return;
  }

  // Agrupamos por músculo, respetando el orden de MUSCULOS.
  // Si hay un filtro elegido, queda un solo grupo.
  const html = MUSCULOS
    .map(musculo => {
      const delGrupo = ejercicios.filter(ej => ej.musculo === musculo);
      if (delGrupo.length === 0) return ''; // grupo vacío: no mostramos nada
      return `
        <section class="grupo">
          <h3 class="grupo__titulo">${musculo}</h3>
          <ul class="lista">${delGrupo.map(htmlItem).join('')}</ul>
        </section>`;
    })
    .join('');

  contenedor.innerHTML = html;
}

// Pasamos la función htmlItem directo a map(): map le da cada ejercicio
function htmlItem(ejercicio) {
  const claseTipo = ejercicio.tipo === 'cardio' ? 'etiqueta--cardio' : '';
  return `
    <li>
      <button class="item" data-id="${ejercicio.id}">
        <span class="item__nombre">${escapar(ejercicio.nombre)}</span>
        <span class="etiqueta ${claseTipo}">${TIPOS[ejercicio.tipo]}</span>
      </button>
    </li>`;
}


/* ---------------------------------------------------------
   3. FORMULARIO (hoja)
   --------------------------------------------------------- */

// Los radios de músculo y tipo se arman una sola vez, al arrancar
function armarOpcionesFormulario() {
  $('#opciones-musculo').innerHTML = MUSCULOS.map(musculo => `
    <label><input type="radio" name="musculo" value="${musculo}"><span>${musculo}</span></label>
  `).join('');

  // Object.entries convierte { peso: 'Con peso', ... } en [['peso','Con peso'], ...]
  $('#opciones-tipo').innerHTML = Object.entries(TIPOS).map(([clave, texto]) => `
    <label><input type="radio" name="tipo" value="${clave}"><span>${texto}</span></label>
  `).join('');
}

// id = null → formulario vacío para crear; id = 'e...' → editar ese ejercicio
function abrirFormulario(id = null) {
  idEditando = id;
  const ejercicio = id ? buscarEjercicio(id) : null;
  const usos = id ? vecesUsado(id) : 0;

  formulario.reset();
  $('#titulo-form-ejercicio').textContent = ejercicio ? 'Editar ejercicio' : 'Nuevo ejercicio';

  // form.elements.nombre es el input con name="nombre".
  // Con radios, form.elements.musculo es el GRUPO entero y su .value
  // es el valor del marcado; si le asignás un valor, marca ese.
  const campos = formulario.elements;
  campos.nombre.value = ejercicio?.nombre ?? '';
  campos.musculo.value = ejercicio?.musculo ?? (filtroMusculo !== 'Todos' ? filtroMusculo : '');
  campos.tipo.value = ejercicio?.tipo ?? (campos.musculo.value === 'Cardio' ? 'cardio' : 'peso');

  // Si ya está en el historial: no se puede cambiar el tipo ni eliminar
  const bloqueado = usos > 0;
  formulario.querySelectorAll('input[name="tipo"]').forEach(radio => { radio.disabled = bloqueado; });
  $('#aviso-uso').hidden = !bloqueado;
  $('#aviso-uso').textContent = bloqueado
    ? `Lo usaste en ${plural(usos, 'sesión', 'sesiones')}: el tipo no se puede cambiar ni se puede eliminar.`
    : '';
  $('#btn-eliminar-ejercicio').hidden = !ejercicio || bloqueado;

  mostrarError('');
  actualizarAyudaTipo();
  dialogo.showModal();

  // Al crear, ponemos el cursor en el nombre (al editar no, para no abrir el teclado)
  if (!ejercicio) campos.nombre.focus();
}

function cerrarFormulario() {
  dialogo.close();
  idEditando = null;
}

function mostrarError(mensaje) {
  const error = $('#error-ejercicio');
  error.textContent = mensaje;
  error.hidden = !mensaje;
}

function actualizarAyudaTipo() {
  const tipo = formulario.elements.tipo.value;
  $('#ayuda-tipo').textContent = AYUDA_TIPOS[tipo] ?? '';
}


/* ---------------------------------------------------------
   4. EVENTOS
   Se conectan una sola vez, desde app.js, al arrancar.
   --------------------------------------------------------- */
export function iniciarPantallaEjercicios() {
  armarOpcionesFormulario();

  // Filtros (delegación: un solo listener para todos los chips)
  $('#filtros-musculo').addEventListener('click', (evento) => {
    const chip = evento.target.closest('[data-musculo]');
    if (!chip) return;
    filtroMusculo = chip.dataset.musculo;
    dibujarEjercicios();
  });

  // Buscador: "input" se dispara con cada letra que escribís
  $('#buscar-ejercicio').addEventListener('input', (evento) => {
    textoBusqueda = evento.target.value;
    dibujarLista();
  });

  // Tocar un ejercicio de la lista → editarlo
  $('#lista-ejercicios').addEventListener('click', (evento) => {
    const item = evento.target.closest('[data-id]');
    if (item) abrirFormulario(item.dataset.id);
  });

  $('#btn-nuevo-ejercicio').addEventListener('click', () => abrirFormulario());

  // Dentro del formulario: si elegís Cardio, el tipo pasa solo a Cardio (y al revés)
  formulario.addEventListener('change', (evento) => {
    const campos = formulario.elements;
    if (evento.target.name === 'musculo' && !campos.tipo[0].disabled) {
      if (campos.musculo.value === 'Cardio') campos.tipo.value = 'cardio';
      else if (campos.tipo.value === 'cardio') campos.tipo.value = 'peso';
    }
    actualizarAyudaTipo();
  });

  // Guardar
  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault(); // que el formulario no recargue la página
    const campos = formulario.elements;
    const valores = {
      nombre: campos.nombre.value,
      musculo: campos.musculo.value,
      tipo: campos.tipo.value
    };

    try {
      if (idEditando) {
        await editarEjercicio(idEditando, valores);
        avisar('Ejercicio actualizado');
      } else {
        const nuevo = await crearEjercicio(valores);
        avisar(`Agregado: ${nuevo.nombre}`);
      }
      cerrarFormulario();
      dibujarEjercicios();
    } catch (error) {
      mostrarError(error.message); // el formulario queda abierto para corregir
    }
  });

  // Eliminar
  $('#btn-eliminar-ejercicio').addEventListener('click', async () => {
    const ejercicio = buscarEjercicio(idEditando);
    if (!ejercicio || !confirm(`¿Eliminar "${ejercicio.nombre}"?`)) return;
    try {
      await eliminarEjercicio(idEditando);
      cerrarFormulario();
      dibujarEjercicios();
      avisar('Ejercicio eliminado');
    } catch (error) {
      mostrarError(error.message);
    }
  });

  $('#btn-cancelar-ejercicio').addEventListener('click', cerrarFormulario);

  // Tocar el fondo oscuro (fuera del panel) también cierra.
  // Si tocaste el fondo, el "target" es el <dialog> mismo y no algo de adentro.
  dialogo.addEventListener('click', (evento) => {
    if (evento.target === dialogo) cerrarFormulario();
  });
}
