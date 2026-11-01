# Gym Metrics

App para el celular (PWA) para registrar y seguir el progreso en el gimnasio:
sesiones por músculos, series con repeticiones y kilos, cardio por minutos,
historial, progreso semanal y exportación a CSV.

**Estado: versión 1 completa (etapas 1 a 6).**

- **Entrenar:** empezar una sesión eligiendo los músculos del día, cargar series
  con "la última vez" a la vista y marcar cada ejercicio como hecho.
- **Historial:** sesiones por mes; corregir, cambiar la fecha, borrar o cargar un día anterior.
- **Progreso:** peso máximo por semana de cada ejercicio, asistencia (calendario y
  barras) y series por músculo.
- **Ejercicios:** catálogo con 45 sugeridos precargados.
- **Ajustes:** respaldo JSON (exportar e importar) y exportación a CSV.

## Estructura

```
gym-metrics/
├── index.html          Pantallas y menú inferior
├── manifest.json       Nombre, colores e íconos para instalarla
├── sw.js               Service worker: funciona sin internet
├── css/estilos.css     Tema negro y dorado
├── js/
│   ├── app.js                  Arranque y Ajustes (el "director")
│   ├── navegacion.js           Cambiar de pantalla
│   ├── almacen.js              ÚNICO lugar que guarda/lee datos (localStorage)
│   ├── respaldo.js             Exportar e importar el JSON
│   ├── csv.js                  Exportar los entrenamientos a CSV
│   ├── pwa.js                  Service worker e instalación
│   ├── utiles.js               Funciones chicas: $, avisar, fechas, descargar
│   ├── ejercicios.js           Lógica del catálogo (datos, validaciones, sugeridos)
│   ├── sesiones.js             Lógica de entrenamientos (sesión en curso, historial, última vez)
│   ├── progreso.js             Cálculos de progreso, asistencia y músculos
│   ├── graficos.js             Gráficos SVG hechos a mano (línea y barras)
│   ├── hojas-sesion.js         Hojas compartidas: formulario de sesión, elegir, series
│   ├── pantalla-entrenar.js    Pestaña Entrenar
│   ├── pantalla-historial.js   Pestaña Historial y detalle de una sesión
│   ├── pantalla-progreso.js    Pestaña Progreso
│   └── pantalla-ejercicios.js  Pestaña Ejercicios
└── iconos/
```

Los datos se guardan en el navegador del celular (localStorage), con la clave `gymMetrics.v1`.

## Probar en la compu

Los módulos (`import`/`export`) y el service worker **no funcionan abriendo `index.html` con doble clic**: necesitan un servidor.

- Con XAMPP: copiá la carpeta en `htdocs` y abrí `http://localhost/gym-metrics/`
- O con Python, desde la carpeta: `python -m http.server 8000` y abrí `http://localhost:8000`

En Chrome, con F12 → botón de celular (Ctrl+Shift+M) la ves con tamaño de teléfono.

## Publicar en GitHub Pages (gratis, con https)

### Opción A: desde la web de GitHub (sin instalar nada)

1. En GitHub: **New repository** → nombre `gym-metrics` → **Public** → *Create repository*.
2. En el repositorio nuevo: **Add file → Upload files**.
3. Arrastrá **el contenido** de la carpeta `gym-metrics` (no la carpeta en sí):
   `index.html`, `manifest.json`, `sw.js`, `LEEME.md` y las carpetas `css`, `js` e `iconos`.
   Tiene que quedar `index.html` en la raíz del repositorio.
4. Abajo: **Commit changes**.
5. **Settings → Pages → Build and deployment → Source: Deploy from a branch →
   Branch: `main` / `(root)` → Save**.
6. En uno o dos minutos queda en `https://TU-USUARIO.github.io/gym-metrics/`.

### Opción B: con git, desde la consola

Desde la carpeta `gym-metrics`, con el repositorio ya creado (vacío) en GitHub:

```bash
git init
git add .
git commit -m "Gym Metrics v1"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/gym-metrics.git
git push -u origin main
```

Después, el paso 5 de la opción A (activar Pages).

## Instalar en el celular

- **Android (Chrome):** abrí la dirección y tocá **"Instalar app"** (arriba, en Entrenar),
  o menú ⋮ → "Instalar app" / "Agregar a la pantalla principal".
- **iPhone (Safari):** botón Compartir → "Agregar a inicio".

## Cuando cambies algo

1. Subí el número de `VERSION` en `sw.js` (por ejemplo de `'v7'` a `'v8'`).
2. Si agregaste un archivo `.js` nuevo, sumalo a la lista `ARCHIVOS` de `sw.js`.
3. Volvé a subir los archivos (en la web: *Add file → Upload files* reemplaza los que tengan el mismo nombre).
4. En el celular, abrí la app: la próxima vez que la abras ya tiene la versión nueva
   (avisa con "App actualizada").

## Ojo con los datos

- Viven **solo en el navegador del celular**. Si desinstalás la app o borrás los datos de Chrome,
  se pierden: exportá un respaldo desde ⚙ Ajustes de vez en cuando (y guardalo en Drive o por mail).
- Los datos de cada dirección son independientes: lo que cargaste probando en `localhost`
  **no aparece** en la versión de GitHub Pages. Para pasarlos: en localhost, *Exportar respaldo*;
  en la app publicada, *Importar respaldo* con ese archivo.

## Exportar a CSV

⚙ Ajustes → **Exportar a CSV**. Una fila por serie:

```
Fecha;Músculo;Ejercicio;Serie;Reps;Kg;Minutos
2026-10-28;Bíceps;Curl con barra;1;10;8;
2026-10-28;Cardio;Cinta;;;;15
```

- Separado por **punto y coma** y con **coma decimal**, como usa el Excel en español:
  se abre directo con doble clic.
- **Google Sheets:** Archivo → Importar → Subir → el archivo → *Tipo de separador: Detectar automáticamente*.
  Si los kilos con coma aparecen como texto: Archivo → Configuración → Configuración regional: Argentina.
- La sesión en curso no se exporta hasta que la termines.

## Pensado para Capacitor (Android, más adelante)

- Para guardar con el plugin Preferences, solo hay que cambiar `js/almacen.js`.
- Para exportar archivos en Android (Filesystem + Share), solo hay que cambiar `descargarArchivo()` en `js/utiles.js`.
- Pendiente para esa etapa: que el botón "atrás" de Android cierre las hojas y vuelva de las pantallas internas.
