# 🚀 INSTRUCCIONES DE DEPLOY - RENDER.COM

Guía paso a paso para subir el backend de Avitec 360 a Render.

## 📋 Pre-requisitos

1. **Cuenta en Render.com** (gratis para empezar)
2. **Repositorio en GitHub** con el código del backend
3. **Archivos de assets** copiados correctamente

## 🗂️ Preparación del repositorio

### 1. Crear repositorio en GitHub
```bash
# Crear nuevo repo llamado: avitec360-backend
# Descripción: Backend de procesamiento de videos para Photobooth 360
```

### 2. Copiar archivos del backend
```bash
# Desde el directorio actual:
cp -r backend/* /ruta/al/nuevo/repo/avitec360-backend/
```

### 3. Copiar assets necesarios
```bash
# Música
cp public/music/beggin.mp3 /ruta/repo/assets/music/
cp public/music/master_puppets.mp3 /ruta/repo/assets/music/  
cp public/music/night_dancer.mp3 /ruta/repo/assets/music/

# Fuentes
cp public/fonts/Montserrat-Regular.ttf /ruta/repo/assets/fonts/
cp public/fonts/PlayfairDisplay-Regular.ttf /ruta/repo/assets/fonts/
cp public/fonts/Chewy-Regular.ttf /ruta/repo/assets/fonts/
```

### 4. Verificar estructura final
```
avitec360-backend/
├── package.json
├── index.js
├── README.md
├── test.js
├── uploads/
├── processed/
└── assets/
    ├── music/
    │   ├── beggin.mp3
    │   ├── master_puppets.mp3
    │   └── night_dancer.mp3
    └── fonts/
        ├── Montserrat-Regular.ttf
        ├── PlayfairDisplay-Regular.ttf
        └── Chewy-Regular.ttf
```

## 🌐 Configuración en Render.com

### 1. Crear nuevo Web Service
- **Dashboard de Render** → "New +" → "Web Service"
- **Connect a repository** → Seleccionar `avitec360-backend`

### 2. Configuración del servicio
```
Name: avitec360-backend
Environment: Node
Region: Oregon (US West) o Frankfurt (Europe)
Branch: main
```

### 3. Build & Deploy Settings
```
Build Command: npm install
Start Command: npm start
```

### 4. Instance Type
```
Plan: Starter (Gratis) - Para pruebas
Plan: Basic ($7/mes) - Para producción (recomendado por FFmpeg)
```

### 5. Variables de entorno
```
NODE_ENV = production
```

### 6. Advanced Settings
```
Health Check Path: /
Auto-Deploy: Yes
```

## ⚙️ Configuración avanzada

### Render.yaml (opcional)
Si prefieres configuración como código, crear `render.yaml`:

```yaml
services:
  - type: web
    name: avitec360-backend
    env: node
    plan: starter
    buildCommand: npm install
    startCommand: npm start
    healthCheckPath: /
    envVars:
      - key: NODE_ENV
        value: production
```

### Dockerfile (alternativo)
Si prefieres usar Docker:

```dockerfile
FROM node:18-alpine

# Instalar FFmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 10000

CMD ["npm", "start"]
```

## 🧪 Testing después del deploy

### 1. Verificar salud del servidor
```bash
curl https://avitec360-backend.onrender.com/
```

**Respuesta esperada:**
```json
{
  "status": "active",
  "message": "Servidor de procesamiento Avitec 360 ✅",
  "version": "1.0.0",
  "capabilities": [...]
}
```

### 2. Verificar opciones disponibles
```bash
curl https://avitec360-backend.onrender.com/options
```

### 3. Test de procesamiento (con Postman)
```
POST https://avitec360-backend.onrender.com/process-video
Content-Type: multipart/form-data

Fields:
- video: [archivo MP4]
- styleConfig: {"music":"beggin","frame":"none","text":"Test"}
- normalDuration: 3
- slowmoDuration: 2
```

## 📊 Monitoreo

### Métricas importantes:
- **Response Time**: < 5 segundos para videos cortos
- **Memory Usage**: < 512MB en uso normal  
- **Error Rate**: < 1%
- **Uptime**: > 99%

### Logs útiles:
```bash
# Ver logs en tiempo real desde Render Dashboard
# Buscar por:
- "🎬 Iniciando procesamiento" (inicio de trabajo)
- "⏱️ ESTADÍSTICAS DE RENDIMIENTO" (métricas)
- "❌ Error fatal" (problemas críticos)
```

## 🔧 Troubleshooting común

### Problema: FFmpeg no encontrado
**Solución**: Render incluye FFmpeg, verificar que `ffmpeg-static` esté en dependencies

### Problema: Archivos grandes fallan
**Solución**: Aumentar límites en multer o usar compresión

### Problema: Timeout en videos largos
**Solución**: Upgrade a plan Basic o optimizar parámetros FFmpeg

### Problema: Assets no encontrados
**Solución**: Verificar que archivos de música/fuentes estén en repo

## 🔐 Seguridad

### Headers recomendados:
```javascript
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});
```

### Límites de rate limiting:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10 // máximo 10 requests por IP
});

app.use('/process-video', limiter);
```

## 📱 Integración con app móvil

### URL final del backend:
```
https://avitec360-backend.onrender.com
```

### Actualizar frontend:
```javascript
// En VideoPreview.tsx o donde hagas el procesamiento
const BACKEND_URL = 'https://avitec360-backend.onrender.com';

const processVideoInBackend = async (videoBlob, styleConfig) => {
  const formData = new FormData();
  formData.append('video', videoBlob);
  formData.append('styleConfig', JSON.stringify(styleConfig));
  formData.append('normalDuration', '5');
  formData.append('slowmoDuration', '5');
  
  const response = await fetch(`${BACKEND_URL}/process-video`, {
    method: 'POST',
    body: formData
  });
  
  return await response.blob();
};
```

## ✅ Checklist final

- [ ] Repositorio creado y configurado
- [ ] Assets copiados (música y fuentes)
- [ ] Web Service creado en Render
- [ ] Build exitoso sin errores
- [ ] Health check respondiendo (200 OK)
- [ ] Test de procesamiento funcionando
- [ ] URL documentada para el frontend
- [ ] Monitoreo configurado

---

🎉 **¡Backend listo para procesar videos del Photobooth 360!**

*Ahora los videos se procesarán en el servidor, liberando recursos del dispositivo móvil y garantizando consistencia en todos los dispositivos.*
