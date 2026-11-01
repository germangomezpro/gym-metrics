/* =========================================================
   GYM METRICS — progreso.js
   ---------------------------------------------------------
   Los CÁLCULOS de la pestaña Progreso. No toca la pantalla:
   recibe datos, devuelve números y listas.

   Nada de esto se guarda: todo se calcula en el momento
   a partir del historial de sesiones (como las rachas de
   tu app de hábitos). Así nunca queda desactualizado.

   Las semanas van de LUNES a DOMINGO y se identifican por
   la fecha de su lunes: la semana '2026-10-26' es del lunes
   26/10 al domingo 1/11.
   ========================================================= */

import { obtenerDatos } from './almacen.js';
import { MUSCULOS, buscarEjercicio } from './ejercicios.js';
import { claveFecha, fechaDesdeClave } from './utiles.js';


/* ---------------------------------------------------------
   1. FECHAS Y SEMANAS
   --------------------------------------------------------- */

// Suma (o resta, con número negativo) días a una fecha '2026-10-28'
export function sumarDias(clave, dias) {
  const fecha = fechaDesdeClave(clave);
  fecha.setDate(fecha.getDate() + dias); // setDate se encarga de cambiar de mes/año
  return claveFecha(fecha);
}

// El lunes de la semana de una fecha.
// getDay() da 0 = domingo, 1 = lunes ... 6 = sábado.
// (día + 6) % 7 convierte eso en "cuántos días pasaron desde el lunes":
// lunes → 0, martes → 1 ... domingo → 6.  (% es el resto de la división)
export function inicioSemana(clave) {
  const diasDesdeLunes = (fechaDesdeClave(clave).getDay() + 6) % 7;
  return sumarDias(clave, -diasDesdeLunes);
}

// Los lunes de las últimas N semanas, de la más vieja a la actual
export function ultimasSemanas(cantidad, hasta = claveFecha()) {
  const actual = inicioSemana(hasta);
  // Array.from({ length: N }, función) crea un array de N elementos
  // llamando a la función con cada posición (0, 1, 2...)
  return Array.from({ length: cantidad }, (_, i) => sumarDias(actual, -7 * (cantidad - 1 - i)));
}

// '2026-10-26' → '26/10'
export function diaMes(clave) {
  const fecha = fechaDesdeClave(clave);
  return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
}


/* ---------------------------------------------------------
   2. PROGRESO DE UN EJERCICIO
   --------------------------------------------------------- */

// Qué se mide según el tipo de ejercicio
export function metricaDe(ejercicio) {
  if (ejercicio.tipo === 'peso') return { nombre: 'Peso máximo', unidad: 'kg' };
  if (ejercicio.tipo === 'sinPeso') return { nombre: 'Máximo de repeticiones', unidad: 'reps' };
  return { nombre: 'Minutos', unidad: 'min' };
}

// El número que representa un registro:
// con peso → el kilaje más alto; sin peso → la serie con más reps; cardio → minutos.
// Math.max(...array) busca el mayor: los "..." pasan cada elemento como un número suelto.
function valorDe(registro, tipo) {
  if (tipo === 'cardio') return registro.minutos;
  if (tipo === 'peso') return Math.max(...registro.series.map(s => s.kg));
  return Math.max(...registro.series.map(s => s.reps));
}

