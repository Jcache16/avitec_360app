# 🖼️ Marcos para Videos 360°

Este directorio contiene los marcos PNG que se pueden aplicar a los videos procesados.

## Marcos Disponibles

- **elegante.png** - Marco elegante con diseño sofisticado
- **floral.png** - Marco floral con elementos decorativos

## Especificaciones

- **Formato**: PNG con transparencia
- **Resolución recomendada**: Optimizada para formato vertical (9:16)
- **Uso**: Se aplican como overlay sobre el video durante el procesamiento

## Agregar Nuevos Marcos

1. Colocar el archivo PNG en este directorio
2. Actualizar el array `FRAME_OPTIONS` en el frontend (`StyleSelection.tsx`)
3. Asegurarse de que el ID coincida con el nombre del archivo (sin extensión)

Ejemplo:
```javascript
{ id: "nuevo_marco", name: "Nuevo Marco", thumbnail: "/frames/nuevo_marco.png" }
```
