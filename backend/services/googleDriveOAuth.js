// backend/services/googleDriveOAuth.js
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

/**
 * Cliente OAuth para Google Drive usando cuota personal
 * Alternativa a Service Account para evitar limitaciones de almacenamiento
 */

let oAuthClient = null;

/**
 * Inicializar cliente OAuth
 */
function initOAuthClient() {
  try {
    let credentials, tokens;
    
    // MÉTODO 1: Intentar leer desde variables de entorno (PREFERIDO PARA PRODUCCIÓN)
    if (process.env.GOOGLE_OAUTH_CREDENTIALS && process.env.GOOGLE_OAUTH_TOKENS) {
      console.log('🌐 Usando credenciales OAuth desde variables de entorno');
      
      try {
        credentials = JSON.parse(process.env.GOOGLE_OAUTH_CREDENTIALS);
        tokens = JSON.parse(process.env.GOOGLE_OAUTH_TOKENS);
        console.log('✅ Credenciales OAuth cargadas desde variables de entorno');
      } catch (parseError) {
        console.error('❌ Error parseando variables de entorno OAuth:', parseError.message);
        throw new Error('Variables de entorno OAuth mal formateadas');
      }
      
    } else {
      // MÉTODO 2: Leer desde archivos (DESARROLLO LOCAL)
      console.log('📁 Usando credenciales OAuth desde archivos locales');
      
      const credentialsPath = process.env.GOOGLE_OAUTH_CREDENTIALS_FILE || 
                            path.join(__dirname, '../config/oauth-credentials.json');
      const tokenPath = process.env.GOOGLE_OAUTH_TOKENS_FILE || 
                       path.join(__dirname, '../config/oauth-tokens.json');
      
      console.log(`🔍 Verificando credenciales OAuth: ${credentialsPath}`);
      console.log(`🔍 Verificando tokens OAuth: ${tokenPath}`);
      
      if (!fs.existsSync(credentialsPath)) {
        throw new Error(`Archivo de credenciales OAuth no encontrado: ${credentialsPath}`);
      }
      
      if (!fs.existsSync(tokenPath)) {
        throw new Error(`Archivo de tokens OAuth no encontrado: ${tokenPath}. Ejecuta: npm run get-oauth-token`);
      }
      
      credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    }
    
    if (!credentials.installed) {
      throw new Error('Formato de credenciales OAuth incorrecto');
    }
    
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    
    oAuthClient = new google.auth.OAuth2(
      client_id, 
      client_secret, 
      redirect_uris[0]
    );
    
    oAuthClient.setCredentials(tokens);
    
    // Configurar renovación automática de tokens (solo para archivos locales)
    if (!process.env.GOOGLE_OAUTH_CREDENTIALS) {
      oAuthClient.on('tokens', (newTokens) => {
        console.log('🔄 Renovando tokens OAuth automáticamente');
        
        // Actualizar tokens si hay nuevos
        if (newTokens.refresh_token) {
          tokens.refresh_token = newTokens.refresh_token;
        }
        if (newTokens.access_token) {
          tokens.access_token = newTokens.access_token;
        }
        if (newTokens.expiry_date) {
          tokens.expiry_date = newTokens.expiry_date;
        }
        
        // Guardar tokens actualizados (solo en desarrollo local)
        const tokenPath = process.env.GOOGLE_OAUTH_TOKENS_FILE || 
                         path.join(__dirname, '../config/oauth-tokens.json');
        try {
          fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
          console.log('✅ Tokens OAuth actualizados automáticamente');
        } catch (writeError) {
          console.warn('⚠️ No se pudieron guardar tokens actualizados:', writeError.message);
        }
      });
    } else {
      console.log('🌐 Modo producción: renovación automática de tokens deshabilitada');
    }
    
    console.log('🔐 Cliente OAuth inicializado correctamente');
    return oAuthClient;
    
  } catch (error) {
    console.error('❌ Error inicializando cliente OAuth:', error.message);
    throw error;
  }
}

/**
 * Obtener cliente OAuth (inicializa si es necesario)
 */
function getOAuthClient() {
  if (!oAuthClient) {
    oAuthClient = initOAuthClient();
  }
  return oAuthClient;
}

/**
 * Crear instancia de Google Drive con OAuth
 */
function createDriveClient() {
  const auth = getOAuthClient();
  return google.drive({ version: 'v3', auth });
}

/**
 * Verificar si OAuth está configurado y funcionando
 */
async function testOAuthConnection() {
  try {
    console.log('🔍 Verificando conexión OAuth con Google Drive...');
    
    const drive = createDriveClient();
    const res = await drive.about.get({
      fields: 'user(displayName, emailAddress), storageQuota(limit, usage)',
    });
    
    console.log('✅ Conexión OAuth exitosa');
    console.log('👤 Usuario:', res.data.user.displayName, res.data.user.emailAddress);
    
    if (res.data.storageQuota) {
      const used = parseInt(res.data.storageQuota.usage) / 1024 / 1024 / 1024;
      const limit = parseInt(res.data.storageQuota.limit) / 1024 / 1024 / 1024;
      console.log(`💾 Almacenamiento personal: ${used.toFixed(2)} GB / ${limit.toFixed(2)} GB`);
      console.log(`📊 Espacio disponible: ${(limit - used).toFixed(2)} GB`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error de conexión OAuth:', error.message);
    
    if (error.message.includes('invalid_grant')) {
      console.log('💡 El refresh_token puede haber expirado');
      console.log('🔧 Solución: Ejecuta npm run get-oauth-token para regenerar');
    }
    
    return false;
  }
}

/**
 * Obtener información del usuario autenticado
 */
async function getUserInfo() {
  try {
    const drive = createDriveClient();
    const res = await drive.about.get({
      fields: 'user(displayName, emailAddress), storageQuota(limit, usage)',
    });
    
    return {
      name: res.data.user.displayName,
      email: res.data.user.emailAddress,
      storageUsed: res.data.storageQuota ? parseInt(res.data.storageQuota.usage) : 0,
      storageLimit: res.data.storageQuota ? parseInt(res.data.storageQuota.limit) : 0,
    };
  } catch (error) {
    console.error('❌ Error obteniendo info del usuario:', error);
    throw error;
  }
}

module.exports = {
  createDriveClient,
  testOAuthConnection,
  getUserInfo,
  getOAuthClient
};
