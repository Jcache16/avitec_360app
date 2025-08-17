/**
 * 🔄 SCRIPT: Regenerar Token OAuth Expirado
 * 
 * Script simplificado para regenerar tokens OAuth cuando expiran
 * Actualiza automáticamente archivos locales y variables de entorno
 */

const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const path = require('path');

// Configuración
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const OAUTH_CREDENTIALS_PATH = path.join(__dirname, 'config/oauth-credentials.json');
const TOKEN_PATH = path.join(__dirname, 'config/oauth-tokens.json');

console.log('🔄 Regenerador de Token OAuth para Google Drive');
console.log('===========================================\n');

async function regenerateExpiredToken() {
  try {
    // Verificar que existe el archivo de credenciales OAuth
    if (!fs.existsSync(OAUTH_CREDENTIALS_PATH)) {
      console.error('❌ No se encontró el archivo de credenciales OAuth');
      console.log('📋 Necesitas el archivo config/oauth-credentials.json');
      console.log('💡 Si no lo tienes, ejecuta: npm run setup-oauth');
      return;
    }

    // Cargar credenciales OAuth
    const credentials = JSON.parse(fs.readFileSync(OAUTH_CREDENTIALS_PATH, 'utf8'));
    
    if (!credentials.installed) {
      console.error('❌ El archivo OAuth tiene formato incorrecto');
      return;
    }

    const { client_secret, client_id, redirect_uris } = credentials.installed;
    
    // Crear cliente OAuth2
    const oAuth2Client = new google.auth.OAuth2(
      client_id, 
      client_secret, 
      redirect_uris[0]
    );

    // Generar URL de autorización con prompt=consent para forzar nuevo refresh_token
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent' // IMPORTANTE: Fuerza generar nuevo refresh_token
    });

    console.log('🔑 PASO 1: Reautoriza la aplicación visitando esta URL:');
    console.log('🔗', authUrl);
    console.log('');
    console.log('📋 IMPORTANTE:');
    console.log('   • Usa la MISMA cuenta de Google que antes');
    console.log('   • Acepta TODOS los permisos');
    console.log('   • Esto generará un nuevo refresh_token permanente');
    console.log('');

    // Pedir código de autorización
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('🔑 PASO 2: Pega el código de autorización aquí: ', async (code) => {
      rl.close();

      try {
        console.log('\n🔄 Intercambiando código por nuevos tokens...');
        
        // Intercambiar código por tokens
        const { tokens } = await oAuth2Client.getToken(code);
        
        if (!tokens.refresh_token) {
          console.error('❌ No se obtuvo refresh_token');
          console.log('💡 Asegúrate de usar prompt=consent en la URL');
          return;
        }

        console.log('✅ ¡Nuevos tokens obtenidos exitosamente!');
        console.log('📊 Información de tokens:');
        console.log(`   🔑 Access Token: ${tokens.access_token ? 'Obtenido' : 'Falta'}`);
        console.log(`   🔄 Refresh Token: ${tokens.refresh_token ? 'Obtenido (NUEVO)' : 'Falta'}`);
        console.log(`   ⏰ Expira: ${new Date(tokens.expiry_date).toLocaleString()}`);

        // Guardar tokens localmente
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
        console.log(`\n💾 Tokens guardados localmente en: ${TOKEN_PATH}`);

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

        // Mostrar variable de entorno para producción
        console.log('\n🌐 PASO 3: Actualizar variable de entorno en producción');
        console.log('📋 Copia este valor para GOOGLE_OAUTH_TOKENS:');
        console.log('');
        console.log('```');
        console.log(JSON.stringify(tokens));
        console.log('```');
        console.log('');
        console.log('🚀 INSTRUCCIONES PARA RENDER/VERCEL:');
        console.log('   1. Ve a tu dashboard de hosting');
        console.log('   2. Encuentra la variable GOOGLE_OAUTH_TOKENS');
        console.log('   3. Reemplaza su valor con el JSON de arriba');
        console.log('   4. Redeploy la aplicación');
        console.log('');
        console.log('⚡ El nuevo token debería durar mucho más tiempo');

        console.log('\n🎉 ¡Regeneración completada!');
        console.log('📋 Próximos pasos:');
        console.log('   1. Actualiza la variable de entorno en producción');
        console.log('   2. Redeploy tu backend');
        console.log('   3. Las subidas deberían funcionar normalmente');
        
      } catch (error) {
        console.error('\n❌ Error obteniendo tokens:', error.message);
        console.log('\n💡 Posibles soluciones:');
        console.log('   1. Verifica que copiaste el código completo');
        console.log('   2. Asegúrate de que no hay espacios extra');
        console.log('   3. El código expira rápido, intenta de nuevo');
        console.log('   4. Usa la URL exacta generada por este script');
      }
    });

  } catch (error) {
    console.error('❌ Error en el proceso:', error.message);
  }
}

// Ejecutar
if (require.main === module) {
  console.log('⚠️  Token OAuth expirado detectado');
  console.log('🔄 Regenerando tokens automáticamente...\n');
  regenerateExpiredToken();
}

module.exports = { regenerateExpiredToken };
