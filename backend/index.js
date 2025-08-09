/**
 * 🎬 AVITEC 360 BACKEND - PROCESAMIENTO DE VIDEOS
 * 
 * Versión 1.6.0 - Pipeline de 1 pasada optimizado (sin generación de overlays)
 */

// Cargar variables de entorno al inicio
require('dotenv').config();

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
  // Permitir configurar por ENV; por defecto 240s para hardware limitado
  this.ffmpegTimeout = parseInt(process.env.FFMPEG_TIMEOUT_MS || '240000');
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

      // Detección rápida de rotación/aspecto para el pipeline de 1 pasada
      let rotationInfo = { needsRotation: false, filter: '', needsCrop: false };
      try {
        rotationInfo = await this.getQuickRotationInfo(originalInput);
      } catch (e) {
        this.log(`⚠️ No se pudo obtener rotación/aspecto: ${e.message}`);
      }

      // Pipeline optimizado de 1 pasada (fallback automático al flujo previo si falla)
      let encodedOncePath;
      try {
        encodedOncePath = await this.singlePassProcess(originalInput, overlayPath, normalDuration, slowmoDuration, rotationInfo);
        this.log('✅ Pipeline de 1 pasada completado');
      } catch (spErr) {
        this.log(`⚠️ Pipeline de 1 pasada falló: ${spErr.message} → usando flujo previo`);

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
        encodedOncePath = await this.applyOverlayPNG(concatenatedVideo, overlayPath);
      }

      const finalVideo = await this.applyMusic(encodedOncePath, styleConfig);

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

  // Pipeline de UNA pasada: escala/pad o crop → recorte por tiempo + slowmo → concat → overlay → encode H.264
  async singlePassProcess(inputPath, overlaySourcePath, normalDuration, slowmoDuration, rotationInfo) {
    this.log('⚡ Ejecutando pipeline de 1 pasada (filter_complex)');
    const outputPath = path.join(this.workingDir, 'onepass.mp4');

    // Copiar overlay localmente para rutas seguras
    const overlayPath = path.join(this.workingDir, 'overlay.png');
    await fs.copy(overlaySourcePath, overlayPath);

    // Construir filtros de preproceso (rotación + escalado 720x1280 → pad o crop inteligente)
    const baseScale = rotationInfo && rotationInfo.needsCrop
      ? 'scale=960:1280:force_original_aspect_ratio=increase,crop=720:1280'
      : 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black';
    const rotate = rotationInfo && rotationInfo.needsRotation ? `${rotationInfo.filter},` : '';

    // Calcular duraciones saneadas
    const N = Math.max(0, Number(normalDuration) || 0);
    const S = Math.max(0, Number(slowmoDuration) || 0);

    // Filtros: preparar video base 720x1280 en [prep]
    // Según N/S construir grafo evitando concat si no aplica
    let filterGraph;
    if (N > 0 && S > 0) {
      filterGraph = [
        `[0:v]${rotate}${baseScale},setpts=PTS[prep]`,
        `[prep]split=2[s1][s2]`,
        `[s1]trim=start=0:end=${N},setpts=PTS-STARTPTS[v1]`,
        `[s2]trim=start=${N}:end=${N + S},setpts=2.0*(PTS-STARTPTS)[v2]`,
        `[v1][v2]concat=n=2:v=1:a=0[base]`,
        `[1:v]scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2[ovr]`,
        `[base][ovr]overlay=0:0:format=auto:eval=init[vout]`
      ].join(';');
    } else if (N > 0) {
      filterGraph = [
        `[0:v]${rotate}${baseScale},setpts=PTS[prep]`,
        `[prep]trim=start=0:end=${N},setpts=PTS-STARTPTS[base]`,
        `[1:v]scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2[ovr]`,
        `[base][ovr]overlay=0:0:format=auto:eval=init[vout]`
      ].join(';');
    } else if (S > 0) {
      filterGraph = [
        `[0:v]${rotate}${baseScale},setpts=PTS[prep]`,
        `[prep]trim=start=0:end=${S},setpts=2.0*(PTS-STARTPTS)[base]`,
        `[1:v]scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2[ovr]`,
        `[base][ovr]overlay=0:0:format=auto:eval=init[vout]`
      ].join(';');
    } else {
      // Si ambos son 0, producir 1s de video para evitar error
      filterGraph = [
        `[0:v]${rotate}${baseScale},trim=start=0:end=1,setpts=PTS-STARTPTS[base]`,
        `[1:v]scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2[ovr]`,
        `[base][ovr]overlay=0:0:format=auto:eval=init[vout]`
      ].join(';');
    }

    // Opciones de codificación optimizadas para CPU mínima
    const outputOpts = [
      '-map', '[vout]',
      '-c:v', 'libx264',
      '-preset', process.env.X264_PRESET || 'ultrafast',
      '-crf', process.env.X264_CRF || '30',
      '-profile:v', process.env.X264_PROFILE || 'baseline',
      '-level', '4.0',
      '-pix_fmt', 'yuv420p',
      '-r', '24',
      '-g', '48',
      '-movflags', '+faststart',
      '-an',
      '-threads', process.env.FFMPEG_THREADS || '1',
      '-max_muxing_queue_size', '1024'
    ];

    // Construir comando
    const totalRead = (N + S) > 0 ? (N + S) : 1;
    const command = ffmpeg()
      .input(inputPath)
      .inputOptions(['-t', String(totalRead)])
      .input(overlayPath)
      .complexFilter(filterGraph)
      .outputOptions(outputOpts)
      .output(outputPath);

    await this.runCommandWithTimeout(command, '1-Pasada');

    // Limpiezas locales
    if (await fs.pathExists(overlayPath)) await fs.remove(overlayPath);
    return outputPath;
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
    
    // ESTRATEGIA HÍBRIDA: Detección mínima + crop inteligente + 720p vertical
    this.log(`⚡ MODO HÍBRIDO: Detección rápida + optimización de aspecto en 720p`);
    
    try {
      // PASO 1: Detección ultra-rápida de rotación Y proporción
      let needsRotation = false;
      let rotationFilter = '';
      let needsCrop = false;
      
      try {
        // Usar ffprobe con timeout corto para metadata de rotación y aspecto
        const videoInfo = await this.getQuickRotationInfo(inputPath);
        
        if (videoInfo.needsRotation) {
          needsRotation = true;
          rotationFilter = videoInfo.filter;
          this.log(`🔧 Rotación detectada: ${videoInfo.rotation}° - aplicando corrección`);
        } else {
          this.log(`✅ Sin rotación necesaria - procesamiento directo`);
        }
        
        if (videoInfo.needsCrop) {
          needsCrop = true;
          this.log(`✂️ Video 4:3 detectado - aplicando crop inteligente`);
        }
        
      } catch (detectionError) {
        this.log(`⚠️ Detección falló: ${detectionError.message} - asumiendo sin rotación ni crop`);
        needsRotation = false;
        needsCrop = false;
      }
      
      // PASO 2: Aplicar filtro optimizado según detección (720p vertical)
      let scaleFilter;
      if (needsCrop) {
        // Para videos 4:3: crop inteligente que llena el marco completo en 720p
        scaleFilter = 'scale=960:1280:force_original_aspect_ratio=increase,crop=720:1280';
        this.log(`📐 Usando crop inteligente para video 4:3 → escala a 960x1280 y corta a 720x1280 (720p)`);
      } else {
        // Para otros formatos: padding tradicional en 720p
        scaleFilter = 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black';
        this.log(`📐 Usando escalado con padding para preservar proporción en 720p (720x1280)`);
      }
      const videoFilter = needsRotation ? `${rotationFilter},${scaleFilter}` : scaleFilter;
      
    const command = ffmpeg(inputPath)
        .outputOptions([
          '-c:v', 'libx264',
      '-preset', process.env.X264_PRESET || 'ultrafast',    // Máxima velocidad
      '-crf', process.env.X264_CRF || '30',                 // Calidad vs tamaño
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
      '-preset', process.env.X264_PRESET || 'ultrafast',
      '-crf', process.env.X264_CRF || '30',
            '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black',
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

  // Función ultra-rápida para detectar rotación crítica Y proporción de aspecto
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
          resolve({ needsRotation: false, rotation: 0, filter: '', aspectRatio: null, needsCrop: false });
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
        
        // DETECTAR PROPORCIÓN DE ASPECTO
        const width = videoStream.width || 0;
        const height = videoStream.height || 0;
        let aspectRatio = null;
        let needsCrop = false;
        
        if (width > 0 && height > 0) {
          const ratio = width / height;
          aspectRatio = ratio;
          
          // Detectar videos 4:3 (ratio ≈ 1.33) que necesitan crop para 9:16 vertical en 720p
          if (Math.abs(ratio - (4/3)) < 0.1) { // 4:3 con tolerancia
            needsCrop = true;
            this.log(`📐 Video 4:3 detectado (${width}x${height}, ratio: ${ratio.toFixed(2)}) - aplicando crop inteligente a 720p`);
          } else if (Math.abs(ratio - (3/4)) < 0.1) { // 3:4 (ya vertical)
            this.log(`📐 Video 3:4 detectado (${width}x${height}, ratio: ${ratio.toFixed(2)}) - ya es vertical, escalando a 720p`);
          } else {
            this.log(`📐 Proporción detectada: ${width}x${height} (ratio: ${ratio.toFixed(2)}) - escalando a 720p`);
          }
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
          filter,
          aspectRatio,
          needsCrop,
          width,
          height
        });
      });
    });
  }

  async createSpeedEffectSegments(inputVideoPath, normalDuration, slowmoDuration) {
    // Opciones optimizadas para 720p vertical
    const commonOptions = [
      '-c:v', 'libx264', 
      '-preset', process.env.X264_PRESET || 'ultrafast',
      '-crf', process.env.X264_CRF || '30',
      '-s', '720x1280',         // Resolución 720p vertical
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

    const command = ffmpeg(inputPath)
      .input(overlayPath)
      .complexFilter('[0:v][1:v]overlay=0:0:format=auto')
      .outputOptions([
        '-c:v', 'libx264',
        '-preset', process.env.X264_PRESET || 'ultrafast',
        '-crf', process.env.X264_CRF || '30',
        '-profile:v', process.env.X264_PROFILE || 'baseline',
        '-level', '4.0',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-r', '24',
        '-g', '48',
        '-threads', process.env.FFMPEG_THREADS || '1'
      ])
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
app.get('/', (req, res) => res.json({ status: 'active', version: '1.6.0' }));

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
    
    // Obtener información del archivo para posible subida a Drive
    const outputStats = await fs.stat(outputPath);
    const outputFileName = `video-360-${processingId}.mp4`;
    
    // Agregar headers con metadata del archivo procesado
    res.setHeader('X-Processed-File-Path', outputPath);
    res.setHeader('X-Processed-File-Name', outputFileName);
    res.setHeader('X-Processed-File-Size', outputStats.size.toString());
    res.setHeader('X-Processing-Id', processingId);
    
    res.download(outputPath, outputFileName, async (err) => {
      if (err) {
        console.error(`[${processingId}] ❌ Error enviando archivo:`, err);
      } else {
        console.log(`[${processingId}] 📤 Archivo enviado exitosamente`);
      }
      
      // NOTA: NO eliminar outputPath inmediatamente para permitir subida a Drive
      // El archivo se limpiará después con el cleanup automático de archivos antiguos
      
      // Limpieza de archivos temporales únicamente
      try {
        if (await fs.pathExists(videoFile.path)) await fs.remove(videoFile.path);
        if (await fs.pathExists(overlayPath)) await fs.remove(overlayPath);
        console.log(`[${processingId}] 🧹 Archivos temporales limpiados (output preservado para Drive)`);
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

// 🌐 RUTAS DE GOOGLE DRIVE - INCLUIR OAUTH

// Importar rutas OAuth
const uploadOAuthRouter = require('./routes/upload-oauth');
app.use('/api/upload', uploadOAuthRouter);

/**
 * Verificar conexión con Google Drive (Service Account)
 */
app.get('/drive/test', async (req, res) => {
  try {
    const { testDriveConnection } = require('./services/driveUtils');
    const isConnected = await testDriveConnection();
    
    if (isConnected) {
      res.json({ 
        success: true, 
        message: 'Conexión con Google Drive (Service Account) exitosa',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'No se pudo conectar con Google Drive',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Error en test de Google Drive:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Verificar conexión OAuth con Google Drive 
 */
app.get('/drive/test-oauth', async (req, res) => {
  try {
    const { testOAuthConnection } = require('./services/googleDriveOAuth');
    const result = await testOAuthConnection();
    
    res.json({ 
      success: true, 
      message: 'Conexión OAuth con Google Drive exitosa',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error en test OAuth de Google Drive:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Subir video procesado a Google Drive
 */
app.post('/upload-to-drive', async (req, res) => {
  const uploadId = uuidv4();
  console.log(`[${uploadId}] 📤 Iniciando subida a Google Drive`);
  
  try {
    // Manejar dos tipos de entrada:
    // 1. Archivo ya existente en el servidor (filePath)
    // 2. Datos del video enviados desde el frontend (videoData)
    
    let localFilePath;
    let fileName;
    let shouldCleanupFile = false;
    
    if (req.body.filePath) {
      // Caso 1: Archivo ya existe en el servidor
      const { filePath, fileName: providedFileName, customDate } = req.body;
      
      if (!await fs.pathExists(filePath)) {
        return res.status(404).json({ 
          success: false, 
          error: 'Archivo no encontrado en el servidor',
          uploadId
        });
      }
      
      localFilePath = filePath;
      fileName = providedFileName || path.basename(filePath);
      
    } else if (req.body.videoData && req.body.fileName) {
      // Caso 2: Datos del video enviados desde frontend
      console.log(`[${uploadId}] 📦 Recibiendo datos de video desde frontend`);
      
      const { videoData, fileName: providedFileName, customDate } = req.body;
      
      if (!Array.isArray(videoData)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Formato de videoData inválido',
          uploadId
        });
      }
      
      // Crear archivo temporal desde los datos
      const tempDir = path.join(__dirname, 'temp');
      await fs.ensureDir(tempDir);
      
      localFilePath = path.join(tempDir, `temp-${uploadId}.mp4`);
      fileName = providedFileName;
      shouldCleanupFile = true;
      
      // Convertir array de bytes a Buffer y escribir archivo
      const videoBuffer = Buffer.from(videoData);
      await fs.writeFile(localFilePath, videoBuffer);
      
      console.log(`[${uploadId}] 💾 Archivo temporal creado: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);
      
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Parámetros requeridos: (filePath y fileName) o (videoData y fileName)',
        uploadId
      });
    }
    
    console.log(`[${uploadId}] 📁 Archivo a subir: ${fileName} (${localFilePath})`);
    
    // Obtener fecha para la carpeta (usar customDate si se proporciona, sino fecha actual)
    const customDate = req.body.customDate;
    const date = customDate || new Date().toISOString().split('T')[0];
    console.log(`[${uploadId}] 📅 Fecha de carpeta: ${date}`);
    
    const { ensureDateFolder, uploadVideoToDrive, getFolderPublicLink, getFilePublicLink } = require('./services/driveUtils');
    
    // Crear/obtener carpeta de fecha
    const folderId = await ensureDateFolder(date);
    console.log(`[${uploadId}] ✅ Carpeta de fecha asegurada: ${folderId}`);
    
    // Subir archivo
    const fileId = await uploadVideoToDrive(localFilePath, fileName, folderId);
    console.log(`[${uploadId}] ✅ Video subido exitosamente: ${fileId}`);
    
    // Obtener enlaces públicos
    const folderLink = getFolderPublicLink(folderId);
    const fileLink = getFilePublicLink(fileId);
    
    console.log(`[${uploadId}] 🔗 Enlaces generados:`, { folderLink, fileLink });
    
    // Limpiar archivo temporal si fue creado
    if (shouldCleanupFile && await fs.pathExists(localFilePath)) {
      await fs.remove(localFilePath);
      console.log(`[${uploadId}] 🧹 Archivo temporal limpiado`);
    }
    
    res.json({ 
      success: true, 
      message: 'Video subido exitosamente a Google Drive',
      data: {
        folderId,
        fileId,
        folderLink,
        fileLink,
        date,
        fileName
      },
      uploadId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`[${uploadId}] ❌ Error subiendo a Google Drive:`, error);
    
    let statusCode = 500;
    let errorMessage = 'Error interno subiendo a Google Drive';
    
    if (error.message.includes('credentials') || error.message.includes('authentication')) {
      statusCode = 401;
      errorMessage = 'Error de autenticación con Google Drive. Verifica las credenciales.';
    } else if (error.message.includes('quota') || error.message.includes('limite')) {
      statusCode = 507;
      errorMessage = 'Cuota de Google Drive excedida.';
    } else if (error.message.includes('permission') || error.message.includes('forbidden')) {
      statusCode = 403;
      errorMessage = 'Permisos insuficientes en Google Drive.';
    }
    
    res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      technicalError: error.message,
      uploadId,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Obtener información de la carpeta de una fecha específica
 */
app.get('/drive/folder/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validar formato de fecha
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Formato de fecha inválido. Use YYYY-MM-DD'
      });
    }
    
    const { ensureDateFolder, getFolderPublicLink } = require('./services/driveUtils');
    
    const folderId = await ensureDateFolder(date);
    const folderLink = getFolderPublicLink(folderId);
    
    res.json({ 
      success: true, 
      data: {
        date,
        folderId,
        folderLink
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo carpeta de Drive:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 🧪 Endpoint de prueba completa (solo para testing)
 */
app.post('/drive/test-upload', upload.single('testVideo'), async (req, res) => {
  const testId = uuidv4();
  console.log(`[${testId}] 🧪 Test de subida completa iniciado`);
  
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'Se requiere un archivo de video para el test'
      });
    }
    
    const { ensureDateFolder, uploadVideoToDrive, getFolderPublicLink, getFilePublicLink } = require('./services/driveUtils');
    
    const testDate = new Date().toISOString().split('T')[0];
    const testFileName = `test-${testId}.mp4`;
    
    console.log(`[${testId}] 📁 Archivo de test: ${req.file.originalname} → ${testFileName}`);
    
    // Crear carpeta y subir
    const folderId = await ensureDateFolder(testDate);
    const fileId = await uploadVideoToDrive(req.file.path, testFileName, folderId);
    
    // Generar enlaces
    const folderLink = getFolderPublicLink(folderId);
    const fileLink = getFilePublicLink(fileId);
    
    // Limpiar archivo temporal
    if (await fs.pathExists(req.file.path)) {
      await fs.remove(req.file.path);
    }
    
    console.log(`[${testId}] ✅ Test completado exitosamente`);
    
    res.json({
      success: true,
      message: '🧪 Test de subida completado exitosamente',
      data: {
        testId,
        folderId,
        fileId,
        folderLink,
        fileLink,
        date: testDate,
        fileName: testFileName,
        originalFile: req.file.originalname,
        fileSize: req.file.size
      },
      instructions: {
        qr: `Genera un QR con esta URL: ${folderLink}`,
        access: `Accede directamente: ${folderLink}`,
        video: `Ver video: ${fileLink}`
      }
    });
    
  } catch (error) {
    console.error(`[${testId}] ❌ Error en test de subida:`, error);
    
    // Limpiar archivo en caso de error
    if (req.file && await fs.pathExists(req.file.path)) {
      await fs.remove(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: 'Error en test de subida',
      technicalError: error.message,
      testId
    });
  }
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