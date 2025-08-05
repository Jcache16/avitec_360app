/**
 * 🧪 TEST DEL BACKEND AVITEC 360
 * 
 * Script de prueba para verificar que el backend funciona correctamente
 * antes del deploy en Render.com
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

// 🧪 Pruebas básicas
const runTests = async () => {
  console.log('🧪 Iniciando pruebas del backend Avitec 360...\n');

  try {
    // Test 1: Verificar que el servidor esté funcionando
    console.log('📡 Test 1: Conectividad del servidor');
    const healthResponse = await axios.get(`${SERVER_URL}/`);
    console.log('✅ Servidor respondiendo:', healthResponse.data.message);
    console.log('📋 Capacidades:', healthResponse.data.capabilities.join(', '));

    // Test 2: Verificar opciones disponibles
    console.log('\n🎨 Test 2: Opciones disponibles');
    const optionsResponse = await axios.get(`${SERVER_URL}/options`);
    console.log('✅ Música disponible:', optionsResponse.data.music.map(m => m.name).join(', '));
    console.log('✅ Fuentes disponibles:', optionsResponse.data.fonts.map(f => f.name).join(', '));

    // Test 3: Verificar estructura de directorios
    console.log('\n📁 Test 3: Estructura de directorios');
    const checkDir = (dirPath, name) => {
      if (fs.existsSync(dirPath)) {
        console.log(`✅ ${name}: ${dirPath}`);
        return true;
      } else {
        console.log(`❌ ${name}: ${dirPath} (no existe)`);
        return false;
      }
    };

    const requiredDirs = [
      [path.join(__dirname, 'uploads'), 'Directorio uploads'],
      [path.join(__dirname, 'processed'), 'Directorio processed'],
      [path.join(__dirname, 'assets'), 'Directorio assets'],
      [path.join(__dirname, 'assets', 'music'), 'Directorio música'],
      [path.join(__dirname, 'assets', 'fonts'), 'Directorio fuentes']
    ];

    const dirsOk = requiredDirs.every(([dir, name]) => checkDir(dir, name));

    // Test 4: Verificar archivos de assets
    console.log('\n🎵 Test 4: Archivos de música');
    const musicFiles = ['beggin.mp3', 'master_puppets.mp3', 'night_dancer.mp3'];
    const musicDir = path.join(__dirname, 'assets', 'music');
    
    musicFiles.forEach(file => {
      const filePath = path.join(musicDir, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`✅ ${file}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      } else {
        console.log(`❌ ${file}: No encontrado`);
      }
    });

    console.log('\n🔤 Test 5: Archivos de fuentes');
    const fontFiles = ['Montserrat-Regular.ttf', 'PlayfairDisplay-Regular.ttf', 'Chewy-Regular.ttf'];
    const fontsDir = path.join(__dirname, 'assets', 'fonts');
    
    fontFiles.forEach(file => {
      const filePath = path.join(fontsDir, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`✅ ${file}: ${(stats.size / 1024).toFixed(2)} KB`);
      } else {
        console.log(`❌ ${file}: No encontrado`);
      }
    });

    // Resumen final
    console.log('\n📊 RESUMEN DE PRUEBAS:');
    console.log('✅ Servidor funcionando correctamente');
    console.log('✅ API endpoints respondiendo');
    console.log(dirsOk ? '✅ Estructura de directorios correcta' : '❌ Faltan directorios');
    
    console.log('\n🚀 Backend listo para deploy en Render.com!');
    
  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Asegúrate de que el servidor esté ejecutándose con: npm start');
    }
    process.exit(1);
  }
};

// Ejecutar si es llamado directamente
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
