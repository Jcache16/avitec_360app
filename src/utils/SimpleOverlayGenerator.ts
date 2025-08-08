import { StyleConfig } from "@/utils/VideoProcessor";

/**
 * Verifica que las fuentes de Google Fonts estén cargadas
 */
async function ensureFontsLoaded(): Promise<void> {
  const fontsToCheck = [
    "'Playfair Display'",
    "'Chewy'", 
    "'Montserrat'"
  ];

  for (const font of fontsToCheck) {
    try {
      // Verificar si la fuente está disponible usando document.fonts API
      if ('fonts' in document) {
        await document.fonts.load(`16px ${font}`);
        console.log(`✅ Fuente cargada (Canvas nativo): ${font}`);
      }
    } catch (error) {
      console.warn(`⚠️ Error verificando fuente ${font}:`, error);
    }
  }
  
  // Esperar un poco más para asegurar la carga
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('✅ Verificación de fuentes completada (Canvas nativo)');
}

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
      
      // ASEGURAR QUE LAS FUENTES ESTÉN CARGADAS ANTES DE GENERAR
      await ensureFontsLoaded();
      
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
        
        // Configurar fuente - USAR EXACTAMENTE LOS NOMBRES CARGADOS (sin fallbacks genéricos)
        const fontSize = 32;  // Reducido de 48 a 32
        const fontMap: Record<string, string> = {
          playfair: "'Playfair Display'",
          chewy: "'Chewy'",
          montserrat: "'Montserrat'",
        };
        const fontFamily = fontMap[config.textFont || "montserrat"] || "'Montserrat'";
        
        console.log('🔤 Fuente seleccionada (Canvas nativo):', fontFamily);
        
        // Configurar fuente para medir
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Medir el texto real
        const textMetrics = ctx.measureText(config.text);
        const textWidth = textMetrics.width;
        const textHeight = fontSize;
        
        // Calcular dimensiones del fondo con padding proporcional
        const paddingX = Math.max(20, textWidth * 0.1); // 10% del ancho del texto como mínimo
        const paddingY = 16;
        const backgroundWidth = Math.min(textWidth + (paddingX * 2), width - 40); // Máximo ancho menos margen
        const backgroundHeight = textHeight + (paddingY * 2);
        
        // Posición centrada
        const backgroundX = (width - backgroundWidth) / 2;
        const backgroundY = height - 80 - backgroundHeight / 2;
        
        console.log('📐 Dimensiones calculadas (Canvas nativo):', { textWidth, backgroundWidth, backgroundHeight });
        
        // Fondo del texto ajustado al contenido real
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        drawRoundedRect(ctx, backgroundX, backgroundY, backgroundWidth, backgroundHeight, 12);
        ctx.fill();
        
        // Sombra del texto
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;  // Reducido de 8 a 6
        ctx.shadowOffsetX = 1.5;  // Reducido de 2 a 1.5
        ctx.shadowOffsetY = 1.5;
        
        // REMOVIDO: strokeText para coincidir con preview (solo sombra, sin borde)
        
        // Fill del texto
        ctx.fillStyle = config.textColor || "#FFFFFF";
        ctx.fillText(config.text, width / 2, height - 52);
        
        // Resetear sombra
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        console.log('✅ Texto dibujado con fuente:', fontFamily);
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
