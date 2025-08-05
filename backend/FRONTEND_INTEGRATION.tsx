/**
 * 🔗 INTEGRACIÓN FRONTEND-BACKEND
 * 
 * Ejemplos de cómo integrar el backend de Avitec 360 con el frontend actual.
 * Reemplaza el procesamiento local con llamadas al servidor.
 */

// 🌐 Configuración del backend
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://avitec360-backend.onrender.com';

/**
 * 🎬 Procesar video en el backend (reemplaza processVideo360)
 */
export const processVideoInBackend = async (
  videoBlob: Blob,
  styleConfig: StyleConfig,
  normalDuration: number,
  slowmoDuration: number,
  overlayPNG?: Blob,
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
    
    // Añadir overlay si se proporciona
    if (overlayPNG) {
      formData.append('overlay', overlayPNG, 'overlay.png');
    }

    // Simular progreso (en una implementación real usarías WebSockets)
    const progressSteps = [
      { step: "Enviando al servidor...", progress: 5 },
      { step: "Preparando archivos...", progress: 15 },
      { step: "Efectos de velocidad...", progress: 30 },
      { step: "Uniendo segmentos...", progress: 50 },
      { step: "Aplicando overlay...", progress: 70 },
      { step: "Aplicando música...", progress: 85 },
      { step: "Finalizando...", progress: 95 }
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
    }, 2000);

    // Realizar petición al backend
    const response = await fetch(`${BACKEND_URL}/process-video`, {
      method: 'POST',
      body: formData,
    });

    clearInterval(progressInterval);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error del servidor: ${response.status}`);
    }

    // Obtener video procesado
    const processedBlob = await response.blob();
    
    onProgress?.({ step: "Completado", progress: 100, total: 100 });
    
    console.log('✅ Video procesado en backend:', {
      originalSize: videoBlob.size,
      processedSize: processedBlob.size,
      compression: ((1 - processedBlob.size / videoBlob.size) * 100).toFixed(1) + '%'
    });

    return processedBlob;
    
  } catch (error) {
    console.error('❌ Error procesando video en backend:', error);
    throw new Error(`Error del backend: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * 🎨 Obtener opciones disponibles del backend
 */
export const getBackendOptions = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/options`);
    if (!response.ok) {
      throw new Error(`Error obteniendo opciones: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('❌ Error obteniendo opciones del backend:', error);
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

/**
 * 🔧 Verificar estado del backend
 */
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${BACKEND_URL}/`, {
      method: 'GET',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    console.warn('⚠️ Backend no disponible, usando procesamiento local');
    return false;
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
  
  // Verificar si el backend está disponible
  const backendAvailable = await checkBackendHealth();
  
  if (backendAvailable) {
    console.log('🌐 Usando procesamiento en backend');
    onProgress?.({ step: "Conectando al servidor...", progress: 2, total: 100 });
    return await processVideoInBackend(
      videoBlob, 
      styleConfig, 
      normalDuration, 
      slowmoDuration, 
      overlayPNG, 
      onProgress
    );
  } else {
    console.log('💻 Usando procesamiento local (fallback)');
    onProgress?.({ step: "Procesando localmente...", progress: 5, total: 100 });
    
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
  }
};

// 📋 EJEMPLO DE USO EN COMPONENTES

/**
 * En VideoPreview.tsx - Reemplazar el useEffect actual
 */
/*
useEffect(() => {
  const processVideoAsync = async () => {
    if (!videoBlob || !overlayPNG || isProcessing) return;

    console.log('🎬 Iniciando procesamiento híbrido...');
    setIsProcessing(true);
    setError(null);

    try {
      // Validaciones previas
      if (videoBlob.size === 0) {
        setError('El video grabado está vacío');
        return;
      }
      if (overlayPNG.size === 0) {
        setError('El overlay generado está vacío');
        return;
      }

      // Procesar usando backend o local
      const processedBlob = await processVideoHybrid(
        videoBlob,
        styles,
        duration * 0.5, // Primera mitad normal
        duration * 0.5, // Segunda mitad slow motion
        overlayPNG,
        setProgress
      );

      // Validar resultado
      if (!processedBlob || processedBlob.size === 0) {
        throw new Error('El video procesado está vacío o es inválido');
      }

      if (processedBlob.type !== 'video/mp4') {
        console.warn('⚠️ Tipo de video inesperado:', processedBlob.type);
      }

      // Limpiar URL anterior si existe
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }

      const url = URL.createObjectURL(processedBlob);
      setVideoUrl(url);
      setProcessedVideoBlob(processedBlob);

      console.log('✅ Video procesado exitosamente:', {
        originalSize: videoBlob.size,
        processedSize: processedBlob.size,
        url: url.substring(0, 50) + '...'
      });

    } catch (error) {
      console.error('❌ Error en procesamiento híbrido:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsProcessing(false);
    }
  };

  processVideoAsync();
}, [videoBlob, overlayPNG, styles, duration]);
*/

/**
 * En next.config.ts - Añadir variable de entorno
 */
/*
const nextConfig = {
  // ... configuración existente
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'
  }
};
*/

/**
 * En .env.local - Configurar URL del backend
 */
/*
# Backend local para desarrollo
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# Backend en producción (reemplazar con tu URL de Render)
# NEXT_PUBLIC_BACKEND_URL=https://avitec360-backend.onrender.com
*/

export default {
  processVideoInBackend,
  processVideoHybrid,
  getBackendOptions,
  checkBackendHealth
};
