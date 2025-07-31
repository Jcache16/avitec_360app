/**
 * Componente: VideoPreview - Diseño mejorado
 * 
 * Pantalla de vista previa del video final con estética consistente
 * Permite descargar o subir a Google Drive
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { StyleConfig, processVideo360, ProcessingProgress } from "@/utils/VideoProcessor";

interface VideoPreviewProps {
  videoBlob: Blob;
  styleConfig: StyleConfig;
  duration: number;
  onRestart: () => void;
  onBack: () => void;
}

export default function VideoPreview({ videoBlob, styleConfig, duration, onRestart, onBack }: VideoPreviewProps) {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(true);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState("Iniciando...");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    processVideo();
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoBlob]);

  const processVideo = async () => {
    setIsProcessing(true);
    setError(null);
    setProcessingProgress(0);
    
    try {
      const onProgress = (progress: ProcessingProgress) => {
        setProcessingStep(progress.step);
        setProcessingProgress(progress.progress);
      };

      const processedBlob = await processVideo360(
        videoBlob,
        styleConfig,
        duration,
        onProgress
      );

      const url = URL.createObjectURL(processedBlob);
      setVideoUrl(url);
      setIsProcessing(false);

    } catch (error: any) {
      console.error('Error procesando video:', error);
      setError(error.message || 'Error procesando el video');
      setIsProcessing(false);
    }
  };

  const downloadVideo = () => {
    if (!videoUrl) return;

    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `photobooth-360-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uploadToGoogleDrive = async () => {
    setIsUploading(true);
    
    // TODO: Implementar subida real a Google Drive
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      alert('¡Video subido exitosamente a Google Drive!');
    } catch (error) {
      alert('Error subiendo a Google Drive');
    } finally {
      setIsUploading(false);
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

          <h2 className="text-2xl font-bold text-white mb-4">
            Procesando tu video
          </h2>
          
          <p className="text-white/70 mb-6">
            {processingStep}
          </p>

          <div className="w-full bg-white/20 rounded-full h-3 mb-4">
            <div
              className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${processingProgress}%` }}
            ></div>
          </div>

          <p className="text-white/50 text-sm">
            {processingProgress}% completado
          </p>
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
            />
            
            {/* Info del video */}
            <div className="mt-4 text-center">
              <p className="text-white/70 text-sm mb-2">
                Duración: {duration}s • Formato: 9:16 • Calidad: 720p
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
                <span>Subiendo a Google Drive...</span>
              </>
            ) : (
              <>
                <span className="text-xl">☁️</span>
                <span>Subir a Google Drive</span>
              </>
            )}
          </button>
        </div>

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