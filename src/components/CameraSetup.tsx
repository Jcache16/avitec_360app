/**
 * Componente: CameraSetup
 * 
 * Segunda pantalla del flujo - Configuración y preparación de la cámara
 * Solicita permisos de cámara, muestra preview y configuraciones básicas
 */

"use client";

import { useState, useEffect, useRef } from "react";

interface CameraSetupProps {
  onStartRecording: (normalDuration: number, slowmoDuration: number, facingMode: string, selectedFile?: File) => void;
  onBack: () => void;
}

export default function CameraSetup({ onStartRecording, onBack }: CameraSetupProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [normalDuration, setNormalDuration] = useState(8); // Duración video normal
  const [slowmoDuration, setSlowmoDuration] = useState(7); // Duración slowmo
  const [currentFacingMode, setCurrentFacingMode] = useState<string>("user"); // Cámara seleccionada
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null); // Video seleccionado de galería
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null); // URL para preview del video seleccionado
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Solicitar permisos y configurar cámara
  const requestCameraAccess = async (facingMode: string = "user") => {
    setIsLoading(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: facingMode
        },
        audio: true
      });

      streamRef.current = stream;
      setCurrentFacingMode(facingMode);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setHasPermission(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("No se pudo acceder a la cámara. Verifica los permisos.");
      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Cambiar entre cámara frontal y trasera
  const switchCamera = async () => {
    if (!streamRef.current) return;

    // Detener stream actual
    streamRef.current.getTracks().forEach(track => track.stop());

    try {
      const newFacingMode = currentFacingMode === "user" ? "environment" : "user";
      await requestCameraAccess(newFacingMode);
    } catch (err) {
      console.error("Error switching camera:", err);
      // Si falla, intentar volver a la cámara original
      await requestCameraAccess(currentFacingMode);
    }
  };

  // Manejar selección de video desde galería
  const handleVideoFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar que sea un archivo de video
    if (!file.type.startsWith('video/')) {
      setError('Por favor selecciona un archivo de video válido');
      return;
    }

    // Limpiar errores previos
    setError(null);

    // Detener stream de cámara si está activo
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Crear URL para preview
    const videoUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(videoUrl);
    setSelectedVideoFile(file);
    setHasPermission(true); // Marcar como "listo" para continuar

    console.log('📁 Video seleccionado:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified)
    });
  };

  // Disparar selector de archivos
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Volver a modo cámara
  const switchToCamera = () => {
    // Limpiar video seleccionado
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }
    setSelectedVideoFile(null);
    setHasPermission(null);
    
    // Solicitar acceso a cámara
    requestCameraAccess(currentFacingMode);
  };

  // Limpiar stream al desmontar componente
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  const handleStartRecording = () => {
    if (hasPermission) {
      // Si hay un video seleccionado, pasarlo como parámetro
      if (selectedVideoFile) {
        console.log('🎬 Iniciando con video seleccionado:', selectedVideoFile.name);
        onStartRecording(normalDuration, slowmoDuration, currentFacingMode, selectedVideoFile);
      } else if (streamRef.current) {
        // Cerrar el stream actual para evitar conflictos con RecordingScreen
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        
        // Dar un poco de tiempo antes de navegar
        setTimeout(() => {
          console.log('🎬 Iniciando grabación desde cámara');
          onStartRecording(normalDuration, slowmoDuration, currentFacingMode);
        }, 100);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col px-6 py-8 relative overflow-hidden">
      {/* Efectos de fondo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-purple-500/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-l from-blue-500/20 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 flex-1 flex flex-col max-w-md mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={onBack}
            className="absolute left-0 top-0 p-2 text-white/70 hover:text-white transition-colors"
          >
            <span className="text-2xl">←</span>
          </button>
          <h1 className="text-2xl font-bold text-white mb-2">
            Configurar Cámara
          </h1>
          <p className="text-purple-200 text-sm">
            Prepara tu dispositivo para la grabación
          </p>
        </div>

        {/* Vista previa de la cámara */}
        <div className="flex-1 flex flex-col justify-center mb-8">
          <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl mb-6">
            {!hasPermission ? (
              // Estado sin permisos - Mostrar opciones
              <div className="aspect-[4/3] flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl">📹</span>
                </div>
                <h3 className="text-white font-semibold mb-2">
                  Elegir fuente de video
                </h3>
                <p className="text-white/70 text-sm mb-6">
                  Graba en vivo o selecciona un video existente
                </p>
                {error && (
                  <p className="text-red-400 text-sm mb-4 bg-red-500/20 px-3 py-2 rounded-lg">
                    {error}
                  </p>
                )}
                
                {/* Botones de opciones */}
                <div className="space-y-3 w-full max-w-xs">
                  <button
                    onClick={() => requestCameraAccess()}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:from-red-600 hover:to-pink-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span className="text-lg">📷</span>
                    <span>{isLoading ? "Conectando..." : "Grabar en vivo"}</span>
                  </button>
                  
                  <button
                    onClick={triggerFileSelect}
                    className="w-full bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-medium hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="text-lg">📁</span>
                    <span>Elegir video existente</span>
                  </button>
                </div>
              </div>
            ) : (
              // Vista previa activa
              <div className="relative">
                {selectedVideoFile ? (
                  // Preview de video seleccionado
                  <>
                    <video
                      src={videoPreviewUrl || undefined}
                      controls
                      className="w-full aspect-[4/3] object-cover"
                      onLoadedMetadata={(e) => {
                        const video = e.currentTarget;
                        console.log('📹 Video cargado:', {
                          duration: video.duration,
                          width: video.videoWidth,
                          height: video.videoHeight
                        });
                      }}
                    />
                    
                    {/* Información del archivo */}
                    <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">📁</span>
                        <span>{selectedVideoFile.name}</span>
                      </div>
                      <div className="text-white/70 text-xs">
                        {(selectedVideoFile.size / (1024 * 1024)).toFixed(1)} MB
                      </div>
                    </div>
                    
                    {/* Botón para cambiar a cámara */}
                    <div className="absolute top-4 right-4">
                      <button
                        onClick={switchToCamera}
                        className="bg-black/50 backdrop-blur-sm text-white p-3 rounded-full hover:bg-black/70 transition-colors"
                        title="Cambiar a cámara"
                      >
                        <span className="text-xl">📷</span>
                      </button>
                    </div>
                  </>
                ) : (
                  // Preview de cámara en vivo
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full aspect-[4/3] object-cover"
                    />
                    
                    {/* Controles sobre el video */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={triggerFileSelect}
                        className="bg-black/50 backdrop-blur-sm text-white p-3 rounded-full hover:bg-black/70 transition-colors"
                        title="Elegir video existente"
                      >
                        <span className="text-xl">📁</span>
                      </button>
                      <button
                        onClick={switchCamera}
                        className="bg-black/50 backdrop-blur-sm text-white p-3 rounded-full hover:bg-black/70 transition-colors"
                        title="Cambiar cámara"
                      >
                        <span className="text-xl">🔄</span>
                      </button>
                    </div>
                    
                    {/* Overlay de guía */}
                    <div className="absolute inset-0 border-4 border-white/30 rounded-2xl pointer-events-none">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/50 rounded-full"></div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Configuraciones */}
          {hasPermission && (
            <div className="space-y-4">
              {/* Duración video normal */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <label className="block text-white font-medium mb-3">
                  Video normal: {normalDuration}s
                </label>
                <input
                  type="range"
                  min="3"
                  max="10"
                  step="1"
                  value={normalDuration}
                  onChange={(e) => setNormalDuration(Number(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-white/60 text-xs mt-1">
                  <span>3s</span>
                  <span>5s</span>
                  <span>8s</span>
                  <span>10s</span>
                </div>
              </div>

              {/* Duración slowmo */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <label className="block text-white font-medium mb-3">
                  Slowmo: {slowmoDuration}s
                </label>
                <input
                  type="range"
                  min="2"
                  max={15 - normalDuration}
                  step="1"
                  value={slowmoDuration}
                  onChange={(e) => setSlowmoDuration(Number(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-white/60 text-xs mt-1">
                  <span>2s</span>
                  <span>{Math.floor((15 - normalDuration) / 2)}s</span>
                  <span>{15 - normalDuration}s</span>
                </div>
              </div>

              {/* Total duration display */}
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-center">
                  <span className="text-white font-medium">Total: {normalDuration + slowmoDuration}s</span>
                  <span className="text-white/60 text-sm block">de máximo 15s</span>
                </div>
              </div>

              {/* Instrucciones */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <h4 className="text-white font-medium mb-2">📋 Instrucciones:</h4>
                <ul className="text-white/80 text-sm space-y-1">
                  <li>• Mantén el dispositivo estable</li>
                  <li>• Asegúrate de tener buena iluminación</li>
                  <li>• Sin boomerang para mejor rendimiento</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Botón de acción */}
        {hasPermission && (
          <button
            onClick={handleStartRecording}
            className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold py-4 px-8 rounded-2xl text-xl shadow-2xl transform transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-500/50 active:scale-95"
          >
            <span className="flex items-center justify-center gap-3">
              <span>
                {selectedVideoFile ? 'Procesar Video' : 'Iniciar Grabación'}
              </span>
              <span className="text-2xl">
                {selectedVideoFile ? '⚡' : '🎬'}
              </span>
            </span>
          </button>
        )}

        {/* Input file oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleVideoFileSelect}
        />
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}
