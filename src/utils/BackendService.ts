/**
 * 🌐 SERVICIO DE BACKEND HÍBRIDO
 * 
 * Servicio que maneja el procesamiento de video usando backend como primera opción
 * y fallback al procesamiento local si el backend no está disponible.
 */

import { StyleConfig, ProcessingProgress } from '@/utils/VideoProcessor';

// 🌐 Configuración del backend
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://avitec360-backend.onrender.com';
const BACKEND_TIMEOUT = 15000; // 15 segundos timeout para verificar backend (más tiempo para móviles)

/**
 * 🔧 Verificar estado del backend con timeout
 */
export const checkBackendHealth = async (onProgress?: (progress: ProcessingProgress) => void): Promise<boolean> => {
  try {
    console.log('🔍 Verificando disponibilidad del backend...');
    onProgress?.({ step: "🔍 Verificando conexión con el servidor...", progress: 2, total: 100 });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT);
    
    const response = await fetch(`${BACKEND_URL}/`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend disponible:', data.message);
      onProgress?.({ step: "✅ Servidor conectado exitosamente", progress: 5, total: 100 });
      return true;
    } else {
      console.warn('⚠️ Backend respondió con error:', response.status);
      onProgress?.({ step: "⚠️ Servidor no responde, usando procesamiento local", progress: 5, total: 100 });
      return false;
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('⚠️ Timeout verificando backend');
      onProgress?.({ step: "⏰ Servidor tardó mucho en responder, usando procesamiento local", progress: 5, total: 100 });
    } else {
      console.warn('⚠️ Error verificando backend:', error);
      onProgress?.({ step: "❌ Error conectando al servidor, usando procesamiento local", progress: 5, total: 100 });
    }
    return false;
  }
};

/**
 * 🎬 Procesar video en el backend
 */
