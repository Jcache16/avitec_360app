/**
 * Proyecto: Photobooth 360 WebApp
 * Framework: Next.js 14 (App Router) + TypeScript + Tailwind CSS
 *
 * Página principal con navegación interna por componentes
 * Maneja el flujo completo de la aplicación con estados condicionales
 */

"use client";

import { useState } from "react";
import NoSSRWrapper from "@/components/NoSSRWrapper";
import CameraSetup from "@/components/CameraSetup";
import StyleSelection from "@/components/StyleSelection";
import RecordingScreen from "@/components/RecordingScreen";
import VideoPreview from "@/components/VideoPreview";
import { StyleConfig } from "@/utils/VideoProcessor";

// Enum para los diferentes estados/pantallas de la app
enum AppScreen {
  WELCOME = "welcome",
  STYLE_SELECTION = "style_selection",
  CAMERA_SETUP = "camera_setup",
  RECORDING = "recording",
  PREVIEW = "preview",
  FINAL = "final"
}

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.WELCOME);
  const [styleConfig, setStyleConfig] = useState<StyleConfig | null>(null);
  const [overlayPNG, setOverlayPNG] = useState<Blob | null>(null);
  const [normalDuration, setNormalDuration] = useState<number>(8);
  const [slowmoDuration, setSlowmoDuration] = useState<number>(7);
  const [selectedFacingMode, setSelectedFacingMode] = useState<string>("user");
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

  const handleStyleConfigured = (config: StyleConfig, overlayPNG: Blob) => {
    console.log('📋 handleStyleConfigured llamado con:', {
      config,
      overlayPNG: {
        size: overlayPNG.size,
        type: overlayPNG.type
      }
    });
    setStyleConfig(config);
    setOverlayPNG(overlayPNG);
    setCurrentScreen(AppScreen.CAMERA_SETUP);
  };

  const handleRecordingComplete = (blob: Blob) => {
    setVideoBlob(blob);
    setCurrentScreen(AppScreen.PREVIEW);
  };
  // Navegación entre pantallas
  const navigateToScreen = (screen: AppScreen) => {
    setCurrentScreen(screen);
  };

  const handleStartExperience = () => {
    navigateToScreen(AppScreen.STYLE_SELECTION);
  };


  const handleStartRecording = (
    normalDur: number, 
    slowmoDur: number, 
    facingMode: string, 
    selectedFile?: File
  ) => {
    setNormalDuration(normalDur);
    setSlowmoDuration(slowmoDur);
    setSelectedFacingMode(facingMode);
    
    // Si se seleccionó un archivo, vamos directamente al preview
    // Si no, vamos a la pantalla de grabación
    if (selectedFile) {
      // Convertir el archivo a Blob y ir directo al preview
      setVideoBlob(selectedFile);
      navigateToScreen(AppScreen.PREVIEW);
    } else {
      navigateToScreen(AppScreen.RECORDING);
    }
  };

  const handleRestartExperience = () => {
    setStyleConfig(null);
    setVideoBlob(null);
    setNormalDuration(8);
    setSlowmoDuration(7);
    setSelectedFacingMode("user");
    navigateToScreen(AppScreen.WELCOME);
  };

  const handleBackToWelcome = () => {
    navigateToScreen(AppScreen.WELCOME);
  };

  const handleBackToStyleSelection = () => {
    navigateToScreen(AppScreen.STYLE_SELECTION);
  };

  // Renderizado condicional basado en el estado actual
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case AppScreen.WELCOME:
        return <WelcomeScreen onStartExperience={handleStartExperience} />;
      
      case AppScreen.STYLE_SELECTION:
        return (
          <StyleSelection
            onContinue={handleStyleConfigured}
            onBack={handleBackToWelcome}
          />
        );
      
      case AppScreen.CAMERA_SETUP:
        return (
          <CameraSetup
            onStartRecording={handleStartRecording}
            onBack={handleBackToStyleSelection}
          />
        );
      
      case AppScreen.RECORDING:
        return (
          <RecordingScreen
            onRecordingComplete={handleRecordingComplete}
            onBack={handleBackToStyleSelection}
            styleConfig={styleConfig!}
            normalDuration={normalDuration}
            slowmoDuration={slowmoDuration}
            facingMode={selectedFacingMode}
          />
        );
      
      case AppScreen.PREVIEW:
        return (
          <VideoPreview
            videoBlob={videoBlob!}
            styleConfig={styleConfig!}
            normalDuration={normalDuration}
            slowmoDuration={slowmoDuration}
            overlayPNG={overlayPNG!}
            onRestart={handleRestartExperience}
            onBack={() => setCurrentScreen(AppScreen.CAMERA_SETUP)}
          />
        );
      
      case AppScreen.FINAL:
        // TODO: Implementar componente FinalScreen
        return <div className="min-h-screen bg-blue-500 flex items-center justify-center text-white">
          <p>Pantalla Final - En desarrollo</p>
        </div>;
      
      default:
        return <WelcomeScreen onStartExperience={handleStartExperience} />;
    }
  };

  return (
    <NoSSRWrapper>
      {renderCurrentScreen()}
    </NoSSRWrapper>
  );
}

// Componente de la pantalla de bienvenida (extraído para mejor organización)
function WelcomeScreen({ onStartExperience }: { onStartExperience: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-center px-6 py-8 relative overflow-hidden">
      {/* Efectos de fondo animados */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-purple-500/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-l from-blue-500/20 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 text-center max-w-md mx-auto">
        {/* Logo/Icono de la app */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-4">
            <img 
              src="/logo.svg" 
              alt="AVI TEC 360° Studio Logo" 
              className="w-full h-full"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            AVI TEC 360° Studio
          </h1>
        </div>

        {/* Mensaje principal */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            Captura tu
            <span className="block bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              momento 360°
            </span>
          </h2>
          <p className="text-purple-100 text-lg leading-relaxed mb-6">
            Graba videos únicos con efectos profesionales en slow motion.
          </p>
          
          {/* Características destacadas */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm border border-white/20">
              📹 Grabación automática
            </span>
            <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm border border-white/20">
              ⚡ Efectos instantáneos
            </span>
            <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm border border-white/20">
              ☁️ Descarga directa
            </span>
          </div>
        </div>

        {/* Botón principal de acción */}
        <button
          onClick={onStartExperience}
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-4 px-8 rounded-2xl text-xl shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-purple-500/25 focus:outline-none focus:ring-4 focus:ring-purple-500/50 active:scale-95"
        >
          <span className="flex items-center justify-center gap-3">
            <span>Comenzar Experiencia</span>
            <span className="text-2xl">🚀</span>
          </span>
        </button>

        {/* Texto adicional */}
        <p className="text-purple-200 text-sm mt-6 opacity-80">
          Sin instalación • Funciona en tu navegador
        </p>
      </div>

      {/* Footer inferior - Movido fuera del contenido principal */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-purple-200/80 z-20 px-4">
        © {new Date().getFullYear()} AVI TEC. Todos los derechos reservados - Página desarrollada por{' '}
        <a
          href="https://sparksolutions.dev"
          className="underline text-purple-200/80 hover:text-purple-100 transition-colors cursor-pointer"
          target="_blank"
          rel="noopener noreferrer"
        >
          Spark Solutions
        </a>
        .
      </div>
    </div>
  );
}
