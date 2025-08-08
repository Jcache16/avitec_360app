// backend/services/driveUtilsOAuth.js
const { createDriveClient } = require('./googleDriveOAuth');
const fs = require('fs');
const path = require('path');

// ID fijo de la carpeta raíz
const ROOT_FOLDER_NAME = 'AVITEC_360_VIDEOS';
let rootFolderId = null;

/**
 * Buscar o crear carpeta raíz AVITEC_360_VIDEOS usando OAuth
 */
async function ensureRootFolder() {
  if (rootFolderId) return rootFolderId;

  try {
    const drive = createDriveClient();
    console.log(`🔍 [OAuth] Buscando carpeta raíz: ${ROOT_FOLDER_NAME}`);
    
    const res = await drive.files.list({
      q: `name='${ROOT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    });

    if (res.data.files.length > 0) {
      rootFolderId = res.data.files[0].id;
      console.log(`✅ [OAuth] Carpeta raíz encontrada: ${rootFolderId}`);
    } else {
      console.log(`📁 [OAuth] Creando carpeta raíz: ${ROOT_FOLDER_NAME}`);
      
      const folder = await drive.files.create({
        resource: {
          name: ROOT_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
      
      rootFolderId = folder.data.id;
      console.log(`✅ [OAuth] Carpeta raíz creada: ${rootFolderId}`);
      
      // Hacer pública la carpeta raíz
      await drive.permissions.create({
        fileId: rootFolderId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
      
      console.log(`🌐 [OAuth] Carpeta raíz hecha pública`);
    }

    return rootFolderId;
  } catch (error) {
    console.error('❌ [OAuth] Error al gestionar carpeta raíz:', error);
    throw error;
  }
}

/**
 * Buscar o crear subcarpeta por fecha usando OAuth
 */
async function ensureDateFolder(date) {
  try {
    const drive = createDriveClient();
    const rootId = await ensureRootFolder();
    console.log(`🔍 [OAuth] Buscando carpeta para fecha: ${date}`);

    const res = await drive.files.list({
      q: `name='${date}' and '${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
    });

    if (res.data.files.length > 0) {
      const folderId = res.data.files[0].id;
      console.log(`✅ [OAuth] Carpeta de fecha encontrada: ${folderId}`);
      return folderId;
    }

    console.log(`📁 [OAuth] Creando carpeta para fecha: ${date}`);
    
    const folder = await drive.files.create({
      resource: {
        name: date,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [rootId],
      },
      fields: 'id',
    });

    const folderId = folder.data.id;
    console.log(`✅ [OAuth] Carpeta de fecha creada: ${folderId}`);

    // Hacer pública la carpeta de fecha
    await drive.permissions.create({
      fileId: folderId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    console.log(`🌐 [OAuth] Carpeta de fecha hecha pública`);
    return folderId;
    
  } catch (error) {
    console.error(`❌ [OAuth] Error al gestionar carpeta de fecha ${date}:`, error);
    throw error;
  }
}

/**
 * Subir archivo de video a Drive usando OAuth (con cuota personal)
 */
async function uploadVideoToDrive(localFilePath, fileName, folderId) {
  try {
    const drive = createDriveClient();
    console.log(`⬆️ [OAuth] Subiendo video: ${fileName} a carpeta: ${folderId}`);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`Archivo no encontrado: ${localFilePath}`);
    }
    
    const fileStats = fs.statSync(localFilePath);
    console.log(`📊 [OAuth] Tamaño del archivo: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: 'video/mp4',
      body: fs.createReadStream(localFilePath),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, size',
    });

    console.log(`✅ [OAuth] Video subido exitosamente: ${file.data.id}`);
    
    // Hacer público el archivo
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
    
    console.log(`🌐 [OAuth] Video hecho público: ${file.data.id}`);
    
    return file.data.id;
    
  } catch (error) {
    console.error(`❌ [OAuth] Error al subir video ${fileName}:`, error);
    
    // Dar más contexto sobre el error
    if (error.message.includes('quotaExceeded')) {
      console.error('💾 Error: Cuota de almacenamiento personal excedida');
      console.error('💡 Solución: Libera espacio en tu Google Drive personal');
    } else if (error.message.includes('authError') || error.message.includes('invalid_grant')) {
      console.error('🔐 Error: Token OAuth expirado o inválido');
      console.error('💡 Solución: Ejecuta npm run get-oauth-token para renovar');
    }
    
    throw error;
  }
}

/**
 * Obtener link público de la carpeta
 */
function getFolderPublicLink(folderId) {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

/**
 * Obtener link directo del archivo
 */
function getFilePublicLink(fileId) {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

/**
 * Obtener link de descarga directa del archivo
 */
function getFileDownloadLink(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Listar archivos en una carpeta de fecha
 */
async function listFilesInDateFolder(date) {
  try {
    const drive = createDriveClient();
    const folderId = await ensureDateFolder(date);
    
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, size, createdTime, mimeType)',
      orderBy: 'createdTime desc'
    });
    
    return res.data.files.map(file => ({
      id: file.id,
      name: file.name,
      size: parseInt(file.size) || 0,
      createdTime: file.createdTime,
      mimeType: file.mimeType,
      viewLink: getFilePublicLink(file.id),
      downloadLink: getFileDownloadLink(file.id)
    }));
    
  } catch (error) {
    console.error(`❌ [OAuth] Error listando archivos de fecha ${date}:`, error);
    throw error;
  }
}

module.exports = {
  ensureDateFolder,
  uploadVideoToDrive,
  getFolderPublicLink,
  getFilePublicLink,
  getFileDownloadLink,
  listFilesInDateFolder,
};
