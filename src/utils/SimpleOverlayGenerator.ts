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
  width: number = 720,
  height: number = 1280
): Promise<Blob> {
  return new Promise((resolve, reject) => {
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
        const color = config.frameColor || "#FFFFFF";
        
        // Marco exterior
        ctx.strokeStyle = color;
        ctx.lineWidth = 22;
        drawRoundedRect(ctx, 11, 11, width - 22, height - 22, 44);
        ctx.stroke();
        
        // Marco interior
        ctx.strokeStyle = color + "80";
        ctx.lineWidth = 8;
        drawRoundedRect(ctx, 34, 34, width - 68, height - 68, 16);
        ctx.stroke();
      }
      
      // --- Texto personalizado ---
      if (config.text && config.text.trim()) {
        console.log('📝 Dibujando texto:', config.text);
        
        // Fondo del texto
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        drawRoundedRect(ctx, width / 2 - 200, height - 110, 400, 78, 16);
        ctx.fill();
        
        // Configurar fuente
        const fontSize = 48;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Sombra del texto
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Stroke del texto
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(config.text, width / 2, height - 71);
        
        // Fill del texto
        ctx.fillStyle = config.textColor || "#FFFFFF";
        ctx.fillText(config.text, width / 2, height - 71);
        
        // Resetear sombra
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }
      
      // --- Nombre de la canción ---
      if (config.music && config.music !== "none") {
        console.log('🎵 Dibujando indicador de música:', config.music);
        
        // Fondo del indicador de música
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        drawRoundedRect(ctx, 36, 32, 360, 54, 12);
        ctx.fill();
        
        // Sombra sutil
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        
        // Redibuja el fondo con sombra
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        drawRoundedRect(ctx, 36, 32, 360, 54, 12);
        ctx.fill();
        
        // Resetear sombra
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        
        // Texto de la música
        const name = config.music
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
          
        ctx.font = "600 24px sans-serif";
        ctx.fillStyle = "#6C63FF";
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText("🎵 " + name, 56, 59);
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
