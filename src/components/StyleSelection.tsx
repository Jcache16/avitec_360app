/**
 * Componente: StyleSelection
 * 
 * Pantalla de selección de estilo - Permite elegir música, marco y texto
 * Se ejecuta antes de la configuración de cámara
 */

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { StyleConfig } from "@/utils/VideoProcessor";
import { generateOverlayPNG } from "@/utils/OverlayGenerator";
import { generateSimpleOverlayPNG } from "@/utils/SimpleOverlayGenerator";

interface StyleSelectionProps {
  onContinue: (styleConfig: StyleConfig, overlayPNG: Blob) => void;
  onBack: () => void;
}

// Opciones disponibles
const MUSIC_OPTIONS = [
  { id: "none", name: "Sin música", preview: null },
  { id: "beggin", name: "Beggin - Maneskin", preview: "/music/beggin.mp3" },
  { id: "master_puppets", name: "Master of Puppets - Metallica", preview: "/music/master_puppets.mp3" },
  { id: "night_dancer", name: "Night Dancer - Imase", preview: "/music/night_dancer.mp3" },
];

const FRAME_OPTIONS = [
  { id: "none", name: "Sin marco", thumbnail: null },
  { id: "custom", name: "Personalizado", thumbnail: null, isCustom: true },
  { id: "classic", name: "Clásico", thumbnail: "/frames/classic-thumb.svg" },
  { id: "modern", name: "Moderno", thumbnail: "/frames/modern-thumb.svg" },
  { id: "elegant", name: "Elegante", thumbnail: "/frames/elegant-thumb.svg" },
  { id: "fun", name: "Divertido", thumbnail: "/frames/fun-thumb.svg" },
];

// Colores predefinidos para el borde personalizado
const BORDER_COLORS = [
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#EF4444", // Red
  "#F97316", // Orange
  "#EAB308", // Yellow
  "#22C55E", // Green
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#6366F1", // Indigo
  "#FFFFFF", // White
  "#000000", // Black
  "#6B7280", // Gray
];

const FONT_OPTIONS = [
  { id: "playfair", name: "Playfair Display", className: "font-playfair", style: { fontFamily: "'Playfair Display', serif" } },
  { id: "chewy", name: "Chewy", className: "font-chewy", style: { fontFamily: "'Chewy', cursive" } },
  { id: "montserrat", name: "Montserrat", className: "font-montserrat", style: { fontFamily: "'Montserrat', sans-serif" } },
];

