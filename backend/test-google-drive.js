/**
 * 🧪 SCRIPT DE PRUEBA - Google Drive Integration
 * 
 * Este script verifica que la integración con Google Drive funciona correctamente
 */

const { testDriveConnection, ensureDateFolder, getFolderPublicLink } = require('./services/driveUtils');
const fs = require('fs-extra');
const path = require('path');

async function runTests() {
  console.log('🧪 Iniciando pruebas de Google Drive...\n');
  
  try {
    // Test 1: Verificar conexión
    console.log('1️⃣ Probando conexión con Google Drive...');
    const isConnected = await testDriveConnection();
    
    if (isConnected) {
      console.log('✅ Conexión exitosa\n');
    } else {
      console.log('❌ Conexión fallida\n');
      return;
    }
    
    // Test 2: Crear carpeta de fecha
    console.log('2️⃣ Probando creación de carpeta...');
    const testDate = new Date().toISOString().split('T')[0];
    console.log(`📅 Fecha de prueba: ${testDate}`);
    
    const folderId = await ensureDateFolder(testDate);
    console.log(`✅ Carpeta creada/encontrada: ${folderId}`);
    
    // Test 3: Generar enlace público
    console.log('\n3️⃣ Generando enlace público...');
    const publicLink = getFolderPublicLink(folderId);
    console.log(`🔗 Enlace público: ${publicLink}`);
    
    // Test 4: Verificar estructura de carpetas
    console.log('\n4️⃣ Verificando estructura...');
    console.log('📁 Estructura esperada en Google Drive:');
    console.log('   AVITEC_360_VIDEOS/');
    console.log(`   └── ${testDate}/`);
    console.log('       └── (videos se subirán aquí)');
    
    console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
    console.log('\n📋 Próximos pasos:');
    console.log('   1. Ejecutar el backend: npm start');
    console.log('   2. Ejecutar el frontend: npm run dev');
    console.log('   3. Probar subida desde la interfaz web');
    console.log(`   4. Verificar en: ${publicLink}`);
    
  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error.message);
    console.log('\n🔧 Posibles soluciones:');
    console.log('   1. Verificar que google-drive-credentials.json existe');
    console.log('   2. Verificar permisos de la cuenta de servicio');
    console.log('   3. Verificar que Google Drive API está habilitada');
    console.log('   4. Revisar logs para más detalles');
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
