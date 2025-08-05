/**
 * 🎬 AVITEC 360 BACKEND - PROCESAMIENTO DE VIDEOS
 * 
 * Backend que replica exactamente el flujo de VideoProcessor.ts del frontend
 * Incluye todas las optimizaciones y funcionalidades actuales:
 * - Resolución 480x854 (9:16 aspect ratio)
 * - Efectos de velocidad (normal + slow motion)
 * - Overlay PNG con frames, texto y música
 * - Aplicación de música con mezcla de audio
 * - Optimizaciones de rendimiento (ultrafast preset, CRF 30)
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
const sharp = require('sharp');

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
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}.${file.originalname.split('.').pop()}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB límite
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de video e imagen'), false);
    }
  }
});

// 🎨 Configuración de estilos disponibles (igual que frontend)
const MUSIC_OPTIONS = [
  { id: "none", name: "Sin música" },
  { id: "beggin", name: "Beggin - Maneskin", file: "beggin.mp3" },
  { id: "master_puppets", name: "Master of Puppets - Metallica", file: "master_puppets.mp3" },
  { id: "night_dancer", name: "Night Dancer - Imase", file: "night_dancer.mp3" },
];

const FONT_OPTIONS = [
  { id: "montserrat", name: "Montserrat", file: "Montserrat-Regular.ttf" },
  { id: "playfair", name: "Playfair Display", file: "PlayfairDisplay-Regular.ttf" },
  { id: "chewy", name: "Chewy", file: "Chewy-Regular.ttf" },
];

// 🎯 Clase VideoProcessor (réplica exacta del frontend)
class VideoProcessor {
  constructor() {
    this.workingDir = path.join(__dirname, 'temp', uuidv4());
    this.outputDir = path.join(__dirname, 'processed');
  }

  async initialize() {
    // Crear directorios de trabajo
    await fs.ensureDir(this.workingDir);
    await fs.ensureDir(this.outputDir);
    console.log('✅ VideoProcessor inicializado:', this.workingDir);
  }

  async processWithStyles(videoPath, overlayPath, styleConfig, normalDuration, slowmoDuration, onProgress) {
    const startTime = Date.now();
    console.log('🎬 Iniciando procesamiento OPTIMIZADO de video con estilos...');
    console.log('📋 Parámetros:', {
      normalDuration,
      slowmoDuration,
      totalDuration: normalDuration + slowmoDuration,
      videoPath: path.basename(videoPath),
      overlayPath: path.basename(overlayPath),
      stylesKeys: Object.keys(styleConfig),
      resolution: '480x854 (9:16 aspect ratio, sin estiramientos)'
    });

    try {
      onProgress?.({ step: "Preparando archivos...", progress: 10, total: 100 });

      // Copiar archivos al directorio de trabajo
      const inputVideo = path.join(this.workingDir, 'input.mp4');
      const overlayPng = path.join(this.workingDir, 'overlay.png');
      
      await fs.copy(videoPath, inputVideo);
      await fs.copy(overlayPath, overlayPng);

      onProgress?.({ step: "Efectos de velocidad...", progress: 20, total: 100 });
      await this.createSpeedEffectSegments(normalDuration, slowmoDuration);

      onProgress?.({ step: "Uniendo y normalizando...", progress: 50, total: 100 });
      await this.concatenateAndNormalizeSegments();

      onProgress?.({ step: "Aplicando overlay...", progress: 70, total: 100 });
      await this.applyOverlayPNG();

      onProgress?.({ step: "Aplicando música...", progress: 85, total: 100 });
      await this.applyMusic(styleConfig);

      onProgress?.({ step: "Finalizando...", progress: 95, total: 100 });
      
      // Mover archivo final al directorio de salida
      const finalOutput = path.join(this.outputDir, `processed-${uuidv4()}.mp4`);
      await fs.move(path.join(this.workingDir, 'output.mp4'), finalOutput);

      onProgress?.({ step: "Completado", progress: 100, total: 100 });

      // Estadísticas de rendimiento
      const endTime = Date.now();
      const processingTimeSeconds = (endTime - startTime) / 1000;
      const videoLengthSeconds = normalDuration + slowmoDuration;
      const speedRatio = videoLengthSeconds / processingTimeSeconds;
      
      console.log('⏱️ ESTADÍSTICAS DE RENDIMIENTO:');
      console.log(`   • Tiempo de procesamiento: ${processingTimeSeconds.toFixed(2)} segundos`);
      console.log(`   • Duración del video: ${videoLengthSeconds} segundos`);
      console.log(`   • Ratio velocidad: ${speedRatio.toFixed(3)}x`);

      // Limpiar directorio de trabajo
      await this.cleanup();
      
      return finalOutput;
    } catch (error) {
      console.error("❌ Error fatal en el procesamiento de video:", error);
      await this.cleanup();
      throw error;
    }
  }

  async createSpeedEffectSegments(normalDuration, slowmoDuration) {
    console.log('🎬 Creando segmentos de velocidad (sin estiramientos)');
    
    const scaleFilter = "scale=480:854:force_original_aspect_ratio=decrease,pad=480:854:(ow-iw)/2:(oh-ih)/2,setsar=1";
    const commonOptions = [
      '-c:v', 'libx264', 
      '-preset', 'ultrafast', 
      '-crf', '30',
      '-profile:v', 'baseline',  // CRÍTICO: Profile H.264 compatible con móviles
      '-level', '3.0',           // Level compatible con dispositivos antiguos
      '-pix_fmt', 'yuv420p',     // Formato de pixel estándar para móviles
      '-movflags', '+faststart', // Optimización para streaming/reproducción inmediata
      '-an'                      // CRÍTICO: Eliminar audio original desde el inicio
    ];

    // Segmento 1: Video normal
    await new Promise((resolve, reject) => {
      ffmpeg(path.join(this.workingDir, 'input.mp4'))
        .inputOptions(['-t', String(normalDuration)])
        .videoFilters(scaleFilter)
        .outputOptions(commonOptions)
        .output(path.join(this.workingDir, 'seg1.mp4'))
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // Segmento 2: Video slow motion (SIN audio original)
    await new Promise((resolve, reject) => {
      ffmpeg(path.join(this.workingDir, 'input.mp4'))
        .inputOptions(['-ss', String(normalDuration), '-t', String(slowmoDuration)])
        .videoFilters(`setpts=2.0*PTS,${scaleFilter}`)
        // NO audioFilters - eliminar audio completamente
        .outputOptions(commonOptions)
        .output(path.join(this.workingDir, 'seg2.mp4'))
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    console.log('✅ Segmentos de velocidad creados');
  }

  async concatenateAndNormalizeSegments() {
    console.log('🔗 Concatenando segmentos');
    
    // CRÍTICO: Crear lista de concatenación con formato correcto
    const concatListPath = path.join(this.workingDir, 'concat_list.txt');
    const concatContent = `file 'seg1.mp4'\nfile 'seg2.mp4'`;
    
    console.log('📝 Creando concat_list.txt en:', concatListPath);
    await fs.writeFile(concatListPath, concatContent, 'utf8');
    
    // Verificar que el archivo se creó correctamente
    if (!await fs.pathExists(concatListPath)) {
      throw new Error('No se pudo crear concat_list.txt');
    }
    console.log('✅ concat_list.txt creado exitosamente');

    // Concatenar segmentos
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy'])
        .output(path.join(this.workingDir, 'concatenated.mp4'))
        .on('end', resolve)
        .on('error', (err) => {
          console.error('❌ Error en concatenación:', err);
          reject(err);
        })
        .run();
    });

    // Normalizar (eliminar audio original para evitar micrófono)
    await new Promise((resolve, reject) => {
      ffmpeg(path.join(this.workingDir, 'concatenated.mp4'))
        .outputOptions([
          '-c:v', 'copy',
          '-an'  // CRÍTICO: Eliminar todo audio original (micrófono)
        ])
        .output(path.join(this.workingDir, 'normalized.mp4'))
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // Limpiar archivos intermedios
    await fs.remove(path.join(this.workingDir, 'seg1.mp4'));
    await fs.remove(path.join(this.workingDir, 'seg2.mp4'));
    await fs.remove(concatListPath);
    await fs.remove(path.join(this.workingDir, 'concatenated.mp4'));

    console.log('✅ Segmentos concatenados y normalizados (sin audio original)');
  }

  async applyOverlayPNG() {
    console.log('🎨 Aplicando overlay PNG optimizado');
    
    await new Promise((resolve, reject) => {
      ffmpeg(path.join(this.workingDir, 'normalized.mp4'))
        .input(path.join(this.workingDir, 'overlay.png'))
        .complexFilter([
          '[0:v][1:v]overlay=0:0:format=auto'
        ])
        .outputOptions([
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-crf', '30',
          '-profile:v', 'baseline',  // CRÍTICO: Profile H.264 compatible con móviles
          '-level', '3.0',           // Level compatible con dispositivos antiguos
          '-pix_fmt', 'yuv420p',     // Formato de pixel estándar para móviles
          '-movflags', '+faststart', // Optimización para streaming/reproducción inmediata
          '-c:a', 'copy'
        ])
        .output(path.join(this.workingDir, 'styled.mp4'))
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // Limpiar archivo intermedio
    await fs.remove(path.join(this.workingDir, 'normalized.mp4'));
    console.log('✅ Overlay aplicado exitosamente');
  }

  async applyMusic(styleConfig) {
    const inputFile = path.join(this.workingDir, 'styled.mp4');
    const outputFile = path.join(this.workingDir, 'output.mp4');

    if (!styleConfig.music || styleConfig.music === "none") {
      console.log('🎵 Sin música seleccionada, copiando archivo sin audio');
      // CRÍTICO: Si no hay música, asegurar que no hay audio del micrófono
      await new Promise((resolve, reject) => {
        ffmpeg(inputFile)
          .outputOptions([
            '-c:v', 'copy',
            '-an'  // Eliminar cualquier audio original
          ])
          .output(outputFile)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
      return;
    }

    console.log(`🎵 Aplicando música: ${styleConfig.music}`);
    const musicOption = MUSIC_OPTIONS.find(m => m.id === styleConfig.music);
    
    if (!musicOption || !musicOption.file) {
      console.warn('⚠️ Música no encontrada, continuando sin audio');
      await new Promise((resolve, reject) => {
        ffmpeg(inputFile)
          .outputOptions(['-c:v', 'copy', '-an'])
          .output(outputFile)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
      return;
    }

    const musicPath = path.join(__dirname, 'assets', 'music', musicOption.file);
    
    if (!await fs.pathExists(musicPath)) {
      console.warn('⚠️ Archivo de música no existe:', musicPath);
      console.warn('⚠️ Continuando sin audio');
      await new Promise((resolve, reject) => {
        ffmpeg(inputFile)
          .outputOptions(['-c:v', 'copy', '-an'])
          .output(outputFile)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
      return;
    }

    console.log('🎵 Archivo de música encontrado:', musicPath);

    try {
      await new Promise((resolve, reject) => {
        ffmpeg(inputFile)
          .input(musicPath)
          .outputOptions([
            '-c:v', 'copy',         // No re-encodear video
            '-c:a', 'aac',          // Codec de audio
            '-b:a', '128k',         // Bitrate de audio
            '-map', '0:v:0',        // CRÍTICO: Mapear solo video del input
            '-map', '1:a:0',        // CRÍTICO: Mapear solo audio de la música
            '-shortest',            // Duración del video más corto
            '-avoid_negative_ts', 'make_zero'  // Evitar timestamps negativos
          ])
          .output(outputFile)
          .on('start', (commandLine) => {
            console.log('🎵 Comando FFmpeg para música:', commandLine);
          })
          .on('end', resolve)
          .on('error', (err) => {
            console.error('❌ Error aplicando música:', err);
            reject(err);
          })
          .run();
      });
      
      console.log('✅ Música aplicada exitosamente');
    } catch (musicError) {
      console.warn('⚠️ Error aplicando música, creando video sin audio:', musicError);
      // Fallback: crear video sin audio
      await new Promise((resolve, reject) => {
        ffmpeg(inputFile)
          .outputOptions(['-c:v', 'copy', '-an'])
          .output(outputFile)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
    }

    // Limpiar archivo intermedio
    await fs.remove(inputFile);
  }

  async cleanup() {
    try {
      if (await fs.pathExists(this.workingDir)) {
        await fs.remove(this.workingDir);
        console.log('🧹 Directorio de trabajo limpiado');
      }
    } catch (error) {
      console.error('❌ Error durante cleanup:', error);
    }
  }
}

// 🎨 Generador de Overlay (réplica de OverlayGenerator.tsx)
class OverlayGenerator {
  static async generateOverlayPNG(styleConfig) {
    console.log('🎨 Generando overlay PNG con configuración:', styleConfig);
    
    const width = 480;
    const height = 854;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Fondo transparente
    ctx.clearRect(0, 0, width, height);

    // Aplicar marco si está configurado
    if (styleConfig.frame && styleConfig.frame !== 'none') {
      await this.drawFrame(ctx, width, height, styleConfig);
    }

    // Aplicar texto si está configurado
    if (styleConfig.text && styleConfig.text.trim()) {
      await this.drawText(ctx, width, height, styleConfig);
    }

    // Indicador de música si está configurado
    if (styleConfig.music && styleConfig.music !== 'none') {
      await this.drawMusicIndicator(ctx, width, height, styleConfig);
    }

    // Convertir canvas a PNG buffer
    const buffer = canvas.toBuffer('image/png');
    return buffer;
  }

  static async drawFrame(ctx, width, height, styleConfig) {
    if (styleConfig.frame === 'custom') {
      // Marco personalizado con color
      const borderWidth = 20;
      const color = styleConfig.frameColor || '#8B5CF6';
      
      ctx.strokeStyle = color;
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(borderWidth / 2, borderWidth / 2, width - borderWidth, height - borderWidth);
    }
    // Aquí se pueden añadir más tipos de marcos predefinidos
  }

  static async drawText(ctx, width, height, styleConfig) {
    const text = styleConfig.text;
    const fontFamily = styleConfig.textFont || 'montserrat';
    const color = styleConfig.textColor || '#FFFFFF';
    
    // Configurar fuente
    const fontSize = Math.max(24, width * 0.05);
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px Arial`; // Fallback font
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Posición del texto (parte inferior)
    const x = width / 2;
    const y = height - 100;

    // Sombra del texto para mejor legibilidad
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Dibujar texto
    ctx.fillText(text, x, y);
    
    // Limpiar sombra
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  static async drawMusicIndicator(ctx, width, height, styleConfig) {
    const musicOption = MUSIC_OPTIONS.find(m => m.id === styleConfig.music);
    if (!musicOption) return;

    // Indicador musical en la esquina superior derecha
    const size = 40;
    const x = width - size - 20;
    const y = 20;

    // Fondo semi-transparente
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x - 10, y - 10, size + 20, size + 20);

    // Icono de música (nota musical simple)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♪', x + size / 2, y + size / 2);
  }
}

// 🚀 RUTAS DE LA API

// Ruta de salud
app.get('/', (req, res) => {
  res.json({
    status: 'active',
    message: 'Servidor de procesamiento Avitec 360 ✅',
    version: '1.0.0',
    capabilities: [
      'Procesamiento de video 480x854',
      'Efectos de velocidad (normal + slow motion)', 
      'Overlay PNG con frames y texto',
      'Aplicación de música',
      'Optimizaciones para móviles'
    ]
  });
});

// Ruta principal de procesamiento
app.post('/process-video', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'overlay', maxCount: 1 }
]), async (req, res) => {
  const processingId = uuidv4();
  console.log(`🎬 Iniciando procesamiento ${processingId}`);

  try {
    // Validar archivos recibidos
    if (!req.files.video || !req.files.video[0]) {
      return res.status(400).json({ error: 'Video requerido' });
    }

    const videoFile = req.files.video[0];
    let overlayPath = null;

    // Procesar configuración de estilo
    const styleConfig = JSON.parse(req.body.styleConfig || '{}');
    const normalDuration = parseFloat(req.body.normalDuration) || 5;
    const slowmoDuration = parseFloat(req.body.slowmoDuration) || 5;

    console.log('📋 Configuración recibida:', {
      processingId,
      styleConfig,
      normalDuration,
      slowmoDuration,
      videoSize: videoFile.size,
      overlayReceived: !!req.files.overlay
    });

    // Generar overlay si no se proporciona
    if (req.files.overlay && req.files.overlay[0]) {
      overlayPath = req.files.overlay[0].path;
    } else {
      console.log('🎨 Generando overlay PNG automáticamente');
      const overlayBuffer = await OverlayGenerator.generateOverlayPNG(styleConfig);
      overlayPath = path.join(__dirname, 'temp', `overlay-${processingId}.png`);
      await fs.ensureDir(path.dirname(overlayPath));
      await fs.writeFile(overlayPath, overlayBuffer);
    }

    // Función de progreso que envía actualizaciones al cliente
    const onProgress = (progress) => {
      console.log(`📊 Progreso ${processingId}: ${progress.step} (${progress.progress}%)`);
      // En una implementación real, podrías usar WebSockets o Server-Sent Events
      // para enviar progreso en tiempo real
    };

    // Procesar video
    const processor = new VideoProcessor();
    await processor.initialize();
    
    const outputPath = await processor.processWithStyles(
      videoFile.path,
      overlayPath,
      styleConfig,
      normalDuration,
      slowmoDuration,
      onProgress
    );

    // Enviar archivo procesado
    console.log(`✅ Procesamiento ${processingId} completado: ${path.basename(outputPath)}`);
    
    res.download(outputPath, `video-360-${processingId}.mp4`, async (err) => {
      if (err) {
        console.error(`❌ Error enviando archivo ${processingId}:`, err);
      }
      
      // Limpiar archivos temporales
      try {
        await fs.remove(videoFile.path);
        if (overlayPath && overlayPath.includes('temp')) {
          await fs.remove(overlayPath);
        }
        await fs.remove(outputPath);
        console.log(`🧹 Archivos temporales ${processingId} eliminados`);
      } catch (cleanupError) {
        console.error(`❌ Error limpiando ${processingId}:`, cleanupError);
      }
    });

  } catch (error) {
    console.error(`❌ Error fatal procesamiento ${processingId}:`, error);
    res.status(500).json({
      error: 'Error procesando video',
      message: error.message,
      processingId
    });
  }
});

// Ruta para obtener opciones disponibles
app.get('/options', (req, res) => {
  res.json({
    music: MUSIC_OPTIONS,
    fonts: FONT_OPTIONS,
    frames: [
      { id: "none", name: "Sin marco" },
      { id: "custom", name: "Personalizado" }
    ],
    colors: [
      "#8B5CF6", "#EC4899", "#EF4444", "#F97316", "#EAB308",
      "#22C55E", "#06B6D4", "#3B82F6", "#6366F1", "#FFFFFF", "#000000"
    ]
  });
});

// Middleware de manejo de errores
app.use((error, req, res, next) => {
  console.error('❌ Error de servidor:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Archivo demasiado grande (máx: 100MB)' });
    }
  }
  
  res.status(500).json({
    error: 'Error interno del servidor',
    message: error.message
  });
});

// Limpiar archivos temporales al iniciar
const cleanupOldFiles = async () => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    const processedDir = path.join(__dirname, 'processed');
    const tempDir = path.join(__dirname, 'temp');
    
    await fs.ensureDir(uploadsDir);
    await fs.ensureDir(processedDir);
    await fs.ensureDir(tempDir);
    
    // Limpiar archivos de más de 1 hora
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const dir of [uploadsDir, processedDir, tempDir]) {
      const files = await fs.readdir(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        if (stats.mtime.getTime() < oneHourAgo) {
          await fs.remove(filePath);
          console.log(`🧹 Archivo antiguo eliminado: ${file}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error limpiando archivos antiguos:', error);
  }
};

// Iniciar servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Servidor Avitec 360 Backend iniciado en puerto ${PORT}`);
  console.log(`📋 Configuración:`);
  console.log(`   • FFmpeg: ${ffmpegPath}`);
  console.log(`   • Resolución de salida: 480x854 (9:16)`);
  console.log(`   • Optimizaciones: ultrafast preset, CRF 30`);
  console.log(`   • Límite de archivo: 100MB`);
  
  // Verificar archivos de música al iniciar
  console.log(`🎵 Verificando archivos de música:`);
  for (const music of MUSIC_OPTIONS) {
    if (music.file) {
      const musicPath = path.join(__dirname, 'assets', 'music', music.file);
      const exists = await fs.pathExists(musicPath);
      console.log(`   • ${music.name}: ${exists ? '✅' : '❌'} (${musicPath})`);
    }
  }
  
  // Limpiar archivos antiguos al iniciar
  await cleanupOldFiles();
  
  // Limpiar archivos cada hora
  setInterval(cleanupOldFiles, 60 * 60 * 1000);
});

module.exports = app;