export default function StyleSelection({ onContinue, onBack }: StyleSelectionProps) {
  const [selectedMusic, setSelectedMusic] = useState<string>("none");
  const [selectedFrame, setSelectedFrame] = useState<string>("none");
  const [customFrameColor, setCustomFrameColor] = useState<string>("#8B5CF6"); // Purple por defecto
  const [customText, setCustomText] = useState<string>("¡Mi momento 360°!");
  const [selectedFont, setSelectedFont] = useState<string>("montserrat");
  const selectedTextColor = "white"; // Color fijo para el texto
  const [isPlayingPreview, setIsPlayingPreview] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  

  const handleMusicPreview = async (musicId: string) => {
    // Detener audio actual si existe
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }

    if (isPlayingPreview === musicId) {
      setIsPlayingPreview(null);
      return;
    }

    const musicOption = MUSIC_OPTIONS.find(m => m.id === musicId);
    if (musicOption?.preview) {
      try {
        const audio = new Audio(musicOption.preview);
        audio.volume = 0.5; // Volumen al 50%
        
        // Eventos del audio
        audio.onended = () => {
          setIsPlayingPreview(null);
          setCurrentAudio(null);
        };
        
        audio.onerror = () => {
          console.error("Error al cargar el audio:", musicOption.preview);
          setIsPlayingPreview(null);
          setCurrentAudio(null);
        };

        setCurrentAudio(audio);
        setIsPlayingPreview(musicId);
        
        await audio.play();
        
        // Auto-stop después de 10 segundos
        setTimeout(() => {
          if (audio && !audio.paused) {
            audio.pause();
            audio.currentTime = 0;
            setIsPlayingPreview(null);
            setCurrentAudio(null);
          }
        }, 10000);
        
      } catch (error) {
        console.error("Error al reproducir audio:", error);
        setIsPlayingPreview(null);
        setCurrentAudio(null);
      }
    }
  };

  const handleContinue = async () => {
    // Detener audio si está reproduciéndose
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    const styleConfig: StyleConfig = {
      music: selectedMusic !== "none" ? selectedMusic : undefined,
      frame: selectedFrame !== "none" ? selectedFrame : undefined,
      frameColor: selectedFrame === "custom" ? customFrameColor : undefined,
      text: customText,
      textFont: selectedFont,
      textColor: selectedTextColor,
    };
    // Genera el PNG dinámico con fallback robusto
    try {
      console.log('🎨 Intentando generar overlay con fabric.js...');
      const overlayPNG = await generateOverlayPNG(styleConfig);
      console.log('✅ Overlay generado con fabric.js exitosamente');
      onContinue(styleConfig, overlayPNG);
    } catch (fabricError) {
      console.warn('⚠️ Fabric.js falló, usando canvas nativo:', fabricError);
      try {
        const overlayPNG = await generateSimpleOverlayPNG(styleConfig);
        console.log('✅ Overlay generado con canvas nativo exitosamente');
        onContinue(styleConfig, overlayPNG);
      } catch (canvasError) {
        console.error('❌ Error generando overlay:', canvasError);
        alert('Error generando el overlay. Inténtalo de nuevo.');
      }
    }
  };

  const selectedFontStyle = FONT_OPTIONS.find(f => f.id === selectedFont)?.style || {};

  // Limpiar audio al desmontar el componente
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, [currentAudio]);

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
        <div className="text-center mb-6">
          <button
            onClick={onBack}
            className="absolute left-0 top-0 p-2 text-white/70 hover:text-white transition-colors"
          >
            <span className="text-2xl">←</span>
          </button>
          <h1 className="text-2xl font-bold text-white mb-2">
            Personaliza tu Video
          </h1>
          <p className="text-purple-200 text-sm">
            Elige el estilo para tu experiencia 360°
          </p>
        </div>

        {/* Vista previa */}
        <div className="bg-black rounded-2xl overflow-hidden shadow-2xl mb-6 relative">
          <div className="aspect-[9/16] relative">
            <Image
              src="/placeholder-preview.png"
              alt="Vista previa"
              fill
              className="object-cover"
            />
            
            {/* Overlay del marco seleccionado */}
            {selectedFrame === "custom" && (
              <div 
                className="absolute inset-4 rounded-2xl pointer-events-none"
                style={{
                  border: `4px solid ${customFrameColor}`,
                  boxShadow: `inset 0 0 0 2px ${customFrameColor}40, 0 0 20px ${customFrameColor}60`
                }}
              >
                <div 
                  className="absolute inset-2 rounded-xl"
                  style={{
                    border: `2px solid ${customFrameColor}80`
                  }}
                ></div>
              </div>
            )}
            {selectedFrame !== "none" && selectedFrame !== "custom" && (
              <div className="absolute inset-0 border-8 border-white/30 rounded-2xl pointer-events-none">
                <div className="absolute inset-2 border-4 border-purple-400/50 rounded-xl"></div>
              </div>
            )}
            
            {/* Texto personalizado */}
            {customText && (
              <div className="absolute bottom-4 left-4 right-4">
                <p 
                  className="text-white text-center text-lg font-bold drop-shadow-lg bg-black/30 px-3 py-2 rounded-lg backdrop-blur-sm"
                  style={selectedFontStyle}
                >
                  {customText}
                </p>
              </div>
            )}
            
            {/* Indicador de música */}
            {selectedMusic !== "none" && (
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-2">
                <span className="text-white text-sm">🎵</span>
                <span className="text-white text-xs">
                  {MUSIC_OPTIONS.find(m => m.id === selectedMusic)?.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Configuraciones */}
        <div className="flex-1 space-y-6 overflow-y-auto">
          {/* Selección de música */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span>🎵</span> Música de fondo
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {MUSIC_OPTIONS.map((music) => (
                <div
                  key={music.id}
                  className={`p-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    selectedMusic === music.id
                      ? "bg-purple-500 text-white"
                      : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                  onClick={() => setSelectedMusic(music.id)}
                >
                  <div className="flex items-center justify-between">
                    <span>{music.name}</span>
                    {music.preview && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMusicPreview(music.id);
                        }}
                        className="text-lg hover:scale-110 transition-transform"
                      >
                        {isPlayingPreview === music.id ? "⏸️" : "▶️"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selección de marco */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span>🖼️</span> Marco decorativo
            </h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {FRAME_OPTIONS.map((frame) => (
                <button
                  key={frame.id}
                  onClick={() => setSelectedFrame(frame.id)}
                  className={`aspect-square rounded-lg overflow-hidden transition-all ${
                    selectedFrame === frame.id
                      ? "ring-4 ring-purple-400 scale-95"
                      : "hover:scale-105"
                  }`}
                >
                  {frame.isCustom ? (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex flex-col items-center justify-center text-white text-xs relative">
                      <div 
                        className="w-8 h-8 rounded border-2 mb-1"
                        style={{ borderColor: customFrameColor }}
                      />
                      <span>Personalizado</span>
                    </div>
                  ) : frame.thumbnail ? (
                    <div className="w-full h-full bg-gray-600 flex items-center justify-center text-white text-xs">
                      {frame.name}
                    </div>
                  ) : (
                    <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/60 text-xs">
                      Sin marco
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Selector de color para marco personalizado */}
            {selectedFrame === "custom" && (
              <div className="space-y-3">
                <label className="text-white/80 text-sm">Color del borde:</label>
                <div className="grid grid-cols-6 gap-2">
                  {BORDER_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setCustomFrameColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        customFrameColor === color
                          ? "border-white scale-110 shadow-lg"
                          : "border-white/30 hover:border-white/60 hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                
                {/* Input de color personalizado */}
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={customFrameColor}
                    onChange={(e) => setCustomFrameColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border-2 border-white/30 bg-transparent cursor-pointer"
                  />
                  <span className="text-white/70 text-sm">Color personalizado</span>
                </div>
              </div>
            )}
          </div>

          {/* Personalización de texto */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span>📝</span> Texto personalizado
            </h3>
            
            {/* Input de texto */}
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="w-full bg-white/10 text-white placeholder-white/50 px-4 py-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
              maxLength={50}
            />
            
            {/* Selección de fuente */}
            <div className="space-y-2">
              <label className="text-white/80 text-sm">Fuente:</label>
              <div className="grid grid-cols-1 gap-2">
                {FONT_OPTIONS.map((font) => (
                  <button
                    key={font.id}
                    onClick={() => setSelectedFont(font.id)}
                    className={`p-3 rounded-lg text-left transition-all ${
                      selectedFont === font.id
                        ? "bg-purple-500 text-white"
                        : "bg-white/10 text-white/80 hover:bg-white/20"
                    }`}
                    style={font.style}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Botón continuar */}
        <button
          onClick={handleContinue}
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-4 px-8 rounded-2xl text-xl shadow-2xl transform transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500/50 active:scale-95 mt-6"
        >
          <span className="flex items-center justify-center gap-3">
            <span>Continuar</span>
            <span className="text-2xl">✨</span>
          </span>
        </button>
      </div>

      {/* Importar Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link 
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Chewy&family=Montserrat:wght@400;600;700&display=swap" 
        rel="stylesheet" 
      />
    </div>
  );
}
