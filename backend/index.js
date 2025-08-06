/**
 * 🎬 AVITEC 360 BACKEND - PROCESAMIENTO DE VIDEOS
 * 
 * Versión 1.3.1 - Implementación de timeout robusto para ffmpeg (versión completa)
 */

const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs-extra');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { createCanvas, loadImage, registerFont } = require('canvas');

const app = express();

// 🔧 Configuración de FFmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

// 🌐 Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 📁 Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    fs.ensureDirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de video e imagen'), false);
    }
  }
});

// 🎨 Configuración de estilos disponibles
const MUSIC_OPTIONS = [
  { id: "none", name: "Sin música" },
  { id: "sigue_bailandome", name: "Sigue Bailandome - Yannc", file: "SigueBailandome_Yannc.mp3" },
  { id: "feel_so_close", name: "Feel So Close - Calvin Harris", file: "FeelSoClose_CalvinHarris.mp3" },
  { id: "crazy_inLove", name: "Crazy In Love - Beyoncé", file: "CrazyInLove_Beyonce.mp3" },
  { id: "extasis_CSanta", name: "Extasis - C. Santa", file: "Extasis_CSanta.mp3" },
  { id: "blinding_Lights", name: "Blinding Lights - The Weeknd", file: "BlindingLights_TheWeeknd.mp3" },
  { id: "dontStop_theParty", name: "Don't Stop the Party - Pitbull", file: "DontStoptheParty_Pitbull.mp3" },
  // Agregar nuevas canciones aquí:
  // { id: "nueva_cancion", name: "Nueva Canción - Artista", file: "nueva_cancion.mp3" },
];

const FONT_OPTIONS = [
  { id: "montserrat", name: "Montserrat", file: "Montserrat-Regular.ttf" },
  { id: "playfair", name: "Playfair Display", file: "PlayfairDisplay-Regular.ttf" },
  { id: "chewy", name: "Chewy", file: "Chewy-Regular.ttf" },
];

// 🎯 Clase VideoProcessor
class VideoProcessor {
  constructor(processingId) {
    this.processingId = processingId || 'no-id';
    this.workingDir = path.join(__dirname, 'temp', uuidv4());
    this.outputDir = path.join(__dirname, 'processed');
    this.ffmpegTimeout = 60 * 1000; // 60 segundos timeout MÁS AGRESIVO
  }

  log(message) {
    console.log(`[${this.processingId}] ${message}`);
  }

