// backend/services/driveResumableUpload.js
const { google } = require('googleapis');
const { getOAuthClient } = require('./googleDriveOAuth');
const { ensureDateFolder, getFolderPublicLink } = require('./driveUtilsOAuth');

/**
 * Servicio para manejo de subidas resumables directas a Google Drive
 * El cliente sube directamente a Drive usando URLs proporcionadas por el backend
 */

/**
 * Crear una sesión de subida resumable y devolver la URL al cliente
 * @param {string} fileName - Nombre del archivo
 * @param {number} fileSize - Tamaño del archivo en bytes
 * @param {string} mimeType - Tipo MIME del archivo
 * @returns {Promise<{uploadUrl: string, folderId: string, date: string}>}
 */
async function createResumableUploadSession(fileName, fileSize, mimeType = 'video/mp4') {
  try {
    console.log('🚀 [Resumable] Creando sesión de subida resumable...');
    console.log(`📄 Archivo: ${fileName} (${(fileSize/1024/1024).toFixed(2)} MB)`);
    
    const auth = getOAuthClient();
    
    // Crear/obtener carpeta de fecha
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const dateFolderId = await ensureDateFolder(today);
    console.log(`📁 [Resumable] Carpeta de fecha: ${dateFolderId}`);
    
    // Generar nombre único con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uniqueFileName = `AVITEC_360_${timestamp}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    // Configuración de metadatos del archivo
    const fileMetadata = {
      name: uniqueFileName,
      parents: [dateFolderId],
      description: `Video AVITEC 360 - ${today} - Subida resumable directa`
    };
    
    // Crear sesión de subida resumable usando fetch directamente a Google Drive API
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${auth.credentials.access_token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': fileSize.toString(),
      },
      body: JSON.stringify(fileMetadata),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error creando sesión resumable: ${response.status} ${errorText}`);
    }
    
    // Obtener la URL de subida desde los headers
    const uploadUrl = response.headers.get('location');
    
    if (!uploadUrl) {
      throw new Error('No se pudo obtener URL de subida resumable de Google Drive');
    }
    
    console.log('✅ [Resumable] Sesión creada exitosamente');
    console.log(`🔗 [Resumable] Upload URL generada: ${uploadUrl.substring(0, 100)}...`);
    
    return {
      uploadUrl,
      fileName: uniqueFileName,
      folderId: dateFolderId,
      date: today,
      fileSize,
      mimeType
    };
    
  } catch (error) {
    console.error('❌ [Resumable] Error creando sesión:', error);
    throw error;
  }
}

/**
 * Verificar el estado de una subida resumable
 * @param {string} uploadUrl - URL de la sesión de subida
 * @returns {Promise<{status: string, uploadedBytes?: number, fileId?: string}>}
 */
async function checkUploadStatus(uploadUrl) {
  try {
    console.log('🔍 [Resumable] Verificando estado de subida...');
    
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': 'bytes */*', // Query status request
      }
    });
    
    console.log(`📊 [Resumable] Status de verificación: ${response.status}`);
    
    if (response.status === 200 || response.status === 201) {
      // Subida completada
      const result = await response.json();
      console.log('✅ [Resumable] Subida completada');
      return {
        status: 'completed',
        fileId: result.id
      };
    } else if (response.status === 308) {
      // Subida incompleta - obtener bytes subidos
      const range = response.headers.get('Range');
      let uploadedBytes = 0;
      
      if (range) {
        const match = range.match(/bytes=0-(\d+)/);
        if (match) {
          uploadedBytes = parseInt(match[1]) + 1;
        }
      }
      
      console.log(`📊 [Resumable] Subida incompleta: ${uploadedBytes} bytes`);
      return {
        status: 'incomplete',
        uploadedBytes
      };
    } else if (response.status === 404 || response.status === 410) {
      // URL de sesión expirada/inválida - probablemente la subida ya terminó
      console.log('⚠️ [Resumable] URL de sesión expirada - buscando archivo por nombre...');
      
      // Intentar buscar el archivo recién subido por nombre
      return {
        status: 'session_expired',
        message: 'Sesión expirada pero archivo probablemente subido'
      };
    } else {
      // Otro error
      const errorText = await response.text();
      console.warn(`⚠️ [Resumable] Error verificando estado: ${response.status} - ${errorText}`);
      
      return {
        status: 'error',
        error: `Error ${response.status}: ${errorText}`
      };
    }
    
  } catch (error) {
    console.error('❌ [Resumable] Error verificando estado:', error);
    
    // Si hay error de red, asumir que la subida se completó
    // (común cuando la URL de sesión expira después de subida exitosa)
    return {
      status: 'network_error',
      message: 'Error de red - archivo probablemente subido'
    };
  }
}

/**
 * Buscar archivo recién subido cuando la sesión expira
 * @param {string} fileName - Nombre del archivo a buscar
 * @param {string} folderId - ID de la carpeta donde buscar
 * @returns {Promise<string|null>} ID del archivo encontrado o null
 */
async function findRecentUploadedFile(fileName, folderId) {
  try {
    console.log(`🔍 [Resumable] Buscando archivo recién subido: ${fileName}`);
    
    const auth = getOAuthClient();
    const drive = google.drive({ version: 'v3', auth });
    
    // Buscar archivos en la carpeta con nombre similar
    const response = await drive.files.list({
      q: `'${folderId}' in parents and name contains 'AVITEC_360_' and trashed=false`,
      orderBy: 'createdTime desc', // Más recientes primero
      pageSize: 10,
      fields: 'files(id, name, createdTime, size)'
    });
    
    const files = response.data.files || [];
    console.log(`📋 [Resumable] Encontrados ${files.length} archivos recientes`);
    
    // Buscar archivo con nombre exacto o similar timestamp
    const targetFile = files.find(file => {
      // Extraer timestamp del nombre
      const match = fileName.match(/AVITEC_360_([^_]+)_/);
      if (match) {
        const timestamp = match[1];
        return file.name.includes(timestamp);
      }
      return file.name === fileName;
    });
    
    if (targetFile) {
      console.log(`✅ [Resumable] Archivo encontrado: ${targetFile.name} (${targetFile.id})`);
      return targetFile.id;
    } else {
      console.log('❌ [Resumable] No se encontró el archivo');
      return null;
    }
    
  } catch (error) {
    console.error('❌ [Resumable] Error buscando archivo:', error);
    return null;
  }
}

/**
 * Generar enlaces después de completar la subida
 * @param {string} fileId - ID del archivo en Drive
 * @param {string} folderId - ID de la carpeta
 * @param {string} fileName - Nombre del archivo
 * @param {string} date - Fecha (YYYY-MM-DD)
 * @returns {Object} Enlaces generados
 */
function generateUploadLinks(fileId, folderId, fileName, date) {
  const folderLink = getFolderPublicLink(folderId);
  const fileViewLink = `https://drive.google.com/file/d/${fileId}/view`;
  const fileDownloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
  
  return {
    fileId,
    fileName,
    date,
    folderId,
    links: {
      folder: folderLink,
      view: fileViewLink,
      download: fileDownloadLink
    },
    qrCode: {
      url: fileViewLink,
      text: `Video AVITEC 360 - ${date}`
    }
  };
}

module.exports = {
  createResumableUploadSession,
  checkUploadStatus,
  findRecentUploadedFile,
  generateUploadLinks
};
