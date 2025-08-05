import { StaticCanvas, Rect, Text, Shadow } from 'fabric';
import { StyleConfig } from "@/utils/VideoProcessor";

/**
 * Genera un PNG overlay robusto usando fabric.js v6.
 * OPTIMIZADO: Resolución 480x854 para compatibilidad con video procesado
 */
export async function generateOverlayPNG(
  config: StyleConfig,
  width: number = 480,  // CORREGIDO: de 720 a 480
  height: number = 854  // CORREGIDO: de 1280 a 854
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('🎨 Generando overlay PNG con config:', config);
      
      // Crear un canvas HTML temporal
      const canvasElement = document.createElement('canvas');
      canvasElement.width = width;
      canvasElement.height = height;
      
      // Crea canvas fabric.js SIN backgroundColor (transparente)
      const canvas = new StaticCanvas(canvasElement, { 
        width, 
        height,
        backgroundColor: 'transparent'
      });

      console.log('📐 Canvas creado:', width, 'x', height);

      // --- Marco decorativo ---
      if (config.frame && config.frame !== "none") {
        console.log('🖼️ Agregando marco:', config.frame);
        const color = config.frameColor || "#FFFFFF";
        
        // CORREGIDO: Proporciones ajustadas para 480x854
        const outerRect = new Rect({
          left: 8, top: 8,   // Reducido de 11 a 8
          width: width - 16,  // Reducido de 22 a 16
          height: height - 16,
          rx: 32, ry: 32,    // Reducido de 44 a 32
          stroke: color, 
          strokeWidth: 16,   // Reducido de 22 a 16
          fill: "transparent", 
          selectable: false
        });
        canvas.add(outerRect);

        const innerRect = new Rect({
          left: 24, top: 24,  // Reducido de 34 a 24
          width: width - 48,  // Reducido de 68 a 48
          height: height - 48,
          rx: 12, ry: 12,    // Reducido de 16 a 12
          stroke: color + "80", 
          strokeWidth: 6,    // Reducido de 8 a 6
          fill: "transparent", 
          selectable: false
        });
        canvas.add(innerRect);
      }

      // --- Texto personalizado ---
      if (config.text && config.text.trim()) {
        console.log('📝 Agregando texto:', config.text);
        
        const fontMap: Record<string, string> = {
          playfair: "serif",
          chewy: "cursive",
          montserrat: "sans-serif",
        };
        const fontFamily = fontMap[config.textFont || "montserrat"] || "sans-serif";
        
        // CORREGIDO: Proporciones ajustadas para 480x854
        const textBg = new Rect({
          left: width / 2 - 140,  // Reducido de 200 a 140
          top: height - 80,       // Reducido de 110 a 80
          width: 280,             // Reducido de 400 a 280
          height: 56,             // Reducido de 78 a 56
          fill: "rgba(0,0,0,0.7)", 
          selectable: false, 
          rx: 12,                 // Reducido de 16 a 12
          ry: 12
        });
        canvas.add(textBg);

        const textObj = new Text(config.text, {
          left: width / 2,
          top: height - 52,       // Ajustado de 71 a 52
          fontFamily,
          fontSize: 32,           // Reducido de 48 a 32
          fontWeight: "bold",
          fill: config.textColor || "#FFFFFF",
          stroke: "#000000",
          strokeWidth: 1.5,       // Reducido de 2 a 1.5
          originX: "center",
          originY: "center",
          shadow: new Shadow({
            color: "rgba(0,0,0,0.8)",
            blur: 6,              // Reducido de 8 a 6
            offsetX: 1.5,         // Reducido de 2 a 1.5
            offsetY: 1.5
          }),
          selectable: false
        });
        canvas.add(textObj);
      }

      // --- Nombre de la canción ---
      if (config.music && config.music !== "none") {
        console.log('🎵 Agregando indicador de música:', config.music);
        
        // CORREGIDO: Proporciones ajustadas para 480x854
        const musicRect = new Rect({
          left: 24, top: 24,      // Reducido de 36,32 a 24,24
          width: 240, height: 36, // Reducido de 360,54 a 240,36
          fill: "rgba(255,255,255,0.95)", 
          rx: 8, ry: 8,           // Reducido de 12 a 8
          selectable: false,
          shadow: new Shadow({
            color: "rgba(0,0,0,0.3)",
            blur: 6,              // Reducido de 8 a 6
            offsetX: 0,
            offsetY: 3            // Reducido de 4 a 3
          })
        });
        canvas.add(musicRect);

        const name = config.music
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
          
        const musicText = new Text("🎵 " + name, {
          left: 36,               // Reducido de 56 a 36
          top: 42,                // Reducido de 59 a 42
          fontFamily: "sans-serif",
          fontSize: 16,           // Reducido de 24 a 16
          fontWeight: "600",
          fill: "#6C63FF",
          originX: "left",
          originY: "center",
          selectable: false
        });
        canvas.add(musicText);
      }

      console.log('🔄 Renderizando canvas...');
      
      // Renderizar el canvas
      canvas.renderAll();
      
      // Esperar un frame para asegurar que se renderice
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      // Exportar como dataURL
      const dataUrl = canvas.toDataURL({ 
        format: "png", 
        quality: 1,
        multiplier: 1,
        enableRetinaScaling: false
      });
      
      console.log('📤 DataURL generado, tamaño:', dataUrl.length);
      
      // Convertir a blob
      if (!dataUrl || dataUrl === 'data:,') {
        throw new Error('Canvas no generó dataURL válido');
      }
      
      // Usar una promesa separada para fetch
      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        
        if (!blob || blob.size === 0) {
          throw new Error('Blob generado está vacío');
        }
        
        console.log('✅ Overlay PNG generado exitosamente:', blob.size, 'bytes');
        resolve(blob);
        
      } catch (fetchError) {
        console.error('❌ Error convirtiendo dataURL a blob:', fetchError);
        
        // Fallback: convertir manualmente
        try {
          const base64Data = dataUrl.split(',')[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const fallbackBlob = new Blob([bytes], { type: 'image/png' });
          
          if (fallbackBlob.size > 0) {
            console.log('✅ Overlay PNG generado con fallback:', fallbackBlob.size, 'bytes');
            resolve(fallbackBlob);
          } else {
            throw new Error('Fallback blob también está vacío');
          }
          
        } catch (fallbackError) {
          console.error('❌ Error en fallback:', fallbackError);
          reject(new Error('No se pudo generar el overlay PNG'));
        }
      }
      
    } catch (error) {
      console.error('❌ Error generando overlay:', error);
      reject(error);
    }
  });
}