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

- Al iniciar, la app intenta cargar la coleccion completa desde `localStorage`.
- Si no hay datos guardados, usa los JSON locales de `src/data/`.
- Los JSON precargados son `tableroTotales.json` y `segundoArchivo.json`.
- Los archivos se guardan separados por nombre dentro de una coleccion.
- Cada carga desde el input reemplaza por completo la coleccion anterior.
- Si queres cargar dos o mas Excel, seleccionalos juntos en la misma carga.
- El boton `Limpiar datos guardados` borra `localStorage` y deja el tablero vacio.
- El boton `Restaurar datos precargados` vuelve a cargar los JSON locales.
- La coleccion completa se guarda en `localStorage` para sobrevivir a un refresh.
