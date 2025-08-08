// backend/services/googleDrive.js
const { google } = require('googleapis');
const path = require('path');

// Configuración de autenticación con soporte para variables de entorno
let auth;

if (process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CLIENT_EMAIL) {
  // Opción 1: Usar variables de entorno (PRODUCCIÓN)
  console.log('🔐 Usando credenciales desde variables de entorno');
  
  auth = new google.auth.GoogleAuth({
    credentials: {
      type: "service_account",
      project_id: process.env.GOOGLE_PROJECT_ID || "avitec-360app",
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Convertir \n a saltos de línea reales
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  // Opción 2: Usar ruta a archivo de credenciales (SERVIDOR)
  console.log('📁 Usando archivo de credenciales desde GOOGLE_APPLICATION_CREDENTIALS');
  
  auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  
} else {
  // Opción 3: Usar archivo local (DESARROLLO)
  const localCredentialsPath = path.join(__dirname, '../config/avitec-360app-9e09c1bc408f.json');
  
  try {
    require('fs').accessSync(localCredentialsPath);
    console.log('🛠️ Usando credenciales locales para desarrollo');
    
    auth = new google.auth.GoogleAuth({
      keyFile: localCredentialsPath,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    
  } catch (error) {
    console.error('❌ No se encontraron credenciales de Google Drive');
    console.error('💡 Opciones para configurar:');
    console.error('   1. Variables de entorno: GOOGLE_PRIVATE_KEY, GOOGLE_CLIENT_EMAIL, etc.');
    console.error('   2. Variable GOOGLE_APPLICATION_CREDENTIALS con ruta al archivo JSON');
    console.error('   3. Archivo local: backend/config/avitec-360app-9e09c1bc408f.json');
    throw new Error('Credenciales de Google Drive no configuradas');
  }
}

const drive = google.drive({ version: 'v3', auth });

module.exports = drive;
