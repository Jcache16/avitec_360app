# 🔐 **CONFIGURACIÓN GOOGLE DRIVE - OAUTH 2.0**

## � **Opción 1: OAuth 2.0 (RECOMENDADO) - Cuota Personal**

### ⚡ **¿Por qué OAuth?**
- ✅ **Usa tu cuota personal de Google Drive** (15GB gratis)
- ✅ **Sin limitaciones de Service Account**
- ✅ **Acceso directo a tu Drive personal**
- ⚠️ **Requiere autorización una sola vez**

### 🛠️ **Configuración OAuth**

#### **Paso 1: Obtener credenciales OAuth**
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto o crea uno nuevo
3. Habilita la **Google Drive API**
4. Ve a **APIs & Services > Credentials**
5. Clic en **+ CREATE CREDENTIALS > OAuth 2.0 Client IDs**
6. Tipo de aplicación: **Desktop application**
7. Nombre: `AVITEC 360 OAuth Client`
8. **Descarga el archivo JSON** (oauth-credentials.json)

#### **Paso 2: Colocar credenciales**
```bash
# Coloca el archivo descargado en:
backend/config/oauth-credentials.json
```

#### **Paso 3: Variables de entorno**
Agrega a tu archivo `.env`:
```env
# Google Drive OAuth Configuration
GOOGLE_OAUTH_CREDENTIALS_FILE=./config/oauth-credentials.json
GOOGLE_OAUTH_TOKENS_FILE=./config/oauth-tokens.json
```

#### **Paso 4: Autorizar la aplicación**
```bash
# Ejecutar proceso de autorización OAuth
cd backend
npm run get-oauth-token
```

Esto abrirá el navegador para autorizar la aplicación. Después del proceso:
- Se generará `oauth-tokens.json` automáticamente
- Los tokens se renovarán automáticamente

#### **Paso 5: Verificar configuración**
```bash
npm run verify-oauth
```
```json
{
  "installed": {
    "client_id": "tu-client-id.apps.googleusercontent.com",
    "project_id": "tu-proyecto-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "tu-client-secret",
    "redirect_uris": ["http://localhost"]
  }
}
```

**Archivo generado:** `token.json` (se crea automáticamente tras autorización)

---

### 🤖 **Opción 2: Service Account (LIMITADO)**

**Archivo requerido:** `google-drive-credentials.json`

### Estructura esperada del archivo Service Account JSON:
```json
{
  "type": "service_account",
  "project_id": "tu-proyecto-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "tu-servicio@tu-proyecto.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

---

### ⚠️ IMPORTANTE
- Estos archivos contienen información sensible
- Deben estar incluidos en `.gitignore`
- Solo deben existir en el servidor de producción
- Nunca subir a control de versiones

### Permisos necesarios
- `https://www.googleapis.com/auth/drive` (acceso completo a Drive)

### Para obtener credenciales OAuth:
1. Ve a Google Cloud Console
2. Proyecto > APIs & Services > Credentials
3. Create Credentials > OAuth 2.0 Client IDs
4. Application type: Desktop application
5. Descarga el archivo JSON y colócalo aquí como `oauth_credentials.json`
