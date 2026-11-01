/* =========================================================
   GYM METRICS — graficos.js
   ---------------------------------------------------------
   Gráficos hechos a mano con SVG, sin librerías.

   SVG es un formato de dibujo con etiquetas, como HTML:
     <line x1 y1 x2 y2>   una línea
     <circle cx cy r>     un círculo
     <rect x y width height>  un rectángulo
     <path d="M x y L x y ...">  un camino (M = mover, L = línea hasta)
     <text x y>           un texto

   El "viewBox" define un lienzo imaginario (acá 320 × 180).
   Dibujamos en esas medidas y el navegador lo estira para
   que ocupe el ancho de la pantalla. Así no nos preocupamos
   por el tamaño real del celular.

   Los colores no van acá: cada pieza tiene una clase
   (grafico__linea, grafico__barra...) y el CSS la pinta.
   ========================================================= */

const ANCHO = 320;
const ALTO = 180;
// Márgenes: lugar para los números del eje (izquierda) y las fechas (abajo)
const M = { arriba: 16, derecha: 12, abajo: 24, izquierda: 34 };

// El área donde va el dibujo propiamente dicho
const AREA = {
  x: M.izquierda,
  y: M.arriba,
  ancho: ANCHO - M.izquierda - M.derecha,
  alto: ALTO - M.arriba - M.abajo
};

// Redondeo a 1 decimal para los textos (1.25 → 1.3), sin ".0" sobrante
function redondear(n) {
  return Math.round(n * 10) / 10;
}


/* ---------------------------------------------------------
   ESCALA
   Convierte un valor (por ejemplo 12 kg) en una altura en el lienzo.
   Es una "regla de tres": si 'minimo' va abajo de todo y 'maximo'
   arriba de todo, ¿dónde cae 'valor'?
   --------------------------------------------------------- */
function crearEscala(minimo, maximo) {
  // Devolvemos una FUNCIÓN: crearEscala arma la regla y nos da una
  // función lista para usar con cada valor. (Una función que devuelve funciones.)
  return valor => AREA.y + AREA.alto - ((valor - minimo) / (maximo - minimo)) * AREA.alto;
}

// Posición horizontal del punto número i de un total de n
function posicionX(i, n) {
  if (n === 1) return AREA.x + AREA.ancho / 2;
  return AREA.x + (i / (n - 1)) * AREA.ancho;
}

// Un "paso" redondo para las marcas del eje: 1, 2, 2,5, 5, 10, 20, 25, 50...
// Así el eje dice 0 · 5 · 10 · 15 y no 4 · 7,3 · 10,7 · 14.
function pasoRedondo(rango) {
  const aproximado = rango / 3;                                   // queremos unas 3 o 4 marcas
  const potencia = 10 ** Math.floor(Math.log10(aproximado));      // 1, 10, 100... (o 0,1)
  const relativo = aproximado / potencia;                         // un número entre 1 y 10
  const lindo = relativo <= 1 ? 1 : relativo <= 2 ? 2 : relativo <= 2.5 ? 2.5 : relativo <= 5 ? 5 : 10;
  return lindo * potencia;
}

// Las líneas horizontales de fondo con su número a la izquierda (una por cada paso)
function htmlGrilla(minimo, maximo, paso, escalaY, formato) {
  let html = '';
  // El "+ paso / 2" evita que un error de redondeo (14.999999) deje afuera la última marca
  for (let valor = minimo; valor <= maximo + paso / 2; valor += paso) {
    const y = escalaY(valor);
    html += `
      <line class="grafico__grilla" x1="${AREA.x}" y1="${y}" x2="${ANCHO - M.derecha}" y2="${y}" />
      <text class="grafico__texto" x="${AREA.x - 6}" y="${y + 3}" text-anchor="end">${formato(redondear(valor))}</text>`;
  }
  return html;
}

// Las fechas de abajo (una cada "cada" puntos, más la última)
function htmlEtiquetasX(puntos, cada, posicion) {
  return puntos.map((punto, i) => {
    const esUltimo = i === puntos.length - 1;
    if (i % cada !== 0 && !esUltimo) return '';
    // Si la anteúltima etiqueta quedaría pegada a la última, no la mostramos
    if (!esUltimo && puntos.length - 1 - i < cada / 2) return '';
    return `<text class="grafico__texto" x="${posicion(i)}" y="${ALTO - 6}" text-anchor="middle">${punto.etiqueta}</text>`;
  }).join('');
}


