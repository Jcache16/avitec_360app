# 🎬 AVITEC 360 BACKEND

Backend de procesamiento de videos para Photobooth 360 que replica exactamente el flujo del frontend.

## 🎯 Características

- **Resolución optimizada**: 480x854 (9:16 aspect ratio) para móviles
- **Efectos de velocidad**: Segmento normal + slow motion (2x más lento)
- **Overlay PNG**: Frames personalizados, texto y indicadores de música
- **Aplicación de música**: Mezcla de audio con biblioteca de canciones
- **Optimizaciones**: Preset ultrafast, CRF 30, limpieza automática de archivos

## 🏗️ Arquitectura

### Flujo de procesamiento:
1. **Recepción**: Video + configuración de estilo
2. **Generación de overlay**: PNG transparente con frames/texto/música
3. **Segmentación**: Video normal + video slow motion
4. **Concatenación**: Unión de segmentos
5. **Aplicación de overlay**: Superposición PNG sobre video
6. **Aplicación de música**: Mezcla de audio (si se selecciona)
7. **Entrega**: Video final procesado

### Clases principales:
- `VideoProcessor`: Lógica de procesamiento FFmpeg (réplica exacta del frontend)
- `OverlayGenerator`: Generación de PNG con Canvas (réplica de OverlayGenerator.tsx)

## 📦 Instalación

```bash
# Clonar e instalar dependencias
npm install

# Copiar archivos de assets desde el frontend
cp ../public/music/*.mp3 assets/music/
cp ../public/fonts/*.ttf assets/fonts/

# Ejecutar en desarrollo
npm run dev

# Ejecutar en producción
npm start
```

## 🧪 Testing

```bash
# Probar configuración local
npm test

# O manualmente:
node test.js
```

## 📋 API Endpoints

### `GET /`
- **Descripción**: Estado del servidor
- **Respuesta**: Info del servidor y capacidades

### `GET /options`
- **Descripción**: Opciones disponibles
- **Respuesta**: Lista de música, fuentes, frames y colores

### `POST /process-video`
- **Descripción**: Procesar video con estilos
- **Content-Type**: `multipart/form-data`
- **Campos**:
  - `video` (file): Video a procesar
  - `overlay` (file, opcional): Overlay PNG personalizado
  - `styleConfig` (JSON): Configuración de estilo
  - `normalDuration` (number): Duración segmento normal
  - `slowmoDuration` (number): Duración segmento slow motion

#### Ejemplo de styleConfig:
```json
{
  "music": "beggin",
  "frame": "custom",
  "frameColor": "#8B5CF6",
  "text": "Mi texto personalizado",
  "textFont": "montserrat",
  "textColor": "#FFFFFF"
}
```

## 🎨 Configuración de estilos

### Música disponible:
- `none`: Sin música
- `beggin`: Beggin - Maneskin
- `master_puppets`: Master of Puppets - Metallica  
- `night_dancer`: Night Dancer - Imase

### Fuentes disponibles:
- `montserrat`: Montserrat Regular
- `playfair`: Playfair Display Regular
- `chewy`: Chewy Regular

### Tipos de marco:
- `none`: Sin marco
- `custom`: Marco personalizado con color configurable

## 🚀 Deploy en Render.com

### Variables de entorno:
- `NODE_ENV=production`
- `PORT=10000` (automático en Render)

### Configuración de build:
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Node Version**: 18+

### Recursos necesarios:
- **Instancia**: Basic ($7/mes mínimo) - FFmpeg requiere CPU
- **Almacenamiento**: Efímero (archivos se eliminan tras 1 hora)
- **Memoria**: 512MB mínimo recomendado

## 📁 Estructura del proyecto

```
avitec360-backend/
├── index.js              # Servidor principal
├── package.json          # Dependencias y scripts
├── test.js               # Script de pruebas
├── README.md             # Este archivo
├── uploads/              # Videos subidos (temporal)
├── processed/            # Videos procesados (temporal)
├── assets/               # Recursos estáticos
│   ├── music/           # Archivos MP3
│   │   ├── beggin.mp3
│   │   ├── master_puppets.mp3
│   │   └── night_dancer.mp3
│   └── fonts/           # Fuentes TTF
│       ├── Montserrat-Regular.ttf
│       ├── PlayfairDisplay-Regular.ttf
│       └── Chewy-Regular.ttf
└── temp/                 # Archivos de trabajo (se crea automáticamente)
```

## 🛠️ Tecnologías utilizadas

- **Express.js**: Servidor web
- **FFmpeg**: Procesamiento de video (fluent-ffmpeg + ffmpeg-static)
- **Canvas**: Generación de overlays PNG
- **Sharp**: Manipulación de imágenes
- **Multer**: Subida de archivos
- **UUID**: Identificadores únicos
- **fs-extra**: Operaciones de archivos mejoradas

## 🔧 Optimizaciones implementadas

1. **Rendimiento de video**:
   - Preset `ultrafast` para velocidad máxima
   - CRF 30 para balance calidad/tamaño
   - Resolución fija 480x854 optimizada para móviles

2. **Gestión de memoria**:
   - Limpieza inmediata de archivos intermedios
   - Eliminación automática de archivos temporales
   - Procesamiento por lotes para evitar sobrecarga

3. **Escalabilidad**:
   - Identificadores únicos para evitar conflictos
   - Directorios de trabajo aislados
   - Limpieza automática cada hora

## 📱 Integración con app móvil

### Ejemplo de uso desde frontend:
```javascript
const formData = new FormData();
formData.append('video', videoBlob);
formData.append('styleConfig', JSON.stringify({
  music: 'beggin',
  frame: 'custom',
  frameColor: '#8B5CF6',
  text: 'Mi Photobooth 360',
  textFont: 'montserrat',
  textColor: '#FFFFFF'
}));
formData.append('normalDuration', '5');
formData.append('slowmoDuration', '5');

const response = await fetch('https://tu-backend.onrender.com/process-video', {
  method: 'POST',
  body: formData
});

const processedVideo = await response.blob();
```

## 🐛 Debugging

### Logs importantes:
- `🎬 Iniciando procesamiento OPTIMIZADO` - Inicio de procesamiento
- `⏱️ ESTADÍSTICAS DE RENDIMIENTO` - Métricas de velocidad
- `✅ Video final creado` - Procesamiento exitoso
- `❌ Error fatal en el procesamiento` - Errores críticos

### Verificación de salud:
```bash
curl https://tu-backend.onrender.com/
```

### Verificación de opciones:
```bash
curl https://tu-backend.onrender.com/options
```

## 📄 Licencia

ISC - Avitec 360

---

*Backend que replica exactamente el flujo de VideoProcessor.ts del frontend, optimizado para deploy en Render.com* 🎉
