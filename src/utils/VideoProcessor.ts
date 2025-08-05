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
  const startTime = performance.now(); // OPTIMIZACIÓN: Medir tiempo total de procesamiento
  console.log('🎬 Iniciando procesamiento OPTIMIZADO de video con estilos...');
  console.log('📋 Parámetros:', {
    normalDuration,
    slowmoDuration,
    totalDuration: normalDuration + slowmoDuration,
    videoBlobSize: videoBlob.size,
    overlayBlobSize: overlayPNG.size,
    stylesKeys: Object.keys(styles),
    resolution: '480x854 (9:16 aspect ratio, sin estiramientos)',
    overlayResolution: '480x854 (sincronizada con video)'
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

    // CRÍTICO: Asegurar que se crea correctamente el Blob para móviles Android/iOS
    const outputBlob = new Blob([outputData], { type: "video/mp4" });
    console.log('✅ Video final creado:', {
      originalSize: outputData.length,
      blobSize: outputBlob.size,
      type: outputBlob.type,
      dataType: outputData.constructor.name
    });
    
    onProgress?.({ step: "Completado", progress: 100, total: 100 });
    
    // OPTIMIZACIÓN: Log de rendimiento para monitorear mejoras
    const endTime = performance.now();
    const processingTimeSeconds = (endTime - startTime) / 1000;
    const videoLengthSeconds = normalDuration + slowmoDuration;
    const speedRatio = videoLengthSeconds / processingTimeSeconds;
    
    console.log('⏱️ ESTADÍSTICAS DE RENDIMIENTO:');
    console.log(`   • Tiempo de procesamiento: ${processingTimeSeconds.toFixed(2)} segundos`);
    console.log(`   • Duración del video: ${videoLengthSeconds} segundos`);
    console.log(`   • Ratio velocidad: ${speedRatio.toFixed(3)}x (${speedRatio < 1 ? 'más lento' : 'más rápido'} que tiempo real)`);
    console.log(`   • Video final: ${(outputBlob.size / 1024 / 1024).toFixed(2)} MB`);
    
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
    // OPTIMIZACIÓN: Resolución 480x854 (aspect ratio 9:16) para móviles
    // CORREGIDO: Usar scale con aspect ratio preservation para evitar estiramientos
    const scaleArgs = ["-vf", "scale=480:854:force_original_aspect_ratio=decrease,pad=480:854:(ow-iw)/2:(oh-ih)/2,setsar=1"];
    const commonArgs = [
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "30",
      "-c:a",
      "aac",
      "-y",
    ];

    console.log('🎬 Creando segmento 1: Video normal (sin estiramientos)');
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
    
    console.log('🎬 Creando segmento 2: Video slow motion (sin estiramientos)');
    // Segmento 2: Video en slow motion (slowmoDuration segundos)
    await this.ffmpeg.exec([
      "-i",
      "input.webm",
      "-ss",
      String(normalDuration),
      "-t",
      String(slowmoDuration),
      "-vf",
      "setpts=2.0*PTS,scale=480:854:force_original_aspect_ratio=decrease,pad=480:854:(ow-iw)/2:(oh-ih)/2,setsar=1",
      "-af",
      "atempo=0.5",
      ...commonArgs,
      "seg2.mp4",
    ]);
    
    console.log('✅ Segmentos de velocidad creados sin estiramientos');
  }

  private async concatenateAndNormalizeSegments(): Promise<void> {
    console.log('🔗 Concatenando segmentos');
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

    // OPTIMIZACIÓN: Eliminar archivos intermedios inmediatamente para liberar memoria
    try {
      await this.ffmpeg.deleteFile("seg1.mp4");
      await this.ffmpeg.deleteFile("seg2.mp4");
      await this.ffmpeg.deleteFile("concat_list.txt");
      console.log('🗑️ Archivos intermedios eliminados para liberar memoria');
    } catch (cleanupError) {
      console.warn('⚠️ Error limpiando archivos intermedios:', cleanupError);
    }

    console.log('📏 Normalizando video concatenado');
    await this.ffmpeg.exec([
      "-i",
      "concatenated.mp4",
      "-c",
      "copy",
      "-y",
      "normalized.mp4",
    ]);
    await this.verifyFileExists("normalized.mp4");
    
    // Eliminar archivo concatenado temporal
    try {
      await this.ffmpeg.deleteFile("concatenated.mp4");
      console.log('🗑️ Archivo concatenado temporal eliminado');
    } catch (cleanupError) {
      console.warn('⚠️ Error limpiando concatenated.mp4:', cleanupError);
    }
  }

  private async applyOverlayPNG(
    inputFile: string,
    outputFile: string
  ): Promise<void> {
    console.log('🎨 Aplicando overlay PNG optimizado para velocidad');
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
      "ultrafast", // Preset más rápido
      "-crf",
      "30", // CRF optimizado para velocidad
      "-c:a",
      "copy", // Copiar audio sin re-encodear para velocidad
      "-y",
      outputFile,
    ];
    await this.ffmpeg.exec(args);
    await this.verifyFileExists(outputFile);
    console.log('✅ Overlay aplicado exitosamente');
  }

  private async applyMusic(
    inputFile: string,
    outputFile: string,
    styles: StyleConfig
  ): Promise<void> {
    if (!styles.music || styles.music === "none") {
      // OPTIMIZACIÓN: Copia directa sin re-encodeo cuando no hay música
      console.log('🎵 Sin música seleccionada, copiando archivo directamente');
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
    
    console.log(`🎵 Aplicando música: ${styles.music}`);
    try {
      await this.ffmpeg.writeFile(
        "music.mp3",
        await fetchFile(`/music/${styles.music}.mp3`)
      );
      
      // OPTIMIZACIÓN: Usar -c:v copy para no re-encodear video, solo mezclar audio
      await this.ffmpeg.exec([
        "-i",
        inputFile,
        "-i",
        "music.mp3",
        "-c:v",
        "copy", // No re-encodear video para velocidad
        "-c:a",
        "aac",
        "-b:a",
        "128k", // Bitrate de audio optimizado para móviles
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-shortest",
        "-y",
        outputFile,
      ]);
      await this.verifyFileExists(outputFile);
      
      // Eliminar archivo de música temporal
      try {
        await this.ffmpeg.deleteFile("music.mp3");
        console.log('🗑️ Archivo de música temporal eliminado');
      } catch (cleanupError) {
        console.warn('⚠️ Error limpiando music.mp3:', cleanupError);
      }
      
      console.log('✅ Música aplicada exitosamente');
    } catch (musicError) {
      console.warn('⚠️ Error aplicando música, creando sin audio:', musicError);
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
    console.log('🧹 Iniciando limpieza optimizada del FS...');
    try {
      const files = await this.ffmpeg.listDir(".");
      console.log('📁 Archivos antes de limpieza:', files.map(f => f.name));
      
      // OPTIMIZACIÓN: Lista específica de archivos a eliminar para mejor rendimiento
      const specificFilesToDelete = [
        'input.webm', 'overlay.png', 'seg1.mp4', 'seg2.mp4', 
        'concat_list.txt', 'concatenated.mp4', 'normalized.mp4', 
        'styled.mp4', 'music.mp3', 'output.mp4'
      ];
      
      let deletedCount = 0;
      for (const filename of specificFilesToDelete) {
        try {
          const fileExists = files.some(f => f.name === filename);
          if (fileExists) {
            await this.ffmpeg.deleteFile(filename);
            deletedCount++;
            console.log(`✅ Eliminado: ${filename}`);
          }
        } catch (deleteError) {
          console.warn(`⚠️ No se pudo eliminar ${filename}:`, deleteError);
        }
      }
      
      // Limpieza adicional de archivos no específicos (evitando directorios del sistema)
      const remainingFiles = files.filter(f => 
        !f.isDir && 
        !['dev', 'proc', 'tmp', 'home'].includes(f.name) &&
        !specificFilesToDelete.includes(f.name)
      );
      
      for (const file of remainingFiles) {
        try {
          await this.ffmpeg.deleteFile(file.name);
          deletedCount++;
          console.log(`✅ Eliminado adicional: ${file.name}`);
        } catch (deleteError) {
          console.warn(`⚠️ No se pudo eliminar ${file.name}:`, deleteError);
        }
      }
      
      console.log(`✅ Limpieza completada: ${deletedCount} archivos eliminados`);
    } catch (error) {
      console.error('❌ Error durante cleanup optimizado:', error);
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