  runCommandWithTimeout(command, commandName = 'ffmpeg') {
    return new Promise((resolve, reject) => {
      let timeoutId;
      let processKilled = false;

      command
        .on('start', (commandLine) => {
          this.log(`[${commandName}] Comando iniciado: ${commandLine}`);
          this.log(`[${commandName}] ⏱️ Timeout configurado: ${this.ffmpegTimeout / 1000} segundos`);
          timeoutId = setTimeout(() => {
            processKilled = true;
            this.log(`[${commandName}] ⏰ TIMEOUT - Matando proceso después de ${this.ffmpegTimeout / 1000}s`);
            
            // Intentar kill suave primero
            try {
              command.kill('SIGTERM');
              setTimeout(() => {
                // Si no murió, kill forzado
                try {
                  command.kill('SIGKILL');
                  this.log(`[${commandName}] 💀 Proceso forzadamente terminado`);
                } catch (killError) {
                  this.log(`[${commandName}] ❌ Error en kill forzado: ${killError.message}`);
                }
              }, 2000); // 2 segundos para kill suave
            } catch (killError) {
              this.log(`[${commandName}] ❌ Error en kill suave: ${killError.message}`);
            }
            
            reject(new Error(`[${commandName}] TIMEOUT: El proceso tardó más de ${this.ffmpegTimeout / 1000} segundos.`));
          }, this.ffmpegTimeout);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            this.log(`[${commandName}] 📊 Progreso: ${Math.floor(progress.percent)}%`);
          } else {
            this.log(`[${commandName}] 🔄 Procesando...`);
          }
        })
        .on('end', (stdout, stderr) => {
          clearTimeout(timeoutId);
          this.log(`[${commandName}] ✅ Proceso completado.`);
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          clearTimeout(timeoutId);
          if (processKilled) return;
          
          this.log(`[${commandName}] ❌ Error en el proceso: ${err.message}`);
          if (stderr) console.error(`[${commandName}] stderr:\n`, stderr);
          reject(new Error(`[${commandName}] Error: ${err.message}`));
        });

      command.run();
    });
  }

  async initialize() {
    await fs.ensureDir(this.workingDir);
    await fs.ensureDir(this.outputDir);
    this.log(`✅ VideoProcessor inicializado en: ${this.workingDir}`);
  }

  async processWithStyles(videoPath, overlayPath, styleConfig, normalDuration, slowmoDuration) {
    const startTime = Date.now();
    this.log('🎬 Iniciando procesamiento...');
    
    try {
      const originalInput = path.join(this.workingDir, `original-input${path.extname(videoPath)}`);
      await fs.copy(videoPath, originalInput);

      // INTENTAR normalización, si falla usar original
      let inputVideo;
      try {
        inputVideo = await this.normalizeInputVideo(originalInput);
        this.log('✅ Normalización exitosa');
      } catch (normError) {
        this.log(`⚠️ Normalización falló: ${normError.message}`);
        this.log('🔄 Usando video original sin normalizar');
        inputVideo = originalInput;
      }

      const segmentsPaths = await this.createSpeedEffectSegments(inputVideo, normalDuration, slowmoDuration);
      const concatenatedVideo = await this.concatenateSegments(segmentsPaths);
      const styledVideo = await this.applyOverlayPNG(concatenatedVideo, overlayPath);
      const finalVideo = await this.applyMusic(styledVideo, styleConfig);

      const finalOutput = path.join(this.outputDir, `processed-${uuidv4()}.mp4`);
      await fs.move(finalVideo, finalOutput);

      const endTime = Date.now();
      this.log(`⏱️ Tiempo de procesamiento total: ${(endTime - startTime) / 1000} segundos`);

      await this.cleanup();
      return finalOutput;
    } catch (error) {
      this.log(`❌ Error fatal en el procesamiento de video: ${error.message}`);
      await this.cleanup();
      throw error;
    }
  }

  async normalizeInputVideo(inputPath) {
    this.log(`🔄 Normalizando video: ${path.basename(inputPath)}`);
    const outputPath = path.join(this.workingDir, 'input.mp4');
    
    try {
      // Detectar orientación del video primero
      const videoInfo = await this.getVideoInfo(inputPath);
      const needsRotation = videoInfo.width > videoInfo.height; // Si está en horizontal, necesita rotación
      
      this.log(`📐 Dimensiones originales: ${videoInfo.width}x${videoInfo.height} (${needsRotation ? 'necesita rotación' : 'ya vertical'})`);
      
      let videoFilter;
      if (needsRotation) {
        // Video horizontal -> rotarlo a vertical y escalar
        videoFilter = 'transpose=1,scale=480:854:flags=fast_bilinear:force_original_aspect_ratio=decrease,pad=480:854:(ow-iw)/2:(oh-ih)/2';
      } else {
        // Video ya vertical -> solo escalar manteniendo aspecto
        videoFilter = 'scale=480:854:flags=fast_bilinear:force_original_aspect_ratio=decrease,pad=480:854:(ow-iw)/2:(oh-ih)/2';
      }
      
      const command = ffmpeg(inputPath)
        .outputOptions([
          '-c:v', 'libx264',
          '-preset', 'veryfast',  
          '-crf', '35',           
          '-vf', videoFilter,
          '-r', '24',             
          '-an'                   
        ])
        .output(outputPath);
        
      await this.runCommandWithTimeout(command, 'Normalización');
      await fs.remove(inputPath);
      return outputPath;
      
    } catch (error) {
      this.log(`❌ Error en normalización con detección: ${error.message}`);
      // Fallback a normalización simple
      const command = ffmpeg(inputPath)
        .outputOptions([
          '-c:v', 'libx264',
          '-preset', 'veryfast',  
          '-crf', '35',           
          '-vf', 'scale=480:854:flags=fast_bilinear:force_original_aspect_ratio=decrease,pad=480:854:(ow-iw)/2:(oh-ih)/2',
          '-r', '24',             
          '-an'                   
        ])
        .output(outputPath);
        
      await this.runCommandWithTimeout(command, 'Normalización Fallback');
      await fs.remove(inputPath);
      return outputPath;
    }
  }

  // Nueva función helper para obtener información del video
  async getVideoInfo(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        
        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('No se encontró stream de video'));
          return;
        }
        
        resolve({
          width: videoStream.width,
          height: videoStream.height,
          duration: videoStream.duration,
          fps: eval(videoStream.r_frame_rate) // Convertir fracción a decimal
        });
      });
    });
  }
  
  async createSpeedEffectSegments(inputVideoPath, normalDuration, slowmoDuration) {
    // Opciones SIMPLIFICADAS para evitar cuelgues
    const commonOptions = [
      '-c:v', 'libx264', 
      '-preset', 'veryfast',    // MÁS RÁPIDO
      '-crf', '35',             // Calidad más baja
      '-s', '480x854',          // Forzar resolución
      '-r', '24',               // Frame rate fijo
      '-an'                     // Sin audio
    ];

    const seg1Path = path.join(this.workingDir, 'seg1.mp4');
    const command1 = ffmpeg(inputVideoPath)
      .inputOptions(['-t', String(normalDuration)])
      .outputOptions(commonOptions)
      .output(seg1Path);
    await this.runCommandWithTimeout(command1, 'Segmento Normal');

    const seg2Path = path.join(this.workingDir, 'seg2.mp4');
    const command2 = ffmpeg(inputVideoPath)
      .inputOptions(['-ss', String(normalDuration), '-t', String(slowmoDuration)])
      .videoFilters('setpts=2.0*PTS')  // FILTRO SIMPLIFICADO
      .outputOptions(commonOptions)
      .output(seg2Path);
    await this.runCommandWithTimeout(command2, 'Segmento Slow-Mo');
    
    return [seg1Path, seg2Path];
  }

  async concatenateSegments(segmentsPaths) {
    const outputPath = path.join(this.workingDir, 'concatenated.mp4');
    const concatListPath = path.join(this.workingDir, 'concat_list.txt');
    const concatContent = segmentsPaths.map(p => `file '${path.basename(p)}'`).join('\n');
    await fs.writeFile(concatListPath, concatContent, 'utf8');

    const command = ffmpeg().input(concatListPath).inputOptions(['-f', 'concat', '-safe', '0']).outputOptions(['-c', 'copy']).output(outputPath);
    await this.runCommandWithTimeout(command, 'Concatenación');
    
    for (const p of segmentsPaths) await fs.remove(p);
    await fs.remove(concatListPath);
    return outputPath;
  }

  async applyOverlayPNG(inputPath, overlaySourcePath) {
    const outputPath = path.join(this.workingDir, 'styled.mp4');
    const overlayPath = path.join(this.workingDir, 'overlay.png');
    await fs.copy(overlaySourcePath, overlayPath);

    const command = ffmpeg(inputPath).input(overlayPath).complexFilter('[0:v][1:v]overlay=0:0:format=auto')
      .outputOptions(['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '30', '-profile:v', 'baseline', '-level', '3.0', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'])
      .output(outputPath);
    await this.runCommandWithTimeout(command, 'Aplicar Overlay');
    
    await fs.remove(inputPath);
    await fs.remove(overlayPath);
    return outputPath;
  }

  async applyMusic(inputPath, styleConfig) {
    const outputPath = path.join(this.workingDir, 'output.mp4');

    if (!styleConfig.music || styleConfig.music === "none") {
      this.log('🎵 Sin música seleccionada, finalizando video.');
      await fs.move(inputPath, outputPath);
      return outputPath;
    }

    const musicOption = MUSIC_OPTIONS.find(m => m.id === styleConfig.music);
    if (!musicOption || !musicOption.file) {
      this.log('⚠️ Música no encontrada, continuando sin audio');
      await fs.move(inputPath, outputPath);
      return outputPath;
    }

    const musicPath = path.join(__dirname, 'assets', 'music', musicOption.file);
    if (!await fs.pathExists(musicPath)) {
      this.log(`⚠️ Archivo de música no existe, continuando sin audio: ${musicPath}`);
      await fs.move(inputPath, outputPath);
      return outputPath;
    }

    const command = ffmpeg(inputPath).input(musicPath)
      .outputOptions(['-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-map', '0:v:0', '-map', '1:a:0', '-shortest', '-avoid_negative_ts', 'make_zero'])
      .output(outputPath);
      
    try {
        await this.runCommandWithTimeout(command, 'Aplicar Música');
    } catch (error) {
        this.log(`[Aplicar Música] ⚠️ Falló la aplicación de música. Se usará el video sin audio como fallback. Error: ${error.message}`);
        await fs.move(inputPath, outputPath);
    }

    if (await fs.pathExists(inputPath)) await fs.remove(inputPath);
    return outputPath;
  }

  async cleanup() {
    try {
      if (await fs.pathExists(this.workingDir)) {
        await fs.remove(this.workingDir);
        this.log('🧹 Directorio de trabajo limpiado');
      }
    } catch (error) {
      this.log(`❌ Error durante cleanup: ${error.message}`);
    }
  }
}

