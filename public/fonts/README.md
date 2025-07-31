# Fuentes para el procesador de video

Descarga las siguientes fuentes y colócalas en esta carpeta:

1. **Montserrat-Regular.ttf** - Fuente principal
   - Descarga de: https://fonts.google.com/specimen/Montserrat

2. **PlayfairDisplay-Regular.ttf** - Fuente elegante
   - Descarga de: https://fonts.google.com/specimen/Playfair+Display

3. **Chewy-Regular.ttf** - Fuente divertida
   - Descarga de: https://fonts.google.com/specimen/Chewy

## Instalación automática

El siguiente comando descargará las fuentes automáticamente:

```bash
# Desde la carpeta del proyecto
cd public/fonts
curl -o Montserrat-Regular.ttf "https://fonts.gstatic.com/s/montserrat/v25/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aXpsog.woff2"
curl -o PlayfairDisplay-Regular.ttf "https://fonts.gstatic.com/s/playfairdisplay/v30/nuFiD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDYbtXK-F2qC0s.woff2"
curl -o Chewy-Regular.ttf "https://fonts.gstatic.com/s/chewy/v18/uK_94ruaZus72nbNDxcBDIo.woff2"
```

## Fallback

Si las fuentes no están disponibles, el sistema usará fuentes del sistema como fallback.
