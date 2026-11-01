/* =========================================================
   GYM METRICS — pantalla-progreso.js
   ---------------------------------------------------------
   La pestaña Progreso con sus tres vistas:
     1. Ejercicio  → mejor marca, gráfico semanal, cada vez que lo hiciste
     2. Asistencia → cifras, calendario del mes, sesiones por semana
     3. Músculos   → series y ejercicios por músculo en un período
   Los cálculos están en progreso.js; los dibujos SVG en graficos.js.
   ========================================================= */

import { MUSCULOS, buscarEjercicio } from './ejercicios.js';
import { resumenRegistro, formatoKg } from './sesiones.js';
import {
  metricaDe, historialEjercicio, ejerciciosConHistorial, ultimoEjercicioHecho,
  resumenEjercicio, progresoSemanal, resumenAsistencia, sesionesPorSemana,
  sesionesDelMes, resumenMusculos, PERIODOS, diaMes
} from './progreso.js';
import { graficoLinea, graficoBarras } from './graficos.js';
import { abrirDetalle } from './pantalla-historial.js';
import { obtenerDatos } from './almacen.js';
import { $, $$, escapar, plural, claveFecha } from './utiles.js';


/* ---------------------------------------------------------
   1. ESTADO DE LA PANTALLA
   --------------------------------------------------------- */
let vista = 'ejercicio';
let ejercicioId = null;
let periodo = 'mes';
// Mes que muestra el calendario (arranca en el actual)
const hoy = new Date();
let mesCalendario = { anio: hoy.getFullYear(), mes: hoy.getMonth() };

// Formatea un valor según la unidad: 22.5 kg → '22,5 kg'
function conUnidad(valor, unidad) {
  return `${unidad === 'kg' ? formatoKg(valor) : valor} ${unidad}`;
}


/* ---------------------------------------------------------
   2. DIBUJAR (según la vista elegida)
   --------------------------------------------------------- */
export function dibujarProgreso() {
  const haySesiones = obtenerDatos().sesiones.length > 0;
  $('#progreso-vacio').hidden = haySesiones;

  // Marcamos la pestaña elegida y mostramos solo su vista
  $$('#progreso-pestanas [data-vista]').forEach(boton => {
    boton.setAttribute('aria-selected', String(boton.dataset.vista === vista));
  });
  for (const nombre of ['ejercicio', 'asistencia', 'musculos']) {
    $(`#vista-${nombre}`).hidden = !haySesiones || nombre !== vista;
  }
  if (!haySesiones) return;

  if (vista === 'ejercicio') dibujarVistaEjercicio();
  if (vista === 'asistencia') dibujarVistaAsistencia();
  if (vista === 'musculos') dibujarVistaMusculos();
}


/* ---------------------------------------------------------
   3. VISTA EJERCICIO
   --------------------------------------------------------- */
function dibujarVistaEjercicio() {
  const disponibles = ejerciciosConHistorial();

  // Si el elegido ya no tiene historial (o es la primera vez), elegimos uno
  if (!disponibles.some(ej => ej.id === ejercicioId)) ejercicioId = ultimoEjercicioHecho();

  dibujarSelector(disponibles);

  const ejercicio = buscarEjercicio(ejercicioId);
  const { unidad, nombre: nombreMetrica } = metricaDe(ejercicio);
  const resumen = resumenEjercicio(ejercicioId);

  // --- Cifras: mejor marca y cuánto cambió desde la primera vez ---
  const signo = resumen.diferencia > 0 ? '+' : '';
  $('#progreso-cifras').innerHTML = `
    <div class="cifra">
      <p class="cifra__titulo">Mejor marca</p>
      <p class="cifra__valor">${conUnidad(resumen.mejor.valor, unidad)}</p>
      <p class="cifra__detalle">el ${diaMes(resumen.mejor.fecha)}</p>
    </div>
    <div class="cifra">
      <p class="cifra__titulo">Desde la primera vez</p>
      <p class="cifra__valor">${resumen.cantidad === 1 ? '—' : signo + conUnidad(resumen.diferencia, unidad)}</p>
      <p class="cifra__detalle">${conUnidad(resumen.primera.valor, unidad)} el ${diaMes(resumen.primera.fecha)} · ${plural(resumen.cantidad, 'vez', 'veces')}</p>
    </div>`;

  // --- Gráfico: últimas 12 semanas ---
  $('#progreso-titulo-grafico').textContent = `${nombreMetrica} por semana`;
  const puntos = progresoSemanal(ejercicioId, 12).map(s => ({ etiqueta: diaMes(s.semana), valor: s.valor }));
  const hayEnRango = puntos.some(p => p.valor !== null);
  $('#progreso-grafico').innerHTML = hayEnRango
    ? graficoLinea(puntos, {
        formato: v => (unidad === 'kg' ? formatoKg(v) : String(v)),
        soloEnteros: unidad !== 'kg',
        descripcion: `${nombreMetrica} de ${ejercicio.nombre} en las últimas 12 semanas`
      })
    : '<p class="ayuda">No lo hiciste en las últimas 12 semanas.</p>';

  // --- Lista: cada vez, de la más nueva a la más vieja, comparada con la anterior ---
  const veces = historialEjercicio(ejercicioId);
  // reverse() da vuelta el array. Lo hacemos sobre una copia ([...veces]) para no alterar el original.
  $('#progreso-veces').innerHTML = [...veces].reverse().map((vez, i, invertidas) => {
    const anterior = invertidas[i + 1]; // la vez anterior en el tiempo es la siguiente en esta lista
    return `
      <li>
        <button class="item vez" data-sesion="${vez.sesionId}">
          <span class="vez__fecha">${diaMes(vez.fecha)}</span>
          <span class="vez__detalle">${resumenRegistro(vez.registro)}</span>
          ${htmlCambio(vez.valor, anterior?.valor, unidad)}
        </button>
      </li>`;
  }).join('');
}

