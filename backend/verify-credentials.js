/**
 * 🔍 SCRIPT: Verificar coincidencia entre .env y JSON
 * 
 * Este script compara los datos del archivo .env con el archivo JSON
 * para asegurar que las credenciales coinciden exactamente
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

function verifyCredentials() {
  console.log('🔍 Verificando coincidencia entre .env y JSON de credenciales...\n');
  
  try {
    // Leer archivo JSON
    const jsonPath = path.join(__dirname, 'config/avitec-360app-9e09c1bc408f.json');
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    // Comparar cada campo
    const comparisons = [
      {
        field: 'project_id',
        json: jsonData.project_id,
        env: process.env.GOOGLE_PROJECT_ID?.replace(/"/g, ''), // Remover comillas si las hay
        required: true
      },
      {
        field: 'private_key_id',
        json: jsonData.private_key_id,
        env: process.env.GOOGLE_PRIVATE_KEY_ID?.replace(/"/g, ''),
        required: true
      },
      {
        field: 'private_key',
        json: jsonData.private_key,
        env: process.env.GOOGLE_PRIVATE_KEY?.replace(/"/g, '').replace(/\\n/g, '\n'), // Convertir \n a saltos reales
        required: true
      },
      {
        field: 'client_email',
        json: jsonData.client_email,
        env: process.env.GOOGLE_CLIENT_EMAIL?.replace(/"/g, ''),
        required: true
      },
      {
        field: 'client_id',
        json: jsonData.client_id,
        env: process.env.GOOGLE_CLIENT_ID?.replace(/"/g, ''),
        required: true
      },
      {
        field: 'client_x509_cert_url',
        json: jsonData.client_x509_cert_url,
        env: process.env.GOOGLE_CLIENT_X509_CERT_URL?.replace(/"/g, ''),
        required: false
      }
    ];
    
    let allMatch = true;
    let criticalErrors = 0;
    
    comparisons.forEach(comp => {
      const matches = comp.json === comp.env;
      const status = matches ? '✅' : '❌';
      const importance = comp.required ? '[CRÍTICO]' : '[OPCIONAL]';
      
      console.log(`${status} ${importance} ${comp.field}`);
      
      if (!matches) {
        allMatch = false;
        if (comp.required) {
          criticalErrors++;
          console.log(`   JSON: ${comp.json?.substring(0, 50)}${comp.json?.length > 50 ? '...' : ''}`);
          console.log(`   ENV:  ${comp.env?.substring(0, 50)}${comp.env?.length > 50 ? '...' : ''}`);
        }
      }
      
      console.log('');
    });
    
    // Verificar campos adicionales del .env
    console.log('📋 Variables adicionales del .env:');
    console.log(`   PORT: ${process.env.PORT || 'no configurado'}`);
    console.log(`   GOOGLE_DRIVE_FOLDER_NAME: ${process.env.GOOGLE_DRIVE_FOLDER_NAME || 'no configurado'}`);
    console.log(`   GOOGLE_DRIVE_TIMEOUT: ${process.env.GOOGLE_DRIVE_TIMEOUT || 'no configurado'}`);
    
    // Resultado final
    console.log('\n' + '='.repeat(60));
    
    if (allMatch) {
      console.log('🎉 ¡PERFECTO! Todos los campos críticos coinciden exactamente.');
      console.log('✅ El archivo .env está listo para subir al servidor de producción.');
    } else if (criticalErrors === 0) {
      console.log('✅ Los campos críticos coinciden.');
      console.log('⚠️  Algunos campos opcionales no coinciden, pero no afecta la funcionalidad.');
    } else {
      console.log('❌ ERROR: Hay campos críticos que no coinciden.');
      console.log(`   Campos con problemas: ${criticalErrors}`);
      console.log('🔧 Revisa el archivo .env y corrige los valores marcados como [CRÍTICO].');
    }
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message);
    
    if (error.code === 'ENOENT') {
      console.log('\n💡 Archivos necesarios:');
      console.log('   - config/avitec-360app-9e09c1bc408f.json');
      console.log('   - .env');
    }
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  verifyCredentials();
}

module.exports = { verifyCredentials };
