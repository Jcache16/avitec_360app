import { StaticCanvas, Rect, Text, Shadow } from 'fabric';
import { StyleConfig } from "@/utils/VideoProcessor";

/**
 * Genera un PNG overlay robusto usando fabric.js v6.
 */
export async function generateOverlayPNG(
  config: StyleConfig,
  width: number = 720,
  height: number = 1280
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
        
        const outerRect = new Rect({
          left: 11, top: 11, 
          width: width - 22, 
          height: height - 22,
          rx: 44, ry: 44,
          stroke: color, 
          strokeWidth: 22,
          fill: "transparent", 
          selectable: false
        });
        canvas.add(outerRect);

        const innerRect = new Rect({
          left: 34, top: 34, 
          width: width - 68, 
          height: height - 68,
          rx: 16, ry: 16,
          stroke: color + "80", 
          strokeWidth: 8,
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
        
        const textBg = new Rect({
          left: width / 2 - 200, 
          top: height - 110, 
          width: 400, 
          height: 78,
          fill: "rgba(0,0,0,0.7)", 
          selectable: false, 
          rx: 16, 
          ry: 16
        });
        canvas.add(textBg);

        const textObj = new Text(config.text, {
          left: width / 2,
          top: height - 71,
          fontFamily,
          fontSize: 48,
          fontWeight: "bold",
          fill: config.textColor || "#FFFFFF",
          stroke: "#000000",
          strokeWidth: 2,
          originX: "center",
          originY: "center",
          shadow: new Shadow({
            color: "rgba(0,0,0,0.8)",
            blur: 8,
            offsetX: 2,
            offsetY: 2
          }),
          selectable: false
        });
        canvas.add(textObj);
      }

      // --- Nombre de la canción ---
      if (config.music && config.music !== "none") {
        console.log('🎵 Agregando indicador de música:', config.music);
        
        const musicRect = new Rect({
          left: 36, top: 32, 
          width: 360, height: 54,
          fill: "rgba(255,255,255,0.95)", 
          rx: 12, ry: 12, 
          selectable: false,
          shadow: new Shadow({
            color: "rgba(0,0,0,0.3)",
            blur: 8,
            offsetX: 0,
            offsetY: 4
          })
        });
        canvas.add(musicRect);

        const name = config.music
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
          
        const musicText = new Text("🎵 " + name, {
          left: 56, 
          top: 59,
          fontFamily: "sans-serif",
          fontSize: 24,
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