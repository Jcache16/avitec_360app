/**
 * 🌐 SERVICIO DE BACKEND HÍBRIDO
 * 
 * Servicio que maneja el procesamiento de video usando backend como primera opción
 * y fallback al procesamiento local si el backend no está disponible.
 */

import { StyleConfig, ProcessingProgress } from '@/utils/VideoProcessor';

// 🌐 Configuración del backend
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://avitec360-backend.onrender.com';
const BACKEND_TIMEOUT = 10000; // 10 segundos timeout para verificar backend

/**
 * 🔧 Verificar estado del backend con timeout
 */
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    console.log('🔍 Verificando disponibilidad del backend...');
    
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
      return true;
    } else {
      console.warn('⚠️ Backend respondió con error:', response.status);
      return false;
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('⚠️ Timeout verificando backend');
    } else {
      console.warn('⚠️ Error verificando backend:', error);
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
    formData.append('video', videoBlob, 'input-video.mp4');
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

    // Simular progreso paso a paso
    const progressSteps = [
      { step: "Conectando al servidor...", progress: 5 },
      { step: "Enviando archivos...", progress: 15 },
      { step: "Preparando procesamiento...", progress: 25 },
      { step: "Aplicando efectos de velocidad...", progress: 45 },
      { step: "Uniendo segmentos...", progress: 60 },
      { step: "Aplicando overlay...", progress: 75 },
      { step: "Aplicando música...", progress: 85 },
      { step: "Optimizando para móviles...", progress: 95 }
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
    }, 1500); // Actualizar cada 1.5 segundos

    // Realizar petición al backend con timeout extendido
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutos timeout

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
      } catch (parseError) {
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

    onProgress?.({ step: "Completado en servidor", progress: 100, total: 100 });
    
    return processedBlob;
    
  } catch (error) {
    console.error('❌ Error procesando video en backend:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Timeout del servidor. El procesamiento tardó demasiado.');
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
  onProgress?.({ step: "Verificando opciones de procesamiento...", progress: 1, total: 100 });
  
  // Verificar si el backend está disponible
  const backendAvailable = await checkBackendHealth();
  
  if (backendAvailable) {
    console.log('🌐 Usando procesamiento en backend (recomendado)');
    onProgress?.({ step: "Procesando en servidor...", progress: 3, total: 100 });
    
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
      onProgress?.({ step: "Servidor no disponible, procesando localmente...", progress: 5, total: 100 });
      
      // Continuar con procesamiento local como fallback
    }
  } else {
    console.log('💻 Backend no disponible, usando procesamiento local');
  }
  
  // Fallback al procesamiento local
  console.log('💻 Usando procesamiento local (fallback)');
  onProgress?.({ step: "Procesando en dispositivo...", progress: 5, total: 100 });
  
  try {
    // Importar dinámicamente el procesador local
    const { processVideo360 } = await import('@/utils/VideoProcessor');
    return await processVideo360(
      videoBlob,
      styleConfig,
      normalDuration,
      slowmoDuration,
      overlayPNG,
      onProgress
    );
  } catch (localError) {
    console.error('❌ Error en procesamiento local:', localError);
    throw new Error(`Procesamiento falló: ${localError instanceof Error ? localError.message : String(localError)}`);
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

export default {
  processVideoHybrid,
  processVideoInBackend,
  checkBackendHealth,
  getBackendOptions
};
