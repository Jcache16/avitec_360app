/**
 * VideoProcessor.ts
 * Procesador robusto para Photobooth 360 con overlay PNG y FFmpeg.wasm.
 * Requiere: @ffmpeg/ffmpeg y @ffmpeg/util instalados.
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

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
  private isLoaded: boolean = false;
  private loadingPromise: Promise<void> | null = null;

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  private async load(
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<void> {
    // Si ya está cargado, no hacer nada
    if (this.isLoaded) {
      console.log('✅ FFmpeg ya está cargado');
      return;
    }
    
    // Si ya hay una carga en progreso, esperar a que termine
    if (this.loadingPromise) {
      console.log('⏳ Esperando a que termine la carga en progreso...');
      return this.loadingPromise;
    }
    
    // Crear nueva promesa de carga
    console.log('🚀 Iniciando carga de FFmpeg...');
    this.loadingPromise = this.performLoad(onProgress);
    
    try {
      await this.loadingPromise;
    } finally {
      // Limpiar la promesa una vez completada
      this.loadingPromise = null;
    }
  }

  private async performLoad(
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<void> {
    onProgress?.({ step: "Cargando FFmpeg...", progress: 0, total: 100 });
    
    // Configuración optimizada para Next.js - versión UMD estable
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
    
    this.ffmpeg.on("log", ({ message }) => {
      if (message.includes("time=") || /error|failed|unable/i.test(message)) {
        console.log("🎬 FFmpeg:", message);
      }
    });
    
    this.ffmpeg.on("progress", ({ progress }) => {
      if (progress > 0 && onProgress) {
        onProgress({
          step: `Procesando...`,
          progress: Math.round(progress * 100),
          total: 100,
        });
      }
    });
    
    try {
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      
      console.log('🔧 FFmpeg cargado, verificando disponibilidad del FS...');
      
      // Esperar un poco y verificar que el FS esté disponible
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Probar el FS escribiendo un archivo de prueba
      console.log('🧪 Probando FS de FFmpeg...');
      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      
      try {
        await this.ffmpeg.writeFile("test.txt", testData);
        console.log('✅ Archivo de prueba escrito');
        
        const readData = await this.ffmpeg.readFile("test.txt");
        console.log('✅ Archivo de prueba leído, tamaño:', readData.length);
        
        await this.ffmpeg.deleteFile("test.txt");
        console.log('✅ Archivo de prueba eliminado');
        
        // Verificar que los datos sean correctos
        console.log('🔍 Tipo de datos leídos:', typeof readData, readData);
        
        // Simplificar la verificación - solo verificar que se pudo leer algo
        if (!readData || (readData instanceof Uint8Array && readData.length === 0)) {
          throw new Error('No se pudieron leer datos del archivo de prueba');
        }
        
        console.log('✅ Verificación básica de FS exitosa');
        
        console.log('✅ Test de FS completado exitosamente');
      } catch (testError) {
        console.error('❌ Error en test de FS:', testError);
        throw new Error(`Test de FS falló: ${testError instanceof Error ? testError.message : String(testError)}`);
      }
      
      this.isLoaded = true;
      console.log('✅ FFmpeg completamente cargado y FS verificado');
      onProgress?.({ step: "FFmpeg cargado", progress: 5, total: 100 });
    } catch (error) {
      console.error('❌ Error cargando FFmpeg:', error);
      this.isLoaded = false;
      throw new Error(`No se pudo cargar FFmpeg: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async processWithStyles(
  videoBlob: Blob,
  normalDuration: number,
  slowmoDuration: number,
  styles: StyleConfig,
  overlayPNG: Blob,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<Blob> {
  console.log('🎬 Iniciando procesamiento de video con estilos...');
  console.log('📋 Parámetros:', {
    normalDuration,
    slowmoDuration,
    totalDuration: normalDuration + slowmoDuration,
    videoBlobSize: videoBlob.size,
    overlayBlobSize: overlayPNG.size,
    stylesKeys: Object.keys(styles)
  });
  
  try {
    await this.load(onProgress);
    onProgress?.({ step: "Preparando archivos...", progress: 10, total: 100 });

    // Verificar estado inicial de FFmpeg
    console.log('🔧 Estado inicial de FFmpeg...');
    try {
      const initialFiles = await this.ffmpeg.listDir(".");
      console.log('📁 Archivos iniciales en FS:', initialFiles.map(f => f.name));
    } catch (fsError) {
      console.error('❌ Error listando FS inicial:', fsError);
      throw new Error('FFmpeg FS no está disponible. Reinicia la aplicación.');
    }

    // Limpieza previa más selectiva
    await this.cleanup();

    // Escribe el archivo del video de entrada con validación robusta
    console.log('📤 Escribiendo video de entrada...');
    try {
      const videoData = await fetchFile(videoBlob);
      console.log('📊 Video datos:', {
        blobSize: videoBlob.size,
        blobType: videoBlob.type,
        arraySize: videoData.length
      });
      
      if (videoData.length === 0) {
        throw new Error('Los datos del video están vacíos');
      }
      
      await this.ffmpeg.writeFile("input.webm", videoData);
      
      // Verificación inmediata
      await this.verifyFileExists("input.webm");
      console.log('✅ Video de entrada escrito exitosamente');
    } catch (videoError) {
      console.error('❌ Error escribiendo video:', videoError);
      throw new Error(`No se pudo escribir el video de entrada: ${videoError instanceof Error ? videoError.message : String(videoError)}`);
    }

    // Validación y escritura del overlay PNG con validación robusta
    console.log('�️ Procesando overlay PNG...');
    console.log('�🔍 Validando overlay PNG recibido:', {
      exists: !!overlayPNG,
      size: overlayPNG?.size,
      type: overlayPNG?.type,
      constructor: overlayPNG?.constructor?.name
    });
    
    // Verificación más detallada
    if (!overlayPNG) {
      console.error('❌ overlayPNG es null o undefined');
      throw new Error("El overlay PNG está vacío o no se generó correctamente.");
    }
    
    if (!(overlayPNG instanceof Blob)) {
      console.error('❌ overlayPNG no es una instancia de Blob:', typeof overlayPNG);
      throw new Error("El overlay PNG no es un Blob válido.");
    }
    
    if (overlayPNG.size === 0) {
      console.error('❌ overlayPNG tiene tamaño 0');
      throw new Error("El overlay PNG tiene tamaño 0.");
    }
    
    console.log('✅ Overlay PNG válido, extrayendo datos...');
    try {
      const overlayData = await fetchFile(overlayPNG);
      console.log('📤 Datos del overlay extraídos:', {
        blobSize: overlayPNG.size,
        arraySize: overlayData.length,
        firstBytes: Array.from(overlayData.slice(0, 8)).map(b => b.toString(16)).join(' ')
      });
      
      if (overlayData.length === 0) {
        throw new Error('Los datos del overlay están vacíos después de fetchFile');
      }
      
      console.log('📝 Escribiendo overlay a FFmpeg FS...');
      await this.ffmpeg.writeFile("overlay.png", overlayData);
      
      // Verificación inmediata
      await this.verifyFileExists("overlay.png");
      console.log('✅ Overlay PNG escrito exitosamente');
    } catch (overlayError) {
      console.error('❌ Error procesando overlay:', overlayError);
      throw new Error(`No se pudo procesar el overlay PNG: ${overlayError instanceof Error ? overlayError.message : String(overlayError)}`);
    }

    onProgress?.({ step: "Efectos de velocidad...", progress: 20, total: 100 });
    await this.createSpeedEffectSegments(normalDuration, slowmoDuration);

    onProgress?.({ step: "Uniendo y normalizando...", progress: 50, total: 100 });
    await this.concatenateAndNormalizeSegments();

    onProgress?.({ step: "Aplicando overlay...", progress: 70, total: 100 });
    await this.applyOverlayPNG("normalized.mp4", "styled.mp4");

    onProgress?.({ step: "Aplicando música...", progress: 85, total: 100 });
    await this.applyMusic("styled.mp4", "output.mp4", styles);

    onProgress?.({ step: "Finalizando...", progress: 95, total: 100 });
    const outputData = await this.ffmpeg.readFile("output.mp4");
    if (!outputData || outputData.length === 0) {
      throw new Error("El archivo de salida está vacío.");
    }

    const outputBlob = new Blob([outputData], { type: "video/mp4" });
    onProgress?.({ step: "Completado", progress: 100, total: 100 });
    await this.cleanup();
    return outputBlob;
  } catch (error) {
    console.error("❌ Error fatal en el procesamiento de video:", error);
    console.log("🔍 Información de debug del error:", {
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : 'No stack',
      isLoaded: this.isLoaded
    });
    
    // Diagnóstico detallado del estado actual
    try {
      const files = await this.ffmpeg.listDir("/");
      console.log(
        "📁 Archivos en FS al ocurrir el error:",
        files.map((f) => f.name)
      );
    } catch {
      console.error("❌ No se puede acceder al FS para diagnóstico");
    }
    
    // Limpiar y propagar el error con más contexto
    await this.cleanup();
    
    if (error instanceof Error) {
      throw new Error(`Procesamiento de video falló: ${error.message}`);
    } else {
      throw new Error(`Procesamiento de video falló: ${String(error)}`);
    }
  }
}

  private async createSpeedEffectSegments(normalDuration: number, slowmoDuration: number): Promise<void> {
    const scaleArgs = ["-vf", "scale=720:1280,setsar=1"];
    const commonArgs = [
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "28",
      "-c:a",
      "aac",
      "-y",
    ];

    // Segmento 1: Video normal (normalDuration segundos)
    await this.ffmpeg.exec([
      "-i",
      "input.webm",
      "-t",
      String(normalDuration),
      ...scaleArgs,
      ...commonArgs,
      "seg1.mp4",
    ]);
    
    // Segmento 2: Video en slow motion (slowmoDuration segundos)
    await this.ffmpeg.exec([
      "-i",
      "input.webm",
      "-ss",
      String(normalDuration),
      "-t",
      String(slowmoDuration),
      "-vf",
      "setpts=2.0*PTS,scale=720:1280,setsar=1",
      "-af",
      "atempo=0.5",
      ...commonArgs,
      "seg2.mp4",
    ]);
  }

  private async concatenateAndNormalizeSegments(): Promise<void> {
    await this.ffmpeg.writeFile(
      "concat_list.txt",
      new TextEncoder().encode(
        "file seg1.mp4\nfile seg2.mp4"
      )
    );
    await this.ffmpeg.exec([
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      "concat_list.txt",
      "-c",
      "copy",
      "-y",
      "concatenated.mp4",
    ]);
    await this.verifyFileExists("concatenated.mp4");

    await this.ffmpeg.exec([
      "-i",
      "concatenated.mp4",
      "-c",
      "copy",
      "-y",
      "normalized.mp4",
    ]);
    await this.verifyFileExists("normalized.mp4");
  }

  private async applyOverlayPNG(
    inputFile: string,
    outputFile: string
  ): Promise<void> {
    const args = [
      "-i",
      inputFile,
      "-i",
      "overlay.png",
      "-filter_complex",
      "[0:v][1:v]overlay=0:0:format=auto",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "28",
      "-c:a",
      "aac",
      "-y",
      outputFile,
    ];
    await this.ffmpeg.exec(args);
    await this.verifyFileExists(outputFile);
  }

  private async applyMusic(
    inputFile: string,
    outputFile: string,
    styles: StyleConfig
  ): Promise<void> {
    if (!styles.music || styles.music === "none") {
      await this.ffmpeg.exec([
        "-i",
        inputFile,
        "-c",
        "copy",
        "-y",
        outputFile,
      ]);
      return;
    }
    try {
      await this.ffmpeg.writeFile(
        "music.mp3",
        await fetchFile(`/music/${styles.music}.mp3`)
      );
      await this.ffmpeg.exec([
        "-i",
        inputFile,
        "-i",
        "music.mp3",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-shortest",
        "-y",
        outputFile,
      ]);
      await this.verifyFileExists(outputFile);
    } catch {
      // Si falla la combinación con audio, crear sin audio
      await this.ffmpeg.exec([
        "-i",
        inputFile,
        "-c",
        "copy",
        "-y",
        outputFile,
      ]);
    }
  }

  private async verifyFileExists(filename: string): Promise<void> {
    console.log(`🔍 Verificando existencia de archivo: ${filename}`);
    try {
      // Primero listar todos los archivos para debug
      const files = await this.ffmpeg.listDir(".");
      console.log(`📁 Archivos disponibles en FS:`, files.map(f => f.name));
      
      const data = await this.ffmpeg.readFile(filename);
      console.log(`✅ Archivo ${filename} encontrado, tamaño: ${data.length} bytes`);
      
      if (data.length === 0) {
        throw new Error(`El archivo generado '${filename}' está vacío.`);
      }
    } catch (error) {
      console.error(`❌ Error verificando archivo ${filename}:`, error);
      
      // Diagnóstico adicional
      try {
        const files = await this.ffmpeg.listDir(".");
        console.log(`📁 Estado actual del FS:`, files.map(f => `${f.name} (${f.isDir ? 'dir' : 'file'})`));
      } catch (listError) {
        console.error(`❌ No se puede listar el FS:`, listError);
      }
      
      throw new Error(`No se pudo verificar o leer el archivo '${filename}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async cleanup(): Promise<void> {
    console.log('🧹 Iniciando limpieza del FS...');
    try {
      const files = await this.ffmpeg.listDir(".");
      console.log('📁 Archivos antes de limpieza:', files.map(f => f.name));
      
      const filesToDelete = files.filter(f => !f.isDir && !['dev', 'proc', 'tmp'].includes(f.name));
      console.log('🗑️ Archivos a eliminar:', filesToDelete.map(f => f.name));
      
      for (const file of filesToDelete) {
        try {
          await this.ffmpeg.deleteFile(file.name);
          console.log(`✅ Eliminado: ${file.name}`);
        } catch (deleteError) {
          console.warn(`⚠️ No se pudo eliminar ${file.name}:`, deleteError);
        }
      }
      
      console.log('✅ Limpieza completada');
    } catch (error) {
      console.error('❌ Error durante cleanup:', error);
      // No relanzar el error, continuar con el procesamiento
    }
  }
}

let processorInstance: VideoProcessor | null = null;
let isProcessing = false;

export const processVideo360 = async (
  videoBlob: Blob,
  styleConfig: StyleConfig,
  normalDuration: number,
  slowmoDuration: number,
  overlayPNG: Blob,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<Blob> => {
  if (isProcessing) {
    throw new Error('Ya hay un procesamiento de video en curso. Espera a que termine.');
  }
  
  console.log('🎯 Iniciando procesamiento único de video');
  isProcessing = true;
  
  try {
    if (!processorInstance) {
      console.log('📦 Creando nueva instancia de VideoProcessor');
      processorInstance = new VideoProcessor();
    }
    
    const result = await processorInstance.processWithStyles(
      videoBlob,
      normalDuration,
      slowmoDuration,
      styleConfig,
      overlayPNG,
      onProgress
    );
    
    console.log('✅ Procesamiento único completado');
    return result;
  } finally {
    isProcessing = false;
  }
};

export default VideoProcessor;