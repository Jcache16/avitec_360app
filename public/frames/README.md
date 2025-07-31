# Marcos Decorativos - Photobooth 360°

Esta carpeta contiene los archivos PNG de marcos decorativos para superponer en los videos.

## Archivos requeridos:
- `classic-thumb.png` - Miniatura del marco clásico
- `modern-thumb.png` - Miniatura del marco moderno
- `elegant-thumb.png` - Miniatura del marco elegante
- `fun-thumb.png` - Miniatura del marco divertido

## Formato recomendado:
- **Formato**: PNG con transparencia
- **Resolución miniaturas**: 100x100px aproximadamente
- **Resolución finales**: 1080x1920px (9:16 ratio)
- **Fondo**: Transparente para permitir superposición

## Implementación:
- Las miniaturas se muestran en la selección de estilo
- Los marcos finales se aplicarán durante el procesamiento del video
- El marco "Personalizado" usa bordes CSS con colores seleccionables

## Nota sobre el Marco Personalizado:
El marco personalizado no requiere archivos PNG, ya que se genera dinámicamente usando CSS con el color seleccionado por el usuario. Este diseño es más ligero y permite infinitas combinaciones de colores.
