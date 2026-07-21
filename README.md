# Ojos en Alerta

Dashboard React con Vite para consultar datos precargados y actualizar el tablero con archivos Excel `.xlsx`.

## Comandos

```bash
npm install
npm run dev
```

En PowerShell, si `npm` falla por la politica de ejecucion de scripts, usar:

```bash
npm.cmd install
npm.cmd run dev
```

## Flujo de datos

- En la vista publica `/`, la app usa siempre los JSON locales de `src/data/`.
- En `/admin`, la carga desde input sirve como vista local de prueba y se guarda en `localStorage` de ese navegador.
- Los JSON precargados son `tableroTotales.json` y `visualizacionTablerosRecursos.json`.
- Los archivos se guardan separados por nombre dentro de una coleccion.
- Cada carga desde el input reemplaza por completo la coleccion anterior.
- Si queres cargar dos o mas Excel, seleccionalos juntos en la misma carga.
- El boton `Limpiar datos guardados` borra `localStorage` y deja el tablero vacio.
- El boton `Restaurar datos precargados` vuelve a cargar los JSON locales.

## Actualizacion mensual para publicar en Vercel

Para que todos vean los datos actualizados, regenerar los JSON del proyecto y hacer deploy:

```bash
npm.cmd run data:update -- "C:\ruta\Tablero totales.xlsx" "C:\ruta\VISUALIZACION tableros recursos.xlsx"
npm.cmd run build
```

Despues commitear/subir los cambios y desplegar en Vercel. La carga desde `/admin` no publica datos para otros usuarios; solo actualiza tu navegador.
