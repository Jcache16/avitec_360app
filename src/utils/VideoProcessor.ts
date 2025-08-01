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

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  private async load(
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<void> {
    if (this.isLoaded) return;
    onProgress?.({ step: "Cargando FFmpeg...", progress: 0, total: 100 });
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
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
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    this.isLoaded = true;
    onProgress?.({ step: "FFmpeg cargado", progress: 5, total: 100 });
  }

  async processWithStyles(
  videoBlob: Blob,
  duration: number,
  styles: StyleConfig,
  overlayPNG: Blob,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<Blob> {
  try {
    await this.load(onProgress);
    onProgress?.({ step: "Preparando archivos...", progress: 10, total: 100 });

    // Limpieza previa
    await this.cleanup();

    // Escribe el archivo del video de entrada
    await this.ffmpeg.writeFile("input.webm", await fetchFile(videoBlob));
    await this.verifyFileExists("input.webm");

    // Validación y escritura del overlay PNG
    console.log('🔍 Validando overlay PNG recibido:', {
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
    
    console.log('✅ Overlay PNG válido, escribiendo a FFmpeg FS...');
    const overlayData = await fetchFile(overlayPNG);
    console.log('📤 Datos del overlay extraídos:', overlayData.length, 'bytes');
    
    await this.ffmpeg.writeFile("overlay.png", overlayData);
    await this.verifyFileExists("overlay.png");

    onProgress?.({ step: "Efectos de velocidad...", progress: 20, total: 100 });
    await this.createSpeedEffectSegments(duration);

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
    try {
      const files = await this.ffmpeg.listDir("/");
      console.log(
        "📁 Archivos en FS al ocurrir el error:",
        files.map((f) => f.name)
      );
    } catch {
      // Error al listar archivos, continuar con cleanup
    }
    await this.cleanup();
    throw error;
  }
}

  private async createSpeedEffectSegments(duration: number): Promise<void> {
    const normal = duration * 0.6,
      slow = duration * 0.2,
      reverse = duration * 0.2;
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

    await this.ffmpeg.exec([
      "-i",
      "input.webm",
      "-t",
      String(normal),
      ...scaleArgs,
      ...commonArgs,
      "seg1.mp4",
    ]);
    await this.ffmpeg.exec([
      "-i",
      "input.webm",
      "-ss",
      String(normal),
      "-t",
      String(slow),
      "-vf",
      "setpts=2.0*PTS,scale=720:1280,setsar=1",
      "-af",
      "atempo=0.5",
      ...commonArgs,
      "seg2.mp4",
    ]);
    await this.ffmpeg.exec([
      "-i",
      "input.webm",
      "-ss",
      String(normal + slow),
      "-t",
      String(reverse),
      ...scaleArgs,
      ...commonArgs,
      "seg3_temp.mp4",
    ]);
    await this.ffmpeg.exec([
      "-i",
      "seg3_temp.mp4",
      "-vf",
      "reverse,scale=720:1280,setsar=1",
      "-af",
      "areverse",
      ...commonArgs,
      "seg3.mp4",
    ]);
  }

  private async concatenateAndNormalizeSegments(): Promise<void> {
    await this.ffmpeg.writeFile(
      "concat_list.txt",
      new TextEncoder().encode(
        "file seg1.mp4\nfile seg2.mp4\nfile seg3.mp4"
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
    try {
      const data = await this.ffmpeg.readFile(filename);
      if (data.length === 0)
        throw new Error(`El archivo generado '${filename}' está vacío.`);
    } catch (error) {
      throw error;
    }
  }

  private async cleanup(): Promise<void> {
    try {
      const files = await this.ffmpeg.listDir(".");
      for (const file of files) {
        if (!file.isDir) await this.ffmpeg.deleteFile(file.name);
      }
    } catch {
      // Error durante cleanup, continuar
    }
  }
}

let processorInstance: VideoProcessor | null = null;

export const processVideo360 = async (
  videoBlob: Blob,
  styleConfig: StyleConfig,
  duration: number,
  overlayPNG: Blob,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<Blob> => {
  if (!processorInstance) processorInstance = new VideoProcessor();
  return await processorInstance.processWithStyles(
    videoBlob,
    duration,
    styleConfig,
    overlayPNG,
    onProgress
  );
};

export default VideoProcessor;