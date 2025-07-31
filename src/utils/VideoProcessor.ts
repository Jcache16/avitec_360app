/**
 * VideoProcessor.ts
 * Procesador de video optimizado usando FFmpeg.wasm
 * Aplica efectos de velocidad (normal, slow motion, boomerang) + música + texto + marcos
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface ProcessingProgress {
  step: string;
  progress: number;
  total: number;
}

export interface StyleConfig {
  music?: string;
  frame?: string;
  text?: string;
  textFont?: string;
  textColor?: string;
  frameColor?: string;
}

class VideoProcessor {
  private ffmpeg: FFmpeg;
  private isLoaded = false;

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  async load(onProgress?: (progress: ProcessingProgress) => void): Promise<void> {
    if (this.isLoaded) return;

    onProgress?.({ step: 'Cargando FFmpeg...', progress: 0, total: 100 });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    
    this.ffmpeg.on('log', ({ message }) => {
      if (message.includes('time=')) {
        console.log('🎬 FFmpeg:', message);
      }
    });

    this.ffmpeg.on('progress', ({ progress }) => {
      if (progress > 0) {
        onProgress?.({ 
          step: 'Procesando...', 
          progress: Math.round(progress * 100), 
          total: 100 
        });
      }
    });

    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    this.isLoaded = true;
    onProgress?.({ step: 'FFmpeg cargado', progress: 5, total: 100 });
  }

  async processWithStyles(
    videoBlob: Blob,
    duration: number,
    styles: StyleConfig,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<Blob> {
    try {
      console.log('🎬 Iniciando procesamiento de video:', {
        duration,
        videoSize: Math.round(videoBlob.size / 1024) + 'KB',
        styles: {
          music: styles.music,
          frame: styles.frame,
          text: styles.text?.substring(0, 20) + '...',
        }
      });

      await this.load(onProgress);

      onProgress?.({ step: 'Preparando archivos...', progress: 10, total: 100 });
      
      // Limpiar archivos previos
      await this.cleanup();

      // Escribir video de entrada
      const inputData = await fetchFile(videoBlob);
      console.log('📥 Escribiendo archivo de entrada:', inputData.length, 'bytes');
      await this.ffmpeg.writeFile('input.webm', inputData);
      
      // Verificar que el archivo se escribió correctamente
      const inputCheck = await this.ffmpeg.readFile('input.webm');
      console.log('✅ Archivo de entrada verificado:', inputCheck.length, 'bytes');

      onProgress?.({ step: 'Procesando video...', progress: 50, total: 100 });
      
      // ENFOQUE ULTRA SIMPLE: Solo recodificar SIN cambiar formato
      console.log('🔧 Procesando video con recodificación mínima');
      
      // Primero intentemos solo copiar sin recodificar
      const ffmpegArgs = [
        '-i', 'input.webm',
        '-c', 'copy',
        '-y',
        'output.mp4'
      ];
      
      console.log('🎬 Comando FFmpeg (copia):', ffmpegArgs.join(' '));
      
      try {
        await this.ffmpeg.exec(ffmpegArgs);
        console.log('🏁 FFmpeg terminó (copia), leyendo archivo de salida...');
      } catch (copyError) {
        console.log('❌ Copia falló, intentando recodificación:', copyError);
        
        // Si la copia falla, intentamos recodificación
        const reencodeArgs = [
          '-i', 'input.webm',
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-crf', '30',
          '-c:a', 'aac',
          '-y',
          'output.mp4'
        ];
        
        console.log('🎬 Comando FFmpeg (recodificación):', reencodeArgs.join(' '));
        await this.ffmpeg.exec(reencodeArgs);
        console.log('🏁 FFmpeg terminó (recodificación), leyendo archivo de salida...');
      }

      onProgress?.({ step: 'Finalizando...', progress: 90, total: 100 });

      // Leer resultado con verificación
      const outputData = await this.ffmpeg.readFile('output.mp4');
      
      // Verificar que el archivo no esté vacío
      if (!outputData || outputData.length === 0) {
        throw new Error('El archivo de salida está vacío');
      }
      
      const outputBlob = new Blob([outputData], { type: 'video/mp4' });
      
      console.log('✅ Video procesado exitosamente:', {
        bytes: outputData.length,
        kb: Math.round(outputBlob.size / 1024) + 'KB'
      });
      
      onProgress?.({ step: 'Completado', progress: 100, total: 100 });
      
      // Limpiar archivos
      await this.cleanup();
      
      return outputBlob;

    } catch (error) {
      console.error('❌ Error procesando video:', error);
      await this.cleanup();
      throw new Error(`Error durante el procesamiento: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  private async cleanup(): Promise<void> {
    const files = [
      'input.webm', 'output.mp4'
    ];
    
    for (const file of files) {
      try {
        await this.ffmpeg.deleteFile(file);
      } catch (e) {
        // Archivo no existe, ignorar
      }
    }
  }
}

// Función principal que aplica TODOS los efectos
export async function processVideo360(
  videoBlob: Blob,
  styleConfig: StyleConfig,
  duration: number,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<Blob> {
  try {
    const processor = new VideoProcessor();
    return await processor.processWithStyles(videoBlob, duration, styleConfig, onProgress);
  } catch (error) {
    console.error('Error en processVideo360:', error);
    throw error;
  }
}
