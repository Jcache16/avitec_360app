/**
 * Servicio para subidas resumables directas a Google Drive
 * Utiliza sesiones generadas por el backend y sube directamente al API de Drive
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

export class ResumableUploadService {
  private readonly CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks (Google recomienda múltiplos de 256KB)
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 segundo base

  /**
   * Subir archivo usando subida resumable directa a Google Drive
   */
  async uploadFile(
    file: Blob,
    fileName: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    console.log('🚀 [Resumable] Iniciando subida resumable directa...');
    console.log(`📄 Archivo: ${fileName} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    try {
      // Paso 1: Crear sesión de subida resumable
      const sessionData = await this.createUploadSession(file, fileName);
      console.log('✅ [Resumable] Sesión creada:', sessionData.uploadUrl.substring(0, 100) + '...');
      
      // Paso 2: Subir archivo en chunks directamente a Google Drive
      const uploadSuccess = await this.performChunkedUpload(
        sessionData.uploadUrl,
        file,
        onProgress
      );
      
      if (!uploadSuccess) {
        throw new Error('Subida no completada correctamente');
      }
      
      // Paso 3: Verificar subida y obtener enlaces
      const result = await this.verifyAndGetLinks(sessionData);
      
      console.log('🎉 [Resumable] Subida completada exitosamente');
      return result;
      
    } catch (error) {
      console.error('❌ [Resumable] Error en subida:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido en subida'
      };
    }
  }

  /**
   * Crear sesión de subida resumable en el backend
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
   * Realizar subida en chunks directamente a Google Drive
   */
  private async performChunkedUpload(
    uploadUrl: string,
    file: Blob,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<boolean> {
    const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);
    let uploadedBytes = 0;
    
    console.log(`📤 [Resumable] Subiendo ${totalChunks} chunks de ${(this.CHUNK_SIZE / 1024 / 1024).toFixed(1)}MB`);
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * this.CHUNK_SIZE;
      const end = Math.min(start + this.CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      
      const success = await this.uploadChunkWithRetry(
        uploadUrl,
        chunk,
        start,
        end - 1,
        file.size,
        chunkIndex,
        totalChunks
      );
      
      if (!success) {
        throw new Error(`Error subiendo chunk ${chunkIndex + 1}/${totalChunks}`);
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
      
      console.log(`✅ [Resumable] Chunk ${chunkIndex + 1}/${totalChunks} subido (${(uploadedBytes / 1024 / 1024).toFixed(2)} MB)`);
    }
    
    return uploadedBytes === file.size;
  }

  /**
   * Subir un chunk individual con reintentos
   */
  private async uploadChunkWithRetry(
    uploadUrl: string,
    chunk: Blob,
    startByte: number,
    endByte: number,
    totalSize: number,
    chunkIndex: number,
    totalChunks: number
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const success = await this.uploadSingleChunk(
          uploadUrl,
          chunk,
          startByte,
          endByte,
          totalSize
        );
        
        if (success) {
          return true;
        }
        
        // Si es el último intento, fallar
        if (attempt === this.MAX_RETRIES) {
          throw new Error(`Chunk ${chunkIndex + 1} falló después de ${this.MAX_RETRIES} intentos`);
        }
        
        // Esperar antes del siguiente intento
        await this.sleep(this.RETRY_DELAY * attempt);
        console.log(`⚠️ [Resumable] Reintentando chunk ${chunkIndex + 1}, intento ${attempt + 1}/${this.MAX_RETRIES}`);
        
      } catch (error) {
        console.warn(`⚠️ [Resumable] Error en chunk ${chunkIndex + 1}, intento ${attempt}:`, error);
        
        if (attempt === this.MAX_RETRIES) {
          throw error;
        }
        
        await this.sleep(this.RETRY_DELAY * attempt);
      }
    }
    
    return false;
  }

  /**
   * Subir un chunk individual a Google Drive
   */
  private async uploadSingleChunk(
    uploadUrl: string,
    chunk: Blob,
    startByte: number,
    endByte: number,
    totalSize: number
  ): Promise<boolean> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': chunk.type || 'video/mp4',
        'Content-Range': `bytes ${startByte}-${endByte}/${totalSize}`,
        'Content-Length': chunk.size.toString(),
      },
      body: chunk,
    });
    
    // 200/201 = completado, 308 = continuar
    if (response.status === 200 || response.status === 201) {
      console.log('🎉 [Resumable] Último chunk completado, archivo subido');
      return true;
    } else if (response.status === 308) {
      // Chunk aceptado, continuar con el siguiente
      return true;
    } else {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
  }

  /**
   * Verificar subida y obtener enlaces del archivo
   */
  private async verifyAndGetLinks(sessionData: ResumableSessionData): Promise<UploadResult> {
    console.log('🔍 [Resumable] Verificando subida completada...');
    
    // Intentar verificación con reintentos
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch('/api/upload/verify-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uploadUrl: sessionData.uploadUrl,
            fileName: sessionData.fileName,
            folderId: sessionData.folderId,
            date: sessionData.date
          }),
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          console.log('✅ [Resumable] Verificación exitosa');
          return data;
        } else if (response.status >= 500) {
          // Error del servidor - reintentar
          console.warn(`⚠️ [Resumable] Error del servidor en intento ${attempt}/3:`, data.error);
          
          if (attempt === 3) {
            // Último intento - devolver error pero indicar que el archivo podría estar subido
            return {
              success: false,
              error: `Error de verificación: ${data.error}. El archivo podría haberse subido correctamente - verifique Google Drive.`
            };
          }
          
          // Esperar antes del siguiente intento
          await this.sleep(2000 * attempt);
          continue;
        } else {
          // Error del cliente o lógica - no reintentar
          console.error('❌ [Resumable] Error en verificación:', data);
          return {
            success: false,
            error: data.error || 'Error desconocido en verificación'
          };
        }
        
      } catch (error) {
        console.warn(`⚠️ [Resumable] Error de red en verificación, intento ${attempt}/3:`, error);
        
        if (attempt === 3) {
          // Último intento fallido
          return {
            success: false,
            error: 'Error de red en verificación. El archivo probablemente se subió correctamente - verifique Google Drive.'
          };
        }
        
        // Esperar antes del siguiente intento
        await this.sleep(2000 * attempt);
      }
    }
    
    // Este punto no debería alcanzarse
    return {
      success: false,
      error: 'Error inesperado en verificación'
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
export const resumableUploadService = new ResumableUploadService();
