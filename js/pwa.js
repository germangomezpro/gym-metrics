/* =========================================================
   GYM METRICS — pwa.js
   Todo lo que la hace "app instalable": service worker,
   botón de instalar y pedido de almacenamiento persistente.
   (Es lo mismo que tenía tu app de hábitos, movido a su propio archivo.)
   ========================================================= */

import { $, avisar } from './utiles.js';

export function iniciarPWA() {
  registrarServiceWorker();
  prepararBotonInstalar();

  // Pedimos al navegador que no borre nuestros datos si le falta espacio
  if (navigator.storage?.persist) {
    navigator.storage.persist().catch(() => {});
  }
}

// El service worker solo funciona en https (o en localhost), no abriendo el archivo con doble clic
function registrarServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;

  navigator.serviceWorker.register('./sw.js')
    .catch(error => console.error('No se pudo registrar el service worker', error));

  // Cuando se activa una versión nueva de la app, avisamos
  let habiaControlador = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (habiaControlador) avisar('App actualizada. Cerrala y abrila para ver los cambios.');
    habiaControlador = true;
  });
}

// Botón "Instalar app" (Chrome en Android y en la compu).
// El navegador avisa con "beforeinstallprompt" cuando la app se puede instalar;
// guardamos ese aviso y lo usamos cuando tocás el botón.
function prepararBotonInstalar() {
  const boton = $('#btn-instalar');
  let pedidoInstalacion = null;

  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault();
    pedidoInstalacion = evento;
    boton.hidden = false;
  });

  boton.addEventListener('click', async () => {
    if (!pedidoInstalacion) return;
    pedidoInstalacion.prompt();
    await pedidoInstalacion.userChoice;
    pedidoInstalacion = null;
    boton.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    boton.hidden = true;
    avisar('¡App instalada!');
  });
}
