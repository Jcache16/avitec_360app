/**
 * Componente: VideoPreview - Diseño mejorado y robusto
 * 
 * Pantalla de vista previa del video final con estética consistente
 * Permite descargar o subir a Google Drive
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { StyleConfig, ProcessingProgress } from "@/utils/VideoProcessor";
import { processVideoHybrid } from "@/utils/BackendService";
import { offlineResumableUploadService } from "@/utils/OfflineResumableUploadService";
import { QRCodeSVG } from 'qrcode.react';

interface VideoPreviewProps {
  videoBlob: Blob;
  styleConfig: StyleConfig;
  normalDuration: number;
  slowmoDuration: number;
  overlayPNG: Blob;
  onRestart: () => void;
  onBack: () => void;
}

export default function VideoPreview({
  videoBlob,
  styleConfig,
  normalDuration,
  slowmoDuration,
  overlayPNG,
  onRestart,
  onBack,
}: VideoPreviewProps) {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(true);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState("Iniciando...");
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState("");
  const [qrLink, setQrLink] = useState<string>("");
  const [driveUploadData, setDriveUploadData] = useState<{
    folderLink: string;
    fileLink: string;
    fileName: string;
    date: string;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isProcessingRef = useRef(false);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    console.log('🔄 VideoPreview useEffect ejecutado');
    console.log('📊 Estado inicial:', {
      isProcessingRef: isProcessingRef.current,
      hasProcessedRef: hasProcessedRef.current,
      videoBlob: !!videoBlob,
      videoBlobSize: videoBlob?.size,
      overlayPNG: !!overlayPNG,
      overlayPNGSize: overlayPNG?.size,
      existingVideoUrl: !!videoUrl
    });
    
    // Prevenir ejecución doble en React Strict Mode
    if (isProcessingRef.current) {
      console.log('⚠️ Procesamiento ya en curso, omitiendo...');
      return;
    }
    
    // Prevenir reprocesamiento innecesario
    if (hasProcessedRef.current && videoUrl) {
      console.log('⚠️ Ya se procesó anteriormente y tenemos videoUrl, omitiendo...');
      return;
    }

    // Solo procesar si tenemos ambos blobs válidos
    if (!videoBlob || !overlayPNG) {
      console.log('⚠️ Faltan datos para procesar:', { videoBlob: !!videoBlob, overlayPNG: !!overlayPNG });
      setError('Faltan datos necesarios para procesar el video');
      return;
    }
    
    // Validar que los blobs no estén vacíos
    if (videoBlob.size === 0) {
      console.error('❌ Video blob está vacío');
      setError('El video grabado está vacío');
      return;
    }
    
    if (overlayPNG.size === 0) {
      console.error('❌ Overlay PNG está vacío');
      setError('El overlay generado está vacío');
      return;
    }
    
    console.log('🎯 Iniciando procesamiento único en useEffect');
    processVideo();
    
    return () => {
      console.log('🧹 Limpiando useEffect');
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
        console.log('🧹 URL de video revocada');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoBlob, overlayPNG]);

  const processVideo = async () => {
    if (isProcessingRef.current) {
      console.log('⚠️ Ya hay un procesamiento en curso');
      return;
    }
    
    console.log('🎬 Iniciando procesamiento de video en VideoPreview');
    console.log('📊 Parámetros recibidos:', {
      videoBlob: {
        size: videoBlob.size,
        type: videoBlob.type
      },
      overlayPNG: {
        size: overlayPNG.size,
        type: overlayPNG.type
      },
      normalDuration,
      slowmoDuration,
      totalDuration: normalDuration + slowmoDuration,
      styleConfig
    });
    
    isProcessingRef.current = true; // Marcar como en procesamiento
    setIsProcessing(true);
    setError(null);
    setProcessingProgress(0);
    try {
      const onProgress = (progress: ProcessingProgress) => {
        setProcessingStep(progress.step);
        setProcessingProgress(progress.progress);
      };
      
      console.log('🚀 Llamando a processVideoHybrid (backend + fallback local)...');
      const processedBlob = await processVideoHybrid(
        videoBlob,
        styleConfig,
        normalDuration,
        slowmoDuration,
        overlayPNG,
        onProgress
      );
      
      // CRÍTICO: Validar el blob procesado antes de crear URL
      console.log('🔍 Validando blob procesado:', {
        size: processedBlob.size,
        type: processedBlob.type,
        constructor: processedBlob.constructor.name
      });
      
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
      console.log('✅ URL del video creada exitosamente:', url);
      
      setVideoUrl(url);
      setIsProcessing(false);
      hasProcessedRef.current = true; // Marcar como procesado exitosamente
      console.log('✅ Procesamiento completado exitosamente');
    } catch (error: unknown) {
      console.error('❌ Error procesando video:', error);
      const errorMessage = error instanceof Error ? error.message : "Error procesando el video";
      setError(errorMessage);
      setIsProcessing(false);
    } finally {
      isProcessingRef.current = false; // Liberar la bandera
    }
  };

  const downloadVideo = () => {
    console.log('📥 Iniciando descarga de video...');
    console.log('🔍 Estado de descarga:', {
      videoUrl,
      videoUrlLength: videoUrl.length,
      hasVideoUrl: !!videoUrl,
      videoElement: !!videoRef.current,
      videoElementSrc: videoRef.current?.src
    });
    
    if (!videoUrl) {
      console.error('❌ No hay URL de video para descargar');
      alert('Error: No hay video disponible para descargar');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `photobooth-360-${Date.now()}.mp4`;
      
      // CRÍTICO: Asegurar que el enlace tenga los atributos correctos
      link.setAttribute('download', `photobooth-360-${Date.now()}.mp4`);
      link.style.display = 'none';
      
      document.body.appendChild(link);
      console.log('🔗 Enlace de descarga creado:', {
        href: link.href,
        download: link.download
      });
      
      link.click();
      console.log('✅ Click en enlace de descarga ejecutado');
      
      // Limpiar después de un breve delay
      setTimeout(() => {
        document.body.removeChild(link);
        console.log('🧹 Enlace de descarga limpiado');
      }, 100);
      
    } catch (error) {
      console.error('❌ Error en descarga:', error);
      alert('Error al iniciar la descarga. Intenta de nuevo.');
    }
  };

  // Nueva implementación de subida resumable directa a Google Drive
  const uploadToGoogleDrive = async () => {
    console.log('🌐 Iniciando subida resumable directa a Google Drive...');
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStep("Preparando subida...");
    setQrLink("");
    setDriveUploadData(null);

    try {
      // Paso 1: Obtener el blob del video procesado
      setUploadStep("Obteniendo video procesado...");
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error('Error obteniendo el video procesado');
      }
      
      const videoBlob = await response.blob();
      console.log('📦 Video blob obtenido:', {
        size: videoBlob.size,
        type: videoBlob.type,
        sizeMB: (videoBlob.size / (1024 * 1024)).toFixed(2)
      });
      
      const fileName = `avitec-360-${Date.now()}.mp4`;
      
      // Paso 2: Subir usando el servicio offline (SIN verificación)
      setUploadStep("Creando sesión de subida...");
      
      const result = await offlineResumableUploadService.uploadFile(
        videoBlob,
        fileName,
        (progress: { uploadedBytes: number; totalBytes: number; percentage: number; status: string }) => {
          setUploadProgress(progress.percentage);
          setUploadStep(`Subiendo directamente a Drive... ${progress.percentage}%`);
          console.log(`📊 Progreso: ${progress.percentage}% (${(progress.uploadedBytes / 1024 / 1024).toFixed(2)} MB)`);
        }
      );
      
      if (result.success && result.data) {
        console.log('✅ Subida resumable exitosa:', result);
        
        const { links, fileName: uploadedFileName, date } = result.data;
        setDriveUploadData({
          folderLink: links.folder,
          fileLink: links.view,
          fileName: uploadedFileName,
          date
        });
        setQrLink(links.view);
        setUploadStep("¡Subida completada!");
        
        alert(`¡Video subido exitosamente!\n\nCarpeta: ${date}\nArchivo: ${uploadedFileName}\n\n✅ Subida directa sin verificación`);
      } else {
        // Error real en la subida
        const errorMsg = result.error || 'Error desconocido en la subida';
        console.error('❌ Error real en subida:', errorMsg);
        throw new Error(errorMsg);
      }
      
    } catch (uploadError) {
      console.error('❌ Error subiendo a Google Drive:', uploadError);
      setUploadStep("Error en la subida");
      
      let errorMessage = 'Error subiendo el video';
      if (uploadError instanceof Error) {
        if (uploadError.message.includes('quotaExceeded') || uploadError.message.includes('quota')) {
          errorMessage = 'Cuota de almacenamiento de Google Drive excedida';
        } else if (uploadError.message.includes('unauthorized') || uploadError.message.includes('OAuth')) {
          errorMessage = 'Token de autorización expirado. Contacte al administrador';
        } else if (uploadError.message.includes('network') || uploadError.message.includes('fetch')) {
          errorMessage = 'Error de conexión. Verifique su internet e intente nuevamente';
        } else {
          errorMessage = uploadError.message;
        }
      }
      
      alert(`Error subiendo video: ${errorMessage}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-md w-full text-center border border-white/20">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-red-400 text-2xl">⚠️</span>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4">
            Error de procesamiento
          </h2>
          
          <p className="text-white/70 mb-6">
            {error}
          </p>
          
          <div className="space-y-3">
            <button
              onClick={processVideo}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105"
            >
              Reintentar
            </button>
            
            <button
              onClick={onBack}
              className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-md w-full text-center border border-white/20">
          {/* Animación de procesamiento */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-4 border-white/20"></div>
            <div 
              className="absolute inset-0 rounded-full border-4 border-transparent border-t-white transition-all duration-300"
              style={{
                transform: `rotate(${processingProgress * 3.6}deg)`
              }}
            ></div>
            <div className="absolute inset-4 bg-white/10 rounded-full flex items-center justify-center">
              <span className="text-white text-4xl">🎬</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Procesando tu video
          </h2>
          
          {/* Indicador de ubicación de procesamiento */}
          <div className="mb-4">
            {processingStep.includes('🌐') || processingStep.includes('servidor') || processingStep.includes('REMOTO') ? (
              <div className="bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-2">
                <p className="text-green-300 text-sm font-medium">
                  🌐 Procesando en SERVIDOR REMOTO
                </p>
                <p className="text-green-200/70 text-xs">
                  Mayor velocidad y mejor rendimiento
                </p>
              </div>
            ) : processingStep.includes('💻') || processingStep.includes('LOCAL') || processingStep.includes('dispositivo') ? (
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl px-4 py-2">
                <p className="text-blue-300 text-sm font-medium">
                  💻 Procesando en TU DISPOSITIVO
                </p>
                <p className="text-blue-200/70 text-xs">
                  Procesamiento local seguro y privado
                </p>
              </div>
            ) : (
              <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl px-4 py-2">
                <p className="text-purple-300 text-sm font-medium">
                  🔍 Evaluando opciones de procesamiento
                </p>
                <p className="text-purple-200/70 text-xs">
                  Buscando la mejor opción disponible
                </p>
              </div>
            )}
          </div>
          
          <p className="text-white/70 mb-6">
            {processingStep}
          </p>

          <div className="w-full bg-white/20 rounded-full h-3 mb-4">
            <div
              className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${processingProgress}%` }}
            ></div>
          </div>

          <div className="flex justify-between items-center text-white/50 text-sm mb-2">
            <span>{processingProgress}% completado</span>
            <span>
              {processingStep.includes('🌐') || processingStep.includes('servidor') || processingStep.includes('REMOTO') 
                ? '⚡ Rápido' 
                : processingStep.includes('💻') || processingStep.includes('LOCAL') || processingStep.includes('dispositivo')
                ? '🔒 Privado'
                : '🔍 Evaluando'
              }
            </span>
          </div>
          
          {/* Estimación de tiempo restante */}
          <div className="text-center">
            <p className="text-white/40 text-xs">
              {processingProgress < 20 
                ? "Inicializando procesamiento..." 
                : processingProgress < 30 && (processingStep.includes('activándose') || processingStep.includes('Render'))
                ? "⏰ Activando servidor (puede tardar en móviles)..."
                : processingProgress < 50 
                ? "Aplicando efectos de video..." 
                : processingProgress < 80 
                ? "Añadiendo elementos visuales..." 
                : processingProgress < 95 
                ? "Optimizando video final..." 
                : "Casi listo..."
              }
            </p>
            
            {/* Mensaje especial para móviles si tarda mucho */}
            {processingProgress > 15 && processingProgress < 30 && (processingStep.includes('servidor') || processingStep.includes('REMOTO')) && (
              <p className="text-yellow-300/60 text-xs mt-2">
                📱 En móviles puede tardar más. El sistema cambiará a procesamiento local si es necesario.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <button
          onClick={onBack}
          className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white/80 hover:text-white hover:bg-white/30 transition-all duration-300"
        >
          <span className="text-xl">←</span>
        </button>
        
        <h1 className="text-white text-xl font-bold">Tu Video 360</h1>
        
        <button
          onClick={onRestart}
          className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white/80 hover:text-white hover:bg-white/30 transition-all duration-300"
        >
          <span className="text-xl">↻</span>
        </button>
      </div>

      {/* Video Player */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full aspect-[9/16] rounded-2xl bg-black/50"
              poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 180 320'%3E%3Crect fill='%23000' width='180' height='320'/%3E%3Ctext x='90' y='160' text-anchor='middle' fill='%23fff' font-size='16'%3ETu Video 360%3C/text%3E%3C/svg%3E"
              onLoadStart={() => console.log('🎥 Video: LoadStart')}
              onLoadedMetadata={() => console.log('🎥 Video: Metadata cargada')}
              onCanPlay={() => console.log('🎥 Video: Puede reproducirse')}
              onError={(e) => {
                console.error('❌ Error en video element:', e);
                console.error('❌ Video error details:', {
                  error: e.currentTarget.error,
                  networkState: e.currentTarget.networkState,
                  readyState: e.currentTarget.readyState,
                  src: e.currentTarget.src
                });
              }}
              playsInline
              preload="metadata"
            />
            
            {/* Info del video */}
            <div className="mt-4 text-center">
              <p className="text-white/70 text-sm mb-2">
                Duración: {normalDuration + slowmoDuration}s • Formato: 9:16 • Calidad: 720p (Móvil compatible)
              </p>
              <div className="flex items-center justify-center gap-2 text-white/50 text-xs">
                {styleConfig.music && styleConfig.music !== 'none' && (
                  <span className="bg-white/20 px-2 py-1 rounded-full">🎵 {styleConfig.music}</span>
                )}
                {styleConfig.text && styleConfig.text.trim() && (
                  <span className="bg-white/20 px-2 py-1 rounded-full">📝 Texto</span>
                )}
                {styleConfig.frame && styleConfig.frame !== 'none' && (
                  <span className="bg-white/20 px-2 py-1 rounded-full">🖼️ Marco</span>
                )}
                <span className="bg-green-500/20 px-2 py-1 rounded-full text-green-300">📱 H.264 Mobile</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="p-6 space-y-4">
        {/* Botón principal de descarga */}
        <button
          onClick={downloadVideo}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-5 px-6 rounded-3xl text-xl shadow-2xl transform transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <span className="flex items-center justify-center gap-3">
            <span className="text-2xl">⬇️</span>
            <span>Descargar Video</span>
          </span>
        </button>

        {/* Botones secundarios */}
        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={uploadToGoogleDrive}
            disabled={isUploading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3"
          >
            {isUploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <div className="flex flex-col items-center gap-1">
                  <span>Subiendo a Google Drive...</span>
                  {uploadProgress > 0 && (
                    <div className="w-full max-w-48 bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-white h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                  {uploadStep && (
                    <span className="text-xs text-white/80">{uploadStep}</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <span className="text-xl">☁️</span>
                <span>Subir a Google Drive (Directo)</span>
              </>
            )}
          </button>
          
          {/* Botón de debug para móviles */}
          <button
            onClick={async () => {
              const { checkBackendHealth } = await import('@/utils/BackendService');
              const backendAvailable = await checkBackendHealth();
              
              const debugInfo = {
                // Info básica
                videoUrl: !!videoUrl,
                videoUrlLength: videoUrl?.length,
                isProcessing,
                hasProcessed: hasProcessedRef.current,
                
                // Info de blobs
                videoBlobSize: videoBlob?.size,
                overlayPNGSize: overlayPNG?.size,
                
                // Info del elemento video
                videoElement: {
                  src: videoRef.current?.src,
                  readyState: videoRef.current?.readyState,
                  networkState: videoRef.current?.networkState,
                  error: videoRef.current?.error,
                  duration: videoRef.current?.duration,
                  videoWidth: videoRef.current?.videoWidth,
                  videoHeight: videoRef.current?.videoHeight
                },
                
                // Info del backend
                backend: {
                  url: process.env.NEXT_PUBLIC_BACKEND_URL,
                  available: backendAvailable,
                  timeout: process.env.NEXT_PUBLIC_BACKEND_TIMEOUT
                },
                
                // Info del navegador
                browser: {
                  userAgent: navigator.userAgent,
                  platform: navigator.platform,
                  cookieEnabled: navigator.cookieEnabled
                }
              };
              
              console.log('🔍 DEBUG INFO COMPLETO:', debugInfo);
              alert(JSON.stringify(debugInfo, null, 2));
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-xl text-sm opacity-50 hover:opacity-100 transition-all duration-300"
          >
            🔍 Debug Info Completo
          </button>
        </div>

        {/* Sección de QR Code si se subió a Google Drive */}
        {qrLink && driveUploadData && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-center">
              <h3 className="text-white font-bold text-lg mb-3">
                📱 ¡Video subido a la nube!
              </h3>
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-4">
                {/* QR del video individual */}
                <div className="bg-white p-4 rounded-xl inline-block">
                  <QRCodeSVG 
                    value={qrLink}
                    size={150}
                    level="M"
                    includeMargin={true}
                  />
                  <p className="text-xs text-gray-700 mt-2 font-semibold">QR del video</p>
                </div>
                {/* QR de la carpeta general */}
                <div className="bg-white p-4 rounded-xl inline-block">
                  <QRCodeSVG 
                    value={driveUploadData.folderLink}
                    size={150}
                    level="M"
                    includeMargin={true}
                  />
                  <p className="text-xs text-gray-700 mt-2 font-semibold">QR de la carpeta</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-white/80">
                  📅 <strong>Fecha:</strong> {driveUploadData.date}
                </p>
                <p className="text-white/80">
                  📁 <strong>Archivo:</strong> {driveUploadData.fileName}
                </p>
                <p className="text-white/60 text-xs">
                  Escanea el QR del video para verlo directamente.<br />
                  Escanea el QR de la carpeta para ver todos los videos del evento de hoy.
                </p>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => window.open(driveUploadData.folderLink, '_blank')}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-xl text-sm transition-all duration-300"
                >
                  📂 Ver carpeta
                </button>
                <button
                  onClick={() => window.open(driveUploadData.fileLink, '_blank')}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-xl text-sm transition-all duration-300"
                >
                  🎬 Ver video
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Botón para crear otro video */}
        <button
          onClick={onRestart}
          className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 border border-white/20"
        >
          🎬 Crear otro video
        </button>
      </div>
    </div>
  );
}