/**
 * Componente: RecordingScreen
 * 
 * Pantalla de grabación - Maneja la cuenta regresiva, grabación y procesamiento
 * Incluye efectos de sonido y vista previa en tiempo real
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { StyleConfig } from "@/utils/VideoProcessor";

interface RecordingScreenProps {
  onRecordingComplete: (videoBlob: Blob) => void;
  onBack: () => void;
  styleConfig: StyleConfig;
  normalDuration: number;
  slowmoDuration: number;
  facingMode: string;
}

enum RecordingState {
  READY = "ready",
  COUNTDOWN = "countdown", 
  RECORDING = "recording",
  PROCESSING = "processing"
}

export default function RecordingScreen({ 
  onRecordingComplete, 
  onBack, 
  styleConfig, 
  normalDuration, 
  slowmoDuration, 
  facingMode 
}: RecordingScreenProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.READY);
  const [countdownNumber, setCountdownNumber] = useState(3);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<string>("Normal");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const countdownAudioRef = useRef<HTMLAudioElement | null>(null);
  const startAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const totalDuration = normalDuration + slowmoDuration;

  // Configurar cámara al montar
  useEffect(() => {
    // Dar un poco de tiempo para que se libere la cámara anterior
    const timer = setTimeout(() => {
      setupCamera();
    }, 200);
    
    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [facingMode]); // También re-configurar si cambia la cámara

  const setupCamera = async () => {
    try {
      console.log('🎥 Configurando cámara en RecordingScreen con facingMode:', facingMode);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },  // Mantener misma resolución que CameraSetup
          height: { ideal: 1080 },
          facingMode: facingMode // Usar la cámara seleccionada en CameraSetup
        },
        audio: true // Mantener audio como en CameraSetup para consistencia
      });

      streamRef.current = stream;
      console.log('✅ Stream obtenido exitosamente');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Asegurarse de que el video se reproduzca
        videoRef.current.muted = true; // Evitar eco de audio
        try {
          await videoRef.current.play();
          console.log('✅ Video reproduciéndose');
        } catch (playError) {
          console.warn('⚠️ Error al reproducir video:', playError);
          // Intentar reproducir sin audio
          videoRef.current.muted = true;
          await videoRef.current.play();
        }
      }
    } catch (err) {
      console.error("❌ Error accessing camera in RecordingScreen:", err);
      // Intentar de nuevo con configuración más básica
      try {
        console.log('🔄 Intentando configuración básica de cámara...');
        const basicStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: false
        });
        
        streamRef.current = basicStream;
        if (videoRef.current) {
          videoRef.current.srcObject = basicStream;
          videoRef.current.muted = true;
          await videoRef.current.play();
        }
      } catch (basicErr) {
        console.error("❌ Error con configuración básica:", basicErr);
      }
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (countdownAudioRef.current) {
      countdownAudioRef.current.pause();
    }
    if (startAudioRef.current) {
      startAudioRef.current.pause();
    }
  };

  const playCountdownSound = async (isStart: boolean = false) => {
    try {
      const audio = new Audio(isStart ? "/sounds/countdown-start.mp3" : "/sounds/countdown-beep.mp3");
      audio.volume = 0.7;
      
      if (isStart) {
        startAudioRef.current = audio;
      } else {
        countdownAudioRef.current = audio;
      }
      
      await audio.play();
    } catch (error) {
      console.log("Audio not available:", error);
    }
  };

  const startCountdown = () => {
    setRecordingState(RecordingState.COUNTDOWN);
    setCountdownNumber(3);
    
    const countdownInterval = setInterval(() => {
      setCountdownNumber(prev => {
        if (prev > 1) {
          playCountdownSound(false);
          return prev - 1;
        } else {
          clearInterval(countdownInterval);
          playCountdownSound(true);
          startRecording();
          return 0;
        }
      });
    }, 1000);

    // Primer sonido inmediato
    playCountdownSound(false);
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    setRecordingState(RecordingState.RECORDING);
    setRecordingProgress(0);
    recordedChunks.current = [];

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        processRecording();
      };

      mediaRecorder.start();

      // Progreso de grabación - GRABAR TODA LA DURACIÓN
      const progressInterval = setInterval(() => {
        setRecordingProgress(prev => {
          const newProgress = prev + (100 / (totalDuration * 10)); // Incrementos más precisos cada 100ms
          
          // Mostrar fase que se aplicará en post-producción
          const currentTime = (newProgress / 100) * totalDuration;
          
          if (currentTime <= normalDuration) {
            setCurrentPhase("Grabando - Normal");
          } else {
            setCurrentPhase("Grabando - Slow Motion");
          }

          if (newProgress >= 100) {
            clearInterval(progressInterval);
            mediaRecorder.stop();
            return 100;
          }
          
          return newProgress;
        });
      }, 100); // Cada 100ms para más precisión

      // Parar automáticamente después de la duración exacta
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
        clearInterval(progressInterval);
      }, totalDuration * 1000); // Duración exacta en milisegundos

    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const processRecording = () => {
    setRecordingState(RecordingState.PROCESSING);
    
    // Simular procesamiento
    setTimeout(() => {
      const videoBlob = new Blob(recordedChunks.current, { type: 'video/webm' });
      onRecordingComplete(videoBlob);
    }, 2000); // 2 segundos de procesamiento simplificado
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "Normal": return "text-green-400";
      case "Slow Motion": return "text-yellow-400";
      case "Boomerang": return "text-purple-400";
      default: return "text-white";
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Video de fondo pantalla completa */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-contain md:object-cover"
      />

      {/* Overlay oscuro para legibilidad */}
      <div className="absolute inset-0 bg-black/20"></div>

      {/* Contenido superpuesto */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6">
          <button
            onClick={onBack}
            className="p-2 bg-black/50 backdrop-blur-sm rounded-full text-white/80 hover:text-white transition-colors"
            disabled={recordingState !== RecordingState.READY}
          >
            <span className="text-xl">←</span>
          </button>
          
          {recordingState === RecordingState.RECORDING && (
            <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className={`font-medium ${getPhaseColor(currentPhase)}`}>
                {currentPhase}
              </span>
            </div>
          )}

          <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
            <span className="text-white font-medium">{totalDuration}s</span>
          </div>
        </div>

        {/* Área central para countdown */}
        <div className="flex-1 flex items-center justify-center">
          {recordingState === RecordingState.COUNTDOWN && (
            <div className="text-center">
              <div className="text-8xl font-bold text-white mb-4 animate-pulse">
                {countdownNumber}
              </div>
              <p className="text-white/80 text-xl">
                Prepárate...
              </p>
            </div>
          )}

          {recordingState === RecordingState.PROCESSING && (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white text-xl font-medium mb-2">
                Procesando video...
              </p>
              <p className="text-white/70">
                Aplicando efectos y configuraciones
              </p>
            </div>
          )}
        </div>

        {/* Barra de progreso durante grabación */}
        {recordingState === RecordingState.RECORDING && (
          <div className="px-6 mb-8">
            <div className="bg-black/50 backdrop-blur-sm rounded-full p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/80 text-sm">Grabando</span>
                <span className="text-white font-medium">
                  {Math.round((recordingProgress / 100) * totalDuration)}s / {totalDuration}s
                </span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-red-500 to-pink-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${recordingProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Botón de grabación */}
        {recordingState === RecordingState.READY && (
          <div className="p-6">
            <button
              onClick={startCountdown}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-6 px-8 rounded-3xl text-2xl shadow-2xl transform transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <span className="flex items-center justify-center gap-4">
                <div className="w-6 h-6 bg-white rounded-full animate-pulse"></div>
                <span>Grabar</span>
                <div className="w-6 h-6 bg-white rounded-full animate-pulse"></div>
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Overlay del marco durante grabación */}
      {recordingState === RecordingState.RECORDING && styleConfig.frame && styleConfig.frame !== "none" && (
        <div className="absolute inset-4 rounded-2xl pointer-events-none z-20">
          {styleConfig.frame === "custom" && styleConfig.frameColor ? (
            <div 
              className="w-full h-full rounded-2xl"
              style={{
                border: `4px solid ${styleConfig.frameColor}`,
                boxShadow: `inset 0 0 0 2px ${styleConfig.frameColor}40, 0 0 20px ${styleConfig.frameColor}60`
              }}
            >
              <div 
                className="absolute inset-2 rounded-xl w-full h-full"
                style={{
                  border: `2px solid ${styleConfig.frameColor}80`
                }}
              ></div>
            </div>
          ) : (
            <div className="w-full h-full rounded-2xl border-4 border-white/80 shadow-lg">
              <div className="absolute inset-2 rounded-xl border-2 border-white/40"></div>
            </div>
          )}
        </div>
      )}

      {/* Texto superpuesto durante grabación */}
      {recordingState === RecordingState.RECORDING && styleConfig.text && styleConfig.text.trim() && (
        <div className="absolute bottom-32 left-6 right-6 z-20">
          <p 
            className="text-white text-center text-2xl font-bold drop-shadow-lg bg-black/30 px-4 py-3 rounded-xl backdrop-blur-sm"
            style={{
              fontFamily: styleConfig.textFont === "playfair" ? "'Playfair Display', serif" :
                         styleConfig.textFont === "chewy" ? "'Chewy', cursive" :
                         "'Montserrat', sans-serif"
            }}
          >
            {styleConfig.text}
          </p>
        </div>
      )}
    </div>
  );
}
