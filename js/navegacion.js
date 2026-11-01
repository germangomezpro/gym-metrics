/* =========================================================
   GYM METRICS — navegacion.js
   ---------------------------------------------------------
   Cambiar de pantalla. Antes estaba en app.js, pero ahora
   también lo necesita el Historial (para abrir el detalle
   de una sesión). Si pantalla-historial.js importara de app.js
   y app.js de pantalla-historial.js, quedaría un "import
   circular": A necesita a B y B necesita a A. Con la navegación
   en su propio archivo, todos importan de acá y listo.
   ========================================================= */

import { $$ } from './utiles.js';

// Pantallas que no son pestañas del menú: al salir de ellas se vuelve a la pestaña anterior
const INTERNAS = ['ajustes', 'sesion'];

// Qué función dibuja cada pantalla al entrar. Lo completan los otros
// módulos con registrarPantalla(): { entrenar: dibujarEntrenar, ... }
const alEntrar = {};

let ultimaPestana = 'entrenar';

export function registrarPantalla(nombre, dibujar) {
  alEntrar[nombre] = dibujar;
}

export function irA(nombre) {
  // Mostramos solo la pantalla con id="pantalla-<nombre>".
  // toggle(clase, condición): agrega la clase si es true, la saca si es false.
  $$('.pantalla').forEach(pantalla => {
    pantalla.classList.toggle('activa', pantalla.id === `pantalla-${nombre}`);
  });

  // Marcamos en dorado el botón del menú que corresponde.
  // En una pantalla interna (Ajustes, detalle) queda marcada la pestaña de la que venís.
  const pestana = INTERNAS.includes(nombre) ? ultimaPestana : nombre;
  $$('.menu-inferior__boton').forEach(boton => {
    const esEste = boton.dataset.ir === pestana;
    boton.classList.toggle('activo', esEste);
    if (esEste) boton.setAttribute('aria-current', 'page');
    else boton.removeAttribute('aria-current');
  });

  // Cada pantalla se redibuja al entrar, así siempre muestra datos al día.
  // "?.()" llama a la función solo si existe.
  alEntrar[nombre]?.();

  if (!INTERNAS.includes(nombre)) ultimaPestana = nombre;
  window.scrollTo(0, 0);
}

export function volver() {
  irA(ultimaPestana);
}

// DELEGACIÓN DE EVENTOS: un solo listener para todos los [data-ir] y [data-volver]
export function iniciarNavegacion() {
  document.addEventListener('click', (evento) => {
    // closest() sube desde el elemento tocado hasta encontrar uno que cumpla el selector
    const destino = evento.target.closest('[data-ir]');
    if (destino) irA(destino.dataset.ir);
    if (evento.target.closest('[data-volver]')) volver();
  });
}
