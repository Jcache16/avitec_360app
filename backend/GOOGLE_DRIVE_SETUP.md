# 🚀 Guía de implementación completa - Google Drive para AVITEC 360

## ✅ Archivos creados/modificados

### Backend:
- ✅ `package.json` - Agregada dependencia `googleapis`
- ✅ `services/googleDrive.js` - Configuración de autenticación
- ✅ `services/driveUtils.js` - Utilidades para Drive (crear carpetas, subir archivos)
- ✅ `config/README.md` - Documentación de credenciales
- ✅ `config/google-drive-credentials.json.example` - Ejemplo de credenciales
- ✅ `.gitignore` - Protección de credenciales
- ✅ `index.js` - Nuevos endpoints:
  - `GET /drive/test` - Verificar conexión
  - `POST /upload-to-drive` - Subir video
  - `GET /drive/folder/:date` - Info de carpeta por fecha

### Frontend:
- ✅ `package.json` - Agregadas dependencias `qrcode` y `qrcode.react`
- ✅ `VideoPreview.tsx` - Funcionalidad de subida y QR
- ✅ `app/api/upload-drive/route.ts` - API route de Next.js

## 📋 Pasos para completar la configuración

### 1. Instalar dependencias

**Backend:**
```bash
cd backend
npm install googleapis
```

**Frontend:**
```bash
cd .
npm install qrcode qrcode.react
npm install --save-dev @types/qrcode
```

### 2. Configurar credenciales de Google Drive

1. **Ve a Google Cloud Console** → https://console.cloud.google.com/
2. **Selecciona tu proyecto** o crea uno nuevo
3. **Habilita Google Drive API**:
   - APIs & Services → Library
   - Busca "Google Drive API"
   - Click "Enable"

4. **Crear cuenta de servicio**:
   - IAM & Admin → Service Accounts
   - "Create Service Account"
   - Nombre: `avitec-360-drive-service`
   - Role: `Editor` o `Storage Admin`

5. **Generar clave**:
   - Click en la cuenta creada
   - Keys → Add Key → Create new key
   - Formato: JSON
   - Descarga el archivo

6. **Colocar credenciales**:
   - Renombra el archivo descargado a: `google-drive-credentials.json`
   - Colócalo en: `backend/config/google-drive-credentials.json`

### 3. Variables de entorno (opcional)

Crear `.env` en el backend si quieres configuraciones adicionales:
```env
GOOGLE_DRIVE_FOLDER_NAME=AVITEC_360_VIDEOS
GOOGLE_DRIVE_TIMEOUT=30000
```

### 4. Verificar configuración

**Probar conexión:**
```bash
# En el backend corriendo
curl http://localhost:3000/drive/test
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Conexión con Google Drive exitosa",
  "timestamp": "2025-08-08T..."
}
```

## 🎯 Cómo funciona el flujo completo

### 1. Usuario procesa video
- El usuario graba y procesa su video normalmente
- El video se muestra en `VideoPreview.tsx`

### 2. Usuario presiona "Subir a Google Drive"
- `VideoPreview.tsx` → `uploadToGoogleDrive()`
- Se obtiene el blob del video desde la URL
- Se envía al API route `/api/upload-drive`

### 3. API Route (Next.js)
- `app/api/upload-drive/route.ts`
- Recibe el video del frontend
- Lo convierte a datos binarios
- Lo envía al backend como JSON

### 4. Backend procesa la subida
- `POST /upload-to-drive` en `index.js`
- Recibe los datos del video
- Los convierte de vuelta a archivo temporal
- Usa `driveUtils.js` para subir a Drive

### 5. Google Drive Operations
- `ensureDateFolder()` - Crea/encuentra carpeta del día
- `uploadVideoToDrive()` - Sube el archivo
- Hace la carpeta pública
- Retorna enlaces públicos

### 6. Frontend muestra QR
- Recibe la respuesta con enlaces
- Muestra QR code con link a la carpeta
- Permite acceso directo a carpeta y archivo

## 📁 Estructura en Google Drive

```
AVITEC_360_VIDEOS/
├── 2025-08-08/
│   ├── avitec-360-1691501234567.mp4
│   ├── avitec-360-1691501234890.mp4
│   └── ...
├── 2025-08-09/
│   ├── avitec-360-1691587654321.mp4
│   └── ...
└── ...
```

## 🔧 Resolución de problemas

### Error: "Cannot find module 'qrcode.react'"
```bash
npm install qrcode.react @types/qrcode
```

### Error: "Credenciales no encontradas"
- Verifica que `google-drive-credentials.json` existe en `backend/config/`
- Verifica que el archivo no está en `.gitignore` localmente
- Verifica permisos del archivo

### Error: "Permission denied"
- La cuenta de servicio necesita permisos de Drive
- En Google Cloud Console, asigna roles adecuados
- Verifica que Drive API está habilitada

### Error: "Quota exceeded"
- Revisa cuota de Google Drive en la cuenta
- Considera usar cuenta de G Suite con más espacio

## 🚀 Testing rápido

1. **Ejecutar backend:**
```bash
cd backend
npm start
```

2. **Ejecutar frontend:**
```bash
npm run dev
```

3. **Probar subida:**
- Graba un video corto
- Procésalo
- Click en "Subir a Google Drive"
- Verifica que aparece el QR
- Escanea el QR desde tu móvil

## 🔐 Seguridad

- ✅ Credenciales están en `.gitignore`
- ✅ Solo enlaces públicos de lectura
- ✅ Carpetas organizadas por fecha
- ✅ Timeouts configurados para evitar cuelgues
- ✅ Validación de archivos antes de subir

## 📈 Próximas mejoras

1. **Limpieza automática** - Borrar videos viejos después de X días
2. **Notificaciones por email** - Avisar cuando se sube un video
3. **Estadísticas** - Contador de videos por día
4. **Compresión adicional** - Reducir tamaño antes de subir
5. **Watermark dinámico** - Agregar fecha/hora al video
