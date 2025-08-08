#!/usr/bin/env node

/**
 * Script para extraer variables de entorno OAuth desde archivos JSON
 * Para configurar fácilmente en Render
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Extractor de Variables OAuth para Render\n');

try {
  // Rutas de los archivos
  const credentialsPath = path.join(__dirname, 'config', 'oauth-credentials.json');
  const tokensPath = path.join(__dirname, 'config', 'oauth-tokens.json');
  
  console.log('📂 Leyendo archivos OAuth...');
  
  // Verificar que los archivos existen
  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`❌ No se encontró: ${credentialsPath}`);
  }
  
  if (!fs.existsSync(tokensPath)) {
    throw new Error(`❌ No se encontró: ${tokensPath}`);
  }
  
  // Leer y validar archivos
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
  
  console.log('✅ Archivos OAuth leídos correctamente\n');
  
  // Generar variables de entorno
  console.log('🌐 VARIABLES DE ENTORNO PARA RENDER:');
  console.log('=' * 50);
  console.log('\n1️⃣ GOOGLE_OAUTH_CREDENTIALS:');
  console.log(JSON.stringify(credentials));
  
  console.log('\n2️⃣ GOOGLE_OAUTH_TOKENS:');
  console.log(JSON.stringify(tokens));
  
  console.log('\n' + '=' * 50);
  console.log('📋 INSTRUCCIONES:');
  console.log('1. Ve a tu dashboard de Render');
  console.log('2. Selecciona tu servicio backend');
  console.log('3. Ve a Environment Variables');
  console.log('4. Agrega estas dos variables exactamente como aparecen arriba');
  console.log('5. Redeploy el servicio');
  
  console.log('\n⚠️  IMPORTANTE:');
  console.log('- Copia el JSON COMPLETO, incluyendo las llaves {}');
  console.log('- NO agregues espacios adicionales');
  console.log('- Asegúrate de que no haya saltos de línea');
  
  // Verificar información del usuario
  if (credentials.installed) {
    console.log('\n🔐 INFORMACIÓN DE LA APP:');
    console.log(`Client ID: ${credentials.installed.client_id}`);
    console.log(`Project ID: ${credentials.installed.project_id}`);
  }
  
  if (tokens.expiry_date) {
    const expiryDate = new Date(tokens.expiry_date);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    
    console.log('\n⏰ INFORMACIÓN DE TOKENS:');
    console.log(`Token expira: ${expiryDate.toLocaleString()}`);
    console.log(`Días restantes: ${daysUntilExpiry}`);
    
    if (daysUntilExpiry < 7) {
      console.log('⚠️  ADVERTENCIA: El token expira pronto, considera regenerarlo');
    }
  }
  
  console.log('\n✅ Extracción completada');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n💡 Soluciones posibles:');
  console.log('1. Verifica que los archivos oauth-credentials.json y oauth-tokens.json existan');
  console.log('2. Ejecuta: npm run get-oauth-token (si no tienes tokens)');
  console.log('3. Verifica que los archivos JSON sean válidos');
  process.exit(1);
}
