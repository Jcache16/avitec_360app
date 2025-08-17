/**
 * Servicio alternativo de subidas resumables que evita la verificación problemática
 * Genera enlaces directamente basado en la respuesta de Google Drive
 */

interface ResumableSessionData {
  uploadUrl: string;
  fileName: string;
  folderId: string;
  date: string;
  fileSize: number;
  mimeType: string;
}

interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  status: 'uploading' | 'completed' | 'error';
}

interface UploadResult {
  success: boolean;
  data?: {
    fileId: string;
    fileName: string;
    date: string;
    folderId: string;
    links: {
      folder: string;
      view: string;
      download: string;
    };
    qrCode: {
      url: string;
      text: string;
    };
  };
  error?: string;
}

export class DirectResumableUploadService {
  private readonly CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  /**
   * Subir archivo evitando verificación problemática
   */
  async uploadFile(
    file: Blob,
    fileName: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    console.log('🚀 [Direct] Iniciando subida resumable directa (sin verificación)...');
    console.log(`📄 Archivo: ${fileName} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    try {
      // Paso 1: Crear sesión de subida resumable
      const sessionData = await this.createUploadSession(file, fileName);
      console.log('✅ [Direct] Sesión creada');
      
      // Paso 2: Subir archivo en chunks directamente a Google Drive
      const fileId = await this.performDirectUpload(
        sessionData.uploadUrl,
        file,
        onProgress
      );
      
      if (!fileId) {
        throw new Error('No se pudo obtener ID del archivo subido');
      }
      
      console.log('✅ [Direct] Archivo subido con ID:', fileId);
      
      // Paso 3: Generar enlaces directamente (SIN verificación backend)
      const result = this.generateDirectLinks(fileId, sessionData);
      
      console.log('🎉 [Direct] Subida completada exitosamente sin verificación');
      return result;
      
    } catch (error) {
      console.error('❌ [Direct] Error en subida:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido en subida'
      };
    }
  }

  /**
   * Crear sesión de subida resumable
   */
  private async createUploadSession(file: Blob, fileName: string): Promise<ResumableSessionData> {
    const response = await fetch('/api/upload/create-resumable-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName,
        fileSize: file.size,
        mimeType: file.type || 'video/mp4'
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error creando sesión de subida');
    }
    
    return data.data;
  }

  /**
   * Realizar subida directa y obtener fileId de la respuesta final
   */
  private async performDirectUpload(
    uploadUrl: string,
    file: Blob,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string | null> {
    const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);
    let uploadedBytes = 0;
    let fileId: string | null = null;
    
    console.log(`📤 [Direct] Subiendo ${totalChunks} chunks`);
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * this.CHUNK_SIZE;
      const end = Math.min(start + this.CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      
      const result = await this.uploadChunkWithRetry(
        uploadUrl,
        chunk,
        start,
        end - 1,
        file.size,
        chunkIndex,
        totalChunks
      );
      
      if (!result.success) {
        throw new Error(`Error subiendo chunk ${chunkIndex + 1}/${totalChunks}`);
      }
      
      // Si es el último chunk y obtuvimos fileId, guardarlo
      if (result.fileId) {
        fileId = result.fileId;
        console.log('✅ [Direct] File ID obtenido del último chunk:', fileId);
      }
      
      uploadedBytes = end;
      
      // Reportar progreso
      if (onProgress) {
        onProgress({
          uploadedBytes,
          totalBytes: file.size,
          percentage: Math.round((uploadedBytes / file.size) * 100),
          status: uploadedBytes === file.size ? 'completed' : 'uploading'
        });
      }
      
      console.log(`✅ [Direct] Chunk ${chunkIndex + 1}/${totalChunks} completado`);
    }
    
    return fileId;
  }

  /**
   * Subir un chunk individual con reintentos y capturar fileId
   */
  private async uploadChunkWithRetry(
    uploadUrl: string,
    chunk: Blob,
    startByte: number,
    endByte: number,
    totalSize: number,
    chunkIndex: number,
    _totalChunks: number // Prefijo con _ para indicar que no se usa
  ): Promise<{success: boolean, fileId?: string}> {
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const result = await this.uploadSingleChunk(
          uploadUrl,
          chunk,
          startByte,
          endByte,
          totalSize
        );
        
        if (result.success) {
          return result;
        }
        
        if (attempt === this.MAX_RETRIES) {
          throw new Error(`Chunk ${chunkIndex + 1} falló después de ${this.MAX_RETRIES} intentos`);
        }
        
        await this.sleep(this.RETRY_DELAY * attempt);
        console.log(`⚠️ [Direct] Reintentando chunk ${chunkIndex + 1}, intento ${attempt + 1}/${this.MAX_RETRIES}`);
        
      } catch (error) {
        console.warn(`⚠️ [Direct] Error en chunk ${chunkIndex + 1}, intento ${attempt}:`, error);
        
        if (attempt === this.MAX_RETRIES) {
          throw error;
        }
        
        await this.sleep(this.RETRY_DELAY * attempt);
      }
    }
    
    return { success: false };
  }

  /**
   * Subir un chunk individual y capturar fileId si es el último
   */
  private async uploadSingleChunk(
    uploadUrl: string,
    chunk: Blob,
    startByte: number,
    endByte: number,
    totalSize: number
  ): Promise<{success: boolean, fileId?: string}> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': chunk.type || 'video/mp4',
        'Content-Range': `bytes ${startByte}-${endByte}/${totalSize}`,
        'Content-Length': chunk.size.toString(),
      },
      body: chunk,
    });
    
    if (response.status === 200 || response.status === 201) {
      // Último chunk completado - extraer fileId de la respuesta
      try {
        const result = await response.json();
        console.log('🎉 [Direct] Subida completada, respuesta de Google:', result);
        return {
          success: true,
          fileId: result.id // Google Drive devuelve el ID en result.id
        };
      } catch (parseError) {
        console.warn('⚠️ [Direct] No se pudo parsear respuesta final:', parseError);
        return { success: true }; // Aún exitoso aunque no tengamos el ID
      }
    } else if (response.status === 308) {
      // Chunk aceptado, continuar
      return { success: true };
    } else {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
  }

  /**
   * Generar enlaces directamente sin verificación backend
   */
  private generateDirectLinks(fileId: string, sessionData: ResumableSessionData): UploadResult {
    const folderLink = `https://drive.google.com/drive/folders/${sessionData.folderId}`;
    const fileViewLink = `https://drive.google.com/file/d/${fileId}/view`;
    const fileDownloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
    
    return {
      success: true,
      data: {
        fileId,
        fileName: sessionData.fileName,
        date: sessionData.date,
        folderId: sessionData.folderId,
        links: {
          folder: folderLink,
          view: fileViewLink,
          download: fileDownloadLink
        },
        qrCode: {
          url: fileViewLink,
          text: `Video AVITEC 360 - ${sessionData.date}`
        }
      }
    };
  }

  /**
   * Utilidad para esperar
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instancia singleton
export const directResumableUploadService = new DirectResumableUploadService();