/* ---------------------------------------------------------
   GRÁFICO DE LÍNEA
   puntos: [{ etiqueta: '26/10', valor: 12 }, { etiqueta: '2/11', valor: null }, ...]
   Los null (semanas en que no hiciste el ejercicio) no se dibujan:
   la línea une directamente los puntos que sí tienen valor.
   --------------------------------------------------------- */
// soloEnteros: para repeticiones y minutos (no hay "media repetición" en el eje)
export function graficoLinea(puntos, { formato = v => v, cadaEtiqueta = 3, descripcion = '', soloEnteros = false } = {}) {
  const valores = puntos.map(p => p.valor).filter(v => v !== null);
  if (valores.length === 0) return '';

  // Rango del eje vertical: un poco más amplio que los datos, para que no toquen los bordes
  let minimo = Math.min(...valores);
  let maximo = Math.max(...valores);
  const margen = (maximo - minimo) * 0.2 || Math.max(1, maximo * 0.1); // si son todos iguales
  let paso = pasoRedondo(maximo - minimo + 2 * margen);
  if (soloEnteros) paso = Math.max(1, Math.round(paso));
  // Redondeamos los extremos a múltiplos del paso (y el piso nunca baja de 0)
  minimo = Math.max(0, Math.floor((minimo - margen) / paso) * paso);
  maximo = Math.ceil((maximo + margen) / paso) * paso;
  const escalaY = crearEscala(minimo, maximo);
  const x = i => posicionX(i, puntos.length);

  // Coordenadas de los puntos con valor
  const conValor = puntos
    .map((p, i) => ({ ...p, cx: x(i), cy: p.valor === null ? null : escalaY(p.valor) }))
    .filter(p => p.cy !== null);

  // El camino: "M x y" en el primero y "L x y" en los siguientes
  const camino = conValor
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.cx.toFixed(1)} ${p.cy.toFixed(1)}`)
    .join(' ');

  const ultimo = conValor[conValor.length - 1];

  return `
    <svg class="grafico" viewBox="0 0 ${ANCHO} ${ALTO}" role="img" aria-label="${descripcion}">
      ${htmlGrilla(minimo, maximo, paso, escalaY, formato)}
      ${htmlEtiquetasX(puntos, cadaEtiqueta, x)}
      <path class="grafico__linea" d="${camino}" />
      ${conValor.map(p => `<circle class="grafico__punto" cx="${p.cx}" cy="${p.cy}" r="3.5" />`).join('')}
      <circle class="grafico__punto grafico__punto--ultimo" cx="${ultimo.cx}" cy="${ultimo.cy}" r="5.5" />
      <text class="grafico__valor" x="${ultimo.cx}" y="${ultimo.cy - 10}" text-anchor="end">${formato(ultimo.valor)}</text>
    </svg>`;
}


/* ---------------------------------------------------------
   GRÁFICO DE BARRAS
   datos: [{ etiqueta: '26/10', valor: 3 }, ...]
   --------------------------------------------------------- */
export function graficoBarras(datos, { cadaEtiqueta = 3, descripcion = '' } = {}) {
  const maximo = Math.max(1, ...datos.map(d => d.valor)); // al menos 1, para no dividir por 0
  const escalaY = crearEscala(0, maximo);
  const anchoColumna = AREA.ancho / datos.length;
  const anchoBarra = anchoColumna * 0.6;
  const centro = i => AREA.x + anchoColumna * i + anchoColumna / 2;

  const barras = datos.map((d, i) => {
    if (d.valor === 0) return '';
    const y = escalaY(d.valor);
    const esActual = i === datos.length - 1;
    return `
      <rect class="grafico__barra ${esActual ? 'grafico__barra--actual' : ''}"
            x="${centro(i) - anchoBarra / 2}" y="${y}" width="${anchoBarra}"
            height="${AREA.y + AREA.alto - y}" rx="3" />
      <text class="grafico__valor" x="${centro(i)}" y="${y - 5}" text-anchor="middle">${d.valor}</text>`;
  }).join('');

  const base = AREA.y + AREA.alto;
  return `
    <svg class="grafico" viewBox="0 0 ${ANCHO} ${ALTO}" role="img" aria-label="${descripcion}">
      <line class="grafico__grilla" x1="${AREA.x}" y1="${base}" x2="${ANCHO - M.derecha}" y2="${base}" />
      ${htmlEtiquetasX(datos, cadaEtiqueta, centro)}
      ${barras}
    </svg>`;
}
