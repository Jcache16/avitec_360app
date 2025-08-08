/**
 * 🔧 SCRIPT: Extraer variables de entorno desde JSON
 * 
 * Este script lee el archivo JSON de credenciales y genera
 * las variables de entorno necesarias para el servidor de producción
 */

const fs = require('fs');
const path = require('path');

function extractEnvVars() {
  const credentialsPath = path.join(__dirname, 'config/avitec-360app-9e09c1bc408f.json');
  
  try {
    const credentialsData = fs.readFileSync(credentialsPath, 'utf8');
    const credentials = JSON.parse(credentialsData);
    
    console.log('🔐 Variables de entorno para el servidor de producción:');
    console.log('=====================================================\n');
    
    console.log('# Copia estas variables en tu servidor de producción');
    console.log('# (por ejemplo, en Heroku, Vercel, Railway, etc.)\n');
    
    console.log(`GOOGLE_PROJECT_ID="${credentials.project_id}"`);
    console.log(`GOOGLE_PRIVATE_KEY_ID="${credentials.private_key_id}"`);
    console.log(`GOOGLE_PRIVATE_KEY="${credentials.private_key.replace(/\n/g, '\\n')}"`);
    console.log(`GOOGLE_CLIENT_EMAIL="${credentials.client_email}"`);
    console.log(`GOOGLE_CLIENT_ID="${credentials.client_id}"`);
    console.log(`GOOGLE_CLIENT_X509_CERT_URL="${credentials.client_x509_cert_url}"`);
    
    console.log('\n# Variables adicionales opcionales');
    console.log('PORT=3000');
    console.log('GOOGLE_DRIVE_FOLDER_NAME=AVITEC_360_VIDEOS');
    console.log('GOOGLE_DRIVE_TIMEOUT=30000');
    
    console.log('\n📋 Instrucciones para diferentes plataformas:');
    console.log('===========================================');
    console.log('🔸 Heroku: heroku config:set GOOGLE_PROJECT_ID="valor"');
    console.log('🔸 Vercel: vercel env add GOOGLE_PROJECT_ID');
    console.log('🔸 Railway: railway variables set GOOGLE_PROJECT_ID="valor"');
    console.log('🔸 Render: Agregar en Environment Variables');
    console.log('🔸 AWS/DigitalOcean: Exportar en .bashrc o usar secrets manager');
    
    console.log('\n⚠️  IMPORTANTE:');
    console.log('- NUNCA subas estas variables al repositorio público');
    console.log('- Cada plataforma tiene su propia forma de configurar variables de entorno');
    console.log('- El GOOGLE_PRIVATE_KEY debe incluir \\n para los saltos de línea');
    
  } catch (error) {
    console.error('❌ Error leyendo credenciales:', error.message);
    console.log('\n💡 Soluciones:');
    console.log('1. Verifica que el archivo config/avitec-360app-9e09c1bc408f.json existe');
    console.log('2. Verifica que el archivo tiene formato JSON válido');
    console.log('3. Verifica permisos de lectura del archivo');
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  extractEnvVars();
}

module.exports = { extractEnvVars };
