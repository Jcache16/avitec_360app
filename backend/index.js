/**
 * 🎬 AVITEC 360 BACKEND - PROCESAMIENTO DE VIDEOS
 * 
 * Versión 1.5.0 - Solo procesamiento de video (sin generación de overlays)
 */

const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs-extra');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

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
    this.ffmpegTimeout = 120 * 1000; // 120 segundos timeout para videos móviles complejos
  }

  log(message) {
    console.log(`[${this.processingId}] ${message}`);
  }

  runCommandWithTimeout(command, commandName = 'ffmpeg') {
    return new Promise((resolve, reject) => {
      let timeoutId;
      let processKilled = false;
      let commandProcess = null;

      command
        .on('start', (commandLine) => {
          this.log(`[${commandName}] Comando iniciado: ${commandLine}`);
          this.log(`[${commandName}] ⏱️ Timeout configurado: ${this.ffmpegTimeout / 1000} segundos`);
          timeoutId = setTimeout(() => {
            processKilled = true;
            this.log(`[${commandName}] ⏰ TIMEOUT - Matando proceso después de ${this.ffmpegTimeout / 1000}s`);
            
            // Intentar obtener el proceso si está disponible
            if (commandProcess) {
              try {
                // Kill más agresivo para Windows
                if (process.platform === 'win32') {
                  // En Windows usar taskkill para matar el árbol de procesos
                  const { spawn } = require('child_process');
                  spawn('taskkill', ['/pid', commandProcess.pid, '/t', '/f'], { stdio: 'ignore' });
                } else {
                  // En Unix usar kill normal
                  process.kill(commandProcess.pid, 'SIGKILL');
                }
                this.log(`[${commandName}] 💀 Proceso terminado forzadamente (PID: ${commandProcess.pid})`);
              } catch (killError) {
                this.log(`[${commandName}] ❌ Error en kill: ${killError.message}`);
              }
            } else {
              // Fallback: intentar kill a través de fluent-ffmpeg
              try {
                command.kill('SIGTERM');
                setTimeout(() => {
                  try {
                    command.kill('SIGKILL');
                  } catch (killError) {
                    this.log(`[${commandName}] ❌ Error en kill forzado: ${killError.message}`);
                  }
                }, 2000);
              } catch (killError) {
                this.log(`[${commandName}] ❌ Error en kill suave: ${killError.message}`);
              }
            }
            
            reject(new Error(`[${commandName}] TIMEOUT: El proceso tardó más de ${this.ffmpegTimeout / 1000} segundos. Proceso: ${processKilled ? 'terminado' : 'no terminado'}`));
          }, this.ffmpegTimeout);
        })
        .on('progress', (progress) => {
          if (progress.percent && !isNaN(progress.percent)) {
            this.log(`[${commandName}] 📊 Progreso: ${Math.floor(progress.percent)}%`);
          } else if (progress.frames) {
            this.log(`[${commandName}] 🔄 Procesando... Frames: ${progress.frames}`);
          } else {
            this.log(`[${commandName}] 🔄 Procesando...`);
          }
        })
        .on('end', (stdout, stderr) => {
          clearTimeout(timeoutId);
          if (processKilled) {
            this.log(`[${commandName}] ⚠️ Proceso completado después del timeout`);
            return; // No resolver si ya se rechazó por timeout
          }
          this.log(`[${commandName}] ✅ Proceso completado exitosamente.`);
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          clearTimeout(timeoutId);
          if (processKilled) {
            this.log(`[${commandName}] ⚠️ Error recibido después del timeout`);
            return; // No rechazar de nuevo si ya se rechazó por timeout
          }
          
          this.log(`[${commandName}] ❌ Error en el proceso: ${err.message}`);
          if (stderr) {
            this.log(`[${commandName}] stderr: ${stderr.substring(0, 500)}...`); // Limitar stderr log
          }
          reject(new Error(`[${commandName}] Error: ${err.message}`));
        });

      // Intentar capturar la referencia del proceso cuando sea posible
      try {
        commandProcess = command.ffmpegProc;
      } catch (e) {
        // No siempre está disponible, no es crítico
      }

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
      // Validar archivo de video antes del procesamiento
      const isValidVideo = await this.validateVideoFile(videoPath);
      if (!isValidVideo) {
        throw new Error('Archivo de video inválido o corrupto');
      }
      
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

  // Nueva función SIMPLIFICADA para validar archivos de video
  async validateVideoFile(videoPath) {
    this.log(`🔍 Validando archivo de video (modo rápido): ${path.basename(videoPath)}`);
    
    try {
      // Verificar que el archivo existe y tiene tamaño > 0
      const stats = await fs.stat(videoPath);
      if (stats.size === 0) {
        this.log('❌ Archivo de video vacío');
        return false;
      }
      
      if (stats.size < 1024) { // Menos de 1KB es sospechoso
        this.log('❌ Archivo de video demasiado pequeño');
        return false;
      }
      
      this.log(`📊 Tamaño del archivo: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      
      // OPTIMIZACIÓN: Solo verificar que el archivo sea legible por FFmpeg
      // Sin análisis detallado de metadata para máximo rendimiento
      try {
        // Test rápido: intentar leer los primeros segundos
        const testOutputPath = path.join(this.workingDir, 'test-frame.jpg');
        const testCommand = ffmpeg(videoPath)
          .inputOptions(['-t', '0.1'])  // Solo los primeros 0.1 segundos
          .outputOptions(['-vf', 'scale=100:100', '-vframes', '1'])
          .output(testOutputPath);
          
        await this.runCommandWithTimeout(testCommand, 'Validación Rápida');
        
        // Si llegamos aquí, el video es válido
        if (await fs.pathExists(testOutputPath)) {
          await fs.remove(testOutputPath);
        }
        
        this.log(`✅ Video válido (verificación rápida exitosa)`);
        return true;
        
      } catch (testError) {
        this.log(`❌ Video inválido o corrupto: ${testError.message}`);
        return false;
      }
      
    } catch (statError) {
      this.log(`❌ Error accediendo al archivo: ${statError.message}`);
      return false;
    }
  }

  async normalizeInputVideo(inputPath) {
    this.log(`🔄 Normalizando video (DETECCIÓN HÍBRIDA RÁPIDA): ${path.basename(inputPath)}`);
    const outputPath = path.join(this.workingDir, 'input.mp4');
    
    // ESTRATEGIA HÍBRIDA: Detección mínima solo para videos problemáticos de webapp
    this.log(`⚡ MODO HÍBRIDO: Detección rápida + optimización de rendimiento`);
    
    try {
      // PASO 1: Detección ultra-rápida solo de rotación crítica
      let needsRotation = false;
      let rotationFilter = '';
      
      try {
        // Usar ffprobe con timeout corto solo para metadata de rotación
        const rotationInfo = await this.getQuickRotationInfo(inputPath);
        
        if (rotationInfo.needsRotation) {
          needsRotation = true;
          rotationFilter = rotationInfo.filter;
          this.log(`🔧 Rotación detectada: ${rotationInfo.rotation}° - aplicando corrección`);
        } else {
          this.log(`✅ Sin rotación necesaria - procesamiento directo`);
        }
        
      } catch (detectionError) {
        this.log(`⚠️ Detección falló: ${detectionError.message} - asumiendo sin rotación`);
        needsRotation = false;
      }
      
      // PASO 2: Aplicar filtro optimizado según detección
      const scaleFilter = 'scale=480:854:force_original_aspect_ratio=decrease,pad=480:854:(ow-iw)/2:(oh-ih)/2:color=black';
      const videoFilter = needsRotation ? `${rotationFilter},${scaleFilter}` : scaleFilter;
      
      const command = ffmpeg(inputPath)
        .outputOptions([
          '-c:v', 'libx264',
          '-preset', 'veryfast',    // Mantenemos velocidad
          '-crf', '32',             // Calidad optimizada
          '-vf', videoFilter,
          '-r', '24',               // Frame rate fijo
          '-an',                    // Sin audio en normalización
          '-movflags', '+faststart'
        ])
        .output(outputPath);
        
      this.log(`🚀 Filtro aplicado: ${videoFilter}`);
      await this.runCommandWithTimeout(command, 'Normalización Híbrida');
      await fs.remove(inputPath);
      return outputPath;
      
    } catch (error) {
      this.log(`❌ Error en normalización híbrida: ${error.message}`);
      
      // Fallback más robusto: usar autorotate de FFmpeg
      this.log(`🔄 Usando fallback con autorotate (más robusto)`);
      
      try {
        const fallbackCommand = ffmpeg(inputPath)
          .inputOptions(['-autorotate', '1'])  // Autorotate en input
          .outputOptions([
            '-c:v', 'libx264',
            '-preset', 'fast',        // Preset más compatible
            '-crf', '33',             // Balanceado
            '-vf', 'scale=480:854:force_original_aspect_ratio=decrease,pad=480:854:(ow-iw)/2:(oh-ih)/2:color=black',
            '-r', '24',
            '-an',
            '-movflags', '+faststart'
          ])
          .output(outputPath);
          
        await this.runCommandWithTimeout(fallbackCommand, 'Fallback Autorotate');
        await fs.remove(inputPath);
        return outputPath;
        
      } catch (fallbackError) {
        this.log(`❌ Fallback autorotate falló: ${fallbackError.message}`);
        throw new Error(`Normalización falló: ${fallbackError.message}`);
      }
    }
  }

  // Función ultra-rápida para detectar SOLO rotación crítica
  async getQuickRotationInfo(videoPath) {
    return new Promise((resolve, reject) => {
      // Timeout corto para análisis rápido
      const quickTimeout = setTimeout(() => {
        reject(new Error('Timeout en detección rápida'));
      }, 10000); // Solo 10 segundos
      
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        clearTimeout(quickTimeout);
        
        if (err) {
          this.log(`⚠️ Error en ffprobe rápido: ${err.message}`);
          reject(err);
          return;
        }
        
        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        if (!videoStream) {
          resolve({ needsRotation: false, rotation: 0, filter: '' });
          return;
        }
        
        let rotation = 0;
        
        // DETECCIÓN RÁPIDA - Solo los casos más comunes
        try {
          // Método 1: Tags directos (más común en webapp)
          if (videoStream.tags) {
            if (videoStream.tags.rotate) {
              rotation = parseInt(videoStream.tags.rotate) || 0;
            } else if (videoStream.tags.rotation) {
              rotation = parseInt(videoStream.tags.rotation) || 0;
            }
          }
          
          // Método 2: Display Matrix (iOS webkit)
          if (videoStream.side_data_list && rotation === 0) {
            const displayMatrix = videoStream.side_data_list.find(sd => 
              sd.side_data_type === 'Display Matrix'
            );
            
            if (displayMatrix && displayMatrix.rotation !== undefined) {
              rotation = Math.abs(parseInt(displayMatrix.rotation) || 0);
            }
          }
          
        } catch (rotError) {
          this.log(`⚠️ Error en detección rápida: ${rotError.message}`);
          rotation = 0;
        }
        
        // Normalizar rotación
        rotation = rotation % 360;
        if (rotation < 0) rotation += 360;
        
        // Determinar si necesita rotación y qué filtro
        let needsRotation = false;
        let filter = '';
        
        if (rotation === 90) {
          needsRotation = true;
          filter = 'transpose=1'; // 90° horario
          this.log(`🔄 Detectado: 90° horario - webapp iPhone típico`);
        } else if (rotation === 270) {
          needsRotation = true;
          filter = 'transpose=2'; // 90° antihorario
          this.log(`🔄 Detectado: 270° antihorario - webapp rotado`);
        } else if (rotation === 180) {
          needsRotation = true;
          filter = 'transpose=2,transpose=2'; // 180°
          this.log(`🔄 Detectado: 180° - video invertido`);
        } else {
          this.log(`✅ Sin rotación crítica detectada (${rotation}°)`);
        }
        
        resolve({
          needsRotation,
          rotation,
          filter
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

// 🚀 RUTAS DE LA API
app.get('/', (req, res) => res.json({ status: 'active', version: '1.5.0' }));

app.post('/process-video', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'overlay', maxCount: 1 }]), async (req, res) => {
  const processingId = uuidv4();
  console.log(`[${processingId}] 📥 Petición POST /process-video recibida.`);
  console.log(`[${processingId}] 🔍 User-Agent: ${req.headers['user-agent'] || 'unknown'}`);

  try {
    if (!req.files || !req.files.video || !req.files.video[0]) {
      return res.status(400).json({ error: 'Video requerido', processingId });
    }

    const videoFile = req.files.video[0];
    console.log(`[${processingId}] 📁 Video recibido: ${videoFile.originalname} (${(videoFile.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`[${processingId}] 📝 Mimetype: ${videoFile.mimetype}`);
    
    const styleConfig = JSON.parse(req.body.styleConfig || '{}');
    const normalDuration = parseFloat(req.body.normalDuration) || 5;
    const slowmoDuration = parseFloat(req.body.slowmoDuration) || 5;
    
    console.log(`[${processingId}] ⚙️ Configuración: Normal=${normalDuration}s, Slowmo=${slowmoDuration}s, Música=${styleConfig.music || 'none'}`);

    let overlayPath;
    if (req.files.overlay && req.files.overlay[0]) {
      // USAR OVERLAY DEL FRONTEND (preferido)
      overlayPath = req.files.overlay[0].path;
      console.log(`[${processingId}] 🎨 Usando overlay del frontend: ${(req.files.overlay[0].size / 1024).toFixed(2)} KB`);
    } else {
      // ERROR: El overlay es requerido desde el frontend
      console.log(`[${processingId}] ❌ No se recibió overlay del frontend - esto es requerido`);
      return res.status(400).json({ 
        error: 'Overlay PNG requerido desde el frontend', 
        message: 'El frontend debe enviar el overlay generado',
        processingId 
      });
    }

    const processor = new VideoProcessor(processingId);
    await processor.initialize();
    
    console.log(`[${processingId}] 🚀 Iniciando procesamiento de video...`);
    const outputPath = await processor.processWithStyles(videoFile.path, overlayPath, styleConfig, normalDuration, slowmoDuration);

    console.log(`[${processingId}] ✅ Procesamiento completado. Enviando archivo: ${path.basename(outputPath)}`);
    
    res.download(outputPath, `video-360-${processingId}.mp4`, async (err) => {
      if (err) {
        console.error(`[${processingId}] ❌ Error enviando archivo:`, err);
      } else {
        console.log(`[${processingId}] 📤 Archivo enviado exitosamente`);
      }
      
      // Limpieza de archivos
      try {
        if (await fs.pathExists(videoFile.path)) await fs.remove(videoFile.path);
        if (await fs.pathExists(overlayPath)) await fs.remove(overlayPath);
        if (await fs.pathExists(outputPath)) await fs.remove(outputPath);
        console.log(`[${processingId}] 🧹 Archivos limpiados`);
      } catch (cleanupError) {
        console.error(`[${processingId}] ❌ Error limpiando archivos post-envío:`, cleanupError);
      }
    });

  } catch (error) {
    console.error(`[${processingId}] ❌ Error fatal en la ruta /process-video:`, error);
    
    // Determinar tipo de error para mejor respuesta
    let statusCode = 500;
    let errorMessage = 'Error procesando video';
    
    if (error.message.includes('TIMEOUT')) {
      statusCode = 408;
      errorMessage = 'El procesamiento del video tardó demasiado tiempo. Intente con un video más corto o de menor calidad.';
    } else if (error.message.includes('inválido') || error.message.includes('corrupto')) {
      statusCode = 400;
      errorMessage = 'El archivo de video no es válido o está corrupto. Intente con otro archivo.';
    } else if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
      statusCode = 400;
      errorMessage = 'Archivo de video no encontrado o inaccesible.';
    } else if (error.message.includes('memory') || error.message.includes('ENOMEM')) {
      statusCode = 507;
      errorMessage = 'Memoria insuficiente para procesar el video. Intente con un video más pequeño.';
    }
    
    res.status(statusCode).json({ 
      error: errorMessage, 
      technicalError: error.message, 
      processingId,
      timestamp: new Date().toISOString()
    });
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