// 🎨 Generador de Overlay (Clase completa sin omitir)
class OverlayGenerator {
  static async generateOverlayPNG(styleConfig) {
    const width = 480;
    const height = 854;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    if (styleConfig.frame && styleConfig.frame !== 'none') {
      await this.drawFrame(ctx, width, height, styleConfig);
    }
    if (styleConfig.text && styleConfig.text.trim()) {
      await this.drawText(ctx, width, height, styleConfig);
    }
    // Indicador de música eliminado para reducir procesamiento
    // if (styleConfig.music && styleConfig.music !== 'none') {
    //   await this.drawMusicIndicator(ctx, width, height, styleConfig);
    // }
    return canvas.toBuffer('image/png');
  }

  static async drawFrame(ctx, width, height, styleConfig) {
    if (styleConfig.frame === 'custom') {
      const borderWidth = 20;
      const color = styleConfig.frameColor || '#8B5CF6';
      ctx.strokeStyle = color;
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(borderWidth / 2, borderWidth / 2, width - borderWidth, height - borderWidth);
    }
  }

  static async drawText(ctx, width, height, styleConfig) {
    const text = styleConfig.text;
    const color = styleConfig.textColor || '#FFFFFF';
    const fontSize = Math.max(24, width * 0.05);
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(text, width / 2, height - 100);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  static async drawMusicIndicator(ctx, width, height, styleConfig) {
    // Función deshabilitada para reducir procesamiento
    // El indicador de música ya no se muestra en el video
    return;
    
    /*
    const musicOption = MUSIC_OPTIONS.find(m => m.id === styleConfig.music);
    if (!musicOption) return;
    const size = 40;
    const x = width - size - 20;
    const y = 20;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x - 10, y - 10, size + 20, size + 20);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♪', x + size / 2, y + size / 2);
    */
  }
}

// 🚀 RUTAS DE LA API
app.get('/', (req, res) => res.json({ status: 'active', version: '1.3.1' }));

app.post('/process-video', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'overlay', maxCount: 1 }]), async (req, res) => {
  const processingId = uuidv4();
  console.log(`[${processingId}] 📥 Petición POST /process-video recibida.`);

  try {
    if (!req.files || !req.files.video || !req.files.video[0]) {
      return res.status(400).json({ error: 'Video requerido' });
    }

    const videoFile = req.files.video[0];
    const styleConfig = JSON.parse(req.body.styleConfig || '{}');
    const normalDuration = parseFloat(req.body.normalDuration) || 5;
    const slowmoDuration = parseFloat(req.body.slowmoDuration) || 5;

    let overlayPath;
    if (req.files.overlay && req.files.overlay[0]) {
      overlayPath = req.files.overlay[0].path;
    } else {
      const overlayBuffer = await OverlayGenerator.generateOverlayPNG(styleConfig);
      overlayPath = path.join(__dirname, 'uploads', `overlay-${processingId}.png`);
      await fs.writeFile(overlayPath, overlayBuffer);
    }

    const processor = new VideoProcessor(processingId);
    await processor.initialize();
    
    const outputPath = await processor.processWithStyles(videoFile.path, overlayPath, styleConfig, normalDuration, slowmoDuration);

    console.log(`[${processingId}] ✅ Procesamiento completado. Enviando archivo: ${path.basename(outputPath)}`);
    
    res.download(outputPath, `video-360-${processingId}.mp4`, async (err) => {
      if (err) console.error(`[${processingId}] ❌ Error enviando archivo:`, err);
      try {
        await fs.remove(videoFile.path);
        await fs.remove(overlayPath);
        await fs.remove(outputPath);
      } catch (cleanupError) {
        console.error(`[${processingId}] ❌ Error limpiando archivos post-envío:`, cleanupError);
      }
    });

  } catch (error) {
    console.error(`[${processingId}] ❌ Error fatal en la ruta /process-video:`, error);
    res.status(500).json({ error: 'Error procesando video', message: error.message, processingId });
  }
});

