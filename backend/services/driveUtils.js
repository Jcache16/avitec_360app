// backend/services/driveUtils.js
const drive = require('./googleDrive');
const fs = require('fs');
const path = require('path');

// ID fijo de la carpeta raíz
const ROOT_FOLDER_NAME = 'AVITEC_360_VIDEOS';
let rootFolderId = null;

/**
 * Buscar o crear carpeta raíz AVITEC_360_VIDEOS
 */
async function ensureRootFolder() {
  if (rootFolderId) return rootFolderId;

  try {
    console.log(`🔍 Buscando carpeta raíz: ${ROOT_FOLDER_NAME}`);
    
    const res = await drive.files.list({
      q: `name='${ROOT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    });

    if (res.data.files.length > 0) {
      rootFolderId = res.data.files[0].id;
      console.log(`✅ Carpeta raíz encontrada: ${rootFolderId}`);
    } else {
      console.log(`📁 Creando carpeta raíz: ${ROOT_FOLDER_NAME}`);
      
      const folder = await drive.files.create({
        resource: {
          name: ROOT_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
      
      rootFolderId = folder.data.id;
      console.log(`✅ Carpeta raíz creada: ${rootFolderId}`);
      
      // Hacer pública la carpeta raíz
      await drive.permissions.create({
        fileId: rootFolderId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
      
      console.log(`🌐 Carpeta raíz hecha pública`);
    }

    return rootFolderId;
  } catch (error) {
    console.error('❌ Error al gestionar carpeta raíz:', error);
    throw error;
  }
}

/**
 * Buscar o crear subcarpeta por fecha (formato: YYYY-MM-DD)
 */
async function ensureDateFolder(date) {
  try {
    const rootId = await ensureRootFolder();
    console.log(`🔍 Buscando carpeta para fecha: ${date}`);

    const res = await drive.files.list({
      q: `name='${date}' and '${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
    });

    if (res.data.files.length > 0) {
      const folderId = res.data.files[0].id;
      console.log(`✅ Carpeta de fecha encontrada: ${folderId}`);
      return folderId;
    }

    console.log(`📁 Creando carpeta para fecha: ${date}`);
    
    const folder = await drive.files.create({
      resource: {
        name: date,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [rootId],
      },
      fields: 'id',
    });

    const folderId = folder.data.id;
    console.log(`✅ Carpeta de fecha creada: ${folderId}`);

    // Hacer pública la carpeta de fecha
    await drive.permissions.create({
      fileId: folderId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    console.log(`🌐 Carpeta de fecha hecha pública`);
    return folderId;
    
  } catch (error) {
    console.error(`❌ Error al gestionar carpeta de fecha ${date}:`, error);
    throw error;
  }
}

/**
 * Subir archivo de video a Drive
 */
async function uploadVideoToDrive(localFilePath, fileName, folderId) {
  try {
    console.log(`⬆️ Subiendo video: ${fileName} a carpeta: ${folderId}`);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`Archivo no encontrado: ${localFilePath}`);
    }
    
    const fileStats = fs.statSync(localFilePath);
    console.log(`📊 Tamaño del archivo: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

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

    console.log(`✅ Video subido exitosamente: ${file.data.id}`);
    return file.data.id;
    
  } catch (error) {
    console.error(`❌ Error al subir video ${fileName}:`, error);
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
 * Verificar conexión con Google Drive
 */
async function testDriveConnection() {
  try {
    console.log('🔍 Verificando conexión con Google Drive...');
    
    const res = await drive.about.get({
      fields: 'user(displayName, emailAddress), storageQuota(limit, usage)',
    });
    
    console.log('✅ Conexión exitosa con Google Drive');
    console.log('👤 Usuario:', res.data.user.displayName, res.data.user.emailAddress);
    
    if (res.data.storageQuota) {
      const used = parseInt(res.data.storageQuota.usage) / 1024 / 1024 / 1024;
      const limit = parseInt(res.data.storageQuota.limit) / 1024 / 1024 / 1024;
      console.log(`💾 Almacenamiento: ${used.toFixed(2)} GB / ${limit.toFixed(2)} GB`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error de conexión con Google Drive:', error);
    return false;
  }
}

module.exports = {
  ensureDateFolder,
  uploadVideoToDrive,
  getFolderPublicLink,
  getFilePublicLink,
  testDriveConnection,
};
