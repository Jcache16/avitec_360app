/**
 * Componente: CameraSetup
 * 
 * Segunda pantalla del flujo - Configuración y preparación de la cámara
 * Solicita permisos de cámara, muestra preview y configuraciones básicas
 */

"use client";

import { useState, useEffect, useRef } from "react";

interface CameraSetupProps {
  onStartRecording: (duration: number) => void;
  onBack: () => void;
}

export default function CameraSetup({ onStartRecording, onBack }: CameraSetupProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(15); // Duración en segundos
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Solicitar permisos y configurar cámara
  const requestCameraAccess = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: "user" // Cámara frontal por defecto
        },
        audio: true
      });

      streamRef.current = stream;
      
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
      const currentFacingMode = streamRef.current.getVideoTracks()[0].getSettings().facingMode;
      const newFacingMode = currentFacingMode === "user" ? "environment" : "user";

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: newFacingMode
        },
        audio: true
      });

      streamRef.current = newStream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Error switching camera:", err);
      // Si falla, intentar volver a la cámara original
      requestCameraAccess();
    }
  };

  // Limpiar stream al desmontar componente
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleStartRecording = () => {
    if (hasPermission && streamRef.current) {
      onStartRecording(recordingDuration);
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
              // Estado sin permisos
              <div className="aspect-[4/3] flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl">📹</span>
                </div>
                <h3 className="text-white font-semibold mb-2">
                  Acceso a la cámara
                </h3>
                <p className="text-white/70 text-sm mb-6">
                  Necesitamos acceso a tu cámara para comenzar la grabación
                </p>
                {error && (
                  <p className="text-red-400 text-sm mb-4 bg-red-500/20 px-3 py-2 rounded-lg">
                    {error}
                  </p>
                )}
                <button
                  onClick={requestCameraAccess}
                  disabled={isLoading}
                  className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-medium hover:bg-white/30 transition-colors disabled:opacity-50"
                >
                  {isLoading ? "Conectando..." : "Permitir acceso"}
                </button>
              </div>
            ) : (
              // Vista previa activa
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-[4/3] object-cover"
                />
                
                {/* Controles sobre el video */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={switchCamera}
                    className="bg-black/50 backdrop-blur-sm text-white p-3 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <span className="text-xl">🔄</span>
                  </button>
                </div>
                
                {/* Overlay de guía */}
                <div className="absolute inset-0 border-4 border-white/30 rounded-2xl pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/50 rounded-full"></div>
                </div>
              </div>
            )}
          </div>

          {/* Configuraciones */}
          {hasPermission && (
            <div className="space-y-4">
              {/* Duración de grabación */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <label className="block text-white font-medium mb-3">
                  Duración de grabación: {recordingDuration}s
                </label>
                <input
                  type="range"
                  min="10"
                  max="20"
                  step="5"
                  value={recordingDuration}
                  onChange={(e) => setRecordingDuration(Number(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-white/60 text-xs mt-1">
                  <span>10s</span>
                  <span>15s</span>
                  <span>20s</span>
                </div>
              </div>

              {/* Instrucciones */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <h4 className="text-white font-medium mb-2">📋 Instrucciones:</h4>
                <ul className="text-white/80 text-sm space-y-1">
                  <li>• Mantén el dispositivo estable</li>
                  <li>• Asegúrate de tener buena iluminación</li>
                  <li>• La grabación será automática</li>
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
              <span>Iniciar Grabación</span>
              <span className="text-2xl">🎬</span>
            </span>
          </button>
        )}
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