export const processVideoInBackend = async (
  videoBlob: Blob,
  styleConfig: StyleConfig,
  normalDuration: number,
  slowmoDuration: number,
  overlayPNG: Blob,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<Blob> => {
  console.log('🌐 Procesando video en backend:', BACKEND_URL);
  
  try {
    // Preparar datos del formulario
    const formData = new FormData();
    
    // 💡 CORRECCIÓN: Usar la extensión correcta (.webm) para el archivo de video
    formData.append('video', videoBlob, 'input-video.webm');
    
    formData.append('styleConfig', JSON.stringify(styleConfig));
    formData.append('normalDuration', String(normalDuration));
    formData.append('slowmoDuration', String(slowmoDuration));
    formData.append('overlay', overlayPNG, 'overlay.png');

    console.log('📤 Enviando datos al backend:', {
      videoSize: videoBlob.size,
      overlaySize: overlayPNG.size,
      styleConfig,
      durations: { normalDuration, slowmoDuration }
    });

    // Simular progreso paso a paso con mensajes más descriptivos y tiempos adaptados a móviles
    const progressSteps = [
      { step: "🌐 Conectado al servidor remoto", progress: 10 },
      { step: "📤 Enviando video al servidor (puede tardar en móviles)...", progress: 15 },
      { step: "📤 Enviando efectos y configuración...", progress: 20 },
      { step: "⏰ Servidor activándose (Render.com puede tardar)...", progress: 25 },
      { step: "🔄 Servidor iniciando procesamiento de video...", progress: 30 },
      { step: "⚡ Aplicando efectos de velocidad en servidor...", progress: 45 },
      { step: "🎬 Uniendo segmentos de video en servidor...", progress: 60 },
      { step: "🎨 Aplicando overlay personalizado en servidor...", progress: 70 },
      { step: "🎵 Aplicando música seleccionada en servidor...", progress: 80 },
      { step: "📱 Optimizando para dispositivos móviles en servidor...", progress: 90 },
      { step: "⬇️ Descargando video procesado del servidor...", progress: 95 },
      { step: "🔄 Finalizando transferencia (casi listo)...", progress: 98 }
    ];

    let progressIndex = 0;
    const progressInterval = setInterval(() => {
      if (progressIndex < progressSteps.length && onProgress) {
        onProgress({
          ...progressSteps[progressIndex],
          total: 100
        });
        progressIndex++;
      }
    }, 2000); // Actualizar cada 2 segundos (más tiempo para móviles lentos)

    // Realizar petición al backend con timeout extendido para móviles
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutos timeout (mejor para móviles y Render.com)

    const response = await fetch(`${BACKEND_URL}/process-video`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    clearInterval(progressInterval);

    if (!response.ok) {
      let errorMessage = `Error del servidor: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        console.warn('No se pudo parsear error del servidor');
      }
      throw new Error(errorMessage);
    }

    // Obtener video procesado
    const processedBlob = await response.blob();
    
    console.log('✅ Video procesado en backend:', {
      originalSize: videoBlob.size,
      processedSize: processedBlob.size,
      compression: ((1 - processedBlob.size / videoBlob.size) * 100).toFixed(1) + '%',
      type: processedBlob.type
    });

    // Verificar que el blob sea válido
    if (!processedBlob || processedBlob.size === 0) {
      throw new Error('El video procesado del backend está vacío');
    }

    onProgress?.({ step: "✅ Video procesado exitosamente en servidor", progress: 100, total: 100 });
    
    return processedBlob;
    
  } catch (error) {
    console.error('❌ Error procesando video en backend:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('⏰ El servidor tardó más de 5 minutos. Esto puede pasar en móviles o cuando Render.com está activándose. Intentando procesamiento local...');
    }
    
    throw new Error(`Error del backend: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * 🔄 Función híbrida: backend si está disponible, local como fallback
 */
export const processVideoHybrid = async (
  videoBlob: Blob,
  styleConfig: StyleConfig,
  normalDuration: number,
  slowmoDuration: number,
  overlayPNG: Blob,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<Blob> => {
  
  console.log('🎯 Iniciando procesamiento híbrido...');
  onProgress?.({ step: "🔍 Evaluando opciones de procesamiento...", progress: 1, total: 100 });
  
  // Verificar si el backend está disponible
  const backendAvailable = await checkBackendHealth(onProgress);
  
  if (backendAvailable) {
    console.log('🌐 Usando procesamiento en backend (recomendado)');
    onProgress?.({ step: "🌐 Procesamiento REMOTO seleccionado - Mayor velocidad", progress: 8, total: 100 });
    
    try {
      return await processVideoInBackend(
        videoBlob, 
        styleConfig, 
        normalDuration, 
        slowmoDuration, 
        overlayPNG, 
        onProgress
      );
    } catch (backendError) {
      console.warn('⚠️ Backend falló, intentando procesamiento local:', backendError);
      onProgress?.({ step: "⏰ Servidor tardó mucho (normal en móviles), cambiando a LOCAL...", progress: 10, total: 100 });
      
      // Breve pausa para que el usuario vea el mensaje
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } else {
    console.log('💻 Backend no disponible, usando procesamiento local');
    onProgress?.({ step: "🔄 Servidor no disponible, iniciando modo LOCAL...", progress: 8, total: 100 });
    // Breve pausa para que el usuario vea el mensaje
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Fallback al procesamiento local
  console.log('💻 Usando procesamiento local (fallback)');
  onProgress?.({ step: "💻 Procesamiento LOCAL activado - En tu dispositivo", progress: 12, total: 100 });
  
  try {
    // Importar dinámicamente el procesador local
    const { processVideo360 } = await import('@/utils/VideoProcessor');
    
    // Crear un wrapper para los mensajes de progreso local
    const localProgressWrapper = (progress: ProcessingProgress) => {
      // Agregar indicador de procesamiento local a todos los mensajes
      const localizedStep = progress.step.includes('💻') 
        ? progress.step 
        : `💻 LOCAL: ${progress.step}`;
      
      onProgress?.({
        ...progress,
        step: localizedStep
      });
    };
    
    onProgress?.({ step: "💻 Iniciando procesamiento en tu dispositivo...", progress: 15, total: 100 });
    
    return await processVideo360(
      videoBlob,
      styleConfig,
      normalDuration,
      slowmoDuration,
      overlayPNG,
      localProgressWrapper
    );
  } catch (localError) {
    console.error('❌ Error en procesamiento local:', localError);
    throw new Error(`❌ Procesamiento falló completamente: ${localError instanceof Error ? localError.message : String(localError)}`);
  }
};

/**
 * 🎨 Obtener opciones disponibles del backend
 */
export const getBackendOptions = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/options`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error obteniendo opciones: ${response.status}`);
    }
    
    const options = await response.json();
    console.log('✅ Opciones del backend obtenidas:', options);
    return options;
  } catch (error) {
    console.warn('⚠️ Error obteniendo opciones del backend, usando fallback:', error);
    
    // Fallback a opciones locales si el backend no está disponible
    return {
      music: [
        { id: "none", name: "Sin música" },
        { id: "beggin", name: "Beggin - Maneskin" },
        { id: "master_puppets", name: "Master of Puppets - Metallica" },
        { id: "night_dancer", name: "Night Dancer - Imase" },
      ],
      fonts: [
        { id: "montserrat", name: "Montserrat" },
        { id: "playfair", name: "Playfair Display" },
        { id: "chewy", name: "Chewy" },
      ],
      frames: [
        { id: "none", name: "Sin marco" },
        { id: "custom", name: "Personalizado" },
      ],
      colors: [
        "#8B5CF6", "#EC4899", "#EF4444", "#F97316", "#EAB308",
        "#22C55E", "#06B6D4", "#3B82F6", "#6366F1", "#FFFFFF", "#000000"
      ]
    };
  }
};

const BackendService = {
  processVideoHybrid,
  processVideoInBackend,
  checkBackendHealth,
  getBackendOptions
};

export default BackendService;

/**
 * 🔍 Verificar si un video ya fue procesado (para casos de timeout)
 * TODO: Implementar en el backend endpoint GET /video/:id
 */
export const checkVideoStatus = async (videoId: string): Promise<{ processed: boolean; downloadUrl?: string }> => {
  try {
    const response = await fetch(`${BACKEND_URL}/video/${videoId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      return { processed: false };
    }
    
    const data = await response.json();
    return {
      processed: data.processed,
      downloadUrl: data.downloadUrl
    };
  } catch (error) {
    console.warn('⚠️ Error verificando estado del video:', error);
    return { processed: false };
  }
};

/**
 * 🔄 Función mejorada con reintento para videos que tardaron
 */
export const processVideoWithRetry = async (
  videoBlob: Blob,
  styleConfig: StyleConfig,
  normalDuration: number,
  slowmoDuration: number,
  overlayPNG: Blob,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<Blob> => {
  
  try {
    // Intentar procesamiento normal
    return await processVideoHybrid(videoBlob, styleConfig, normalDuration, slowmoDuration, overlayPNG, onProgress);
  } catch (error) {
    
    // Si fue timeout, mostrar opción de reintento
    if (error instanceof Error && error.message.includes('5 minutos')) {
      onProgress?.({ step: "⏰ ¿El video puede estar listo en el servidor? Puedes reintentar", progress: 0, total: 100 });
      
      // TODO: Aquí se podría generar un videoId y verificar si ya está procesado
      // const videoId = generateVideoId(videoBlob, styleConfig);
      // const status = await checkVideoStatus(videoId);
      // if (status.processed && status.downloadUrl) {
      //   return await fetch(status.downloadUrl).then(r => r.blob());
      // }
    }
    
    // Si no, continuar con el error original
    throw error;
  }
};
