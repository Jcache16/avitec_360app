import { StyleConfig } from "@/utils/VideoProcessor";

/**
 * Polyfill para roundRect si no está disponible
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, width: number, height: number, radius: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    // Fallback manual
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

/**
 * Generador de overlay PNG simple usando Canvas HTML nativo
 * Fallback robusto para cuando fabric.js falla
 */
export async function generateSimpleOverlayPNG(
  config: StyleConfig,
  width: number = 480,  // CORREGIDO: de 720 a 480
  height: number = 854  // CORREGIDO: de 1280 a 854
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('🎨 Generando overlay simple con Canvas nativo');
      
      // Crear canvas HTML
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('No se pudo obtener contexto 2D del canvas');
      }
      
      // Fondo transparente
      ctx.clearRect(0, 0, width, height);
      
      // --- Marco decorativo ---
      if (config.frame && config.frame !== "none") {
        console.log('🖼️ Dibujando marco:', config.frame);
        
        if (config.frame === "custom" && config.frameColor) {
          // Marco personalizado con color
          const color = config.frameColor;
          
          // Marco exterior (proporciones ajustadas para 480x854)
          ctx.strokeStyle = color;
          ctx.lineWidth = 16;  // Reducido de 22 a 16
          drawRoundedRect(ctx, 8, 8, width - 16, height - 16, 32);  // Ajustado
          ctx.stroke();
          
          // Marco interior
          ctx.strokeStyle = color + "80";
          ctx.lineWidth = 6;  // Reducido de 8 a 6
          drawRoundedRect(ctx, 24, 24, width - 48, height - 48, 12);  // Ajustado
          ctx.stroke();
          
        } else if (config.frame !== "custom") {
          // Marco PNG predefinido
          try {
            console.log(`📸 Cargando imagen de marco: /frames/${config.frame}.png`);
            
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise<void>((resolveImg, rejectImg) => {
              img.onload = () => resolveImg();
              img.onerror = () => rejectImg(new Error(`Error cargando imagen: /frames/${config.frame}.png`));
              img.src = `/frames/${config.frame}.png`;
            });
            
            // Dibujar la imagen escalada al tamaño del canvas
            ctx.drawImage(img, 0, 0, width, height);
            console.log('✅ Marco PNG dibujado exitosamente');
            
          } catch (imgError) {
            console.warn('⚠️ Error cargando marco PNG, continuando sin marco:', imgError);
          }
        }
      }
      
      // --- Texto personalizado ---
      if (config.text && config.text.trim()) {
        console.log('📝 Dibujando texto:', config.text);
        
        // Fondo del texto (proporciones ajustadas para 480x854)
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        drawRoundedRect(ctx, width / 2 - 140, height - 80, 280, 56, 12);  // Ajustado
        ctx.fill();
        
        // Configurar fuente
        const fontSize = 32;  // Reducido de 48 a 32
        const fontMap: Record<string, string> = {
          playfair: "serif",
          chewy: "cursive",
          montserrat: "sans-serif",
        };
        const fontFamily = fontMap[config.textFont || "montserrat"] || "sans-serif";
        
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Sombra del texto
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;  // Reducido de 8 a 6
        ctx.shadowOffsetX = 1.5;  // Reducido de 2 a 1.5
        ctx.shadowOffsetY = 1.5;
        
        // Stroke del texto
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;  // Reducido de 3 a 1.5
        ctx.strokeText(config.text, width / 2, height - 52);  // Ajustado de 71 a 52
        
        // Fill del texto
        ctx.fillStyle = config.textColor || "#FFFFFF";
        ctx.fillText(config.text, width / 2, height - 52);
        
        // Resetear sombra
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }
      
      // --- INDICADOR DE MÚSICA REMOVIDO ---
      // El indicador de música ya no se muestra en el overlay para limpiar la interfaz visual
      // La música se aplica solo como audio en el video final
      if (config.music && config.music !== "none") {
        console.log('🎵 Música seleccionada (sin mostrar en overlay):', config.music);
      }
      
      console.log('🔄 Convirtiendo canvas a blob...');
      
      // Convertir a blob
      canvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          console.log('✅ Overlay simple generado exitosamente:', blob.size, 'bytes');
          resolve(blob);
        } else {
          reject(new Error('No se pudo generar el overlay con canvas nativo'));
        }
      }, 'image/png', 1.0);
      
    } catch (error) {
      console.error('❌ Error generando overlay simple:', error);
      reject(error);
    }
  });
}
