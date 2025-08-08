# 🎵 Assets del Backend

Este directorio contiene los assets necesarios para el procesamiento de videos en el backend.

## Estructura

```
assets/
├── music/           # Archivos de música de fondo
│   ├── *.mp3       # Pistas disponibles
│   └── README.md   # Documentación de música
└── README.md       # Este archivo
```

## ⚠️ Cambios en v1.5.0

- **Fuentes eliminadas**: Las fuentes ahora se manejan en el frontend
- **Marcos eliminados**: Los marcos PNG se procesan en el frontend  
- **Overlays**: El backend ya no genera overlays, los recibe del frontend

El backend ahora se enfoca únicamente en:
1. 🎬 Procesamiento de video (velocidad, concatenación)
2. 🎵 Aplicación de música
3. 📱 Optimización para móviles

Todos los elementos visuales (texto, fuentes, marcos) se generan en el frontend y se envían como overlay PNG al backend.

## 🎵 Música Requerida

Copiar los siguientes archivos desde `public/music/`:
- `SigueBailandome_Yannc.mp3`
- `FeelSoClose_CalvinHarris.mp3`
- `CrazyInLove_Beyonce.mp3`
- `Extasis_CSanta.mp3`
- `BlindingLights_TheWeeknd.mp3`
- `DontStoptheParty_Pitbull.mp3`

```bash
# Copiar música al backend
cp ../public/music/*.mp3 assets/music/
```
