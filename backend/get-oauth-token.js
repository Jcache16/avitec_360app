/**
 * 🔑 SCRIPT: Obtener refresh token para OAuth 2.0
 * 
 * Este script permite autorizar tu cuenta personal de Google Drive
 * para usar tu cuota personal en lugar de la Service Account
 * 
 * EJECUTAR SOLO UNA VEZ para obtener el refresh_token
 */

const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const path = require('path');

// Configuración
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const OAUTH_CREDENTIALS_PATH = path.join(__dirname, 'config/oauth-credentials.json');
const TOKEN_PATH = path.join(__dirname, 'config/oauth-tokens.json');

console.log('🔑 Generador de Token OAuth para Google Drive');
console.log('=========================================\n');

async function getRefreshToken() {
  try {
    // Verificar que existe el archivo de credenciales OAuth
    if (!fs.existsSync(OAUTH_CREDENTIALS_PATH)) {
      console.error('❌ No se encontró el archivo de credenciales OAuth');
      console.log('📋 Pasos para obtenerlo:');
      console.log('   1. Ve a Google Cloud Console > APIs & Services > Credentials');
      console.log('   2. Create Credentials > OAuth 2.0 Client IDs');
      console.log('   3. Application type: Desktop application');
      console.log('   4. Descarga el JSON y guárdalo como: config/oauth-credentials.json');
      return;
    }

    // Cargar credenciales OAuth
    const credentials = JSON.parse(fs.readFileSync(OAUTH_CREDENTIALS_PATH, 'utf8'));
    
    // Verificar estructura del archivo
    if (!credentials.installed) {
      console.error('❌ El archivo OAuth tiene formato incorrecto');
      console.log('💡 Asegúrate de descargar el tipo "Desktop application"');
      return;
    }

    const { client_secret, client_id, redirect_uris } = credentials.installed;
    
    // Crear cliente OAuth2
    const oAuth2Client = new google.auth.OAuth2(
      client_id, 
      client_secret, 
      redirect_uris[0]
    );

    // Generar URL de autorización
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline', // Necesario para obtener refresh_token
      scope: SCOPES,
      prompt: 'consent' // Fuerza mostrar pantalla de consentimiento
    });

    console.log('🌐 PASO 1: Autoriza la aplicación visitando esta URL:');
    console.log('');
    console.log(authUrl);
    console.log('');
    console.log('📋 INSTRUCCIONES:');
    console.log('   1. Abre la URL en tu navegador');
    console.log('   2. Inicia sesión con tu cuenta personal de Google');
    console.log('   3. Acepta los permisos');
    console.log('   4. Copia el código de autorización que aparece');
    console.log('');

    // Pedir código de autorización
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('🔑 PASO 2: Pega aquí el código de autorización: ', async (code) => {
      rl.close();

      try {
        // Intercambiar código por tokens
        const { tokens } = await oAuth2Client.getToken(code);
        
        console.log('\n✅ ¡Autorización exitosa!');
        console.log('📊 Tokens obtenidos:', {
          access_token: tokens.access_token ? '✅ Obtenido' : '❌ Falta',
          refresh_token: tokens.refresh_token ? '✅ Obtenido' : '❌ Falta',
          expiry_date: tokens.expiry_date ? new Date(tokens.expiry_date).toLocaleString() : 'N/A'
        });

        // Guardar tokens
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
        console.log(`\n💾 Tokens guardados en: ${TOKEN_PATH}`);

        // Verificar que funciona
        oAuth2Client.setCredentials(tokens);
        const drive = google.drive({ version: 'v3', auth: oAuth2Client });
        
        console.log('\n🔍 Verificando acceso a Google Drive...');
        const res = await drive.about.get({
          fields: 'user(displayName, emailAddress), storageQuota(limit, usage)',
        });

        console.log('✅ Verificación exitosa:');
        console.log(`   👤 Usuario: ${res.data.user.displayName}`);
        console.log(`   📧 Email: ${res.data.user.emailAddress}`);
        
        if (res.data.storageQuota) {
          const used = parseInt(res.data.storageQuota.usage) / 1024 / 1024 / 1024;
          const limit = parseInt(res.data.storageQuota.limit) / 1024 / 1024 / 1024;
          console.log(`   💾 Almacenamiento: ${used.toFixed(2)} GB / ${limit.toFixed(2)} GB`);
        }

        console.log('\n🎉 ¡Configuración OAuth completada!');
        console.log('📋 Próximos pasos:');
        console.log('   1. El backend usará automáticamente estos tokens');
        console.log('   2. Los videos se subirán usando tu cuota personal');
        console.log('   3. No necesitas hacer nada más');
        
      } catch (error) {
        console.error('\n❌ Error obteniendo tokens:', error.message);
        console.log('\n💡 Posibles soluciones:');
        console.log('   1. Verifica que copiaste el código completo');
        console.log('   2. Asegúrate de que no hay espacios extra');
        console.log('   3. El código expira rápido, intenta de nuevo');
      }
    });

  } catch (error) {
    console.error('❌ Error en el proceso:', error.message);
  }
}

// Función para verificar si ya hay tokens
function checkExistingTokens() {
  if (fs.existsSync(TOKEN_PATH)) {
    console.log('⚠️  Ya existe un archivo de tokens');
    console.log('📁 Ubicación:', TOKEN_PATH);
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('¿Quieres regenerar los tokens? (y/N): ', (answer) => {
      rl.close();
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        getRefreshToken();
      } else {
        console.log('✅ Manteniendo tokens existentes');
        console.log('💡 Si tienes problemas, ejecuta el script de nuevo y elige "y"');
      }
    });
  } else {
    getRefreshToken();
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  checkExistingTokens();
}

module.exports = { getRefreshToken };
