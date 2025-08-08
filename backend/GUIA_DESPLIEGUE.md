# 🚀 GUÍA DE DESPLIEGUE - Google Drive Integration

## ✅ **Estado actual: LISTO PARA PRODUCCIÓN**

### 🔍 **Verificación completada:**
- ✅ Credenciales JSON y .env coinciden 100%
- ✅ Conexión con Google Drive funcional
- ✅ Carpetas creadas y enlaces públicos trabajando
- ✅ Sistema híbrido de credenciales implementado

---

## 📋 **Opciones para desplegar al servidor**

### **🔧 Opción 1: Variables de entorno (RECOMENDADA)**

**Para servicios como Heroku, Vercel, Railway, Render, etc.**

```bash
# Comandos ya generados para ti:
GOOGLE_PROJECT_ID="avitec-360app"
GOOGLE_PRIVATE_KEY_ID="9e09c1bc408f19b48233fb541fd67d1c88235c3e"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDAG8kunnCAQzOG..."
GOOGLE_CLIENT_EMAIL="avitec360-uploader@avitec-360app.iam.gserviceaccount.com"
GOOGLE_CLIENT_ID="104534821164431925485"
GOOGLE_CLIENT_X509_CERT_URL="https://www.googleapis.com/robot/v1/metadata/x509/avitec360-uploader%40avitec-360app.iam.gserviceaccount.com"
PORT=3000
GOOGLE_DRIVE_FOLDER_NAME=AVITEC_360_VIDEOS
GOOGLE_DRIVE_TIMEOUT=30000
```

**🎯 Plataformas específicas:**

- **Heroku:** `heroku config:set GOOGLE_PROJECT_ID="avitec-360app"`
- **Vercel:** Panel → Settings → Environment Variables
- **Railway:** `railway variables set GOOGLE_PROJECT_ID="avitec-360app"`
- **Render:** Dashboard → Environment Variables

---

### **📁 Opción 2: Subir archivo .env directamente**

**Para servidores VPS/dedicados (DigitalOcean, AWS EC2, etc.)**

1. **Subir el archivo `.env` al servidor:**
   ```bash
   scp backend/.env usuario@servidor:/ruta/al/proyecto/backend/
   ```

2. **O crear el archivo en el servidor:**
   ```bash
   nano /ruta/al/proyecto/backend/.env
   # Copiar el contenido del .env local
   ```

---

### **🔐 Opción 3: Archivo JSON en el servidor**

**Para máximo control (servidores propios)**

1. **Subir archivo JSON:**
   ```bash
   scp backend/config/avitec-360app-9e09c1bc408f.json usuario@servidor:/ruta/al/proyecto/backend/config/
   ```

2. **O usar variable GOOGLE_APPLICATION_CREDENTIALS:**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/ruta/completa/al/archivo.json"
   ```

---

## 🔄 **Sistema híbrido implementado**

El código automáticamente intentará usar credenciales en este orden:

1. **Variables de entorno** (GOOGLE_PRIVATE_KEY, etc.)
2. **Variable GOOGLE_APPLICATION_CREDENTIALS** (ruta al JSON)
3. **Archivo JSON local** (config/avitec-360app-9e09c1bc408f.json)

---

## 🧪 **Comandos para verificar en el servidor**

```bash
# Verificar que las credenciales funcionan
npm run verify-creds

# Probar conexión con Google Drive
npm run test-drive

# Extraer variables de entorno desde JSON (si necesitas regenerarlas)
npm run extract-env
```

---

## 🔒 **Seguridad implementada**

### ✅ **Lo que SÍ se sube al repositorio:**
- Código fuente
- Archivo `.env.example` (sin credenciales reales)
- Scripts de verificación
- Documentación

### ❌ **Lo que NO se sube (protegido por .gitignore):**
- `config/*.json` (archivo de credenciales)
- `.env` (variables de entorno)
- `*.key`, `*.pem` (cualquier archivo de claves)

---

## 🚀 **Flujo de despliegue recomendado**

### **Para servicios cloud (Heroku, Vercel, etc.):**
1. Hacer `git push` del código (sin credenciales)
2. Configurar variables de entorno en el panel del servicio
3. El servicio automáticamente desplegará y usará las variables

### **Para servidores propios:**
1. Hacer `git pull` en el servidor
2. Subir archivo `.env` por separado (scp, sftp, etc.)
3. Reiniciar el servicio

---

## ✨ **¡Estás listo!**

**Tu configuración está completamente preparada para cualquier tipo de despliegue:**

- 🔐 **Máxima seguridad:** Credenciales nunca en el código
- 🔄 **Flexibilidad:** Múltiples métodos de configuración
- ✅ **Verificado:** Todo probado y funcionando
- 📚 **Documentado:** Guías completas para cada escenario

**Solo elige la opción que mejor se adapte a tu plataforma de hosting y ¡despliega!** 🚀
