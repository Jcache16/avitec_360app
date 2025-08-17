// backend/routes/upload-oauth.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');
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

/**
 * Carga por CHUNKS para evitar límites de payload en plataformas serverless
 * Cliente envía pequeños binarios a /video-oauth-chunk con headers de control.
 */
router.post('/video-oauth-chunk',
  // Aceptar cuerpo binario crudo (hasta 10MB por chunk)
  express.raw({ type: '*/*', limit: '10mb' }),
  async (req, res) => {
    console.log('\n🚀 [OAuth Upload CHUNK] Recibiendo chunk...');
    try {
      const headers = req.headers;
      const uploadId = String(headers['x-upload-id'] || '').trim();
      const chunkIndex = parseInt(String(headers['x-chunk-index'] || '0'));
      const chunkTotal = parseInt(String(headers['x-chunk-total'] || '1'));
      const fileName = String(headers['x-file-name'] || 'video.mp4');
      const fileSize = parseInt(String(headers['x-file-size'] || '0'));
      const mime = String(headers['x-file-mime'] || 'video/mp4');
      const chunkSize = parseInt(String(headers['x-chunk-size'] || '0'));

      if (!uploadId) {
        return res.status(400).json({ success: false, error: 'Falta x-upload-id' });
      }
      if (!Number.isFinite(chunkIndex) || !Number.isFinite(chunkTotal) || chunkIndex < 0 || chunkTotal <= 0) {
        return res.status(400).json({ success: false, error: 'Metadatos de chunk inválidos' });
      }
      if (!req.body || !(req.body instanceof Buffer)) {
        return res.status(400).json({ success: false, error: 'Cuerpo del chunk inválido' });
      }

      const chunksDir = path.join(__dirname, '..', 'uploads', 'chunks', uploadId);
      fsExtra.ensureDirSync(chunksDir);

      const partPath = path.join(chunksDir, `part_${chunkIndex}`);

      // Si el chunk ya existe con el mismo tamaño, asumir recibido (permite reintentos)
      if (fs.existsSync(partPath)) {
        try {
          const st = fs.statSync(partPath);
          if (!isNaN(chunkSize) && st.size === chunkSize) {
            console.log(`ℹ️ [Chunk ${chunkIndex}] Ya existía, se omite reescritura`);
          } else {
            fs.writeFileSync(partPath, req.body);
            console.log(`✏️ [Chunk ${chunkIndex}] Reescrito con tamaño distinto`);
          }
        } catch (e) {
          fs.writeFileSync(partPath, req.body);
        }
      } else {
        fs.writeFileSync(partPath, req.body);
        console.log(`✅ [Chunk ${chunkIndex}] Guardado (${req.body.length} bytes)`);
      }

      // Comprobar si ya están todos los chunks
      const files = fs.readdirSync(chunksDir).filter(f => f.startsWith('part_'));
      const count = files.length;
      console.log(`📊 [Chunks] ${count}/${chunkTotal} recibidos (uploadId=${uploadId})`);

      if (count < chunkTotal) {
        return res.json({ success: true, received: true, partial: true, uploadId, chunkIndex });
      }

      // Ensamblar en el orden correcto
      const sortedParts = Array.from({ length: chunkTotal }, (_, i) => path.join(chunksDir, `part_${i}`));
      for (const p of sortedParts) {
        if (!fs.existsSync(p)) {
          console.error('❌ Falta chunk esperado:', p);
          return res.status(400).json({ success: false, error: 'Faltan chunks para ensamblar' });
        }
      }

      const uploadsDir = path.join(__dirname, '..', 'uploads');
      fsExtra.ensureDirSync(uploadsDir);

      const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const ext = path.extname(safeName) || '.mp4';
      const assembledPath = path.join(uploadsDir, `${uploadId}${ext}`);

      const writeStream = fs.createWriteStream(assembledPath);
      for (let i = 0; i < chunkTotal; i++) {
        const part = sortedParts[i];
        const data = fs.readFileSync(part);
        writeStream.write(data);
      }
      writeStream.end();

      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      const assembledStats = fs.statSync(assembledPath);
      console.log(`🧩 Ensamblado completo: ${(assembledStats.size / 1024 / 1024).toFixed(2)} MB (esperado ${(fileSize/1024/1024).toFixed(2)} MB)`);

      // Subir a Drive
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const today = new Date().toISOString().split('T')[0];
      const uniqueFileName = `AVITEC_360_${timestamp}_${safeName}`;

      const dateFolderId = await ensureDateFolder(today);
      const fileId = await uploadVideoToDrive(assembledPath, uniqueFileName, dateFolderId);

      const folderLink = getFolderPublicLink(dateFolderId);
      const fileViewLink = `https://drive.google.com/file/d/${fileId}/view`;
      const fileDownloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`;

      // Limpieza: borrar ensamblado y partes
      try {
        fs.unlinkSync(assembledPath);
      } catch {}
      try {
        fsExtra.removeSync(chunksDir);
      } catch {}

      return res.json({
        success: true,
        message: 'Video subido exitosamente usando OAuth (chunks)',
        data: {
          fileId,
          fileName: uniqueFileName,
          originalName: safeName,
          size: assembledStats.size,
          date: today,
          folderId: dateFolderId,
          links: {
            folder: folderLink,
            view: fileViewLink,
            download: fileDownloadLink
          },
          qrCode: {
            url: fileViewLink,
            text: `Video AVITEC 360 - ${today}`
          }
        }
      });

    } catch (error) {
      console.error('❌ [OAuth Upload CHUNK] Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Error procesando chunk' });
    }
  }
);
