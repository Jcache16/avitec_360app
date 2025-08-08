/**
 * 🔐 Script de Verificación OAuth para Google Drive
 * 
 * Este script verifica que la implementación OAuth esté funcionando correctamente
 * y muestra información útil para debugging
 */

require('dotenv').config();

const { testOAuthConnection, createDriveClient } = require('./services/googleDriveOAuth');

async function verificarOAuth() {
  console.log('🔐 VERIFICACIÓN OAUTH PARA GOOGLE DRIVE');
  console.log('=====================================\n');

  try {
    // Paso 1: Verificar archivos de credenciales
    console.log('📋 1. Verificando archivos de credenciales...');
    
    const fs = require('fs');
    const path = require('path');
    
    const credentialsFile = process.env.GOOGLE_OAUTH_CREDENTIALS_FILE || './config/oauth-credentials.json';
    const tokensFile = process.env.GOOGLE_OAUTH_TOKENS_FILE || './config/oauth-tokens.json';
    
    console.log(`   📁 Credenciales: ${credentialsFile}`);
    console.log(`   📁 Tokens: ${tokensFile}`);
    
    if (!fs.existsSync(credentialsFile)) {
      console.log('   ❌ Archivo de credenciales OAuth NO encontrado');
      console.log('   💡 Coloque el archivo JSON descargado de Google Cloud Console en esa ruta');
      process.exit(1);
    } else {
      console.log('   ✅ Archivo de credenciales OAuth encontrado');
    }
    
    if (!fs.existsSync(tokensFile)) {
      console.log('   ❌ Archivo de tokens OAuth NO encontrado');
      console.log('   💡 Ejecute: npm run get-oauth-token para generar los tokens');
      process.exit(1);
    } else {
      console.log('   ✅ Archivo de tokens OAuth encontrado');
      
      // Mostrar información de los tokens
      const tokens = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
      console.log('   📊 Información de tokens:');
      console.log(`      - Tipo: ${tokens.access_token ? 'access_token ✅' : 'access_token ❌'}`);
      console.log(`      - Refresh: ${tokens.refresh_token ? 'refresh_token ✅' : 'refresh_token ❌'}`);
      if (tokens.expiry_date) {
        const expiryDate = new Date(tokens.expiry_date);
        const isExpired = expiryDate < new Date();
        console.log(`      - Expira: ${expiryDate.toLocaleString()} ${isExpired ? '❌ EXPIRADO' : '✅'}`);
      }
    }

    console.log('\n📋 2. Probando conexión OAuth...');
    
    // Paso 2: Probar conexión OAuth
    const oauthResult = await testOAuthConnection();
    console.log('   ✅ Conexión OAuth exitosa');
    console.log(`   👤 Usuario: ${oauthResult.user}`);
    console.log(`   📧 Email: ${oauthResult.email}`);
    console.log(`   💾 Almacenamiento usado: ${oauthResult.storageQuota?.usage || 'N/A'}`);
    console.log(`   📊 Cuota total: ${oauthResult.storageQuota?.limit || 'N/A'}`);

    console.log('\n📋 3. Probando operaciones de Drive...');
    
    // Paso 3: Probar operaciones básicas
    const drive = createDriveClient();
    
    // Listar algunos archivos (máximo 5)
    console.log('   📁 Listando archivos recientes...');
    const listResult = await drive.files.list({
      pageSize: 5,
      fields: 'files(id, name, mimeType, createdTime)',
      orderBy: 'createdTime desc'
    });
    
    if (listResult.data.files && listResult.data.files.length > 0) {
      console.log('   ✅ Listado exitoso:');
      listResult.data.files.forEach((file, index) => {
        console.log(`      ${index + 1}. ${file.name} (${file.mimeType})`);
      });
    } else {
      console.log('   ⚠️ No se encontraron archivos (Drive vacío o sin acceso)');
    }

    // Buscar carpeta AVITEC
    console.log('\n   🔍 Buscando carpeta AVITEC_360_VIDEOS...');
    const folderSearch = await drive.files.list({
      q: "name='AVITEC_360_VIDEOS' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name, parents, createdTime)'
    });
    
    if (folderSearch.data.files && folderSearch.data.files.length > 0) {
      const folder = folderSearch.data.files[0];
      console.log('   ✅ Carpeta AVITEC encontrada:');
      console.log(`      - ID: ${folder.id}`);
      console.log(`      - Creada: ${new Date(folder.createdTime).toLocaleString()}`);
      console.log(`      - Enlace: https://drive.google.com/drive/folders/${folder.id}`);
    } else {
      console.log('   ℹ️ Carpeta AVITEC no existe (se creará automáticamente en la primera subida)');
    }

    console.log('\n📋 4. Verificando permisos de escritura...');
    
    // Paso 4: Verificar que podemos crear archivos
    try {
      const testFile = await drive.files.create({
        resource: {
          name: `test-oauth-${Date.now()}.txt`,
          parents: [] // Root folder
        },
        media: {
          mimeType: 'text/plain',
          body: 'Test OAuth file - puede eliminarse'
        },
        fields: 'id'
      });
      
      console.log('   ✅ Creación de archivos funcional');
      console.log(`   🗂️ Archivo test creado: ${testFile.data.id}`);
      
      // Eliminar archivo de prueba
      await drive.files.delete({ fileId: testFile.data.id });
      console.log('   🧹 Archivo test eliminado correctamente');
      
    } catch (createError) {
      console.log('   ❌ Error creando archivos:', createError.message);
      
      if (createError.message.includes('quotaExceeded')) {
        console.log('   💾 ❌ PROBLEMA: Cuota de almacenamiento excedida');
        console.log('   💡 SOLUCIÓN: Libere espacio en su Google Drive personal');
      } else if (createError.message.includes('forbidden')) {
        console.log('   🔐 ❌ PROBLEMA: Permisos insuficientes');
        console.log('   💡 SOLUCIÓN: Verifique los scopes en las credenciales OAuth');
      }
      
      throw createError;
    }

    console.log('\n🎉 VERIFICACIÓN COMPLETADA EXITOSAMENTE');
    console.log('=====================================');
    console.log('✅ OAuth configurado correctamente');
    console.log('✅ Google Drive accesible');
    console.log('✅ Permisos de escritura confirmados');
    console.log('✅ Listo para subir videos a Drive');
    console.log('\n💡 Para probar la subida completa, use: npm run test-upload');

  } catch (error) {
    console.error('\n❌ ERROR EN VERIFICACIÓN OAUTH');
    console.error('================================');
    console.error(`Error: ${error.message}`);
    
    if (error.message.includes('invalid_grant')) {
      console.error('\n🔐 PROBLEMA: Token OAuth expirado o inválido');
      console.error('💡 SOLUCIÓN: Ejecute npm run get-oauth-token para renovar');
    } else if (error.message.includes('ENOENT')) {
      console.error('\n📁 PROBLEMA: Archivo de configuración no encontrado');
      console.error('💡 SOLUCIÓN: Verifique las rutas de archivos en .env');
    } else if (error.message.includes('quotaExceeded')) {
      console.error('\n💾 PROBLEMA: Cuota de Google Drive excedida');
      console.error('💡 SOLUCIÓN: Libere espacio en su Drive personal');
    }
    
    console.error('\n📖 Para más ayuda, consulte: backend/config/README.md');
    process.exit(1);
  }
}

// Ejecutar verificación
if (require.main === module) {
  verificarOAuth();
}

module.exports = { verificarOAuth };