app.get('/options', (req, res) => {
  res.json({
    music: MUSIC_OPTIONS,
    fonts: FONT_OPTIONS,
    frames: [{ id: "none", name: "Sin marco" }, { id: "custom", name: "Personalizado" }],
    colors: ["#8B5CF6", "#EC4899", "#EF4444", "#F97316", "#EAB308", "#22C55E", "#06B6D4", "#3B82F6", "#6366F1", "#FFFFFF", "#000000"]
  });
});

// Middleware de manejo de errores (sin omitir)
app.use((error, req, res, next) => {
  console.error('❌ Error de servidor:', error);
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Archivo demasiado grande (máx: 100MB)' });
    }
  }
  if (!res.headersSent) {
    res.status(500).json({ error: 'Error interno del servidor', message: error.message });
  }
});

// Limpiar archivos temporales al iniciar (sin omitir)
const cleanupOldFiles = async () => {
  try {
    const tempDirs = [path.join(__dirname, 'uploads'), path.join(__dirname, 'processed'), path.join(__dirname, 'temp')];
    for (const dir of tempDirs) await fs.ensureDir(dir);
    
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const dir of tempDirs) {
      const files = await fs.readdir(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        try {
          const stats = await fs.stat(filePath);
          if (stats.mtime.getTime() < oneHourAgo) {
            await fs.remove(filePath);
            console.log(`🧹 Archivo antiguo eliminado: ${file}`);
          }
        } catch (statError) {
            console.log(`🧹 No se pudo obtener stat para ${file}, eliminando de todos modos.`);
            await fs.remove(filePath);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error limpiando archivos antiguos:', error);
  }
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Servidor Avitec 360 Backend iniciado en puerto ${PORT}`);
  await cleanupOldFiles();
  setInterval(cleanupOldFiles, 60 * 60 * 1000);
});

module.exports = app;