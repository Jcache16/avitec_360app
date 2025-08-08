// backend/routes/upload-oauth.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ensureDateFolder, uploadVideoToDrive, getFolderPublicLink } = require('../services/driveUtilsOAuth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${sanitizedName}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB límite
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de video'), false);
    }
  }
});

/**
 * Endpoint para subir video usando OAuth (cuota personal)
 */
router.post('/video-oauth', upload.single('video'), async (req, res) => {
  console.log('\n🚀 [OAuth Upload] Iniciando subida de video...');
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó archivo de video'
      });
    }

    const { originalname, filename, path: localPath, size } = req.file;
    console.log(`📄 [OAuth Upload] Archivo recibido: ${originalname} (${(size/1024/1024).toFixed(2)} MB)`);

    // Crear nombre único con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uniqueFileName = `AVITEC_360_${timestamp}_${originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    // Obtener fecha actual para organización
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    console.log(`📁 [OAuth Upload] Organizando en carpeta: ${today}`);
    console.log(`🏷️ [OAuth Upload] Nombre único: ${uniqueFileName}`);

    // Crear/obtener carpeta de fecha
    const dateFolderId = await ensureDateFolder(today);
    console.log(`✅ [OAuth Upload] Carpeta de fecha lista: ${dateFolderId}`);

    // Subir video a Drive usando OAuth
    const fileId = await uploadVideoToDrive(localPath, uniqueFileName, dateFolderId);
    console.log(`✅ [OAuth Upload] Video subido a Drive: ${fileId}`);

    // Generar enlaces
    const folderLink = getFolderPublicLink(dateFolderId);
    const fileViewLink = `https://drive.google.com/file/d/${fileId}/view`;
    const fileDownloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`;

    // Limpiar archivo temporal
    try {
      fs.unlinkSync(localPath);
      console.log(`🗑️ [OAuth Upload] Archivo temporal eliminado`);
    } catch (cleanupError) {
      console.warn(`⚠️ [OAuth Upload] No se pudo eliminar archivo temporal:`, cleanupError.message);
    }

    const response = {
      success: true,
      message: 'Video subido exitosamente usando OAuth',
      data: {
        fileId,
        fileName: uniqueFileName,
        originalName: originalname,
        size,
        date: today,
        folderId: dateFolderId,
        links: {
          folder: folderLink,
          view: fileViewLink,
          download: fileDownloadLink
        },
        qrCode: {
          // El QR code apuntará a la vista del archivo
          url: fileViewLink,
          text: `Video AVITEC 360 - ${today}`
        }
      }
    };

    console.log(`🎉 [OAuth Upload] Proceso completado exitosamente`);
    console.log(`🔗 [OAuth Upload] Enlaces generados:`);
    console.log(`   📁 Carpeta: ${folderLink}`);
    console.log(`   👁️ Ver: ${fileViewLink}`);
    console.log(`   ⬇️ Descargar: ${fileDownloadLink}`);

    res.json(response);

  } catch (error) {
    console.error('❌ [OAuth Upload] Error durante la subida:', error);

    // Limpiar archivo temporal en caso de error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ [OAuth Upload] No se pudo limpiar archivo temporal:', cleanupError.message);
      }
    }

    // Respuesta de error detallada
    let errorMessage = 'Error interno del servidor';
    let statusCode = 500;

    if (error.message.includes('quotaExceeded')) {
      errorMessage = 'Cuota de almacenamiento personal de Google Drive excedida';
      statusCode = 507; // Insufficient Storage
    } else if (error.message.includes('authError') || error.message.includes('invalid_grant')) {
      errorMessage = 'Token OAuth expirado. Contacte al administrador para renovar la autorización';
      statusCode = 401; // Unauthorized
    } else if (error.message.includes('No se proporcionó archivo')) {
      errorMessage = error.message;
      statusCode = 400; // Bad Request
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Endpoint de prueba OAuth
 */
router.get('/test-oauth', async (req, res) => {
  try {
    const { testOAuthConnection } = require('../services/googleDriveOAuth');
    const result = await testOAuthConnection();
    
    res.json({
      success: true,
      message: 'Conexión OAuth funcionando correctamente',
      data: result
    });
    
  } catch (error) {
    console.error('❌ [Test OAuth] Error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error al probar conexión OAuth',
      details: error.message
    });
  }
});

module.exports = router;