// Las opciones del <select>, agrupadas por músculo con <optgroup>
function dibujarSelector(disponibles) {
  $('#progreso-ejercicio').innerHTML = MUSCULOS.map(musculo => {
    const delGrupo = disponibles.filter(ej => ej.musculo === musculo);
    if (delGrupo.length === 0) return '';
    return `<optgroup label="${musculo}">${delGrupo.map(ej =>
      `<option value="${ej.id}">${escapar(ej.nombre)}</option>`).join('')}</optgroup>`;
  }).join('');
  $('#progreso-ejercicio').value = ejercicioId;
}

// ▲2 / ▼1 / = comparado con la vez anterior (nada si es la primera)
function htmlCambio(valor, anterior, unidad) {
  if (anterior === undefined) return '<span class="vez__cambio vez__cambio--igual">1ª</span>';
  const diferencia = Math.round((valor - anterior) * 100) / 100;
  const numero = unidad === 'kg' ? formatoKg(Math.abs(diferencia)) : Math.abs(diferencia);
  if (diferencia > 0) return `<span class="vez__cambio vez__cambio--sube">▲${numero}</span>`;
  if (diferencia < 0) return `<span class="vez__cambio vez__cambio--baja">▼${numero}</span>`;
  return '<span class="vez__cambio vez__cambio--igual">=</span>';
}


/* ---------------------------------------------------------
   4. VISTA ASISTENCIA
   --------------------------------------------------------- */
function dibujarVistaAsistencia() {
  const { estaSemana, esteMes, promedio } = resumenAsistencia();
  // toLocaleString con 1 decimal y coma: 2.75 → '2,8'
  const promedioTexto = promedio.toLocaleString('es-AR', { maximumFractionDigits: 1 });

  $('#asistencia-cifras').innerHTML = `
    <div class="cifra"><p class="cifra__titulo">Esta semana</p><p class="cifra__valor">${estaSemana}</p></div>
    <div class="cifra"><p class="cifra__titulo">Este mes</p><p class="cifra__valor">${esteMes}</p></div>
    <div class="cifra"><p class="cifra__titulo">Promedio</p><p class="cifra__valor">${promedioTexto}<small>/sem</small></p></div>`;

  dibujarCalendario();

  const datos = sesionesPorSemana(12).map(s => ({ etiqueta: diaMes(s.semana), valor: s.valor }));
  $('#asistencia-grafico').innerHTML = graficoBarras(datos, {
    descripcion: 'Sesiones por semana en las últimas 12 semanas'
  });
}

