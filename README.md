# PhotoBooth 360° App 🎬

Una aplicación web de photobooth que graba videos de 20 segundos con efectos automáticos de velocidad, música de fondo, marcos decorativos y texto personalizado.

## 🔄 Flujo del Usuario

1. **Inicio** - Pantalla de bienvenida
2. **Selección de estilo** - Elige música, marco y texto opcional
3. **Vista previa de cámara** - Configuración y botón de grabar
4. **Cuenta regresiva** - 3, 2, 1...
5. **Grabación automática** - 20 segundos
6. **Procesamiento automático**:
   - 60% velocidad normal
   - 20% slow motion
   - 20% boomerang reverso
   - Aplicación de música de fondo
   - Overlay o marco decorativo
   - Texto superpuesto
7. **Vista previa del video final**
8. **Descarga** - En el celular o Google Drive

## 🛠️ Problemas Corregidos

### ✅ Tipos de datos incompatibles
- Corregido `StyleConfig` en `VideoProcessor.ts` y `VideoPreview.tsx`
- Sincronizados tipos entre componentes

### ✅ VideoProcessor optimizado
- **Antes**: Múltiples comandos FFmpeg secuenciales (lento)
- **Después**: Procesamiento por pasos optimizado
- Agregados logs detallados para debugging
- Preset `ultrafast` para procesamiento más rápido

### ✅ Archivos de recursos
- Creadas fuentes SVG para marcos decorativos
- Instrucciones para fuentes de texto
- Validación de archivos de música

### ✅ Manejo de errores mejorado
- Mensajes de error más específicos
- Fallbacks cuando recursos no están disponibles
- Logs de consola para debugging

## 📁 Estructura del Proyecto

```
src/
├── app/                 # Next.js App Router
├── components/          # Componentes React
│   ├── CameraSetup.tsx     # Configuración de cámara
│   ├── RecordingScreen.tsx # Grabación con cuenta regresiva
│   ├── StyleSelection.tsx  # Selección de música/marco/texto
│   └── VideoPreview.tsx    # Vista previa y descarga
└── utils/
    └── VideoProcessor.ts   # Procesamiento FFmpeg optimizado

public/
├── music/               # Archivos MP3 de música de fondo
├── frames/              # Marcos decorativos SVG
├── fonts/               # Fuentes de texto (opcional)
└── sounds/              # Efectos de sonido
```

## 🚀 Instalación y Uso

### 1. Instalar dependencias
```bash
npm install
```

### 2. Ejecutar en desarrollo
```bash
npm run dev
```

### 3. Probar la aplicación
```bash
# En PowerShell/Windows
.\test.sh

# En bash/Linux/Mac
chmod +x test.sh && ./test.sh
```

## 🔧 Configuración Técnica

### FFmpeg.wasm
- Versión: 0.12.6
- Preset: `ultrafast` para desarrollo
- Codecs: H.264/AAC
- Resolución: 720x1280 (9:16)

### Efectos de Velocidad
```javascript
// Configuración de segmentos (20s total)
const segmentDuration = duration / 3; // ~6.67s cada uno

// Segmento 1: Normal (0-6.67s)
// Segmento 2: Slow Motion 0.5x (6.67-13.33s) 
// Segmento 3: Boomerang Reverso (13.33-20s)
```

### Música de Fondo
- Volumen: 30%
- Loop infinito durante la duración del video
- Mezcla con audio original

## 🐛 Debugging

### Consola del Navegador
La aplicación incluye logs detallados:

```javascript
🎬 Iniciando procesamiento de video: {...}
🔧 Paso 1: Convirtiendo video base
🎵 Paso 2: Agregando música
📝 Paso 3: Agregando texto
🖼️ Paso 4: Agregando marco
⚡ Paso 5: Creando efectos de velocidad
✅ Video procesado exitosamente: 1.2MB
```

### Errores Comunes

1. **"Error procesando video"**
   - Verificar que los archivos de música existan en `/public/music/`
   - Revisar la consola para logs específicos

2. **"Música no disponible"**
   - Verificar archivos MP3 en la carpeta `public/music/`
   - Verificar que los nombres coincidan con `MUSIC_OPTIONS`

3. **Procesamiento lento**
   - Es normal en la primera carga (FFmpeg.wasm se descarga)
   - Considera cambiar preset de `ultrafast` a `fast` para mejor calidad

## 🎯 Próximas Mejoras

- [ ] Google Drive upload
- [ ] Fuentes de texto personalizadas
- [ ] Marcos PNG personalizados
- [ ] Efectos de transición
- [ ] Filtros de color
- [ ] Múltiples resoluciones

## 📱 Dispositivos Soportados

- ✅ Desktop Chrome/Edge/Firefox
- ✅ Mobile Chrome/Safari (iOS/Android)
- ⚠️ Requiere HTTPS para acceso a cámara

## 🔒 Privacidad

- Todos los videos se procesan localmente en el navegador
- No se suben datos a servidores externos
- FFmpeg.wasm ejecuta en el cliente

---

**Desarrollado con ❤️ para Avitec**