// Todas las veces que hiciste un ejercicio, de la más vieja a la más nueva:
// [{ sesionId, fecha, registro, valor }]
export function historialEjercicio(ejercicioId) {
  const ejercicio = buscarEjercicio(ejercicioId);
  const veces = [];
  for (const sesion of obtenerDatos().sesiones) {
    const registro = sesion.ejercicios.find(r => r.ejercicioId === ejercicioId);
    if (registro) {
      veces.push({ sesionId: sesion.id, fecha: sesion.fecha, registro, valor: valorDe(registro, ejercicio.tipo) });
    }
  }
  return veces.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// Los ejercicios que hiciste al menos una vez (para el selector),
// ordenados por músculo y nombre
export function ejerciciosConHistorial() {
  const usados = new Set(); // un Set es como un array pero SIN repetidos
  for (const sesion of obtenerDatos().sesiones) {
    for (const registro of sesion.ejercicios) usados.add(registro.ejercicioId);
  }
  return obtenerDatos().ejercicios
    .filter(ej => usados.has(ej.id))
    .sort((a, b) =>
      MUSCULOS.indexOf(a.musculo) - MUSCULOS.indexOf(b.musculo) ||  // primero por músculo
      a.nombre.localeCompare(b.nombre, 'es'));                      // si empatan, por nombre
}

// El ejercicio que hiciste más recientemente (para mostrar uno al entrar)
export function ultimoEjercicioHecho() {
  const ordenadas = [...obtenerDatos().sesiones].sort((a, b) => b.fecha.localeCompare(a.fecha));
  // Buscamos uno que no sea cardio (es más interesante ver el progreso de un peso)
  for (const sesion of ordenadas) {
    const registro = sesion.ejercicios.find(r => buscarEjercicio(r.ejercicioId)?.tipo !== 'cardio');
    if (registro) return registro.ejercicioId;
  }
  return ordenadas[0]?.ejercicios[0]?.ejercicioId ?? null;
}

// Mejor marca, primera vez y diferencia
export function resumenEjercicio(ejercicioId) {
  const veces = historialEjercicio(ejercicioId);
  if (veces.length === 0) return null;

  // reduce para quedarnos con la vez de mayor valor (si empatan, la primera en lograrlo)
  const mejor = veces.reduce((max, vez) => (vez.valor > max.valor ? vez : max));
  const primera = veces[0];
  const ultima = veces[veces.length - 1];

  return { mejor, primera, ultima, diferencia: ultima.valor - primera.valor, cantidad: veces.length };
}

// Valor máximo de cada una de las últimas N semanas (null si esa semana no lo hiciste)
export function progresoSemanal(ejercicioId, cantidadSemanas = 12) {
  const veces = historialEjercicio(ejercicioId);
  return ultimasSemanas(cantidadSemanas).map(lunes => {
    const domingo = sumarDias(lunes, 6);
    const deLaSemana = veces.filter(v => v.fecha >= lunes && v.fecha <= domingo);
    return {
      semana: lunes,
      valor: deLaSemana.length ? Math.max(...deLaSemana.map(v => v.valor)) : null
    };
  });
}


/* ---------------------------------------------------------
   3. ASISTENCIA
   --------------------------------------------------------- */

function sesionesEntre(desde, hasta) {
  return obtenerDatos().sesiones.filter(s => s.fecha >= desde && s.fecha <= hasta);
}

export function resumenAsistencia() {
  const hoy = claveFecha();
  const sesiones = obtenerDatos().sesiones;

  const estaSemana = sesionesEntre(inicioSemana(hoy), hoy).length;
  const esteMes = sesionesEntre(hoy.slice(0, 8) + '01', hoy).length; // desde el día 1

  // Promedio de las últimas 8 semanas (o menos, si empezaste a usar la app hace poco)
  let promedio = 0;
  if (sesiones.length > 0) {
    const primera = sesiones.reduce((min, s) => (s.fecha < min ? s.fecha : min), hoy);
    const semanasDesdeLaPrimera = Math.round(
      (fechaDesdeClave(inicioSemana(hoy)) - fechaDesdeClave(inicioSemana(primera))) / (7 * 864e5)
    ) + 1;  // 864e5 = 86.400.000 = milisegundos de un día
    const semanas = Math.min(8, semanasDesdeLaPrimera);
    const desde = ultimasSemanas(semanas)[0];
    promedio = sesionesEntre(desde, hoy).length / semanas;
  }

  return { estaSemana, esteMes, promedio };
}

// Cuántas sesiones hubo en cada una de las últimas N semanas
export function sesionesPorSemana(cantidadSemanas = 12) {
  return ultimasSemanas(cantidadSemanas).map(lunes => ({
    semana: lunes,
    valor: sesionesEntre(lunes, sumarDias(lunes, 6)).length
  }));
}

// Las sesiones de un mes, agrupadas por día: { 21: ['s2'], 26: ['s3'] }
// mes va de 0 (enero) a 11 (diciembre), como en JavaScript
export function sesionesDelMes(anio, mes) {
  const prefijo = `${anio}-${String(mes + 1).padStart(2, '0')}-`;
  const porDia = {};
  for (const sesion of obtenerDatos().sesiones) {
    if (!sesion.fecha.startsWith(prefijo)) continue;
    const dia = Number(sesion.fecha.slice(8));
    porDia[dia] ??= [];
    porDia[dia].push(sesion.id);
  }
  return porDia;
}


/* ---------------------------------------------------------
   4. MÚSCULOS
   --------------------------------------------------------- */

export const PERIODOS = {
  semana: 'Semana',
  mes: 'Mes',
  tresMeses: '3 meses',
  todo: 'Todo'
};

// Desde qué fecha cuenta cada período
function desdeDelPeriodo(periodo) {
  const hoy = claveFecha();
  if (periodo === 'semana') return inicioSemana(hoy);
  if (periodo === 'mes') return hoy.slice(0, 8) + '01';
  if (periodo === 'tresMeses') {
    const fecha = fechaDesdeClave(hoy);
    fecha.setMonth(fecha.getMonth() - 3);
    return claveFecha(fecha);
  }
  return '0000-00-00'; // "todo": cualquier fecha es mayor que esta
}

// Por cada músculo: series, ejercicios y minutos (cardio) en el período.
// Devuelve los 9 músculos, de más trabajado a menos.
export function resumenMusculos(periodo) {
  // Arrancamos todos en cero, así también aparecen los que no trabajaste
  const resumen = {};
  for (const musculo of MUSCULOS) resumen[musculo] = { musculo, series: 0, ejercicios: 0, minutos: 0 };

  for (const sesion of sesionesEntre(desdeDelPeriodo(periodo), claveFecha())) {
    for (const registro of sesion.ejercicios) {
      const ejercicio = buscarEjercicio(registro.ejercicioId);
      if (!ejercicio) continue;
      const fila = resumen[ejercicio.musculo];
      fila.ejercicios += 1;
      fila.series += registro.series?.length ?? 0;
      fila.minutos += registro.minutos ?? 0;
    }
  }

  // Object.values → solo los valores del objeto, como array.
  // Orden: más series primero; después los que tienen minutos (cardio);
  // al final los que no trabajaste. "||" pasa al siguiente criterio si hay empate (0).
  // (true - false = 1: restar booleanos los convierte en 1 y 0)
  return Object.values(resumen).sort((a, b) =>
    (b.series - a.series) ||
    ((b.minutos > 0) - (a.minutos > 0)) ||
    MUSCULOS.indexOf(a.musculo) - MUSCULOS.indexOf(b.musculo));
}