function dibujarCalendario() {
  const { anio, mes } = mesCalendario;
  const primerDia = new Date(anio, mes, 1);
  // new Date(año, mes + 1, 0) = el día 0 del mes siguiente = el último día de este mes
  const diasDelMes = new Date(anio, mes + 1, 0).getDate();
  // Cuántos casilleros vacíos van antes del día 1 (la semana arranca el lunes)
  const huecos = (primerDia.getDay() + 6) % 7;

  $('#mes-titulo').textContent = primerDia
    .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    .replace(' de ', ' ');

  // No dejamos avanzar más allá del mes actual
  const hoyDate = new Date();
  $('#mes-siguiente').disabled = anio === hoyDate.getFullYear() && mes === hoyDate.getMonth();

  const entrenos = sesionesDelMes(anio, mes);
  const claveHoy = claveFecha();

  let html = '<span></span>'.repeat(huecos); // repeat: el mismo texto N veces
  for (let dia = 1; dia <= diasDelMes; dia++) {
    const clave = claveFecha(new Date(anio, mes, dia));
    const sesiones = entrenos[dia];
    const clases = ['dia-cal'];
    if (sesiones) clases.push('dia-cal--entreno');
    if (clave === claveHoy) clases.push('dia-cal--hoy');
    if (clave > claveHoy) clases.push('dia-cal--futuro');
    // Solo los días con sesión se pueden tocar
    html += sesiones
      ? `<button class="${clases.join(' ')}" data-sesion="${sesiones[0]}" aria-label="Ver la sesión del ${dia}">${dia}</button>`
      : `<button class="${clases.join(' ')}" disabled>${dia}</button>`;
  }
  $('#calendario').innerHTML = html;
}

function cambiarMes(cantidad) {
  // new Date se encarga de pasar de diciembre a enero (mes 12 → enero del año siguiente)
  const nueva = new Date(mesCalendario.anio, mesCalendario.mes + cantidad, 1);
  mesCalendario = { anio: nueva.getFullYear(), mes: nueva.getMonth() };
  dibujarCalendario();
}


/* ---------------------------------------------------------
   5. VISTA MÚSCULOS
   --------------------------------------------------------- */
function dibujarVistaMusculos() {
  $('#musculos-periodos').innerHTML = Object.entries(PERIODOS).map(([clave, texto]) => `
    <button class="chip chip--filtro ${clave === periodo ? 'activo' : ''}" data-periodo="${clave}">${texto}</button>
  `).join('');

  const filas = resumenMusculos(periodo);
  // Las barras se miden contra el máximo: el músculo con más series llena la barra.
  // El cardio se mide aparte (en minutos no se puede comparar con series).
  const maxSeries = Math.max(1, ...filas.map(f => f.series));
  const maxMinutos = Math.max(1, ...filas.map(f => f.minutos));

  $('#musculos-lista').innerHTML = filas.map(f => {
    const esCardio = f.musculo === 'Cardio';
    const cifra = esCardio ? `${f.minutos} min` : plural(f.series, 'serie');
    const porcentaje = esCardio ? (f.minutos / maxMinutos) * 100 : (f.series / maxSeries) * 100;
    const vacio = f.ejercicios === 0;
    return `
      <li class="barra-musculo ${vacio ? 'barra-musculo--cero' : ''}">
        <div class="barra-musculo__fila">
          <span class="barra-musculo__nombre">${f.musculo}</span>
          <span class="barra-musculo__cifra">${cifra}</span>
        </div>
        <div class="barra-musculo__pista"><div class="barra-musculo__relleno" style="width: ${porcentaje}%"></div></div>
        <span class="barra-musculo__detalle">${vacio ? 'Sin entrenar en este período' : plural(f.ejercicios, 'ejercicio')}</span>
      </li>`;
  }).join('');
}


/* ---------------------------------------------------------
   6. EVENTOS (se conectan una vez, desde app.js)
   --------------------------------------------------------- */
export function iniciarPantallaProgreso() {
  $('#progreso-pestanas').addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-vista]');
    if (!boton) return;
    vista = boton.dataset.vista;
    dibujarProgreso();
  });

  $('#progreso-ejercicio').addEventListener('change', (evento) => {
    ejercicioId = evento.target.value;
    dibujarVistaEjercicio();
  });

  // Tocar una vez de la lista o un día del calendario → abre esa sesión
  for (const contenedor of ['#progreso-veces', '#calendario']) {
    $(contenedor).addEventListener('click', (evento) => {
      const elemento = evento.target.closest('[data-sesion]');
      if (elemento) abrirDetalle(elemento.dataset.sesion);
    });
  }

  $('#mes-anterior').addEventListener('click', () => cambiarMes(-1));
  $('#mes-siguiente').addEventListener('click', () => cambiarMes(+1));

  $('#musculos-periodos').addEventListener('click', (evento) => {
    const chip = evento.target.closest('[data-periodo]');
    if (!chip) return;
    periodo = chip.dataset.periodo;
    dibujarVistaMusculos();
  });
}
